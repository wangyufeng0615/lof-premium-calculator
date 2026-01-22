/**
 * 溢价率计算模块
 */

import type { Fund, FundType, FundWithPremium, CalculationResult, DailyPremium } from './types';
import { fetchLOFList, fetchFundNavBatch, fetchHistoricalPrice, fetchFundNavHistory, fetchHistoricalPrices } from './fetcher';

// 套利成本 (%)
const PREMIUM_ARBITRAGE_COST = 0.16;   // 溢价套利: 申购+卖出
const DISCOUNT_ARBITRAGE_COST = 0.51;  // 折价套利: 买入+赎回

// 基金类型关键词
const QDII_KEYWORDS = ['QDII', '海外', '美股', '港股', '纳斯达克', '标普', '恒生', '日经'];
const COMMODITY_KEYWORDS = ['原油', '黄金', '白银', '石油', '贵金属', '商品', '有色'];

/**
 * 检测基金类型
 */
function detectFundType(name: string): FundType {
  if (QDII_KEYWORDS.some(kw => name.includes(kw))) {
    return 'qdii';
  }
  if (COMMODITY_KEYWORDS.some(kw => name.includes(kw))) {
    return 'commodity';
  }
  return 'normal';
}

/**
 * 计算净值延迟天数
 */
function getNavDelayDays(navDate: string): number {
  // 使用北京时间计算延迟天数
  const now = new Date();
  const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const todayStr = beijingNow.toISOString().split('T')[0];

  // 简单的日期差计算
  const navParts = navDate.split('-').map(Number);
  const todayParts = todayStr.split('-').map(Number);

  const navDays = Date.UTC(navParts[0], navParts[1] - 1, navParts[2]);
  const todayDays = Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]);

  return Math.floor((todayDays - navDays) / (1000 * 60 * 60 * 24));
}

/**
 * 计算溢价率
 */
function calculatePremiumRate(marketPrice: number, nav: number): number {
  if (nav <= 0) return 0;
  return Number(((marketPrice - nav) / nav * 100).toFixed(2));
}

/**
 * 找出最常见的值
 */
function mostCommon<T>(arr: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  let maxCount = 0;
  let maxItem: T | undefined;
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxItem = item;
    }
  }
  return maxItem;
}

/**
 * 计算所有 LOF 基金的溢价率
 */
export async function calculate(topN: number = 20): Promise<CalculationResult> {
  // 1. 获取 LOF 列表
  const allFunds = await fetchLOFList();

  // 2. 筛选可能有套利机会的基金（涨跌幅 > 2% 或 < -2%，优先处理）
  // 按涨跌幅绝对值排序，优先处理波动大的
  const sortedFunds = [...allFunds].sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
  );

  // 限制处理数量以避免超时和限流（最多30只）
  const funds = sortedFunds.slice(0, 30);
  const codes = funds.map(f => f.code);

  // 3. 批量获取净值（小批量并发）
  const navMap = await fetchFundNavBatch(codes, 3);  // 更小的批量

  console.log(`净值获取完成: ${navMap.size}/${codes.length}`);

  // 等待一段时间再获取价格，避免连续请求被限流
  await new Promise(resolve => setTimeout(resolve, 500));

  // 3. 确定数据日期（最常见的净值日期）
  const navDates: string[] = [];
  for (const nav of navMap.values()) {
    navDates.push(nav.navDate);
  }
  const dataDate = mostCommon(navDates) || '';

  // 4. 串行获取历史收盘价（避免并发导致限流）
  const priceMap = new Map<string, number>();
  const codesWithNav = Array.from(navMap.keys());

  for (const code of codesWithNav) {
    const price = await fetchHistoricalPrice(code, dataDate);
    if (price !== null) {
      priceMap.set(code, price);
    }
    // 每个请求后短暂延迟
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`价格获取完成: ${priceMap.size}/${codesWithNav.length}`);

  // 5. 计算溢价率（使用同一天的市价和净值）
  const fundsWithPremium: FundWithPremium[] = [];

  for (const fund of funds) {
    const nav = navMap.get(fund.code);
    const historicalPrice = priceMap.get(fund.code);

    // 必须同时有净值和同一天的历史价格
    if (!nav || !historicalPrice) continue;

    // 只使用净值日期与数据日期匹配的基金
    if (nav.navDate !== dataDate) continue;

    const fundType = detectFundType(fund.name);
    const premiumRate = calculatePremiumRate(historicalPrice, nav.nav);
    const navDelayDays = getNavDelayDays(nav.navDate);

    // 计算净收益（扣除套利成本）
    const netProfit = premiumRate > 0
      ? Number((premiumRate - PREMIUM_ARBITRAGE_COST).toFixed(2))
      : Number((Math.abs(premiumRate) - DISCOUNT_ARBITRAGE_COST).toFixed(2));

    fundsWithPremium.push({
      ...fund,
      marketPrice: historicalPrice, // 使用历史收盘价
      nav: nav.nav,
      navDate: nav.navDate,
      fundType,
      premiumRate,
      navDelayDays,
      netProfit,
    });
  }

  // 6. 统计
  const premiumFunds = fundsWithPremium.filter(f => f.premiumRate > 0);
  premiumFunds.sort((a, b) => b.premiumRate - a.premiumRate);

  // 7. 对前10只高溢价基金获取历史数据
  const topFundsForHistory = premiumFunds.slice(0, 10);

  console.log(`获取历史数据: 前${topFundsForHistory.length}只高溢价基金`);

  // 小批量并发获取历史数据（净值已缓存，只需获取价格）
  const BATCH_SIZE = 3;
  for (let i = 0; i < topFundsForHistory.length; i += BATCH_SIZE) {
    const batch = topFundsForHistory.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (fund) => {
      try {
        // 净值历史已在 fetchFundNav 时缓存，这里直接读取缓存
        // 只需要额外获取价格历史
        const [navHistory, priceHistory] = await Promise.all([
          fetchFundNavHistory(fund.code, 10),  // 命中缓存，无网络请求
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

        // 按日期排序,保留最近10条
        premiumHistory.sort((a, b) => a.date.localeCompare(b.date));
        fund.premiumHistory = premiumHistory.slice(-10);
      } catch (e) {
        console.log(`历史数据获取失败: ${fund.code}`, e);
      }
    }));

    // 批次间延迟避免限流
    if (i + BATCH_SIZE < topFundsForHistory.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const executionTime = new Date().toISOString();

  return {
    executionTime,
    successCount: fundsWithPremium.length,
    failedCount: funds.length - fundsWithPremium.length,
    premiumFundCount: premiumFunds.length,
    mostCommonNavDate: dataDate,
    arbitrageCosts: {
      premium: PREMIUM_ARBITRAGE_COST,
      discount: DISCOUNT_ARBITRAGE_COST,
    },
    topPremiumFunds: premiumFunds, // 存储所有溢价基金，由调用方截取
    allFunds: fundsWithPremium,
    _debug: {
      totalFundsInMarket: allFunds.length, // 市场上所有基金
      processedFunds: funds.length,         // 实际处理的基金数
      navFetched: navMap.size,
      priceFetched: priceMap.size,
      dataDate,
      historyFetched: topFundsForHistory.length,
    },
  };
}

/**
 * 格式化报告（文本格式）
 */
export function formatReport(result: CalculationResult, topN: number = 10): string {
  const lines: string[] = [];

  lines.push('LOF基金溢价率报告');
  lines.push('='.repeat(50));
  lines.push(`计算时间: ${result.executionTime}`);

  const total = result.successCount + result.failedCount;
  if (total > 0) {
    const rate = (result.successCount / total * 100).toFixed(1);
    lines.push(`数据成功率: ${result.successCount}/${total} (${rate}%)`);
  }

  lines.push(`溢价基金数量: ${result.premiumFundCount} 只`);

  if (result.mostCommonNavDate) {
    lines.push(`净值日期(T-1): ${result.mostCommonNavDate}`);
  }

  lines.push('');
  lines.push('套利成本参考:');
  lines.push(`  溢价套利(申购+卖出): ${result.arbitrageCosts.premium}%`);
  lines.push(`  折价套利(买入+赎回): ${result.arbitrageCosts.discount}%`);

  if (result.topPremiumFunds.length > 0) {
    lines.push('');
    lines.push(`溢价率最高的LOF基金 (TOP ${topN}):`);

    for (let i = 0; i < Math.min(topN, result.topPremiumFunds.length); i++) {
      const fund = result.topPremiumFunds[i];
      let typeTag = '';
      let warning = '';

      if (fund.fundType === 'qdii') {
        typeTag = '[QDII] ';
        warning = ' (净值延迟T-2,注意风险)';
      } else if (fund.fundType === 'commodity') {
        typeTag = '[商品] ';
        warning = ' (净值延迟T-2,注意风险)';
      }

      const profit = fund.netProfit > 0.5
        ? `净收益${fund.netProfit}%`
        : '无套利空间';

      lines.push(
        `  ${i + 1}. ${fund.code} ${fund.name} ${typeTag}溢价率: ${fund.premiumRate.toFixed(2)}% (${profit})${warning}`
      );
    }
  }

  return lines.join('\n');
}
