# LOF 基金溢价率计算工具

基于 Cloudflare Workers 的 LOF 基金溢价率计算服务，包含公开查询页面、
JSON/文本接口、KV 缓存和分批刷新页面。数据来自东方财富公开接口。

结果用于研究和筛选，不构成投资建议。溢价率依赖净值日期、市场收盘价和
上游数据可用性；QDII 与商品类基金尤其可能存在净值时滞。

## 核心流程

1. 拉取 LOF 列表并按波动幅度筛选候选。
2. 获取每只基金的净值及对应日期的历史收盘价。
3. 用同一天的价格和净值计算溢价率，并按基金类型估算净值延迟。
4. 扣除代码中约定的申购/赎回与交易成本，生成净收益估算。
5. 将结果写入 `LOF_CACHE`，供首页和 `/data` 快速读取。

`/calculate` 在单次 Worker 请求内计算；`/batch/*` 把工作拆成多批并把进度
存入 KV，适合上游较慢或容易限流时使用。

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

`npm test` 当前执行 TypeScript 类型检查和 `wrangler deploy --dry-run`，不会
发布 Worker。

## HTTP 接口

| 路径 | 说明 |
| --- | --- |
| `/` | 查询页面 |
| `/api` | 机器可读的接口说明 |
| `/data` | 读取 KV 缓存；缓存缺失或过期时会同步重新计算 |
| `/calculate` | 实时计算并更新缓存 |
| `/health` | 仅确认 Worker 进程可响应，不验证上游或 KV |
| `/batch/start` | 初始化分批计算状态 |
| `/batch/next` | 处理下一批基金 |
| `/batch/progress` | 读取分批进度 |
| `/batch/reset` | 清空分批进度 |

`/data` 和 `/calculate` 支持：

- `top=<N>`：返回前 N 条，默认 20。
- `format=json|text`：响应格式，默认 `json`。

批量接口和仓库内的管理页面目前没有身份认证。复杂路径只是减少误触，不能
当作安全边界；公开部署前应通过 Cloudflare Access、独立鉴权或网络策略限制
管理入口。

## 缓存与定时任务

- 主结果使用 KV key `lof-premium-data`，TTL 为 24 小时。
- 分批进度、基金列表和中间结果使用独立 KV keys。
- Cron 触发器最终以 `wrangler.toml` 为准。

当前 checkout 的 `wrangler.toml` 是 `0 * * * *`，即每小时触发一次。入口代码
和旧文档仍有“UTC 7:30 / 北京时间 15:30”的历史描述，因此部署前必须确认
预期频率，并同时更新配置与文档。频率会直接影响上游请求量和限流风险。

## 部署

```bash
npx wrangler login
npx wrangler kv namespace create LOF_CACHE
npx wrangler kv namespace create LOF_CACHE --preview
```

把目标账户的 namespace ID 配置到 `wrangler.toml` 后：

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
├── fetcher.ts           # 东方财富请求、重试和进程内缓存
├── frontend.ts          # 查询页与管理页的内嵌 HTML
└── types.ts             # API、缓存和 Worker binding 类型
```

## License

MIT
