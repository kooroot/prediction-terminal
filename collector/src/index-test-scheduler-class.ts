/**
 * Test server using a COPY of DataScheduler class logic with mock data
 * This tests if the scheduler pattern itself causes the stack overflow
 */

import type { CacheStore, MarketData, DutchingEvent } from './types'

const PORT = 3001

// Mock data
const mockBinary: MarketData[] = [
  { id: '1', title: 'Test Market', askYes: 0.5, askNo: 0.5, bidYes: 0.49, bidNo: 0.49, sumAsks: 1, margin: 0, liquidity: 1000 }
]
const mockDutching: DutchingEvent[] = [
  { id: '1', title: 'Test Event', outcomeCount: 3, outcomes: [], sumYesAsks: 0.9, sumNoAsks: 1.8, yesMargin: 0.1, noMargin: 0.2, totalLiquidity: 5000, minYesDepth: 100, minNoDepth: 100 }
]

// Copy of DataScheduler class with mock data
class MockDataScheduler {
  private cache: CacheStore
  private intervalIds: {
    polymarket: ReturnType<typeof setInterval> | null
    predictfun: ReturnType<typeof setInterval> | null
    kalshi: ReturnType<typeof setInterval> | null
  } = { polymarket: null, predictfun: null, kalshi: null }

  constructor() {
    this.cache = {
      polymarket: { binary: null, dutching: null },
      predictfun: { binary: null, dutching: null },
      kalshi: { binary: null, dutching: null },
    }
  }

  getCache(): CacheStore {
    return this.cache
  }

  async refreshPolymarket(): Promise<void> {
    console.log('[MockScheduler] Refreshing Polymarket...')
    this.cache.polymarket.binary = {
      data: mockBinary,
      updatedAt: Date.now(),
      platform: 'polymarket',
      type: 'binary',
    }
    this.cache.polymarket.dutching = {
      data: mockDutching,
      updatedAt: Date.now(),
      platform: 'polymarket',
      type: 'dutching',
    }
  }

  async refreshPredictfun(): Promise<void> {
    console.log('[MockScheduler] Refreshing Predict.fun...')
    this.cache.predictfun.binary = {
      data: mockBinary,
      updatedAt: Date.now(),
      platform: 'predictfun',
      type: 'binary',
    }
    this.cache.predictfun.dutching = {
      data: mockDutching,
      updatedAt: Date.now(),
      platform: 'predictfun',
      type: 'dutching',
    }
  }

  async refreshKalshi(): Promise<void> {
    console.log('[MockScheduler] Refreshing Kalshi...')
    this.cache.kalshi.binary = {
      data: mockBinary,
      updatedAt: Date.now(),
      platform: 'kalshi',
      type: 'binary',
    }
    this.cache.kalshi.dutching = {
      data: mockDutching,
      updatedAt: Date.now(),
      platform: 'kalshi',
      type: 'dutching',
    }
  }

  async refreshAll(): Promise<void> {
    await Promise.all([
      this.refreshPolymarket(),
      this.refreshPredictfun(),
      this.refreshKalshi(),
    ])
  }

  start(): void {
    console.log('[MockScheduler] Starting...')
    this.refreshAll()

    this.intervalIds.polymarket = setInterval(() => {
      this.refreshPolymarket()
    }, 60000)

    this.intervalIds.predictfun = setInterval(() => {
      this.refreshPredictfun()
    }, 60000)

    this.intervalIds.kalshi = setInterval(() => {
      this.refreshKalshi()
    }, 60000)
  }

  stop(): void {
    for (const [platform, intervalId] of Object.entries(this.intervalIds)) {
      if (intervalId) {
        clearInterval(intervalId)
        this.intervalIds[platform as keyof typeof this.intervalIds] = null
      }
    }
  }
}

const scheduler = new MockDataScheduler()

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
    console.error('[Test] JSON.stringify FAILED:', error)
    return new Response(JSON.stringify({ error: 'Serialization failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

scheduler.start()

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
        name: 'Test Server - MockDataScheduler Class',
        status: 'running',
      })
    }

    if (path === '/cache') {
      const cache = scheduler.getCache()
      return jsonResponse(cache)
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

console.log(`[Test] MockDataScheduler server on port ${PORT}`)
console.log('[Test] Endpoints: /, /cache, /status')
