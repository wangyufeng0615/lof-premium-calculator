/**
 * 分批计算模块 - 解决 API 限流问题
 */

import type { Env, Fund, FundWithPremium, FundType, BatchProgress, CalculationResult, DailyPremium } from './types';
import { fetchLOFList, fetchFundNav, fetchHistoricalPrice, fetchFundNavHistory, fetchHistoricalPrices } from './fetcher';

const BATCH_SIZE = 10;  // 每批处理的基金数量
const BATCH_DELAY = 300; // 每个请求间延迟(ms)

// 套利成本 (%)
const PREMIUM_ARBITRAGE_COST = 0.16;
const DISCOUNT_ARBITRAGE_COST = 0.51;

// 基金类型关键词
const QDII_KEYWORDS = ['QDII', '海外', '美股', '港股', '纳斯达克', '标普', '恒生', '日经'];
const COMMODITY_KEYWORDS = ['原油', '黄金', '白银', '石油', '贵金属', '商品', '有色'];

// KV keys
const PROGRESS_KEY = 'batch-progress';
const FUNDS_KEY = 'batch-funds';
const RESULTS_KEY = 'batch-results';

function detectFundType(name: string): FundType {
  if (QDII_KEYWORDS.some(kw => name.includes(kw))) return 'qdii';
  if (COMMODITY_KEYWORDS.some(kw => name.includes(kw))) return 'commodity';
  return 'normal';
}

function calculatePremiumRate(marketPrice: number, nav: number): number {
  if (nav <= 0) return 0;
  return Number(((marketPrice - nav) / nav * 100).toFixed(2));
}

function getNavDelayDays(navDate: string): number {
  const now = new Date();
  const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const todayStr = beijingNow.toISOString().split('T')[0];
  const navParts = navDate.split('-').map(Number);
  const todayParts = todayStr.split('-').map(Number);
  const navDays = Date.UTC(navParts[0], navParts[1] - 1, navParts[2]);
  const todayDays = Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]);
  return Math.floor((todayDays - navDays) / (1000 * 60 * 60 * 24));
}

/**
 * 获取当前进度
 */
export async function getProgress(env: Env): Promise<BatchProgress> {
  const data = await env.LOF_CACHE.get(PROGRESS_KEY);
  if (!data) {
    return {
      status: 'idle',
      totalFunds: 0,
      processedFunds: 0,
      currentBatch: 0,
      totalBatches: 0,
      successCount: 0,
    };
  }
  return JSON.parse(data);
}

/**
 * 开始新的批量计算
 */
export async function startBatchCalculation(env: Env): Promise<BatchProgress> {
  // 获取基金列表
  const funds = await fetchLOFList();
  const totalBatches = Math.ceil(funds.length / BATCH_SIZE);

  // 保存基金列表
  await env.LOF_CACHE.put(FUNDS_KEY, JSON.stringify(funds), { expirationTtl: 3600 });

  // 清空之前的结果
  await env.LOF_CACHE.put(RESULTS_KEY, JSON.stringify([]), { expirationTtl: 3600 });

  // 初始化进度
  const progress: BatchProgress = {
    status: 'running',
    totalFunds: funds.length,
    processedFunds: 0,
    currentBatch: 0,
    totalBatches,
    successCount: 0,
    startedAt: new Date().toISOString(),
  };

  await env.LOF_CACHE.put(PROGRESS_KEY, JSON.stringify(progress), { expirationTtl: 3600 });
  return progress;
}

/**
 * 处理下一批基金
 */
export async function processNextBatch(env: Env): Promise<BatchProgress> {
  const progress = await getProgress(env);

  if (progress.status !== 'running') {
    return progress;
  }

  // 获取基金列表
  const fundsData = await env.LOF_CACHE.get(FUNDS_KEY);
  if (!fundsData) {
    progress.status = 'error';
    progress.error = '基金列表不存在';
    await env.LOF_CACHE.put(PROGRESS_KEY, JSON.stringify(progress));
    return progress;
  }

  const funds: Fund[] = JSON.parse(fundsData);
  const start = progress.currentBatch * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, funds.length);

  if (start >= funds.length) {
    // 所有批次处理完成
    progress.status = 'completed';
    progress.completedAt = new Date().toISOString();
    await env.LOF_CACHE.put(PROGRESS_KEY, JSON.stringify(progress));

    // 生成最终结果
    await generateFinalResult(env, progress);
    return progress;
  }

  // 获取当前批次的基金
  const batch = funds.slice(start, end);
  const results: FundWithPremium[] = [];

  // 逐个处理基金（串行避免限流）
  for (const fund of batch) {
    try {
      // 获取净值
      const nav = await fetchFundNav(fund.code);
      if (!nav) {
        await delay(BATCH_DELAY);
        continue;
      }

      // 获取历史价格
      const price = await fetchHistoricalPrice(fund.code, nav.navDate);
      if (!price) {
        await delay(BATCH_DELAY);
        continue;
      }

      // 计算溢价率
      const fundType = detectFundType(fund.name);
      const premiumRate = calculatePremiumRate(price, nav.nav);
      const navDelayDays = getNavDelayDays(nav.navDate);
      const netProfit = premiumRate > 0
        ? Number((premiumRate - PREMIUM_ARBITRAGE_COST).toFixed(2))
        : Number((Math.abs(premiumRate) - DISCOUNT_ARBITRAGE_COST).toFixed(2));

      results.push({
        ...fund,
        marketPrice: price,
        nav: nav.nav,
        navDate: nav.navDate,
        fundType,
        premiumRate,
        navDelayDays,
        netProfit,
      });
    } catch (e) {
      console.error(`处理基金 ${fund.code} 失败:`, e);
    }

    await delay(BATCH_DELAY);
  }

  // 保存结果
  const existingResultsData = await env.LOF_CACHE.get(RESULTS_KEY);
  const existingResults: FundWithPremium[] = existingResultsData ? JSON.parse(existingResultsData) : [];
  existingResults.push(...results);
  await env.LOF_CACHE.put(RESULTS_KEY, JSON.stringify(existingResults), { expirationTtl: 3600 });

  // 更新进度
  progress.currentBatch++;
  progress.processedFunds = end;
  progress.successCount = existingResults.length;
  await env.LOF_CACHE.put(PROGRESS_KEY, JSON.stringify(progress), { expirationTtl: 3600 });

  return progress;
}

/**
 * 生成最终结果
 */
async function generateFinalResult(env: Env, progress: BatchProgress): Promise<void> {
  const resultsData = await env.LOF_CACHE.get(RESULTS_KEY);
  const allFunds: FundWithPremium[] = resultsData ? JSON.parse(resultsData) : [];

  // 筛选溢价基金并排序
  const premiumFunds = allFunds.filter(f => f.premiumRate > 0);
  premiumFunds.sort((a, b) => b.premiumRate - a.premiumRate);

  // 对前10只高溢价基金获取10日历史趋势
  const topFundsForHistory = premiumFunds.slice(0, 10);

  console.log(`获取历史趋势: 前${topFundsForHistory.length}只高溢价基金`);

  // 小批量并发获取历史数据
  const HISTORY_BATCH_SIZE = 3;
  for (let i = 0; i < topFundsForHistory.length; i += HISTORY_BATCH_SIZE) {
    const batch = topFundsForHistory.slice(i, i + HISTORY_BATCH_SIZE);

    await Promise.all(batch.map(async (fund) => {
      try {
        const [navHistory, priceHistory] = await Promise.all([
          fetchFundNavHistory(fund.code, 10),
          fetchHistoricalPrices(fund.code, 10),
        ]);

        // 计算每日溢价率
        const premiumHistory: DailyPremium[] = [];
        const allDates = new Set([...navHistory.keys(), ...priceHistory.keys()]);
        const sortedDates = Array.from(allDates).sort();

        for (const date of sortedDates) {
          const nav = navHistory.get(date);
          const price = priceHistory.get(date);
          if (nav && price && nav > 0) {
            premiumHistory.push({
              date,
              nav,
              price,
              premiumRate: Number(((price - nav) / nav * 100).toFixed(2)),
            });
          }
        }

        premiumHistory.sort((a, b) => a.date.localeCompare(b.date));
        fund.premiumHistory = premiumHistory.slice(-10);
      } catch (e) {
        console.log(`历史数据获取失败: ${fund.code}`, e);
      }
    }));

    // 批次间延迟
    if (i + HISTORY_BATCH_SIZE < topFundsForHistory.length) {
      await delay(100);
    }
  }

  // 获取最常见的净值日期
  const dateCounts = new Map<string, number>();
  for (const f of allFunds) {
    dateCounts.set(f.navDate, (dateCounts.get(f.navDate) || 0) + 1);
  }
  let mostCommonNavDate = '';
  let maxCount = 0;
  for (const [date, count] of dateCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonNavDate = date;
    }
  }

  const result: CalculationResult = {
    executionTime: new Date().toISOString(),
    successCount: allFunds.length,
    failedCount: progress.totalFunds - allFunds.length,
    premiumFundCount: premiumFunds.length,
    mostCommonNavDate,
    arbitrageCosts: {
      premium: PREMIUM_ARBITRAGE_COST,
      discount: DISCOUNT_ARBITRAGE_COST,
    },
    topPremiumFunds: premiumFunds,
    allFunds,
    _debug: {
      totalFundsInMarket: progress.totalFunds,
      processedFunds: progress.processedFunds,
      navFetched: allFunds.length,
      priceFetched: allFunds.length,
      dataDate: mostCommonNavDate,
      historyFetched: topFundsForHistory.length,
    },
  };

  // 保存到缓存
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await env.LOF_CACHE.put('lof-premium-data', JSON.stringify({
    result,
    cachedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }), { expirationTtl: 24 * 60 * 60 });
}

/**
 * 重置进度
 */
export async function resetProgress(env: Env): Promise<void> {
  await env.LOF_CACHE.delete(PROGRESS_KEY);
  await env.LOF_CACHE.delete(FUNDS_KEY);
  await env.LOF_CACHE.delete(RESULTS_KEY);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
