// Test with scheduler but no actual data fetching

const PORT = Number(process.env.PORT) || 3001

// Mock cache store
const cache = {
  polymarket: { binary: null as any, dutching: null as any },
  predictfun: { binary: null as any, dutching: null as any },
  kalshi: { binary: null as any, dutching: null as any },
}

// Simulate scheduler start
console.log('[Scheduler] Starting...')
cache.polymarket.binary = {
  data: [{ id: '1', title: 'Test Market', margin: 0.05 }],
  updatedAt: Date.now(),
  platform: 'polymarket',
  type: 'binary',
}
console.log('[Scheduler] Mock data loaded')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonResponse(data: unknown, status = 200): Response {
  const body = JSON.stringify(data)
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
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
        name: 'Test Server with Mock Scheduler',
        status: 'running',
      })
    }

    if (path === '/health') {
      return jsonResponse({ status: 'ok', timestamp: Date.now() })
    }

    if (path === '/api/cache/status') {
      const status = {
        polymarket: {
          binary: cache.polymarket.binary ? { updatedAt: cache.polymarket.binary.updatedAt, count: cache.polymarket.binary.data.length } : null,
          dutching: cache.polymarket.dutching ? { updatedAt: cache.polymarket.dutching?.updatedAt, count: cache.polymarket.dutching?.data.length } : null,
        },
      }
      return jsonResponse(status)
    }

    // Test cache data endpoint
    if (path === '/api/cache/polymarket/binary') {
      if (!cache.polymarket.binary) {
        return jsonResponse({ error: 'Data not yet available' }, 503)
      }
      return jsonResponse(cache.polymarket.binary)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  },
})

console.log(`Test server with mock scheduler running on http://localhost:${PORT}`)
