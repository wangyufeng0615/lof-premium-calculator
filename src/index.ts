/**
 * LOF基金溢价率计算工具 - Cloudflare Workers
 *
 * 功能:
 * - GET /           API 说明
 * - GET /calculate  实时计算溢价率（会更新缓存）
 * - GET /data       从缓存获取数据
 * - GET /health     健康检查
 *
 * 定时任务:
 * - Cron Trigger 每天 15:30 (UTC 7:30) 自动计算并缓存
 */

import type { Env, CachedData, CalculationResult } from './types';
import { calculate, formatReport } from './calculator';
import { HTML_PAGE } from './frontend';
import { fetchLOFList, fetchFundNav, fetchHistoricalPrice } from './fetcher';

const CACHE_KEY = 'lof-premium-data';
const CACHE_TTL_HOURS = 24;

/**
 * 获取缓存数据
 */
async function getCachedData(env: Env): Promise<CachedData | null> {
  const data = await env.LOF_CACHE.get(CACHE_KEY);
  if (!data) return null;

  try {
    const cached = JSON.parse(data) as CachedData;
    // 检查是否过期
    if (new Date(cached.expiresAt) < new Date()) {
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

/**
 * 保存缓存数据
 */
async function setCachedData(env: Env, result: CalculationResult): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000);

  const cached: CachedData = {
    result,
    cachedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await env.LOF_CACHE.put(CACHE_KEY, JSON.stringify(cached), {
    expirationTtl: CACHE_TTL_HOURS * 60 * 60,
  });
}

/**
 * 处理 HTTP 请求
 */
async function handleFetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 路由
  if (path === '/' || path === '') {
    return handleIndex(corsHeaders);
  }

  if (path === '/api') {
    return handleApiInfo(corsHeaders);
  }

  if (path === '/calculate') {
    return handleCalculate(url, env, corsHeaders);
  }

  if (path === '/data') {
    return handleData(url, env, corsHeaders);
  }

  if (path === '/health') {
    return handleHealth(corsHeaders);
  }

  if (path === '/debug') {
    return handleDebug(corsHeaders);
  }

  if (path === '/debug2') {
    return handleDebug2(corsHeaders);
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * GET / - 前端页面
 */
function handleIndex(headers: Record<string, string>): Response {
  return new Response(HTML_PAGE, {
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * GET /api - API 说明
 */
function handleApiInfo(headers: Record<string, string>): Response {
  const info = {
    name: 'LOF基金溢价率计算器',
    version: '1.0.0',
    endpoints: {
      '/': '前端页面',
      '/api': 'API 说明',
      '/data': '从缓存获取数据（推荐）',
      '/calculate': '实时计算溢价率（会更新缓存）',
      '/health': '健康检查',
    },
    params: {
      top: '返回前N只基金 (默认20)',
      format: '返回格式 json/text (默认json)',
    },
    cron: '每天 UTC 7:30 (北京时间 15:30) 自动更新缓存',
  };

  return new Response(JSON.stringify(info, null, 2), {
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * GET /calculate - 实时计算
 */
async function handleCalculate(
  url: URL,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  const topN = parseInt(url.searchParams.get('top') || '20', 10);
  const format = url.searchParams.get('format') || 'json';

  try {
    const result = await calculate(topN);

    // 更新缓存
    await setCachedData(env, result);

    if (format === 'text') {
      return new Response(formatReport(result, topN), {
        headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return new Response(JSON.stringify({
      ...result,
      topPremiumFunds: result.topPremiumFunds.slice(0, topN),
    }, null, 2), {
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * GET /data - 从缓存获取
 */
async function handleData(
  url: URL,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  const topN = parseInt(url.searchParams.get('top') || '20', 10);
  const format = url.searchParams.get('format') || 'json';

  let cached = await getCachedData(env);

  // 无缓存时自动触发计算
  if (!cached) {
    const result = await calculate(100);
    await setCachedData(env, result);
    cached = {
      result,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  const result = cached.result;

  if (format === 'text') {
    const text = [
      formatReport(result, topN),
      '',
      `缓存时间: ${cached.cachedAt}`,
      `过期时间: ${cached.expiresAt}`,
    ].join('\n');

    return new Response(text, {
      headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response(JSON.stringify({
    ...result,
    topPremiumFunds: result.topPremiumFunds.slice(0, topN),
    _cache: {
      cachedAt: cached.cachedAt,
      expiresAt: cached.expiresAt,
    },
  }, null, 2), {
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * GET /health - 健康检查
 */
function handleHealth(headers: Record<string, string>): Response {
  return new Response(JSON.stringify({
    status: 'ok',
    time: new Date().toISOString(),
  }), {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/**
 * GET /debug - 调试 API 调用
 */
async function handleDebug(headers: Record<string, string>): Promise<Response> {
  const results: Record<string, unknown> = {};

  // 测试 LOF 列表 API 并解析
  const listUrl = 'https://88.push2.eastmoney.com/api/qt/clist/get?pn=1&pz=5&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=b:MK0404,b:MK0405,b:MK0406,b:MK0407&fields=f12,f14,f2,f3';
  try {
    const res = await fetch(listUrl);
    const data = await res.json() as { data?: { diff?: unknown; total?: number } };
    const diff = data.data?.diff;

    // 检查 diff 类型
    const diffType = Array.isArray(diff) ? 'array' : typeof diff;
    const diffKeys = diff && typeof diff === 'object' ? Object.keys(diff).slice(0, 5) : [];
    const diffValues = diff && typeof diff === 'object' && !Array.isArray(diff)
      ? Object.values(diff).slice(0, 2)
      : Array.isArray(diff) ? diff.slice(0, 2) : [];

    results.listApi = {
      status: res.status,
      total: data.data?.total,
      diffType,
      diffKeys,
      diffValues,
    };
  } catch (e) {
    results.listApi = { error: String(e) };
  }

  // 测试净值解析
  const navUrl = 'https://fund.eastmoney.com/pingzhongdata/161226.js';
  try {
    const res = await fetch(navUrl);
    const text = await res.text();
    const match = text.match(/var Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/);
    if (match) {
      const data = JSON.parse(match[1]) as Array<{ x: number; y: number }>;
      const latest = data[data.length - 1];
      const date = new Date(latest.x + 8 * 60 * 60 * 1000);
      results.navApi = {
        status: res.status,
        dataLength: data.length,
        latest: latest,
        parsedDate: date.toISOString().split('T')[0],
      };
    } else {
      results.navApi = { status: res.status, error: 'regex not matched', sample: text.substring(0, 300) };
    }
  } catch (e) {
    results.navApi = { error: String(e) };
  }

  // 测试历史价格解析
  const priceUrl = 'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=0.161226&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55&klt=101&fqt=0&end=20500101&lmt=5';
  try {
    const res = await fetch(priceUrl);
    const data = await res.json() as { data?: { klines?: string[] } };
    results.priceApi = {
      status: res.status,
      klines: data.data?.klines,
    };
  } catch (e) {
    results.priceApi = { error: String(e) };
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/**
 * GET /debug2 - 调试计算流程
 */
async function handleDebug2(headers: Record<string, string>): Promise<Response> {
  const results: Record<string, unknown> = {};

  try {
    // 1. 获取基金列表
    const funds = await fetchLOFList();
    results.step1_funds = {
      count: funds.length,
      sample: funds.slice(0, 3),
    };

    // 2. 获取单个基金净值
    const testCode = '161226';
    const nav = await fetchFundNav(testCode);
    results.step2_nav = {
      code: testCode,
      nav,
    };

    // 3. 获取历史价格
    const dataDate = nav?.navDate || '2025-12-16';
    const price = await fetchHistoricalPrice(testCode, dataDate);
    results.step3_price = {
      code: testCode,
      date: dataDate,
      price,
    };

    // 4. 测试多个基金的净值获取
    const testCodes = funds.slice(0, 5).map(f => f.code);
    const navResults: Record<string, unknown> = {};
    for (const code of testCodes) {
      try {
        navResults[code] = await fetchFundNav(code);
      } catch (e) {
        navResults[code] = { error: String(e) };
      }
    }
    results.step4_multiNav = navResults;

  } catch (e) {
    results.error = String(e);
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/**
 * 定时任务处理
 */
async function handleScheduled(env: Env): Promise<void> {
  console.log('Cron triggered: 开始计算溢价率...');

  try {
    const result = await calculate(50);
    await setCachedData(env, result);

    console.log(`计算完成: ${result.successCount} 只基金, ${result.premiumFundCount} 只溢价`);
  } catch (error) {
    console.error('计算失败:', error);
  }
}

/**
 * Workers 入口
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleFetch(request, env);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },
};
