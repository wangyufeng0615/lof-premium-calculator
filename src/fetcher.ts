/**
 * 数据获取模块 - 东方财富 API
 */

import type { Fund, FundNav } from './types';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// 历史价格缓存 (code -> date -> closePrice)
const priceCache = new Map<string, Map<string, number>>();

/**
 * 获取基金历史收盘价
 */
export async function fetchHistoricalPrice(code: string, date: string): Promise<number | null> {
  // 检查缓存
  if (priceCache.has(code)) {
    const dateMap = priceCache.get(code)!;
    if (dateMap.has(date)) {
      return dateMap.get(date)!;
    }
  }

  // 确定交易所前缀 (深圳1开头用0，上海5开头用1)
  const prefix = code.startsWith('5') ? '1' : '0';
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${prefix}.${code}&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55&klt=101&fqt=0&end=20500101&lmt=30`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const data = await res.json() as { data?: { klines?: string[] } };

    if (!data.data?.klines) {
      return null;
    }

    // 解析并缓存所有日期的价格
    const dateMap = new Map<string, number>();
    for (const line of data.data.klines) {
      const parts = line.split(',');
      // 格式: 日期,开盘,收盘,最高,最低
      const d = parts[0];
      const close = parseFloat(parts[2]);
      if (!isNaN(close)) {
        dateMap.set(d, close);
      }
    }

    priceCache.set(code, dateMap);
    return dateMap.get(date) || null;
  } catch {
    return null;
  }
}

/**
 * 获取 LOF 基金列表（分页获取全部）
 */
export async function fetchLOFList(): Promise<Fund[]> {
  const baseUrl = 'https://88.push2.eastmoney.com/api/qt/clist/get';
  const baseParams = {
    pn: '1',
    pz: '100',
    po: '1',
    np: '1',
    ut: 'bd1d9ddb04089700cf9c27f6f7426281',
    fltt: '2',
    invt: '2',
    wbp2u: '|0|0|0|web',
    fid: 'f3',
    fs: 'b:MK0404,b:MK0405,b:MK0406,b:MK0407',
    fields: 'f12,f14,f2,f3',
  };

  const headers = {
    'User-Agent': USER_AGENT,
    'Referer': 'https://quote.eastmoney.com/',
  };

  // 获取第一页，确定总数
  const firstUrl = `${baseUrl}?${new URLSearchParams(baseParams)}`;
  const firstRes = await fetch(firstUrl, { headers });
  const firstData = await firstRes.json() as {
    data: { diff: Record<string, unknown>[]; total: number };
  };

  if (!firstData.data?.diff) {
    throw new Error('获取 LOF 列表失败');
  }

  const allRecords = [...firstData.data.diff];
  const total = firstData.data.total;
  const totalPages = Math.ceil(total / 100);

  // 获取剩余页面
  const promises: Promise<Response>[] = [];
  for (let page = 2; page <= totalPages; page++) {
    const params = { ...baseParams, pn: String(page) };
    const url = `${baseUrl}?${new URLSearchParams(params)}`;
    promises.push(fetch(url, { headers }));
  }

  const responses = await Promise.all(promises);
  for (const res of responses) {
    const data = await res.json() as { data: { diff: Record<string, unknown>[] } };
    if (data.data?.diff) {
      allRecords.push(...data.data.diff);
    }
  }

  // 转换为 Fund 对象
  const funds: Fund[] = [];
  for (const item of allRecords) {
    const code = String(item.f12 || '');
    const name = String(item.f14 || '');
    const price = item.f2;

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
      changePercent: Number(item.f3) || 0,
    });
  }

  return funds;
}

/**
 * 获取基金净值（通过解析 JS 文件）
 */
export async function fetchFundNav(code: string): Promise<FundNav | null> {
  const url = `https://fund.eastmoney.com/pingzhongdata/${code}.js`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) {
      return null;
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

    const latest = data[data.length - 1];
    // 时间戳是北京时间0点，需要转换为中国日期
    const date = new Date(latest.x + 8 * 60 * 60 * 1000); // 加8小时转UTC+8
    const navDate = date.toISOString().split('T')[0];

    return {
      nav: latest.y,
      navDate,
    };
  } catch {
    return null;
  }
}

/**
 * 批量获取基金净值（并发限制）
 */
export async function fetchFundNavBatch(
  codes: string[],
  concurrency: number = 10
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
  }

  return results;
}
