# LOF基金溢价率计算工具

基于 Cloudflare Workers 的 LOF 基金溢价率计算服务，内置前端页面。

## 功能

- 计算所有 LOF 基金的实时溢价率
- 区分基金类型（普通LOF、QDII、商品类）及净值延迟
- 计算扣除套利成本后的净收益
- 内置简洁前端页面
- KV 缓存 + Cron 定时任务，每天 15:30 自动更新

## 本地开发

```bash
npm install
npm run dev
# 访问 http://localhost:8787
```

## 部署

```bash
# 登录 Cloudflare
npx wrangler login

# 创建 KV 存储
npx wrangler kv namespace create LOF_CACHE
npx wrangler kv namespace create LOF_CACHE --preview

# 将返回的 ID 填入 wrangler.toml，然后部署
npm run deploy
```

## 端点

| 路径 | 说明 |
|------|------|
| `/` | 前端页面 |
| `/api` | API 说明 |
| `/data` | 从缓存获取数据 |
| `/calculate` | 实时计算（更新缓存） |
| `/health` | 健康检查 |

## License

MIT
