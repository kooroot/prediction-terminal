import type { CacheStore, MarketData } from '../types'
import { sendTopVolumeAlert, createTelegramConfig } from './telegram'

interface NotificationSchedulerConfig {
  alertHours: number[] // Hours in KST (e.g., [9, 21])
  getCache: () => CacheStore
}

export class NotificationScheduler {
  private config: NotificationSchedulerConfig
  private lastAlertHour: number | null = null
  private lastAlertDate: string | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private telegramConfig: ReturnType<typeof createTelegramConfig>

  constructor(config: NotificationSchedulerConfig) {
    this.config = config
    this.telegramConfig = createTelegramConfig()
  }

  start(): void {
    if (!this.telegramConfig) {
      console.log('[NotificationScheduler] Telegram not configured. Scheduler disabled.')
      return
    }

    console.log(`[NotificationScheduler] Starting... Alert hours (KST): ${this.config.alertHours.join(', ')}`)

    // Check every minute
    this.intervalId = setInterval(() => {
      this.checkAndSendAlert()
    }, 60_000)

    // Also check immediately on start
    this.checkAndSendAlert()
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('[NotificationScheduler] Stopped')
  }

  private async checkAndSendAlert(): Promise<void> {
    if (!this.telegramConfig) return

    // Get current time in KST
    const now = new Date()
    const kstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const currentHour = kstTime.getHours()
    const currentDate = kstTime.toISOString().split('T')[0] // YYYY-MM-DD

    // Check if current hour is in alert hours
    if (!this.config.alertHours.includes(currentHour)) {
      return
    }

    // Prevent duplicate alerts for the same hour on the same day
    if (this.lastAlertDate === currentDate && this.lastAlertHour === currentHour) {
      return
    }

    // Get top volume data from cache
    const cache = this.config.getCache()
    const topVolumeData = this.getTopVolumeData(cache)

    // Determine period (AM/PM)
    const period = currentHour < 12 ? 'AM' : 'PM'

    console.log(`[NotificationScheduler] Sending ${period} alert...`)

    const success = await sendTopVolumeAlert(this.telegramConfig, topVolumeData, period)

    if (success) {
      this.lastAlertHour = currentHour
      this.lastAlertDate = currentDate
      console.log(`[NotificationScheduler] ${period} alert sent successfully`)
    }
  }

  private getTopVolumeData(cache: CacheStore): {
    polymarket: MarketData[]
    predictfun: MarketData[]
    kalshi: MarketData[]
  } {
    const sortByVolume = (markets: MarketData[]): MarketData[] => {
      return [...markets]
        .filter((m) => (m.volume24h ?? 0) > 0)
        .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
        .slice(0, 20)
    }

    // Use topVolume cache which includes all markets (binary + multi-outcome)
    return {
      polymarket: sortByVolume(cache.polymarket.topVolume?.data ?? []),
      predictfun: sortByVolume(cache.predictfun.topVolume?.data ?? []),
      kalshi: sortByVolume(cache.kalshi.topVolume?.data ?? []),
    }
  }

  // Manual trigger for testing
  async sendNow(): Promise<boolean> {
    if (!this.telegramConfig) {
      console.log('[NotificationScheduler] Telegram not configured')
      return false
    }

    const cache = this.config.getCache()
    const topVolumeData = this.getTopVolumeData(cache)
    const now = new Date()
    const kstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const period = kstTime.getHours() < 12 ? 'AM' : 'PM'

    return sendTopVolumeAlert(this.telegramConfig, topVolumeData, period)
  }
}

export function parseAlertHours(envValue?: string): number[] {
  if (!envValue) {
    return [9, 21] // Default: 9 AM and 9 PM KST
  }

  return envValue
    .split(',')
    .map((h) => parseInt(h.trim(), 10))
    .filter((h) => !isNaN(h) && h >= 0 && h <= 23)
}
