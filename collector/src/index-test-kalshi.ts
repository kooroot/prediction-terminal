/**
 * Test server that ONLY calls Kalshi collector
 * Requires KALSHI_KEY_ID and KALSHI_PRIVATE_KEY environment variables
 */

import { fetchKalshiBinaryMarkets, fetchKalshiDutchingEvents } from './collectors/kalshi'

const PORT = 3001
const KALSHI_KEY_ID = process.env.KALSHI_KEY_ID
const KALSHI_PRIVATE_KEY = process.env.KALSHI_PRIVATE_KEY

if (!KALSHI_KEY_ID || !KALSHI_PRIVATE_KEY) {
  console.error('[Test] ERROR: KALSHI_KEY_ID or KALSHI_PRIVATE_KEY not set')
  process.exit(1)
}

const credentials = { keyId: KALSHI_KEY_ID, privateKey: KALSHI_PRIVATE_KEY }

const cache = {
  binary: null as any,
  dutching: null as any,
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
    return new Response(JSON.stringify({ error: 'Serialization failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

async function refreshKalshi() {
  console.log('[Test] Fetching Kalshi binary markets...')
  try {
    const binary = await fetchKalshiBinaryMarkets(credentials)
    console.log(`[Test] Got ${binary.length} binary markets`)
    if (binary.length > 0) {
      console.log('[Test] First binary market:', JSON.stringify(binary[0]))
    }
    cache.binary = { data: binary, updatedAt: Date.now() }
  } catch (error) {
    console.error('[Test] Binary markets error:', error)
  }

  console.log('[Test] Fetching Kalshi dutching events...')
  try {
    const dutching = await fetchKalshiDutchingEvents(credentials)
    console.log(`[Test] Got ${dutching.length} dutching events`)
    if (dutching.length > 0) {
      console.log('[Test] First dutching event:', JSON.stringify(dutching[0]))
    }
    cache.dutching = { data: dutching, updatedAt: Date.now() }
  } catch (error) {
    console.error('[Test] Dutching events error:', error)
  }
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
      return jsonResponse({
        name: 'Test Server - Kalshi Only',
        status: 'running',
        cache: {
          binary: cache.binary ? { count: cache.binary.data.length, updatedAt: cache.binary.updatedAt } : null,
          dutching: cache.dutching ? { count: cache.dutching.data.length, updatedAt: cache.dutching.updatedAt } : null,
        },
      })
    }

    return jsonResponse({ error: 'Not found' }, 404)
  },
})

console.log(`[Test] Kalshi-only server starting on port ${PORT}`)
refreshKalshi()
console.log('[Test] Server ready. Test with: curl http://localhost:3001/')
