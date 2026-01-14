/**
 * Test: Import REAL DataScheduler but DON'T call start()
 * This tests if just importing/instantiating the class causes the issue
 */

import { DataScheduler } from './scheduler'

const PORT = 3001

console.log('[Test] Creating DataScheduler...')
const scheduler = new DataScheduler({
  platformIntervals: {
    polymarket: 60000,
    predictfun: 60000,
    kalshi: 60000,
  },
})
console.log('[Test] DataScheduler created')

// DON'T call scheduler.start() - just test the server

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
        name: 'Test - Real DataScheduler (no start)',
        status: 'running',
      })
    }

    if (path === '/cache') {
      const cache = scheduler.getCache()
      return jsonResponse(cache)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  },
})

console.log(`[Test] Server running on port ${PORT}`)
console.log('[Test] scheduler.start() NOT called')
