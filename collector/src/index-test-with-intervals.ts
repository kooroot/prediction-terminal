/**
 * Test: refreshAll() + setInterval with LONG intervals
 * This tests if setInterval itself causes the issue
 */

import { DataScheduler } from './scheduler'

const PORT = 3001

const PREDICT_FUN_API_KEY = process.env.PREDICT_FUN_API_KEY
const KALSHI_KEY_ID = process.env.KALSHI_KEY_ID
const KALSHI_PRIVATE_KEY = process.env.KALSHI_PRIVATE_KEY

console.log('[Test] Creating DataScheduler...')
const scheduler = new DataScheduler({
  platformIntervals: {
    polymarket: 300000, // 5 minutes - won't fire during test
    predictfun: 300000,
    kalshi: 300000,
  },
  predictfunApiKey: PREDICT_FUN_API_KEY,
  kalshiCredentials: KALSHI_KEY_ID && KALSHI_PRIVATE_KEY ? {
    keyId: KALSHI_KEY_ID,
    privateKey: KALSHI_PRIVATE_KEY,
  } : undefined,
})

console.log('[Test] Calling start() with 5-minute intervals...')
scheduler.start()
console.log('[Test] start() called, intervals set up')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonResponse(data: unknown, status = 200): Response {
  const body = JSON.stringify(data)
  return new Response(body, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname

    if (path === '/') {
      return jsonResponse({
        name: 'Test - start() with long intervals',
        status: 'running',
      })
    }

    if (path === '/status') {
      const cache = scheduler.getCache()
      return jsonResponse({
        polymarket: {
          binary: cache.polymarket.binary?.data?.length ?? null,
          dutching: cache.polymarket.dutching?.data?.length ?? null,
        },
        predictfun: {
          binary: cache.predictfun.binary?.data?.length ?? null,
          dutching: cache.predictfun.dutching?.data?.length ?? null,
        },
        kalshi: {
          binary: cache.kalshi.binary?.data?.length ?? null,
          dutching: cache.kalshi.dutching?.data?.length ?? null,
        },
      })
    }

    return jsonResponse({ error: 'Not found' }, 404)
  },
})

console.log(`[Test] Server running on port ${PORT}`)
