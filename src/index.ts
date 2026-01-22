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
import { HTML_PAGE, ADMIN_PAGE } from './frontend';

// 管理页面路径（复杂URL起保护作用）
const ADMIN_PATH = '/lof-admin-x7k9m2p4';
import { getProgress, startBatchCalculation, processNextBatch, resetProgress } from './batch-calculator';

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

  if (path === ADMIN_PATH) {
    return handleAdmin(corsHeaders);
  }

  // 批量计算 API
  if (path === '/batch/start') {
    return handleBatchStart(env, corsHeaders);
  }

  if (path === '/batch/next') {
    return handleBatchNext(env, corsHeaders);
  }

  if (path === '/batch/progress') {
    return handleBatchProgress(env, corsHeaders);
  }

  if (path === '/batch/reset') {
    return handleBatchReset(env, corsHeaders);
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
 * GET /lof-admin-xxx - 管理页面
 */
function handleAdmin(headers: Record<string, string>): Response {
  return new Response(ADMIN_PAGE, {
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * POST /batch/start - 开始批量计算
 */
async function handleBatchStart(env: Env, headers: Record<string, string>): Promise<Response> {
  try {
    const progress = await startBatchCalculation(env);
    return new Response(JSON.stringify(progress), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * POST /batch/next - 处理下一批
 */
async function handleBatchNext(env: Env, headers: Record<string, string>): Promise<Response> {
  try {
    const progress = await processNextBatch(env);
    return new Response(JSON.stringify(progress), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * GET /batch/progress - 获取进度
 */
async function handleBatchProgress(env: Env, headers: Record<string, string>): Promise<Response> {
  const progress = await getProgress(env);
  return new Response(JSON.stringify(progress), {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/**
 * POST /batch/reset - 重置进度
 */
async function handleBatchReset(env: Env, headers: Record<string, string>): Promise<Response> {
  await resetProgress(env);
  return new Response(JSON.stringify({ status: 'reset' }), {
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
