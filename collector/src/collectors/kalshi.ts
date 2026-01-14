import type { MarketData, DutchingEvent, DutchingOutcome } from '../types'
import { kalshiFetch, type KalshiCredentials } from '../auth/kalshi'

interface KalshiMarket {
  ticker: string
  title: string
  subtitle?: string
  status: string
  yes_bid: number
  yes_ask: number
  no_bid: number
  no_ask: number
  last_price: number
  volume: number
  volume_24h: number
  liquidity: number
  open_interest: number
  event_ticker: string
  close_time: string
}

interface KalshiMarketsResponse {
  markets: KalshiMarket[]
  cursor?: string
}

interface KalshiEvent {
  event_ticker: string
  title: string
  subtitle?: string
  category: string
  status: string
  markets: string[]
  close_time: string
}

interface KalshiEventsResponse {
  events: KalshiEvent[]
  cursor?: string
}

interface KalshiOrderbook {
  orderbook: {
    yes: [number, number][]
    no: [number, number][]
  }
}

function getBestAsk(levels: [number, number][]): number {
  if (levels.length === 0) return 0
  // Kalshi prices are in cents (0-100), convert to decimal
  return Math.min(...levels.map((l) => l[0])) / 100
}

function getBestBid(levels: [number, number][]): number {
  if (levels.length === 0) return 0
  // Kalshi prices are in cents (0-100), convert to decimal
  return Math.max(...levels.map((l) => l[0])) / 100
}

function getDepth(levels: [number, number][]): number {
  return levels.reduce((sum, l) => sum + l[1], 0)
}

export async function fetchKalshiBinaryMarkets(credentials: KalshiCredentials): Promise<MarketData[]> {
  // Fetch active markets
  const marketsData = await kalshiFetch<KalshiMarketsResponse>(
    credentials,
    '/markets?status=open&limit=100'
  )

  const markets = marketsData.markets ?? []

  // Filter to binary markets with reasonable liquidity
  const validMarkets = markets
    .filter((m) => m.status === 'open' && m.liquidity > 1000)
    .sort((a, b) => b.liquidity - a.liquidity)
    .slice(0, 50)

  // Fetch orderbooks for each market
  const results: MarketData[] = []

  for (const market of validMarkets) {
    try {
      const orderbookData = await kalshiFetch<KalshiOrderbook>(
        credentials,
        `/markets/${market.ticker}/orderbook`
      )

      const orderbook = orderbookData.orderbook
      if (!orderbook) continue

      const askYes = getBestAsk(orderbook.yes.filter((l) => l[0] > 0))
      const bidYes = getBestBid(orderbook.yes.filter((l) => l[0] > 0))
      const askNo = getBestAsk(orderbook.no.filter((l) => l[0] > 0))
      const bidNo = getBestBid(orderbook.no.filter((l) => l[0] > 0))

      // Fallback to market-level prices if orderbook is empty
      const finalAskYes = askYes > 0 ? askYes : market.yes_ask / 100
      const finalAskNo = askNo > 0 ? askNo : market.no_ask / 100
      const finalBidYes = bidYes > 0 ? bidYes : market.yes_bid / 100
      const finalBidNo = bidNo > 0 ? bidNo : market.no_bid / 100

      if (finalAskYes === 0 || finalAskNo === 0) continue

      const sumAsks = finalAskYes + finalAskNo
      const margin = 1 - sumAsks

      results.push({
        id: market.ticker,
        title: market.title.slice(0, 60),
        askYes: finalAskYes,
        askNo: finalAskNo,
        bidYes: finalBidYes,
        bidNo: finalBidNo,
        sumAsks,
        margin,
        liquidity: market.liquidity,
        volume24h: market.volume_24h,
      })
    } catch (error) {
      console.error(`Failed to fetch orderbook for ${market.ticker}:`, error)
      continue
    }
  }

  return results.sort((a, b) => b.margin - a.margin)
}

export async function fetchKalshiDutchingEvents(credentials: KalshiCredentials): Promise<DutchingEvent[]> {
  const now = Date.now()
  const maxExpiryMs = now + 30 * 24 * 60 * 60 * 1000

  // Fetch events
  const eventsData = await kalshiFetch<KalshiEventsResponse>(
    credentials,
    '/events?status=open&limit=50'
  )

  const events = eventsData.events ?? []

  // Filter to multi-outcome events
  const validEvents = events
    .filter((e) => {
      const closeTime = new Date(e.close_time).getTime()
      return (
        e.status === 'open' &&
        e.markets.length >= 3 &&
        closeTime <= maxExpiryMs
      )
    })
    .slice(0, 20)

  const results: DutchingEvent[] = []

  for (const event of validEvents) {
    try {
      // Fetch all markets for this event
      const marketsData = await kalshiFetch<KalshiMarketsResponse>(
        credentials,
        `/markets?event_ticker=${event.event_ticker}&status=open`
      )

      const eventMarkets = marketsData.markets ?? []
      if (eventMarkets.length < 3) continue

      const outcomes: DutchingOutcome[] = []
      let sumYesAsks = 0
      let sumNoAsks = 0
      let totalLiquidity = 0

      for (const market of eventMarkets) {
        try {
          const orderbookData = await kalshiFetch<KalshiOrderbook>(
            credentials,
            `/markets/${market.ticker}/orderbook`
          )

          const orderbook = orderbookData.orderbook
          if (!orderbook) continue

          const yesAsk = getBestAsk(orderbook.yes) || market.yes_ask / 100
          const noAsk = getBestAsk(orderbook.no) || market.no_ask / 100
          const yesBid = getBestBid(orderbook.yes) || market.yes_bid / 100
          const noBid = getBestBid(orderbook.no) || market.no_bid / 100
          const yesAskDepth = getDepth(orderbook.yes)
          const noAskDepth = getDepth(orderbook.no)

          if (yesAsk > 0 && yesAsk < 1 && noAsk > 0 && noAsk < 1) {
            outcomes.push({
              id: market.ticker,
              name: (market.subtitle || market.title).slice(0, 30),
              yesAsk,
              noAsk,
              yesBid,
              noBid,
              yesAskDepth,
              noAskDepth,
              liquidity: market.liquidity,
            })
            sumYesAsks += yesAsk
            sumNoAsks += noAsk
            totalLiquidity += market.liquidity
          }
        } catch {
          continue
        }
      }

      if (outcomes.length < 3) continue

      const n = outcomes.length
      const yesMargin = 1 - sumYesAsks
      const noMargin = n - 1 - sumNoAsks
      const minYesDepth = Math.min(...outcomes.map((o) => o.yesAskDepth))
      const minNoDepth = Math.min(...outcomes.map((o) => o.noAskDepth))
      const closeTime = new Date(event.close_time)
      const daysToExpiry = Math.max(1, (closeTime.getTime() - now) / (1000 * 60 * 60 * 24))

      results.push({
        id: event.event_ticker,
        title: event.title.slice(0, 50),
        outcomeCount: n,
        outcomes: outcomes.sort((a, b) => b.yesAsk - a.yesAsk),
        sumYesAsks,
        sumNoAsks,
        yesMargin,
        noMargin,
        totalLiquidity,
        minYesDepth,
        minNoDepth,
        daysToExpiry,
      })
    } catch (error) {
      console.error(`Failed to process event ${event.event_ticker}:`, error)
      continue
    }
  }

  return results.sort((a, b) => {
    const aMax = Math.max(a.yesMargin, a.noMargin / (a.outcomeCount - 1))
    const bMax = Math.max(b.yesMargin, b.noMargin / (b.outcomeCount - 1))
    return bMax - aMax
  })
}
