/**
 * Test server that ONLY calls Predict.fun collector
 * Requires PREDICT_FUN_API_KEY environment variable
 */

import { fetchPredictfunBinaryMarkets, fetchPredictfunDutchingEvents } from './collectors/predictfun'

const PORT = 3001
const API_KEY = process.env.PREDICT_FUN_API_KEY

if (!API_KEY) {
  console.error('[Test] ERROR: PREDICT_FUN_API_KEY not set')
  process.exit(1)
}

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

async function refreshPredictfun() {
  console.log('[Test] Fetching Predict.fun binary markets...')
  try {
    const binary = await fetchPredictfunBinaryMarkets(API_KEY!)
    console.log(`[Test] Got ${binary.length} binary markets`)
    if (binary.length > 0) {
      console.log('[Test] First binary market:', JSON.stringify(binary[0]))
    }
    cache.binary = { data: binary, updatedAt: Date.now() }
  } catch (error) {
    console.error('[Test] Binary markets error:', error)
  }

  console.log('[Test] Fetching Predict.fun dutching events...')
  try {
    const dutching = await fetchPredictfunDutchingEvents(API_KEY!)
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
        name: 'Test Server - Predict.fun Only',
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

console.log(`[Test] Predict.fun-only server starting on port ${PORT}`)
refreshPredictfun()
console.log('[Test] Server ready. Test with: curl http://localhost:3001/')
