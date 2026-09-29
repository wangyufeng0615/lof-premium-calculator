/**
 * 数据获取模块
 *
 * 净值来自东方财富 pingzhongdata；LOF 列表和日 K 收盘价来自新浪。
 * 东方财富的行情接口（push2 / push2his）会对 Cloudflare 出口 IP 直接断开连接
 * （Worker 里表现为 520/502），2026-09 起改用新浪。
 */

import type { Fund, FundNav } from './types';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const SINA_HEADERS = {
  'User-Agent': USER_AGENT,
  'Referer': 'https://finance.sina.com.cn/',
};
const SINA_MARKET_CENTER = 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center';

// 交易所前缀：上海 5 开头，深圳 1 开头
const sinaSymbol = (code: string) => `${code.startsWith('5') ? 'sh' : 'sz'}${code}`;

/**
 * 新浪日 K 线，返回 date -> 收盘价
 */
async function fetchSinaDailyCloses(code: string, days: number): Promise<Map<string, number>> {
  const url = `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${sinaSymbol(code)}&scale=240&ma=no&datalen=${days}`;
  const res = await fetch(url, { headers: SINA_HEADERS });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const bars = await res.json() as Array<{ day: string; close: string }> | null;
  const result = new Map<string, number>();
  for (const bar of bars || []) {
    const close = parseFloat(bar.close);
    if (!isNaN(close)) {
      result.set(bar.day, close);
    }
  }
  return result;
}

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 带重试的请求包装函数（指数退避）
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 4,
  baseDelay: number = 1000
): Promise<T | null> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      // 子请求配额用完后重试只会继续失败
      if (String(e).includes('Too many subrequests')) {
        console.log(`Subrequest limit reached: ${e}`);
        return null;
      }
      if (i < maxRetries) {
        const waitTime = baseDelay * Math.pow(2, i); // 指数退避: 1s, 2s, 4s, 8s
        console.log(`Retry ${i + 1}/${maxRetries} after ${waitTime}ms: ${e}`);
        await delay(waitTime);
      } else {
        console.log(`All ${maxRetries} retries failed: ${e}`);
      }
    }
  }
  return null;
}

// 历史价格缓存 (code -> date -> closePrice)
const priceCache = new Map<string, Map<string, number>>();

// 净值历史缓存 (code -> date -> nav) - 复用pingzhongdata请求
const navHistoryCache = new Map<string, Map<string, number>>();

/**
 * 获取基金历史收盘价
 */
export async function fetchHistoricalPrice(code: string, date: string): Promise<number | null> {
  // 如果日期为空，直接返回
  if (!date) {
    return null;
  }

  // 检查缓存
  if (priceCache.has(code)) {
    const dateMap = priceCache.get(code)!;
    if (dateMap.has(date)) {
      return dateMap.get(date)!;
    }
  }

  return fetchWithRetry(async () => {
    const dateMap = await fetchSinaDailyCloses(code, 30);
    if (dateMap.size === 0) {
      console.log(`No klines data for ${code}`);
      return null;
    }

    priceCache.set(code, dateMap);
    const price = dateMap.get(date);
    if (!price) {
      console.log(`No price for ${code} on ${date}, available: ${Array.from(dateMap.keys()).slice(-3).join(',')}`);
    }
    return price || null;
  });
}

/**
 * 获取 LOF 基金列表（分页获取全部）
 */
export async function fetchLOFList(): Promise<Fund[]> {
  const node = 'lof_hq_fund';
  const pageSize = 100;

  const countRes = await fetch(`${SINA_MARKET_CENTER}.getHQNodeStockCount?node=${node}`, { headers: SINA_HEADERS });
  if (!countRes.ok) {
    throw new Error(`获取 LOF 数量失败: HTTP ${countRes.status}`);
  }
  const total = Number(JSON.parse(await countRes.text()));
  if (!total) {
    throw new Error('获取 LOF 列表失败');
  }

  // 串行分页，避免并发过高被限流
  const allRecords: Record<string, unknown>[] = [];
  for (let page = 1; page <= Math.ceil(total / pageSize); page++) {
    if (page > 1) await delay(100);
    const url = `${SINA_MARKET_CENTER}.getHQNodeData?page=${page}&num=${pageSize}&sort=symbol&asc=1&node=${node}`;
    const res = await fetch(url, { headers: SINA_HEADERS });
    if (!res.ok) {
      throw new Error(`获取 LOF 列表失败: HTTP ${res.status}`);
    }
    const rows = await res.json() as Record<string, unknown>[] | null;
    allRecords.push(...(rows || []));
  }

  // 转换为 Fund 对象
  const funds: Fund[] = [];
  for (const item of allRecords) {
    const code = String(item.code || '');
    const name = String(item.name || '');
    const price = item.trade;

    if (!code || !name || price === null || price === '-') {
      continue;
    }

    const marketPrice = Number(price);
    if (isNaN(marketPrice) || marketPrice <= 0 || marketPrice > 100 || marketPrice < 0.5) {
      continue;
    }

    // 跳过债券/货币类基金
    const skipKeywords = ['债券', '货币', '短债', '纯债', '中债', '国债', '信用债', '可转债', '企业债', '政府债', '同业存单'];
    if (skipKeywords.some(kw => name.includes(kw))) {
      continue;
    }

    funds.push({
      code,
      name,
      marketPrice,
      changePercent: Number(item.changepercent) || 0,
    });
  }

  return funds;
}

/**
 * 获取基金净值（通过解析 JS 文件）
 * 同时缓存历史净值数据供后续复用
 */
export async function fetchFundNav(code: string): Promise<FundNav | null> {
  const url = `https://fund.eastmoney.com/pingzhongdata/${code}.js`;

  return fetchWithRetry(async () => {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const text = await res.text();

    // 用正则提取 Data_netWorthTrend 变量
    const match = text.match(/var Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) {
      return null;
    }

    const data = JSON.parse(match[1]) as Array<{ x: number; y: number }>;
    if (!data || data.length === 0) {
      return null;
    }

    // 缓存所有历史净值数据（复用此次请求）
    const historyMap = new Map<string, number>();
    for (const item of data) {
      const d = new Date(item.x + 8 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      historyMap.set(dateStr, item.y);
    }
    navHistoryCache.set(code, historyMap);

    const latest = data[data.length - 1];
    // 时间戳是北京时间0点，需要转换为中国日期
    const date = new Date(latest.x + 8 * 60 * 60 * 1000); // 加8小时转UTC+8
    const navDate = date.toISOString().split('T')[0];

    return {
      nav: latest.y,
      navDate,
    };
  });
}

/**
 * 获取基金多日净值历史（最近N天）
 * 优先使用缓存，避免重复请求
 */
export async function fetchFundNavHistory(code: string, days: number = 10): Promise<Map<string, number>> {
  // 检查缓存（fetchFundNav已经缓存过）
  if (navHistoryCache.has(code)) {
    const cached = navHistoryCache.get(code)!;
    const sortedDates = Array.from(cached.keys()).sort();
    const recentDates = sortedDates.slice(-days);
    const result = new Map<string, number>();
    for (const date of recentDates) {
      result.set(date, cached.get(date)!);
    }
    return result;
  }

  // 缓存未命中，发起请求
  const url = `https://fund.eastmoney.com/pingzhongdata/${code}.js`;
  const result = new Map<string, number>();

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) {
      return result;
    }

    const text = await res.text();

    // 用正则提取 Data_netWorthTrend 变量
    const match = text.match(/var Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) {
      return result;
    }

    const data = JSON.parse(match[1]) as Array<{ x: number; y: number }>;
    if (!data || data.length === 0) {
      return result;
    }

    // 缓存全部历史数据
    const historyMap = new Map<string, number>();
    for (const item of data) {
      const date = new Date(item.x + 8 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      historyMap.set(dateStr, item.y);
    }
    navHistoryCache.set(code, historyMap);

    // 取最近 N 天的数据
    const recentData = data.slice(-days);
    for (const item of recentData) {
      const date = new Date(item.x + 8 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      result.set(dateStr, item.y);
    }

    return result;
  } catch {
    return result;
  }
}

/**
 * 获取多日历史收盘价（返回 Map<date, price>）
 */
export async function fetchHistoricalPrices(code: string, days: number = 10): Promise<Map<string, number>> {
  try {
    return await fetchSinaDailyCloses(code, days);
  } catch {
    return new Map();
  }
}

/**
 * 批量获取基金净值（小批量并发）
 */
export async function fetchFundNavBatch(
  codes: string[],
  concurrency: number = 5
): Promise<Map<string, FundNav>> {
  const results = new Map<string, FundNav>();

  // 分批处理
  for (let i = 0; i < codes.length; i += concurrency) {
    const batch = codes.slice(i, i + concurrency);
    const promises = batch.map(async (code) => {
      const nav = await fetchFundNav(code);
      return { code, nav };
    });

    const batchResults = await Promise.all(promises);
    for (const { code, nav } of batchResults) {
      if (nav) {
        results.set(code, nav);
      }
    }

    // 批次间延迟避免限流
    if (i + concurrency < codes.length) {
      await delay(500);
    }
  }

  return results;
}
