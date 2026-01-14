/**
 * Test server using the ACTUAL DataScheduler class but with mocked collectors
 * This tests if the DataScheduler class itself causes the stack overflow
 */

// Mock the collector modules BEFORE importing scheduler
const mockBinary = [{ id: '1', title: 'Test', askYes: 0.5, askNo: 0.5, bidYes: 0.49, bidNo: 0.49, sumAsks: 1, margin: 0, liquidity: 1000 }]
const mockDutching = [{ id: '1', title: 'Test Event', outcomeCount: 3, outcomes: [], sumYesAsks: 0.9, sumNoAsks: 1.8, yesMargin: 0.1, noMargin: 0.2, totalLiquidity: 5000, minYesDepth: 100, minNoDepth: 100 }]

// Override the collector functions
import * as polymarket from './collectors/polymarket'
import * as predictfun from './collectors/predictfun'
import * as kalshi from './collectors/kalshi'

// @ts-ignore - mocking
polymarket.fetchPolymarketBinaryMarkets = async () => mockBinary
// @ts-ignore - mocking
polymarket.fetchPolymarketDutchingEvents = async () => mockDutching
// @ts-ignore - mocking
predictfun.fetchPredictfunBinaryMarkets = async () => mockBinary
// @ts-ignore - mocking
predictfun.fetchPredictfunDutchingEvents = async () => mockDutching
// @ts-ignore - mocking
kalshi.fetchKalshiBinaryMarkets = async () => mockBinary
// @ts-ignore - mocking
kalshi.fetchKalshiDutchingEvents = async () => mockDutching

import { DataScheduler } from './scheduler'

const PORT = 3001

// Create the REAL DataScheduler with mocked collectors
const scheduler = new DataScheduler({
  platformIntervals: {
    polymarket: 60000, // slow down for testing
    predictfun: 60000,
    kalshi: 60000,
  },
  predictfunApiKey: 'mock-key',
  kalshiCredentials: { keyId: 'mock', privateKey: 'mock' },
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonResponse(data: unknown, status = 200): Response {
  try {
    console.log('[Test] Attempting JSON.stringify...')
    const body = JSON.stringify(data)
    console.log('[Test] JSON.stringify succeeded, length:', body.length)
    return new Response(body, {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Test] JSON.stringify FAILED:', error)
    return new Response(JSON.stringify({ error: 'Serialization failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

// Start scheduler
console.log('[Test] Starting scheduler...')
scheduler.start()
console.log('[Test] Scheduler started')

// Wait a bit for initial refresh to complete
setTimeout(() => {
  console.log('[Test] Checking cache after startup...')
  try {
    const cache = scheduler.getCache()
    console.log('[Test] Got cache, trying to stringify...')
    const str = JSON.stringify(cache)
    console.log('[Test] Cache stringified OK, length:', str.length)
  } catch (error) {
    console.error('[Test] Cache stringify FAILED:', error)
  }
}, 2000)

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (path === '/') {
      return jsonResponse({
        name: 'Test Server - DataScheduler Class with Mocks',
        status: 'running',
      })
    }

    if (path === '/cache') {
      console.log('[Test] /cache endpoint hit')
      const cache = scheduler.getCache()
      return jsonResponse(cache)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  },
})

console.log(`[Test] Server running on port ${PORT}`)
console.log('[Test] Test endpoints:')
console.log('  curl http://localhost:3001/')
console.log('  curl http://localhost:3001/cache')
