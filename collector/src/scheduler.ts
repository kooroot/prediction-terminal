import type { CacheStore, MarketData, DutchingEvent } from './types'
import { fetchPolymarketBinaryMarkets, fetchPolymarketDutchingEvents } from './collectors/polymarket'
import { fetchPredictfunBinaryMarkets, fetchPredictfunDutchingEvents } from './collectors/predictfun'
import { fetchKalshiBinaryMarkets, fetchKalshiDutchingEvents } from './collectors/kalshi'
import type { KalshiCredentials } from './auth/kalshi'

export interface SchedulerConfig {
  refreshInterval: number // in milliseconds
  predictfunApiKey?: string
  kalshiCredentials?: KalshiCredentials
}

export class DataScheduler {
  private cache: CacheStore
  private config: SchedulerConfig
  private intervalId: ReturnType<typeof setInterval> | null = null
  private isRunning = false

  constructor(config: SchedulerConfig) {
    this.config = config
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
    console.log('[Scheduler] Refreshing Polymarket data...')
    try {
      const [binary, dutching] = await Promise.all([
        fetchPolymarketBinaryMarkets(),
        fetchPolymarketDutchingEvents(),
      ])

      this.cache.polymarket.binary = {
        data: binary,
        updatedAt: Date.now(),
        platform: 'polymarket',
        type: 'binary',
      }
      this.cache.polymarket.dutching = {
        data: dutching,
        updatedAt: Date.now(),
        platform: 'polymarket',
        type: 'dutching',
      }
      console.log(`[Scheduler] Polymarket: ${binary.length} binary, ${dutching.length} dutching`)
    } catch (error) {
      console.error('[Scheduler] Failed to refresh Polymarket:', error)
    }
  }

  async refreshPredictfun(): Promise<void> {
    if (!this.config.predictfunApiKey) {
      console.log('[Scheduler] Skipping Predict.fun (no API key)')
      return
    }

    console.log('[Scheduler] Refreshing Predict.fun data...')
    try {
      const [binary, dutching] = await Promise.all([
        fetchPredictfunBinaryMarkets(this.config.predictfunApiKey),
        fetchPredictfunDutchingEvents(this.config.predictfunApiKey),
      ])

      this.cache.predictfun.binary = {
        data: binary,
        updatedAt: Date.now(),
        platform: 'predictfun',
        type: 'binary',
      }
      this.cache.predictfun.dutching = {
        data: dutching,
        updatedAt: Date.now(),
        platform: 'predictfun',
        type: 'dutching',
      }
      console.log(`[Scheduler] Predict.fun: ${binary.length} binary, ${dutching.length} dutching`)
    } catch (error) {
      console.error('[Scheduler] Failed to refresh Predict.fun:', error)
    }
  }

  async refreshKalshi(): Promise<void> {
    if (!this.config.kalshiCredentials) {
      console.log('[Scheduler] Skipping Kalshi (no credentials)')
      return
    }

    console.log('[Scheduler] Refreshing Kalshi data...')
    try {
      const [binary, dutching] = await Promise.all([
        fetchKalshiBinaryMarkets(this.config.kalshiCredentials),
        fetchKalshiDutchingEvents(this.config.kalshiCredentials),
      ])

      this.cache.kalshi.binary = {
        data: binary,
        updatedAt: Date.now(),
        platform: 'kalshi',
        type: 'binary',
      }
      this.cache.kalshi.dutching = {
        data: dutching,
        updatedAt: Date.now(),
        platform: 'kalshi',
        type: 'dutching',
      }
      console.log(`[Scheduler] Kalshi: ${binary.length} binary, ${dutching.length} dutching`)
    } catch (error) {
      console.error('[Scheduler] Failed to refresh Kalshi:', error)
    }
  }

  async refreshAll(): Promise<void> {
    if (this.isRunning) {
      console.log('[Scheduler] Refresh already in progress, skipping...')
      return
    }

    this.isRunning = true
    const startTime = Date.now()
    console.log('[Scheduler] Starting full refresh...')

    try {
      // Run all refreshes in parallel
      await Promise.all([
        this.refreshPolymarket(),
        this.refreshPredictfun(),
        this.refreshKalshi(),
      ])

      const duration = Date.now() - startTime
      console.log(`[Scheduler] Full refresh completed in ${duration}ms`)
    } finally {
      this.isRunning = false
    }
  }

  start(): void {
    if (this.intervalId) {
      console.log('[Scheduler] Already running')
      return
    }

    console.log(`[Scheduler] Starting with interval: ${this.config.refreshInterval}ms`)

    // Initial refresh
    this.refreshAll()

    // Schedule periodic refresh
    this.intervalId = setInterval(() => {
      this.refreshAll()
    }, this.config.refreshInterval)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[Scheduler] Stopped')
    }
  }
}
