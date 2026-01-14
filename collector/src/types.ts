export interface MarketData {
  id: string
  title: string
  askYes: number
  askNo: number
  bidYes: number
  bidNo: number
  sumAsks: number
  margin: number
  liquidity: number
  volume24h?: number
}

export interface DutchingOutcome {
  id: string
  name: string
  yesAsk: number
  noAsk: number
  yesBid: number
  noBid: number
  yesAskDepth: number
  noAskDepth: number
  liquidity: number
}

export interface DutchingEvent {
  id: string
  title: string
  outcomeCount: number
  outcomes: DutchingOutcome[]
  sumYesAsks: number
  sumNoAsks: number
  yesMargin: number
  noMargin: number
  totalLiquidity: number
  minYesDepth: number
  minNoDepth: number
  meStatus?: 'yes' | 'no' | 'unknown'
  daysToExpiry?: number
}

export type Platform = 'polymarket' | 'predictfun' | 'kalshi'
export type DataType = 'binary' | 'dutching'

export interface CachedData<T> {
  data: T
  updatedAt: number
  platform: Platform
  type: DataType
}

export interface CacheStore {
  polymarket: {
    binary: CachedData<MarketData[]> | null
    dutching: CachedData<DutchingEvent[]> | null
  }
  predictfun: {
    binary: CachedData<MarketData[]> | null
    dutching: CachedData<DutchingEvent[]> | null
  }
  kalshi: {
    binary: CachedData<MarketData[]> | null
    dutching: CachedData<DutchingEvent[]> | null
  }
}
