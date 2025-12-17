/**
 * 溢价率计算模块
 */

import type { Fund, FundType, FundWithPremium, CalculationResult } from './types';
import { fetchLOFList, fetchFundNavBatch, fetchHistoricalPrice } from './fetcher';

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
  const funds = await fetchLOFList();

  // 2. 批量获取净值
  const codes = funds.map(f => f.code);
  const navMap = await fetchFundNavBatch(codes, 10);  // 减小批量大小

  console.log(`净值获取完成: ${navMap.size}/${codes.length}`);

  // 3. 确定数据日期（最常见的净值日期）
  const navDates: string[] = [];
  for (const nav of navMap.values()) {
    navDates.push(nav.navDate);
  }
  const dataDate = mostCommon(navDates) || '';

  // 4. 批量获取历史收盘价（使用净值日期，限制并发数）
  const priceMap = new Map<string, number>();
  const BATCH_SIZE = 10;  // 减小批量大小
  for (let i = 0; i < codes.length; i += BATCH_SIZE) {
    const batch = codes.slice(i, i + BATCH_SIZE);
    const prices = await Promise.all(
      batch.map(code => fetchHistoricalPrice(code, dataDate))
    );
    batch.forEach((code, j) => {
      if (prices[j] !== null) {
        priceMap.set(code, prices[j]!);
      }
    });
    // 添加小延迟避免限流
    if (i + BATCH_SIZE < codes.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`价格获取完成: ${priceMap.size}/${codes.length}`);

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
