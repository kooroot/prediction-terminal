import type { CacheStore, MarketData, DutchingEvent } from './types'
import { fetchPolymarketBinaryMarkets, fetchPolymarketDutchingEvents } from './collectors/polymarket'
import { fetchPredictfunBinaryMarkets, fetchPredictfunDutchingEvents } from './collectors/predictfun'
import { fetchKalshiBinaryMarkets, fetchKalshiDutchingEvents } from './collectors/kalshi'
import type { KalshiCredentials } from './auth/kalshi'

export interface PlatformIntervals {
  polymarket: number // in milliseconds
  predictfun: number // in milliseconds (should be longer due to rate limits)
  kalshi: number // in milliseconds
}

export interface SchedulerConfig {
  refreshInterval?: number // deprecated: use platformIntervals instead
  platformIntervals?: Partial<PlatformIntervals>
  predictfunApiKey?: string
  kalshiCredentials?: KalshiCredentials
}

const DEFAULT_INTERVALS: PlatformIntervals = {
  polymarket: 5000, // 5 seconds
  predictfun: 60000, // 60 seconds (Predict.fun has strict rate limits)
  kalshi: 10000, // 10 seconds
}

export class DataScheduler {
  private cache: CacheStore
  private config: SchedulerConfig
  private intervals: PlatformIntervals
  private intervalIds: {
    polymarket: ReturnType<typeof setInterval> | null
    predictfun: ReturnType<typeof setInterval> | null
    kalshi: ReturnType<typeof setInterval> | null
  } = { polymarket: null, predictfun: null, kalshi: null }
  private runningFlags = { polymarket: false, predictfun: false, kalshi: false }

  constructor(config: SchedulerConfig) {
    this.config = config
    this.cache = {
      polymarket: { binary: null, dutching: null },
      predictfun: { binary: null, dutching: null },
      kalshi: { binary: null, dutching: null },
    }
    // Merge custom intervals with defaults
    this.intervals = {
      ...DEFAULT_INTERVALS,
      ...config.platformIntervals,
    }
  }

  getCache(): CacheStore {
    return this.cache
  }

  async refreshPolymarket(): Promise<void> {
    if (this.runningFlags.polymarket) {
      console.log('[Scheduler] Polymarket refresh in progress, skipping...')
      return
    }
    this.runningFlags.polymarket = true

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
    } finally {
      this.runningFlags.polymarket = false
    }
  }

  async refreshPredictfun(): Promise<void> {
    if (!this.config.predictfunApiKey) {
      console.log('[Scheduler] Skipping Predict.fun (no API key)')
      return
    }

    if (this.runningFlags.predictfun) {
      console.log('[Scheduler] Predict.fun refresh in progress, skipping...')
      return
    }
    this.runningFlags.predictfun = true

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
    } finally {
      this.runningFlags.predictfun = false
    }
  }

  async refreshKalshi(): Promise<void> {
    if (!this.config.kalshiCredentials) {
      console.log('[Scheduler] Skipping Kalshi (no credentials)')
      return
    }

    if (this.runningFlags.kalshi) {
      console.log('[Scheduler] Kalshi refresh in progress, skipping...')
      return
    }
    this.runningFlags.kalshi = true

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
    } finally {
      this.runningFlags.kalshi = false
    }
  }

  async refreshAll(): Promise<void> {
    const startTime = Date.now()
    console.log('[Scheduler] Starting full refresh...')

    // Run all refreshes in parallel
    await Promise.all([
      this.refreshPolymarket(),
      this.refreshPredictfun(),
      this.refreshKalshi(),
    ])

    const duration = Date.now() - startTime
    console.log(`[Scheduler] Full refresh completed in ${duration}ms`)
  }

  start(): void {
    const alreadyRunning = Object.values(this.intervalIds).some((id) => id !== null)
    if (alreadyRunning) {
      console.log('[Scheduler] Already running')
      return
    }

    console.log('[Scheduler] Starting with per-platform intervals:')
    console.log(`  - Polymarket: ${this.intervals.polymarket}ms`)
    console.log(`  - Predict.fun: ${this.intervals.predictfun}ms`)
    console.log(`  - Kalshi: ${this.intervals.kalshi}ms`)

    // Initial refresh for all platforms
    this.refreshAll()

    // Schedule per-platform periodic refresh
    this.intervalIds.polymarket = setInterval(() => {
      this.refreshPolymarket()
    }, this.intervals.polymarket)

    this.intervalIds.predictfun = setInterval(() => {
      this.refreshPredictfun()
    }, this.intervals.predictfun)

    this.intervalIds.kalshi = setInterval(() => {
      this.refreshKalshi()
    }, this.intervals.kalshi)
  }

  stop(): void {
    let stopped = false
    for (const [platform, intervalId] of Object.entries(this.intervalIds)) {
      if (intervalId) {
        clearInterval(intervalId)
        this.intervalIds[platform as keyof typeof this.intervalIds] = null
        stopped = true
      }
    }
    if (stopped) {
      console.log('[Scheduler] Stopped all platform schedulers')
    }
  }

  getIntervals(): PlatformIntervals {
    return this.intervals
  }
}
