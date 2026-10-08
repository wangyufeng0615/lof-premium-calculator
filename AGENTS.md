# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Project Overview

LOF基金溢价率计算工具 - A Cloudflare Workers service for calculating premium rates of LOF (Listed Open-end Fund) funds in China. A cron trigger every 2 minutes during 14:00–16:00 Beijing time on weekdays advances a KV-backed batch calculation (one round per trading day) (Workers Free allows only 50 subrequests per invocation, so a full run cannot fit in one request).

## Development Commands

```bash
# Install dependencies
npm install

# Local development
npm run dev
# or
npx cf dev

# Type check
npx tsc --noEmit

# Deploy to Cloudflare
npm run deploy

# Type-check and build the deploy bundle without publishing
npm run test

# Exercise the scheduled handler in a local session
npx cf dev --test-scheduled
```

## Pre-deployment Setup

Migrated from Wrangler to cf on 2026-09-29. Worker config lives in `cloudflare.config.ts` (name, cron, KV, vars); `wrangler.config.ts` holds Wrangler-only build options (`minify`) because `cf dev` / `cf deploy` still delegate to the local wrangler (4.100+). `wrangler.toml` was removed, so bare `wrangler` commands no longer see the config. CI deploys with `bunx cf deploy`.

The KV namespace already exists. For a new account, create it and put the returned ID in `cloudflare.config.ts`:

```bash
npx wrangler kv namespace create LOF_CACHE
```

## Architecture

```
src/
├── index.ts        # Workers entry (fetch + scheduled handlers)
├── types.ts        # TypeScript type definitions
├── fetcher.ts      # NAV from EastMoney, LOF list and daily closes from Sina
└── calculator.ts   # Premium rate calculation logic
```

### Core Flow

1. **Data Fetching** (`fetcher.ts`):
   - `fetchLOFList()`: Paginated fetch of the LOF list with market prices from Sina (`Market_Center` node `lof_hq_fund`). EastMoney quote APIs (`push2`, `push2his`) reset connections from Cloudflare egress IPs (520/502 in Workers), so they were replaced in 2026-09
   - `fetchHistoricalPrice()` / `fetchHistoricalPrices()`: Sina daily K-line closes
   - `fetchFundNav()` / `fetchFundNavHistory()`: Recent unit NAVs from EastMoney `api.fund.eastmoney.com/f10/lsjz` (a few rows of JSON). The old `pingzhongdata/{code}.js` parse (~430KB per fund) blew the Workers Free 10ms CPU budget and cron runs ended with `exceededCpu`

2. **Calculation** (`calculator.ts`):
   - Premium rate = `(marketPrice - nav) / nav * 100%`
   - Fund type detection: QDII, Commodity, Normal (based on name keywords)
   - Net profit = premium rate - arbitrage cost (0.16% for premium, 0.51% for discount)

3. **Workers Entry** (`index.ts`):
   - `GET /` - API documentation
   - `GET /calculate` - Start a batch run (returns 202 with progress)
   - `GET /data` - Read from KV cache (recommended)
   - `GET /health` - Health check
   - `scheduled()` - Every 2 minutes (`cloudflare.config.ts`): `runScheduledBatch()` advances one batch, or starts a new run when the cached result is older than 6 hours

### Caching Strategy

- Results cached in Cloudflare KV with 24-hour TTL
- Batch runs refresh the cache roughly every 6 hours; a full run is ~33 batches of 10 funds
- `/data` endpoint reads from cache; on a miss it starts a batch run and returns 503 with progress
- KV is eventually consistent (~60s), so keep the cron interval at 2 minutes or more; batch results are deduplicated by fund code
- `calculate()` in `calculator.ts` is the old single-request path; it exceeds the free-plan subrequest limit and is no longer wired to any route
