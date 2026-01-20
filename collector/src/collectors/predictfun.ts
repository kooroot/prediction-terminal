import type { MarketData, DutchingEvent, DutchingOutcome } from '../types'

const BASE_URL = 'https://api.predict.fun/v1'

interface PredictMarket {
  id: number
  slug: string
  title: string
  categorySlug: string
  outcomes: { name: string }[]
}

interface Category {
  title: string
  slug: string
  isYieldBearing: boolean
  markets: PredictMarket[]
}

interface OrderbookData {
  bids: [number, number][]
  asks: [number, number][]
}

interface StatsData {
  totalLiquidityUsd: number
  volume24hUsd: number
}

const NOT_ME_PATTERNS = [
  /\bby\s+[A-Z]/i,
  /\bbefore\s+/i,
  /\babove\s+[\d$]/i,
  /\bbelow\s+[\d$]/i,
  /FDV above/i,
  /launch.+token.+by/i,
  /market cap.+above/i,
  /hit.+before/i,
  /price.+hit.+before/i,
  /will.+reach/i,
]

const ME_PATTERNS = [/winner/i, /champion/i, /election/i, /president/i, /\bvs\.?\b/i, /who will/i]

function isMutuallyExclusive(title: string): 'yes' | 'no' | 'unknown' {
  if (NOT_ME_PATTERNS.some((p) => p.test(title))) return 'no'
  if (ME_PATTERNS.some((p) => p.test(title))) return 'yes'
  return 'unknown'
}

function getBestAsk(asks: [number, number][]): number {
  if (asks.length === 0) return 0
  return Math.min(...asks.map((a) => a[0]))
}

function getBestBid(bids: [number, number][]): number {
  if (bids.length === 0) return 0
  return Math.max(...bids.map((b) => b[0]))
}

function getDepth(levels: [number, number][]): number {
  return levels.reduce((sum, l) => sum + l[1], 0)
}

export async function fetchPredictfunBinaryMarkets(apiKey: string): Promise<MarketData[]> {
  const headers = { 'x-api-key': apiKey }

  // Use categories endpoint (same as dutching) - /markets endpoint doesn't work reliably
  const response = await fetch(`${BASE_URL}/categories?status=OPEN&first=150`, { headers })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Predict.fun API error: ${response.status} ${response.statusText} - ${text}`)
  }

  const data = (await response.json()) as { data: Category[] }
  const categories = data.data ?? []

  // Binary markets: categories with exactly 1 market (the market itself is the binary YES/NO)
  const binaryCategories = categories.filter((cat) => cat.markets.length === 1)
  const allMarkets = binaryCategories.flatMap((cat) =>
    cat.markets.map((m) => ({ market: m, category: cat }))
  )

  const results: MarketData[] = []

  const batchSize = 30
  for (let i = 0; i < allMarkets.length; i += batchSize) {
    const batch = allMarkets.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async ({ market, category }) => {
        try {
          const [obResp, stResp] = await Promise.all([
            fetch(`${BASE_URL}/markets/${market.id}/orderbook`, { headers }),
            fetch(`${BASE_URL}/markets/${market.id}/stats`, { headers }),
          ])

          const obData = (await obResp.json()) as { success: boolean; data: OrderbookData }
          const stData = (await stResp.json()) as { success: boolean; data: StatsData }

          if (!obData.success || !obData.data) return null

          const orderbook = obData.data
          const stats = stData.success ? stData.data : null

          const askYes = getBestAsk(orderbook.asks)
          const bidYes = getBestBid(orderbook.bids)

          if (askYes === 0 || orderbook.asks.length === 0 || orderbook.bids.length === 0) return null

          const askNo = bidYes > 0 ? 1 - bidYes : 0
          const bidNo = askYes > 0 ? 1 - askYes : 0
          const sumAsks = askYes + askNo
          const margin = 1 - sumAsks

          return {
            id: String(market.id),
            slug: category.slug,
            title: market.title.slice(0, 60),
            askYes,
            askNo,
            bidYes,
            bidNo,
            sumAsks,
            margin,
            liquidity: stats?.totalLiquidityUsd ?? 0,
            volume24h: stats?.volume24hUsd ?? 0,
            platform: 'predictfun',
          } satisfies MarketData
        } catch {
          return null
        }
      })
    )

    for (const r of batchResults) {
      if (r !== null) results.push(r)
    }
  }

  return results.sort((a, b) => b.margin - a.margin)
}

export async function fetchPredictfunDutchingEvents(apiKey: string): Promise<DutchingEvent[]> {
  const headers = { 'x-api-key': apiKey }

  const response = await fetch(`${BASE_URL}/categories?status=OPEN&first=150`, { headers })
  if (!response.ok) throw new Error('Failed to fetch Predict.fun categories')

  const data = (await response.json()) as { data: Category[] }
  const categories = data.data ?? []

  const multiOutcomeCategories = categories.filter((cat) => cat.markets.length >= 3)
  const allMarkets = multiOutcomeCategories.flatMap((cat) => cat.markets.map((m) => ({ market: m, category: cat })))

  const marketDataMap = new Map<number, { orderbook: OrderbookData | null; stats: StatsData | null }>()

  const batchSize = 50
  for (let i = 0; i < allMarkets.length; i += batchSize) {
    const batch = allMarkets.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async ({ market }) => {
        try {
          const [obResp, stResp] = await Promise.all([
            fetch(`${BASE_URL}/markets/${market.id}/orderbook`, { headers }),
            fetch(`${BASE_URL}/markets/${market.id}/stats`, { headers }),
          ])

          const obData = (await obResp.json()) as { success: boolean; data: OrderbookData }
          const stData = (await stResp.json()) as { success: boolean; data: StatsData }

          return {
            id: market.id,
            data: {
              orderbook: obData.success ? obData.data : null,
              stats: stData.success ? stData.data : null,
            },
          }
        } catch {
          return { id: market.id, data: { orderbook: null, stats: null } }
        }
      })
    )

    for (const { id, data: d } of results) {
      marketDataMap.set(id, d)
    }
  }

  const categoryDisplays: DutchingEvent[] = []

  for (const category of multiOutcomeCategories) {
    const outcomes: DutchingOutcome[] = []
    let sumYesAsks = 0
    let sumNoAsks = 0
    let totalLiquidity = 0

    for (const market of category.markets) {
      const data = marketDataMap.get(market.id)
      if (!data) continue

      const { orderbook, stats } = data
      if (!orderbook || orderbook.asks.length === 0) continue

      const yesAsk = getBestAsk(orderbook.asks)
      const yesBid = getBestBid(orderbook.bids)
      const noAsk = yesBid > 0 ? 1 - yesBid : 0
      const noBid = yesAsk > 0 ? 1 - yesAsk : 0
      const yesAskDepth = getDepth(orderbook.asks)
      const noAskDepth = getDepth(orderbook.bids)
      const liquidity = stats?.totalLiquidityUsd ?? 0

      if (yesAsk > 0 && yesAsk < 1) {
        outcomes.push({
          id: String(market.id),
          name: market.title.slice(0, 30),
          yesAsk,
          noAsk,
          yesBid,
          noBid,
          yesAskDepth,
          noAskDepth,
          liquidity,
        })
        sumYesAsks += yesAsk
        if (noAsk > 0 && noAsk < 1) {
          sumNoAsks += noAsk
        }
        totalLiquidity += liquidity
      }
    }

    if (outcomes.length >= 3) {
      const n = outcomes.length
      const yesMargin = 1 - sumYesAsks
      const noMargin = n - 1 - sumNoAsks
      const minYesDepth = Math.min(...outcomes.map((o) => o.yesAskDepth))
      const minNoDepth = Math.min(...outcomes.map((o) => o.noAskDepth))
      const meStatus = isMutuallyExclusive(category.title)

      categoryDisplays.push({
        id: category.slug,
        slug: category.slug,
        title: category.title.slice(0, 45),
        outcomeCount: n,
        outcomes: outcomes.sort((a, b) => b.yesAsk - a.yesAsk),
        sumYesAsks,
        sumNoAsks,
        yesMargin,
        noMargin,
        totalLiquidity,
        minYesDepth,
        minNoDepth,
        meStatus,
      })
    }
  }

  return categoryDisplays.sort((a, b) => {
    const aMax = Math.max(a.yesMargin, a.noMargin / (a.outcomeCount - 1))
    const bMax = Math.max(b.yesMargin, b.noMargin / (b.outcomeCount - 1))
    return bMax - aMax
  })
}
