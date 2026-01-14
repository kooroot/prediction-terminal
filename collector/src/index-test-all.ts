/**
 * Test server that runs ALL THREE collectors WITHOUT the scheduler class
 * This tests if the issue is in the scheduler or in combining all collectors
 */

import { fetchPolymarketBinaryMarkets, fetchPolymarketDutchingEvents } from './collectors/polymarket'
import { fetchPredictfunBinaryMarkets, fetchPredictfunDutchingEvents } from './collectors/predictfun'
import { fetchKalshiBinaryMarkets, fetchKalshiDutchingEvents } from './collectors/kalshi'

const PORT = 3001
const PREDICT_FUN_API_KEY = process.env.PREDICT_FUN_API_KEY
const KALSHI_KEY_ID = process.env.KALSHI_KEY_ID
const KALSHI_PRIVATE_KEY = process.env.KALSHI_PRIVATE_KEY

// Simple cache (not using the complex CacheStore type)
const cache: Record<string, any> = {
  polymarket: { binary: null, dutching: null },
  predictfun: { binary: null, dutching: null },
  kalshi: { binary: null, dutching: null },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonResponse(data: unknown, status = 200): Response {
  try {
    const body = JSON.stringify(data)
    return new Response(body, {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Server] JSON.stringify error:', error)
    return new Response(JSON.stringify({ error: 'Serialization failed', message: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

// Run collectors SEQUENTIALLY (not parallel) to avoid any race conditions
async function refreshAll() {
  console.log('[Test] Starting sequential refresh of all collectors...')

  // 1. Polymarket
  console.log('[Test] 1/3 Polymarket...')
  try {
    const binary = await fetchPolymarketBinaryMarkets()
    cache.polymarket.binary = { data: binary, updatedAt: Date.now() }
    console.log(`[Test] Polymarket binary: ${binary.length}`)
  } catch (e) {
    console.error('[Test] Polymarket binary error:', e)
  }

  try {
    const dutching = await fetchPolymarketDutchingEvents()
    cache.polymarket.dutching = { data: dutching, updatedAt: Date.now() }
    console.log(`[Test] Polymarket dutching: ${dutching.length}`)
  } catch (e) {
    console.error('[Test] Polymarket dutching error:', e)
  }

  // 2. Predict.fun
  console.log('[Test] 2/3 Predict.fun...')
  if (PREDICT_FUN_API_KEY) {
    try {
      const binary = await fetchPredictfunBinaryMarkets(PREDICT_FUN_API_KEY)
      cache.predictfun.binary = { data: binary, updatedAt: Date.now() }
      console.log(`[Test] Predict.fun binary: ${binary.length}`)
    } catch (e) {
      console.error('[Test] Predict.fun binary error:', e)
    }

    try {
      const dutching = await fetchPredictfunDutchingEvents(PREDICT_FUN_API_KEY)
      cache.predictfun.dutching = { data: dutching, updatedAt: Date.now() }
      console.log(`[Test] Predict.fun dutching: ${dutching.length}`)
    } catch (e) {
      console.error('[Test] Predict.fun dutching error:', e)
    }
  } else {
    console.log('[Test] Predict.fun skipped (no API key)')
  }

  // 3. Kalshi
  console.log('[Test] 3/3 Kalshi...')
  if (KALSHI_KEY_ID && KALSHI_PRIVATE_KEY) {
    const credentials = { keyId: KALSHI_KEY_ID, privateKey: KALSHI_PRIVATE_KEY }
    try {
      const binary = await fetchKalshiBinaryMarkets(credentials)
      cache.kalshi.binary = { data: binary, updatedAt: Date.now() }
      console.log(`[Test] Kalshi binary: ${binary.length}`)
    } catch (e) {
      console.error('[Test] Kalshi binary error:', e)
    }

    try {
      const dutching = await fetchKalshiDutchingEvents(credentials)
      cache.kalshi.dutching = { data: dutching, updatedAt: Date.now() }
      console.log(`[Test] Kalshi dutching: ${dutching.length}`)
    } catch (e) {
      console.error('[Test] Kalshi dutching error:', e)
    }
  } else {
    console.log('[Test] Kalshi skipped (no credentials)')
  }

  console.log('[Test] All collectors done!')
}

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (path === '/') {
      const status = {
        name: 'Test Server - All Collectors (No Scheduler)',
        status: 'running',
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
      }
      return jsonResponse(status)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  },
})

console.log(`[Test] All-collectors server (no scheduler) starting on port ${PORT}`)
refreshAll()
console.log('[Test] Server ready. Test with: curl http://localhost:3001/')
