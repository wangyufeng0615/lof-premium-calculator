# LOF 基金溢价率计算工具

基于 Cloudflare Workers 的 LOF 基金溢价率计算服务，包含公开查询页面、
JSON/文本接口、KV 缓存和分批刷新页面。基金净值来自东方财富，LOF 列表和日 K
收盘价来自新浪（东方财富行情接口会拒绝 Cloudflare 出口 IP，2026-09 起切换）。

结果用于研究和筛选，不构成投资建议。溢价率依赖净值日期、市场收盘价和
上游数据可用性；QDII 与商品类基金尤其可能存在净值时滞。

## 核心流程

1. 拉取 LOF 列表并按波动幅度筛选候选。
2. 获取每只基金的净值及对应日期的历史收盘价。
3. 用同一天的价格和净值计算溢价率，并按基金类型估算净值延迟。
4. 扣除代码中约定的申购/赎回与交易成本，生成净收益估算。
5. 将结果写入 `LOF_CACHE`，供首页和 `/data` 快速读取。

Workers 免费版单次调用最多 50 个子请求，全量计算（约 330 只基金 × 净值 + 收盘价）
只能拆到多次调用里完成：计算全部走 `/batch/*` 的分批状态机，进度存 KV，
由定时任务每 2 分钟推进一批（每批 10 只）。`/calculate` 只负责开新一轮。

## 本地开发

```bash
npm install
npm run dev
# http://localhost:8787
```

提交前至少运行：

```bash
npm run check
npm test
```

`npm test` 当前执行 TypeScript 类型检查和 `cf build`（只构建，不会
发布 Worker）。

## HTTP 接口

| 路径 | 说明 |
| --- | --- |
| `/` | 查询页面 |
| `/api` | 机器可读的接口说明 |
| `/data` | 读取 KV 缓存；缓存缺失或过期时开一轮分批计算并返回 503 和进度 |
| `/calculate` | 开一轮分批计算（已有进行中的则返回进度），返回 202 |
| `/health` | 仅确认 Worker 进程可响应，不验证上游或 KV |
| `/batch/start` | 初始化分批计算状态 |
| `/batch/next` | 处理下一批基金 |
| `/batch/progress` | 读取分批进度 |
| `/batch/reset` | 清空分批进度 |

`/data` 支持：

- `top=<N>`：返回前 N 条，默认 20。
- `format=json|text`：响应格式，默认 `json`。

批量接口和仓库内的管理页面目前没有身份认证。复杂路径只是减少误触，不能
当作安全边界；公开部署前应通过 Cloudflare Access、独立鉴权或网络策略限制
管理入口。

## 缓存与定时任务

- 主结果使用 KV key `lof-premium-data`，TTL 为 24 小时。
- 分批进度、基金列表和中间结果使用独立 KV keys。
- Cron 触发器以 `cloudflare.config.ts` 为准，当前是 `*/2 * * * *`。
- 每次触发：有进行中的分批计算就推进一批；否则在结果缓存超过 6 小时
  （`REFRESH_INTERVAL_HOURS`）时开新一轮。一轮约 33 批、1 小时左右跑完。
- KV 最终一致，刚写入的进度最长约 60 秒后才能读到；分批结果按基金代码去重，
  重复处理同一批不会产生重复数据。触发间隔不要缩到 1 分钟以内。

## 部署

2026-09-29 已从 wrangler 迁移到 Cloudflare 的 `cf` 命令行：配置在 `cloudflare.config.ts`，
`wrangler.config.ts` 只保留 `minify` 这类构建选项（`cf dev` / `cf deploy` 底层仍调用本地
wrangler），旧的 `wrangler.toml` 已删除。

KV namespace 已存在。换新账户时：

```bash
cf auth login
npx wrangler kv namespace create LOF_CACHE
```

把返回的 namespace ID 写进 `cloudflare.config.ts` 后：

```bash
npm run deploy
```

`npm run deploy` 会写入 Cloudflare；只在明确要发布时执行。GitHub Actions 也会
在 `main` push 时使用仓库 secrets 自动部署。部署前应确认 KV binding、Cron
频率、Cloudflare 账户和上游接口策略。

## 代码结构

```text
src/
├── index.ts             # Worker 路由、缓存与 scheduled 入口
├── calculator.ts        # 单次计算流程和报告格式化
├── batch-calculator.ts  # KV 驱动的分批计算状态机
├── fetcher.ts           # 东方财富净值、新浪列表/K 线请求，重试和进程内缓存
├── frontend.ts          # 查询页与管理页的内嵌 HTML
└── types.ts             # API、缓存和 Worker binding 类型
```

## License

MIT
