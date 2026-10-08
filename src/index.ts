/**
 * LOF基金溢价率计算工具 - Cloudflare Workers
 *
 * 功能:
 * - GET /           API 说明
 * - GET /calculate  触发一轮分批计算（完成后更新缓存）
 * - GET /data       从缓存获取数据
 * - GET /health     健康检查
 *
 * 定时任务:
 * - 交易日北京时间 14:00–16:00 每 2 分钟一次（见 cloudflare.config.ts），推进分批计算；
 *   缓存超过 6 小时开新一轮，所以每个交易日只算一轮。Workers 免费版单次调用最多 50 个子请求，全量计算只能分批完成。
 */

import type { Env, CachedData } from './types';
import { formatReport } from './calculator';
import { HTML_PAGE, ADMIN_PAGE } from './frontend';

// 复杂路径只减少误触，不提供身份认证；公开部署时必须由外层访问控制保护。
const ADMIN_PATH = '/lof-admin-x7k9m2p4';
import { getProgress, startBatchCalculation, processNextBatch, resetProgress, runScheduledBatch } from './batch-calculator';

const CACHE_KEY = 'lof-premium-data';

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
    return handleCalculate(env, corsHeaders);
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
      '/calculate': '触发一轮分批计算（完成后更新缓存）',
      '/health': '健康检查',
    },
    params: {
      top: '返回前N只基金 (默认20)',
      format: '返回格式 json/text (默认json)',
    },
    cron: '交易日北京时间 14:00–16:00 每 2 分钟推进一批，每天自动算一轮',
  };

  return new Response(JSON.stringify(info, null, 2), {
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * GET /calculate - 触发一轮分批计算
 *
 * Workers 免费版单次调用最多 50 个子请求，无法在一次请求里算完；
 * 这里只开新一轮（已有进行中的则直接返回进度），由定时任务逐批推进。
 */
async function handleCalculate(
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  try {
    let progress = await getProgress(env);
    if (progress.status !== 'running') {
      progress = await startBatchCalculation(env);
    }
    return new Response(JSON.stringify({
      message: `已开始分批计算，共 ${progress.totalBatches} 批，定时任务每 2 分钟推进一批，完成后 /data 自动更新`,
      progress,
    }, null, 2), {
      status: 202,
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

  // 无缓存时触发分批计算，数据由定时任务逐批算出
  if (!cached) {
    let progress = await getProgress(env);
    if (progress.status !== 'running') {
      try {
        progress = await startBatchCalculation(env);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: `缓存为空且无法开始计算: ${message}` }), {
          status: 503,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }
    }
    return new Response(JSON.stringify({
      error: `数据计算中（${progress.currentBatch}/${progress.totalBatches} 批），请稍后刷新`,
      progress,
    }), {
      status: 503,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
    });
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
 * 定时任务处理：推进分批计算
 */
async function handleScheduled(env: Env): Promise<void> {
  try {
    const progress = await runScheduledBatch(env);
    console.log(`分批计算: ${progress.status} ${progress.currentBatch}/${progress.totalBatches}, 成功 ${progress.successCount}`);
  } catch (error) {
    console.error('分批计算失败:', error);
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
