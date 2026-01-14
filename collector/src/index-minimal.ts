// Minimal test server - no scheduler, no imports

const PORT = Number(process.env.PORT) || 3001

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
        name: 'Minimal Test Server',
        status: 'running',
      })
    }

    if (path === '/health') {
      return jsonResponse({ status: 'ok', timestamp: Date.now() })
    }

    return jsonResponse({ error: 'Not found' }, 404)
  },
})

console.log(`Minimal server running on http://localhost:${PORT}`)
