# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LOF基金溢价率计算工具 - A Cloudflare Workers service for calculating premium rates of LOF (Listed Open-end Fund) funds in China. Features automatic daily caching via Cron Triggers and KV storage.

## Development Commands

```bash
# Install dependencies
npm install

# Local development
npm run dev
# or
npx wrangler dev

# Type check
npx tsc --noEmit

# Deploy to Cloudflare
npm run deploy

# Test scheduled (cron) handler
npm run test
# or
npx wrangler dev --test-scheduled
```

## Pre-deployment Setup

Before deploying, create KV namespace and update `wrangler.toml`:

```bash
# Create KV namespace
npx wrangler kv namespace create LOF_CACHE
npx wrangler kv namespace create LOF_CACHE --preview

# Update wrangler.toml with the returned IDs
```

## Architecture

```
src/
├── index.ts        # Workers entry (fetch + scheduled handlers)
├── types.ts        # TypeScript type definitions
├── fetcher.ts      # EastMoney API data fetching
└── calculator.ts   # Premium rate calculation logic
```

### Core Flow

1. **Data Fetching** (`fetcher.ts`):
   - `fetchLOFList()`: Paginated fetch from EastMoney API for LOF fund list with market prices
   - `fetchFundNav()`: Parse JS file from `fund.eastmoney.com/pingzhongdata/{code}.js` to extract NAV data

2. **Calculation** (`calculator.ts`):
   - Premium rate = `(marketPrice - nav) / nav * 100%`
   - Fund type detection: QDII, Commodity, Normal (based on name keywords)
   - Net profit = premium rate - arbitrage cost (0.16% for premium, 0.51% for discount)

3. **Workers Entry** (`index.ts`):
   - `GET /` - API documentation
   - `GET /calculate` - Real-time calculation (updates cache)
   - `GET /data` - Read from KV cache (recommended)
   - `GET /health` - Health check
   - `scheduled()` - Cron trigger handler (daily at UTC 7:30 / Beijing 15:30)

### Caching Strategy

- Results cached in Cloudflare KV with 24-hour TTL
- Cron Trigger updates cache daily after market close
- `/data` endpoint reads from cache (fast)
- `/calculate` endpoint computes fresh data and updates cache
