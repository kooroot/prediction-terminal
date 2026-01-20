import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { fetchCacheStatus } from '~/lib/cache/client'

// Hardcoded for Cloudflare Workers - process.env doesn't work reliably in TanStack Start server functions
const CACHE_SERVER_URL = 'https://robin-researcher-barcelona-msgid.trycloudflare.com'

function getCacheServerUrl(): string {
  return CACHE_SERVER_URL
}

const getCacheStatus = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    return await fetchCacheStatus(getCacheServerUrl())
  } catch {
    return null
  }
})

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async () => {
    const status = await getCacheStatus()
    return { status }
  },
})

function HomePage() {
  const { status } = Route.useLoaderData()

  // Determine status for each market based on cache data
  const polymarketStatus = status?.polymarket?.binary || status?.polymarket?.dutching ? 'active' : 'pending'
  const predictfunStatus = status?.predictfun?.binary || status?.predictfun?.dutching ? 'active' : 'pending'
  const kalshiStatus = status?.kalshi?.binary || status?.kalshi?.dutching ? 'active' : 'pending'

  // Get opportunity counts
  const polymarketCount = (status?.polymarket?.binary?.count || 0) + (status?.polymarket?.dutching?.count || 0)
  const predictfunCount = (status?.predictfun?.binary?.count || 0) + (status?.predictfun?.dutching?.count || 0)
  const kalshiCount = (status?.kalshi?.binary?.count || 0) + (status?.kalshi?.dutching?.count || 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-green-500">$</span>
          <span className="text-zinc-100">ls -la ./markets</span>
          <span className="cursor" />
        </div>
        <p className="text-sm text-zinc-600">// scanning prediction market orderbooks for arbitrage</p>
      </div>

      {/* Market Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MarketCard
          name="polymarket"
          chain="polygon"
          type="CLOB"
          status={polymarketStatus}
          marketCount={polymarketCount}
          href="/polymarket"
        />
        <MarketCard
          name="predict.fun"
          chain="BNB"
          type="CLOB"
          status={predictfunStatus}
          marketCount={predictfunCount}
          href="/predictfun"
        />
        <MarketCard
          name="kalshi"
          chain="CFTC"
          type="exchange"
          status={kalshiStatus}
          marketCount={kalshiCount}
          href="/kalshi"
        />
      </div>

      {/* Top Volume Link */}
      <Link
        to="/top-volume"
        className="group block border border-blue-500/30 bg-blue-500/5 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-blue-500">◆</span>
            <div>
              <span className="text-zinc-200">Top Volume Markets</span>
              <p className="text-sm text-zinc-600">top 20 markets by 24h trading volume across all platforms</p>
            </div>
          </div>
          <span className="text-zinc-600 transition-colors group-hover:text-zinc-400">→</span>
        </div>
      </Link>

      {/* Info Section */}
      <div className="border border-zinc-800 bg-zinc-900/30">
        <div className="border-b border-zinc-800 px-4 py-2">
          <span className="text-sm text-zinc-500">README.md</span>
        </div>
        <div className="space-y-4 p-4 text-sm">
          <div>
            <h3 className="mb-2 text-zinc-400"># Arbitrage Strategies</h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-green-500">##</span>
              <div>
                <span className="text-zinc-200">Binary Arbitrage</span>
                <p className="mt-1 text-sm text-zinc-600">
                  when ask(YES) + ask(NO) &lt; 1.00 → buy both sides → guaranteed profit
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-green-500">##</span>
              <div>
                <span className="text-zinc-200">Dutching (Multi-Outcome)</span>
                <p className="mt-1 text-sm text-zinc-600">
                  when sum(YES asks) &lt; 1.00 in mutually exclusive markets → buy all outcomes
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <span className="text-yellow-500">!</span>
              <span>slippage, fees, and execution risk not factored into displayed margins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-6 text-sm text-zinc-600">
        <span>
          <span className="text-zinc-500">last_scan:</span> {new Date().toLocaleTimeString()}
        </span>
        <span>
          <span className="text-zinc-500">status:</span> <span className="text-green-500">online</span>
        </span>
      </div>
    </div>
  )
}

function MarketCard({
  name,
  chain,
  type,
  status,
  marketCount,
  href,
}: {
  name: string
  chain: string
  type: string
  status: 'active' | 'pending'
  marketCount: number
  href: string
}) {
  return (
    <Link
      to={href}
      className="group block border border-zinc-800 bg-zinc-900/30 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50"
    >
      <div className="border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">{name}</span>
          <span
            className={`text-sm ${
              status === 'active' ? 'text-green-500' : 'text-zinc-600'
            }`}
          >
            [{status}]
          </span>
        </div>
      </div>
      <div className="space-y-2 px-4 py-3 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-600">chain</span>
          <span className="text-zinc-400">{chain}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">type</span>
          <span className="text-zinc-400">{type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">markets</span>
          <span className={status === 'active' ? 'text-green-500' : 'text-zinc-600'}>
            {status === 'active' ? marketCount.toLocaleString() : '--'}
          </span>
        </div>
      </div>
      <div className="border-t border-zinc-800 px-4 py-2 text-sm text-zinc-600 transition-colors group-hover:text-zinc-400">
        → view markets
      </div>
    </Link>
  )
}
