/**
 * 基金类型
 */
export type FundType = 'normal' | 'qdii' | 'commodity';

/**
 * 基金基础数据
 */
export interface Fund {
  code: string;           // 基金代码
  name: string;           // 基金名称
  marketPrice: number;    // 场内交易价格
  changePercent: number;  // 涨跌幅
}

/**
 * 基金净值数据
 */
export interface FundNav {
  nav: number;            // 单位净值
  navDate: string;        // 净值日期 (YYYY-MM-DD)
}

/**
 * 单日溢价数据
 */
export interface DailyPremium {
  date: string;           // 日期 (YYYY-MM-DD)
  nav: number;            // 净值
  price: number;          // 收盘价
  premiumRate: number;    // 溢价率 (%)
}

/**
 * 基金完整数据（含溢价率）
 */
export interface FundWithPremium extends Fund {
  nav: number;            // 单位净值
  navDate: string;        // 净值日期
  fundType: FundType;     // 基金类型
  premiumRate: number;    // 溢价率 (%)
  navDelayDays: number;   // 净值延迟天数
  netProfit: number;      // 扣除套利成本后的净收益 (%)
  premiumHistory?: DailyPremium[]; // 历史溢价数据(仅前5%高溢价基金有)
}

/**
 * 计算结果
 */
export interface CalculationResult {
  executionTime: string;              // 计算时间
  successCount: number;               // 成功获取数据的基金数量
  failedCount: number;                // 失败数量
  premiumFundCount: number;           // 溢价基金数量
  mostCommonNavDate: string;          // 最常见的净值日期
  arbitrageCosts: {
    premium: number;                  // 溢价套利成本 (%)
    discount: number;                 // 折价套利成本 (%)
  };
  topPremiumFunds: FundWithPremium[]; // 溢价率最高的基金
  allFunds: FundWithPremium[];        // 所有基金数据
  _debug?: {                          // 调试信息
    totalFundsInMarket: number;       // 市场上所有基金
    processedFunds: number;           // 实际处理的基金数
    navFetched: number;               // 成功获取净值数量
    priceFetched: number;             // 成功获取价格数量
    dataDate: string;                 // 使用的数据日期
    historyFetched?: number;          // 获取历史数据的基金数
  };
}

/**
 * Workers KV 缓存数据
 */
export interface CachedData {
  result: CalculationResult;
  cachedAt: string;                   // 缓存时间
  expiresAt: string;                  // 过期时间
}

/**
 * 批量计算进度
 */
export interface BatchProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  totalFunds: number;                 // 基金总数
  processedFunds: number;             // 已处理数量
  currentBatch: number;               // 当前批次
  totalBatches: number;               // 总批次数
  successCount: number;               // 成功数量
  startedAt?: string;                 // 开始时间
  completedAt?: string;               // 完成时间
  error?: string;                     // 错误信息
}

/**
 * Cloudflare Workers 环境变量
 */
export interface Env {
  LOF_CACHE: KVNamespace;             // KV 存储
}
