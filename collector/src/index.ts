import { DataScheduler } from './scheduler'
import { NotificationScheduler, parseAlertHours } from './notifications/scheduler'
import type { Platform, DataType } from './types'

// Configuration from environment variables
const PORT = Number(process.env.PORT) || 3001
const TELEGRAM_ALERT_HOURS = parseAlertHours(process.env.TELEGRAM_ALERT_HOURS)

// Per-platform refresh intervals (in milliseconds)
// runningFlags prevent overlapping refreshes, so intervals can be shorter
const POLYMARKET_INTERVAL = Number(process.env.POLYMARKET_INTERVAL) || 15000  // 15 seconds (no rate limit)
const PREDICTFUN_INTERVAL = Number(process.env.PREDICTFUN_INTERVAL) || 60000  // 60 seconds (strict rate limit)
const KALSHI_INTERVAL = Number(process.env.KALSHI_INTERVAL) || 20000          // 20 seconds (authenticated)

const PREDICT_FUN_API_KEY = process.env.PREDICT_FUN_API_KEY
const KALSHI_KEY_ID = process.env.KALSHI_KEY_ID
const KALSHI_PRIVATE_KEY = process.env.KALSHI_PRIVATE_KEY

// Initialize scheduler with per-platform intervals
const scheduler = new DataScheduler({
  platformIntervals: {
    polymarket: POLYMARKET_INTERVAL,
    predictfun: PREDICTFUN_INTERVAL,
    kalshi: KALSHI_INTERVAL,
  },
  predictfunApiKey: PREDICT_FUN_API_KEY,
  kalshiCredentials: KALSHI_KEY_ID && KALSHI_PRIVATE_KEY ? {
    keyId: KALSHI_KEY_ID,
    privateKey: KALSHI_PRIVATE_KEY,
  } : undefined,
})

// Start the data scheduler
scheduler.start()

// Initialize and start notification scheduler
const notificationScheduler = new NotificationScheduler({
  alertHours: TELEGRAM_ALERT_HOURS,
  getCache: () => scheduler.getCache(),
})
notificationScheduler.start()

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Safe JSON response helper (avoids Response.json which may cause stack overflow in Bun)
function jsonResponse(data: unknown, status = 200): Response {
  try {
    const body = JSON.stringify(data)
    return new Response(body, {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('[Server] JSON serialization error:', error)
    return new Response(JSON.stringify({ error: 'Failed to serialize response' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }
}

// HTTP Server using Bun.serve
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    try {
      const url = new URL(req.url)
      const path = url.pathname

      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders })
      }

      // Root path - show API info
      if (path === '/') {
        return jsonResponse({
          name: 'Prediction Market Data Collector',
          status: 'running',
          endpoints: {
            health: 'GET /health',
            status: 'GET /api/cache/status',
            data: 'GET /api/cache/:platform/:type',
            topVolumeAll: 'GET /api/top-volume/all',
            topVolumePlatform: 'GET /api/top-volume/:platform',
            notifyTest: 'GET /api/notify/test',
          },
          platforms: ['polymarket', 'predictfun', 'kalshi'],
          types: ['binary', 'dutching'],
        })
      }

      // Health check
      if (path === '/health') {
        return jsonResponse({ status: 'ok', timestamp: Date.now() })
      }

      // Cache status endpoint
      if (path === '/api/cache/status') {
        const cache = scheduler.getCache()
        const status = {
          polymarket: {
            binary: cache.polymarket.binary ? { updatedAt: cache.polymarket.binary.updatedAt, count: cache.polymarket.binary.data.length } : null,
            dutching: cache.polymarket.dutching ? { updatedAt: cache.polymarket.dutching.updatedAt, count: cache.polymarket.dutching.data.length } : null,
          },
          predictfun: {
            binary: cache.predictfun.binary ? { updatedAt: cache.predictfun.binary.updatedAt, count: cache.predictfun.binary.data.length } : null,
            dutching: cache.predictfun.dutching ? { updatedAt: cache.predictfun.dutching.updatedAt, count: cache.predictfun.dutching.data.length } : null,
          },
          kalshi: {
            binary: cache.kalshi.binary ? { updatedAt: cache.kalshi.binary.updatedAt, count: cache.kalshi.binary.data.length } : null,
            dutching: cache.kalshi.dutching ? { updatedAt: cache.kalshi.dutching.updatedAt, count: cache.kalshi.dutching.data.length } : null,
          },
        }
        return jsonResponse(status)
      }

      // Cache data endpoint: /api/cache/:platform/:type
      const cacheMatch = path.match(/^\/api\/cache\/([^/]+)\/([^/]+)$/)
      if (cacheMatch) {
        const [, platform, type] = cacheMatch as [string, Platform, DataType]

        if (!['polymarket', 'predictfun', 'kalshi'].includes(platform)) {
          return jsonResponse({ error: 'Invalid platform' }, 400)
        }

        if (!['binary', 'dutching'].includes(type)) {
          return jsonResponse({ error: 'Invalid type' }, 400)
        }

        const cache = scheduler.getCache()
        const cachedData = cache[platform]?.[type]

        if (!cachedData) {
          return jsonResponse({ error: 'Data not yet available', platform, type }, 503)
        }

        return jsonResponse(cachedData)
      }

      // Manual trigger for Telegram notification (for testing)
      if (path === '/api/notify/test') {
        const success = await notificationScheduler.sendNow()
        return jsonResponse({
          success,
          message: success ? 'Notification sent' : 'Failed to send notification (check Telegram config)',
        })
      }

      // Top Volume endpoint: /api/top-volume/all (combined across all platforms)
      if (path === '/api/top-volume/all') {
        const cache = scheduler.getCache()
        // Use topVolume cache which includes all markets (binary + multi-outcome)
        const allMarkets = [
          ...(cache.polymarket.topVolume?.data ?? []),
          ...(cache.predictfun.topVolume?.data ?? []),
          ...(cache.kalshi.topVolume?.data ?? []),
        ]

        const sortedByVolume = allMarkets
          .filter((m) => (m.volume24h ?? 0) > 0)
          .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
          .slice(0, 20)

        return jsonResponse({
          data: sortedByVolume,
          updatedAt: Date.now(),
          type: 'top-volume',
          scope: 'all',
        })
      }

      // Top Volume endpoint: /api/top-volume/:platform
      const topVolumeMatch = path.match(/^\/api\/top-volume\/([^/]+)$/)
      if (topVolumeMatch) {
        const [, platform] = topVolumeMatch as [string, Platform]

        if (!['polymarket', 'predictfun', 'kalshi'].includes(platform)) {
          return jsonResponse({ error: 'Invalid platform' }, 400)
        }

        const cache = scheduler.getCache()
        // Use topVolume cache which includes all markets (binary + multi-outcome)
        const platformCache = cache[platform]?.topVolume

        if (!platformCache) {
          return jsonResponse({ error: 'Data not yet available', platform }, 503)
        }

        const sortedByVolume = platformCache.data
          .filter((m) => (m.volume24h ?? 0) > 0)
          .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
          .slice(0, 20)

        return jsonResponse({
          data: sortedByVolume,
          updatedAt: platformCache.updatedAt,
          type: 'top-volume',
          platform,
        })
      }

      // 404 for unknown routes
      return jsonResponse({ error: 'Not found' }, 404)
    } catch (error) {
      console.error('[Server] Request error:', error)
      return jsonResponse({ error: 'Internal server error', message: String(error) }, 500)
    }
  },
})

const intervals = scheduler.getIntervals()
const telegramEnabled = process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
console.log(`
╔════════════════════════════════════════════════════════════╗
║           Prediction Market Data Collector                  ║
╠════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}                    ║
║                                                            ║
║  Per-platform refresh intervals:                           ║
║    Polymarket:  ${String(intervals.polymarket).padEnd(6)}ms                            ║
║    Predict.fun: ${String(intervals.predictfun).padEnd(6)}ms (rate limit protection)   ║
║    Kalshi:      ${String(intervals.kalshi).padEnd(6)}ms                            ║
║                                                            ║
║  Telegram Alerts: ${telegramEnabled ? `Enabled (${TELEGRAM_ALERT_HOURS.join(', ')}h KST)`.padEnd(27) : 'Disabled (set TELEGRAM_BOT_TOKEN)'}║
║                                                            ║
║  Endpoints:                                                ║
║    GET /                          - API info               ║
║    GET /health                    - Health check           ║
║    GET /api/cache/status          - Cache status           ║
║    GET /api/cache/:platform/:type - Get cached data        ║
║    GET /api/top-volume/all        - Top 20 all platforms   ║
║    GET /api/top-volume/:platform  - Top 20 by platform     ║
║    GET /api/notify/test           - Test Telegram alert    ║
║                                                            ║
║  Platforms: polymarket, predictfun, kalshi                 ║
║  Types: binary, dutching                                   ║
╚════════════════════════════════════════════════════════════╝
`)

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...')
  scheduler.stop()
  notificationScheduler.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n[Server] Shutting down...')
  scheduler.stop()
  notificationScheduler.stop()
  process.exit(0)
})

// Note: Don't export default server - it causes stack overflow in Bun
