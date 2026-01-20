import type { MarketData, DutchingEvent, Platform } from '../types'

export type DataType = 'binary' | 'dutching'

export interface CachedData<T> {
  data: T
  updatedAt: number
  platform: Platform
  type: DataType
}

// Hardcoded URL for Cloudflare Workers compatibility
// process.env doesn't work reliably in TanStack Start server functions on Workers
const DEFAULT_CACHE_SERVER_URL = 'https://robin-researcher-barcelona-msgid.trycloudflare.com'

function getCacheServerUrl(): string {
  // Try process.env for local development, fall back to hardcoded for production
  if (typeof process !== 'undefined' && process.env?.CACHE_SERVER_URL) {
    return process.env.CACHE_SERVER_URL
  }
  return DEFAULT_CACHE_SERVER_URL
}

/**
 * Fetch cached data from the VPS cache server
 */
export async function fetchFromCache<T>(
  platform: Platform,
  type: DataType,
  cacheServerUrl?: string
): Promise<CachedData<T>> {
  const baseUrl = cacheServerUrl || getCacheServerUrl()
  const url = `${baseUrl}/api/cache/${platform}/${type}`

  const response = await fetch(url)

  if (!response.ok) {
    if (response.status === 503) {
      throw new Error(`Cache not ready for ${platform}/${type}`)
    }
    throw new Error(`Cache fetch failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<CachedData<T>>
}

/**
 * Fetch binary market data from cache
 */
export async function fetchBinaryMarketsFromCache(
  platform: Platform,
  cacheServerUrl?: string
): Promise<MarketData[]> {
  const cached = await fetchFromCache<MarketData[]>(platform, 'binary', cacheServerUrl)
  return cached.data
}

/**
 * Fetch dutching events from cache
 */
export async function fetchDutchingEventsFromCache(
  platform: Platform,
  cacheServerUrl?: string
): Promise<DutchingEvent[]> {
  const cached = await fetchFromCache<DutchingEvent[]>(platform, 'dutching', cacheServerUrl)
  return cached.data
}

/**
 * Fetch cache status from the server
 */
export async function fetchCacheStatus(cacheServerUrl?: string): Promise<{
  polymarket: { binary: { updatedAt: number; count: number } | null; dutching: { updatedAt: number; count: number } | null }
  predictfun: { binary: { updatedAt: number; count: number } | null; dutching: { updatedAt: number; count: number } | null }
  kalshi: { binary: { updatedAt: number; count: number } | null; dutching: { updatedAt: number; count: number } | null }
}> {
  const baseUrl = cacheServerUrl || getCacheServerUrl()
  const response = await fetch(`${baseUrl}/api/cache/status`)

  if (!response.ok) {
    throw new Error(`Status fetch failed: ${response.status}`)
  }

  return response.json()
}
