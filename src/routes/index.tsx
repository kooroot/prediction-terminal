import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
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
          status="active"
          href="/polymarket"
        />
        <MarketCard
          name="predict.fun"
          chain="BNB"
          type="CLOB"
          status="pending"
          href="/predictfun"
        />
        <MarketCard
          name="kalshi"
          chain="CFTC"
          type="exchange"
          status="pending"
          href="/kalshi"
        />
      </div>

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
  href,
}: {
  name: string
  chain: string
  type: string
  status: 'active' | 'pending'
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
          <span className="text-zinc-600">opportunities</span>
          <span className={status === 'active' ? 'text-green-500' : 'text-zinc-600'}>
            {status === 'active' ? 'scanning...' : '--'}
          </span>
        </div>
      </div>
      <div className="border-t border-zinc-800 px-4 py-2 text-sm text-zinc-600 transition-colors group-hover:text-zinc-400">
        → view markets
      </div>
    </Link>
  )
}
