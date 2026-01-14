import type { MarketData, DutchingEvent, DutchingOutcome } from '../types'

const GAMMA_HOST = 'https://gamma-api.polymarket.com'
const CLOB_HOST = 'https://clob.polymarket.com'

interface GammaMarket {
  condition_id: string
  question: string
  tokens: { token_id: string; outcome: string }[]
  active: boolean
  closed: boolean
  liquidity: string
  volume_num_24hr: string
}

interface OrderBook {
  bids: { price: string; size: string }[]
  asks: { price: string; size: string }[]
}

interface GammaEvent {
  id: string
  title: string
  slug: string
  endDate: string
  liquidity: number
  markets: {
    conditionId: string
    question: string
    groupItemTitle?: string
    clobTokenIds: string
    liquidity: string
    active: boolean
    closed: boolean
    acceptingOrders: boolean
  }[]
  negRisk: boolean
  enableNegRisk: boolean
  active: boolean
  closed: boolean
}

function getBestAsk(asks: { price: string; size: string }[]): number {
  if (asks.length === 0) return 0
  return Math.min(...asks.map((a) => Number.parseFloat(a.price)))
}

function getBestBid(bids: { price: string; size: string }[]): number {
  if (bids.length === 0) return 0
  return Math.max(...bids.map((b) => Number.parseFloat(b.price)))
}

function getDepth(levels: { price: string; size: string }[]): number {
  return levels.reduce((sum, l) => sum + Number.parseFloat(l.size), 0)
}

export async function fetchPolymarketBinaryMarkets(): Promise<MarketData[]> {
  const response = await fetch(`${GAMMA_HOST}/markets?active=true&closed=false&limit=50`)
  if (!response.ok) throw new Error('Failed to fetch Polymarket markets')

  const markets = (await response.json()) as GammaMarket[]

  const validMarkets = markets
    .filter((m) => m.tokens?.length === 2 && Number.parseFloat(m.liquidity || '0') > 1000)
    .sort((a, b) => Number.parseFloat(b.liquidity || '0') - Number.parseFloat(a.liquidity || '0'))
    .slice(0, 40)

  const orderbookPromises = validMarkets.map(async (market) => {
    const yesToken = market.tokens.find((t) => t.outcome === 'Yes')
    const noToken = market.tokens.find((t) => t.outcome === 'No')
    if (!yesToken || !noToken) return null

    try {
      const [yesOb, noOb] = await Promise.all([
        fetch(`${CLOB_HOST}/book?token_id=${yesToken.token_id}`).then((r) => r.json() as Promise<OrderBook>),
        fetch(`${CLOB_HOST}/book?token_id=${noToken.token_id}`).then((r) => r.json() as Promise<OrderBook>),
      ])

      const askYes = getBestAsk(yesOb.asks)
      const askNo = getBestAsk(noOb.asks)
      const bidYes = getBestBid(yesOb.bids)
      const bidNo = getBestBid(noOb.bids)

      if (askYes === 0 || askNo === 0) return null

      const sumAsks = askYes + askNo
      const margin = 1 - sumAsks

      return {
        id: market.condition_id,
        title: market.question.slice(0, 60),
        askYes,
        askNo,
        bidYes,
        bidNo,
        sumAsks,
        margin,
        liquidity: Number.parseFloat(market.liquidity || '0'),
        volume24h: Number.parseFloat(market.volume_num_24hr || '0'),
      } satisfies MarketData
    } catch {
      return null
    }
  })

  const allResults = await Promise.all(orderbookPromises)
  const results: MarketData[] = []
  for (const r of allResults) {
    if (r !== null) results.push(r)
  }
  return results.sort((a, b) => b.margin - a.margin)
}

export async function fetchPolymarketDutchingEvents(): Promise<DutchingEvent[]> {
  const now = Date.now()
  const maxExpiryMs = now + 30 * 24 * 60 * 60 * 1000

  const response = await fetch(`${GAMMA_HOST}/events?active=true&closed=false&limit=50`)
  if (!response.ok) throw new Error('Failed to fetch events')

  const events = (await response.json()) as GammaEvent[]

  const validEvents = events
    .filter((e) => {
      const endDate = new Date(e.endDate).getTime()
      return (
        e.enableNegRisk &&
        e.negRisk &&
        !e.closed &&
        e.active &&
        endDate <= maxExpiryMs &&
        e.markets.length >= 3 &&
        e.liquidity >= 5000 &&
        e.markets.some((m) => m.active && !m.closed && m.acceptingOrders)
      )
    })
    .sort((a, b) => b.liquidity - a.liquidity)
    .slice(0, 15)

  const results: DutchingEvent[] = []

  for (const event of validEvents) {
    const endDate = new Date(event.endDate)
    const daysToExpiry = Math.max(1, (endDate.getTime() - now) / (1000 * 60 * 60 * 24))

    const activeMarkets = event.markets.filter((m) => m.active && !m.closed && m.acceptingOrders)
    if (activeMarkets.length < 3) continue

    const tokenInfos: { market: (typeof activeMarkets)[0]; yesTokenId: string; noTokenId: string }[] = []
    for (const market of activeMarkets) {
      try {
        const tokenIds = JSON.parse(market.clobTokenIds) as string[]
        if (tokenIds[0] && tokenIds[1]) {
          tokenInfos.push({ market, yesTokenId: tokenIds[0], noTokenId: tokenIds[1] })
        }
      } catch {
        continue
      }
    }

    const allOrderbooks = await Promise.all(
      tokenInfos.flatMap(({ yesTokenId, noTokenId }) => [
        fetch(`${CLOB_HOST}/book?token_id=${yesTokenId}`)
          .then((r) => r.json() as Promise<OrderBook>)
          .catch(() => null),
        fetch(`${CLOB_HOST}/book?token_id=${noTokenId}`)
          .then((r) => r.json() as Promise<OrderBook>)
          .catch(() => null),
      ])
    )

    const outcomes: DutchingOutcome[] = []
    let sumYesAsks = 0
    let sumNoAsks = 0
    let totalLiquidity = 0

    for (let i = 0; i < tokenInfos.length; i++) {
      const tokenInfo = tokenInfos[i]
      if (!tokenInfo) continue
      const { market } = tokenInfo
      const yesOrderbook = allOrderbooks[i * 2]
      const noOrderbook = allOrderbooks[i * 2 + 1]

      if (!yesOrderbook || !yesOrderbook.asks || yesOrderbook.asks.length === 0) continue
      if (!noOrderbook || !noOrderbook.asks || noOrderbook.asks.length === 0) continue

      const yesAsk = getBestAsk(yesOrderbook.asks)
      const noAsk = getBestAsk(noOrderbook.asks)
      const yesBid = getBestBid(yesOrderbook.bids)
      const noBid = getBestBid(noOrderbook.bids)
      const yesAskDepth = getDepth(yesOrderbook.asks)
      const noAskDepth = getDepth(noOrderbook.asks)
      const liquidity = Number.parseFloat(market.liquidity ?? '0')

      if (yesAsk > 0 && yesAsk < 1 && noAsk > 0 && noAsk < 1) {
        outcomes.push({
          id: market.conditionId,
          name: (market.groupItemTitle ?? market.question).slice(0, 30),
          yesAsk,
          noAsk,
          yesBid,
          noBid,
          yesAskDepth,
          noAskDepth,
          liquidity,
        })
        sumYesAsks += yesAsk
        sumNoAsks += noAsk
        totalLiquidity += liquidity
      }
    }

    if (outcomes.length < 3) continue

    const n = outcomes.length
    const yesMargin = 1 - sumYesAsks
    const noMargin = n - 1 - sumNoAsks
    const minYesDepth = Math.min(...outcomes.map((o) => o.yesAskDepth))
    const minNoDepth = Math.min(...outcomes.map((o) => o.noAskDepth))

    results.push({
      id: event.id,
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
  }

  return results.sort((a, b) => {
    const aMax = Math.max(a.yesMargin, a.noMargin / (a.outcomeCount - 1))
    const bMax = Math.max(b.yesMargin, b.noMargin / (b.outcomeCount - 1))
    return bMax - aMax
  })
}
