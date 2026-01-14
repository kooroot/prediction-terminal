/**
 * Test server that ONLY calls Polymarket collector
 * If this fails -> issue is in Polymarket collector
 * If this works -> issue is in Predict.fun or Kalshi collector
 */

import { fetchPolymarketBinaryMarkets, fetchPolymarketDutchingEvents } from './collectors/polymarket'

const PORT = 3001

// Cache store
const cache = {
  binary: null as any,
  dutching: null as any,
}

// CORS headers
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

// Refresh Polymarket data
async function refreshPolymarket() {
  console.log('[Test] Fetching Polymarket binary markets...')
  try {
    const binary = await fetchPolymarketBinaryMarkets()
    console.log(`[Test] Got ${binary.length} binary markets`)

    // Log first item to check structure
    if (binary.length > 0) {
      console.log('[Test] First binary market:', JSON.stringify(binary[0]))
    }

    cache.binary = {
      data: binary,
      updatedAt: Date.now(),
    }
  } catch (error) {
    console.error('[Test] Binary markets error:', error)
  }

  console.log('[Test] Fetching Polymarket dutching events...')
  try {
    const dutching = await fetchPolymarketDutchingEvents()
    console.log(`[Test] Got ${dutching.length} dutching events`)

    // Log first item to check structure
    if (dutching.length > 0) {
      console.log('[Test] First dutching event:', JSON.stringify(dutching[0]))
    }

    cache.dutching = {
      data: dutching,
      updatedAt: Date.now(),
    }
  } catch (error) {
    console.error('[Test] Dutching events error:', error)
  }
}

// Start server
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
        name: 'Test Server - Polymarket Only',
        status: 'running',
        cache: {
          binary: cache.binary ? { count: cache.binary.data.length, updatedAt: cache.binary.updatedAt } : null,
          dutching: cache.dutching ? { count: cache.dutching.data.length, updatedAt: cache.dutching.updatedAt } : null,
        },
      })
    }

    if (path === '/binary') {
      return jsonResponse(cache.binary)
    }

    if (path === '/dutching') {
      return jsonResponse(cache.dutching)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  },
})

console.log(`[Test] Polymarket-only server starting on port ${PORT}`)

// Initial fetch
refreshPolymarket()

console.log('[Test] Server ready. Test with: curl http://localhost:3001/')
