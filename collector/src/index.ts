import { DataScheduler } from './scheduler'
import type { Platform, DataType } from './types'

// Configuration from environment variables
const PORT = Number(process.env.PORT) || 3001

// Per-platform refresh intervals (in milliseconds)
// Predict.fun has strict rate limits, so use longer interval
const POLYMARKET_INTERVAL = Number(process.env.POLYMARKET_INTERVAL) || 5000  // 5 seconds
const PREDICTFUN_INTERVAL = Number(process.env.PREDICTFUN_INTERVAL) || 60000 // 60 seconds (rate limit)
const KALSHI_INTERVAL = Number(process.env.KALSHI_INTERVAL) || 10000        // 10 seconds

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

// Start the scheduler
scheduler.start()

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// HTTP Server using Bun.serve
const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Health check
    if (path === '/health') {
      return Response.json({ status: 'ok', timestamp: Date.now() }, { headers: corsHeaders })
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
      return Response.json(status, { headers: corsHeaders })
    }

    // Cache data endpoint: /api/cache/:platform/:type
    const cacheMatch = path.match(/^\/api\/cache\/([^/]+)\/([^/]+)$/)
    if (cacheMatch) {
      const [, platform, type] = cacheMatch as [string, Platform, DataType]

      if (!['polymarket', 'predictfun', 'kalshi'].includes(platform)) {
        return Response.json({ error: 'Invalid platform' }, { status: 400, headers: corsHeaders })
      }

      if (!['binary', 'dutching'].includes(type)) {
        return Response.json({ error: 'Invalid type' }, { status: 400, headers: corsHeaders })
      }

      const cache = scheduler.getCache()
      const cachedData = cache[platform]?.[type]

      if (!cachedData) {
        return Response.json(
          { error: 'Data not yet available', platform, type },
          { status: 503, headers: corsHeaders }
        )
      }

      return Response.json(cachedData, { headers: corsHeaders })
    }

    // 404 for unknown routes
    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
  },
})

const intervals = scheduler.getIntervals()
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
║  Endpoints:                                                ║
║    GET /health                    - Health check           ║
║    GET /api/cache/status          - Cache status           ║
║    GET /api/cache/:platform/:type - Get cached data        ║
║                                                            ║
║  Platforms: polymarket, predictfun, kalshi                 ║
║  Types: binary, dutching                                   ║
╚════════════════════════════════════════════════════════════╝
`)

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...')
  scheduler.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n[Server] Shutting down...')
  scheduler.stop()
  process.exit(0)
})

export default server
