# Top Volume Markets Feature Design

## Overview
Add a new feature to display top 20 markets by 24H volume for each platform, with a dashboard view and daily Telegram alerts.

## Requirements

### Data Display
- Per-platform Top 20 (Polymarket, Predict.fun, Kalshi)
- Combined Top 20 across all platforms
- Details: market name, 24H volume, liquidity, Yes/No prices, margin, expiry date, platform link

### Dashboard
- New `/top-volume` route
- Tabs: [All] [Polymarket] [Predict.fun] [Kalshi]
- Table with 20 rows per tab

### Telegram Alerts
- Twice daily: 09:00 and 21:00 KST
- Top 20 per platform with detailed info
- Platform emojis: 🔵 Polymarket, 🟣 Predict.fun, 🟢 Kalshi

## Technical Design

### 1. Type Changes
```typescript
// collector/src/types.ts
export interface MarketData {
  // existing fields...
  endDate?: string
  daysToExpiry?: number
}
```

### 2. API Endpoints
```
GET /api/top-volume/:platform  → Platform-specific Top 20
GET /api/top-volume/all        → Combined Top 20
```

### 3. File Changes

| File | Change |
|------|--------|
| `collector/src/types.ts` | Add `endDate`, `daysToExpiry` fields |
| `collector/src/collectors/polymarket.ts` | Collect endDate for binary markets |
| `collector/src/collectors/predictfun.ts` | Collect endDate for binary markets |
| `collector/src/collectors/kalshi.ts` | Collect endDate for binary markets |
| `collector/src/server.ts` | Add `/api/top-volume` endpoints |
| `collector/src/notifications/telegram.ts` | New - Telegram API calls |
| `collector/src/notifications/scheduler.ts` | New - Alert scheduler |
| `dashboard/src/routes/top-volume.tsx` | New - Top Volume page |
| `dashboard/src/lib/api.ts` | Add Top Volume API functions |
| `dashboard/src/routes/index.tsx` | Add navigation link |

### 4. Environment Variables
```env
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx
TELEGRAM_ALERT_HOURS=9,21
```

## Implementation Order
1. Type extension & Collector endDate collection
2. Top Volume API endpoints
3. Dashboard page
4. Telegram notification system
