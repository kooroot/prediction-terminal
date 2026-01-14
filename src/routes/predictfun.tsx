import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { fetchBinaryMarketsFromCache, fetchDutchingEventsFromCache } from '~/lib/cache/client'
import type { MarketData, DutchingEvent } from '~/lib/types'

// Cache server URL - set via environment variable
const CACHE_SERVER_URL = process.env.CACHE_SERVER_URL || 'http://localhost:3001'

const getBinaryMarkets = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    return await fetchBinaryMarketsFromCache('predictfun', CACHE_SERVER_URL)
  } catch {
    return null
  }
})

const getDutchingEvents = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    return await fetchDutchingEventsFromCache('predictfun', CACHE_SERVER_URL)
  } catch {
    return null
  }
})

export const Route = createFileRoute('/predictfun')({
  component: PredictfunPage,
  pendingComponent: LoadingPage,
  loader: async () => {
    const [binary, dutching] = await Promise.all([getBinaryMarkets(), getDutchingEvents()])
    return { binary, dutching }
  },
})

function LoadingPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-green-500">$</span>
          <span className="text-zinc-100">fetch --source predict.fun</span>
          <span className="cursor" />
        </div>
        <p className="text-sm text-zinc-600">// BNB chain • hybrid CLOB</p>
      </div>

      <div className="border border-zinc-800 bg-zinc-900/30 p-8">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="animate-pulse">▓</span>
            <span className="animate-pulse" style={{ animationDelay: '0.1s' }}>▓</span>
            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>▓</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-zinc-400">fetching orderbooks...</p>
            <p className="text-sm text-zinc-600">connecting to predict.fun cache</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PredictfunPage() {
  const { binary, dutching } = Route.useLoaderData()
  const [activeTab, setActiveTab] = useState<'binary' | 'dutching'>('binary')

  // Check if data is available
  if (!binary || !dutching) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-green-500">$</span>
            <span className="text-zinc-100">fetch --source predict.fun</span>
          </div>
          <p className="text-sm text-zinc-600">// BNB chain • hybrid CLOB</p>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/30">
          <div className="border-b border-zinc-800 px-4 py-2">
            <span className="text-sm text-zinc-500">status</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-yellow-500">!</span>
              <div className="space-y-2">
                <p className="text-sm text-yellow-500">data not available</p>
                <p className="text-sm text-zinc-600">
                  predict.fun data is not yet cached. ensure the collector server has PREDICT_FUN_API_KEY configured.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-zinc-600 flex items-center gap-2">
          <span>status:</span>
          <span className="text-yellow-500">pending_data</span>
        </div>
      </div>
    )
  }

  const binaryOpps = binary.filter((m) => m.margin > 0.005)
  const dutchingYesOpps = dutching.filter((e) => e.yesMargin > 0.01)
  const dutchingNoOpps = dutching.filter((e) => e.noMargin > 0.01)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-green-500">$</span>
            <span className="text-zinc-100 text-sm sm:text-base">scan --market predict.fun --mode {activeTab}</span>
          </div>
          <p className="text-sm text-zinc-600 hidden sm:block">// BNB chain • hybrid CLOB</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex border border-zinc-800">
          <TabButton
            active={activeTab === 'binary'}
            onClick={() => setActiveTab('binary')}
          >
            binary
          </TabButton>
          <TabButton
            active={activeTab === 'dutching'}
            onClick={() => setActiveTab('dutching')}
          >
            dutching
          </TabButton>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 text-sm">
        <span className="text-zinc-600">
          markets: <span className="text-zinc-400">{activeTab === 'binary' ? binary.length : dutching.length}</span>
        </span>
        <span className="text-zinc-600">
          opportunities:{' '}
          <span className="text-green-500">
            {activeTab === 'binary' ? binaryOpps.length : dutchingYesOpps.length + dutchingNoOpps.length}
          </span>
        </span>
        <span className="text-zinc-600">
          updated: <span className="text-zinc-400">{new Date().toLocaleTimeString()}</span>
        </span>
      </div>

      {/* Content */}
      {activeTab === 'binary' ? (
        <BinaryMarketsTable markets={binary} opportunities={binaryOpps.length} />
      ) : (
        <DutchingEventsTable events={dutching} yesOpps={dutchingYesOpps.length} noOpps={dutchingNoOpps.length} />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm transition-colors ${
        active
          ? 'bg-zinc-800 text-green-500'
          : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-400'
      }`}
    >
      {children}
    </button>
  )
}

function BinaryMarketsTable({ markets, opportunities }: { markets: MarketData[]; opportunities: number }) {
  return (
    <div className="space-y-4">
      {opportunities > 0 && (
        <div className="border border-green-500/30 bg-green-500/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500">▲</span>
            <span className="text-green-500">{opportunities} arbitrage opportunities detected</span>
          </div>
          <p className="mt-1 text-sm text-zinc-600">condition: ask(YES) + ask(NO) &lt; 1.00</p>
        </div>
      )}

      <div className="border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-3 py-2 text-left font-medium text-zinc-500 hide-mobile">#</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">MARKET</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500 hide-mobile">ASK_YES</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500 hide-mobile">ASK_NO</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">SUM</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">MARGIN</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500 hide-mobile">LIQ</th>
            </tr>
          </thead>
          <tbody>
            {markets.slice(0, 50).map((market, i) => {
              const hasOpp = market.margin > 0.005
              return (
                <tr
                  key={market.id}
                  className={`border-b border-zinc-800/50 ${hasOpp ? 'bg-green-500/5' : 'hover:bg-zinc-900/30'}`}
                >
                  <td className="px-3 py-2 text-zinc-600 hide-mobile">{String(i + 1).padStart(2, '0')}</td>
                  <td className="max-w-[300px] truncate px-3 py-2 text-zinc-300 market-title">{market.title}</td>
                  <td className="px-3 py-2 text-right text-zinc-400 hide-mobile">{(market.askYes * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right text-zinc-400 hide-mobile">{(market.askNo * 100).toFixed(1)}%</td>
                  <td className={`px-3 py-2 text-right ${market.sumAsks < 0.98 ? 'text-green-500' : 'text-zinc-400'}`}>
                    {(market.sumAsks * 100).toFixed(1)}%
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${getMarginColor(market.margin)}`}>
                    {market.margin > 0 ? '+' : ''}{(market.margin * 100).toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-600 hide-mobile">{formatCurrency(market.liquidity)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-zinc-600">
        showing {Math.min(50, markets.length)} of {markets.length} markets
      </div>
    </div>
  )
}

function DutchingEventsTable({ events, yesOpps, noOpps }: { events: DutchingEvent[]; yesOpps: number; noOpps: number }) {
  return (
    <div className="space-y-4">
      {(yesOpps > 0 || noOpps > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {yesOpps > 0 && (
            <div className="border border-green-500/30 bg-green-500/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500">▲</span>
                <span className="text-green-500">{yesOpps} BUY_ALL_YES opportunities</span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">condition: Σ(YES asks) &lt; 1.00</p>
            </div>
          )}
          {noOpps > 0 && (
            <div className="border border-purple-500/30 bg-purple-500/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-purple-500">▲</span>
                <span className="text-purple-500">{noOpps} BUY_ALL_NO opportunities</span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">condition: Σ(NO asks) &lt; (N-1)</p>
            </div>
          )}
        </div>
      )}

      <div className="border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-3 py-2 text-left font-medium text-zinc-500 hide-mobile">#</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">EVENT</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">N</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500 hide-mobile">Σ_YES</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">Y_MGN</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500 hide-mobile">Σ_NO</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500 hide-mobile">N-1</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">N_MGN</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500 hide-mobile">ME</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500 hide-mobile">LIQ</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 30).map((event, i) => {
              const nMinus1 = event.outcomeCount - 1
              const hasYesOpp = event.yesMargin > 0.01
              const hasNoOpp = event.noMargin > 0.01
              const hasOpp = hasYesOpp || hasNoOpp

              return (
                <tr
                  key={event.id}
                  className={`border-b border-zinc-800/50 ${hasOpp ? 'bg-green-500/5' : 'hover:bg-zinc-900/30'}`}
                >
                  <td className="px-3 py-2 text-zinc-600 hide-mobile">{String(i + 1).padStart(2, '0')}</td>
                  <td className="max-w-[240px] truncate px-3 py-2 text-zinc-300 market-title">{event.title}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{event.outcomeCount}</td>
                  <td className={`px-3 py-2 text-right hide-mobile ${event.sumYesAsks < 0.97 ? 'text-green-500' : 'text-zinc-400'}`}>
                    {(event.sumYesAsks * 100).toFixed(1)}%
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${getMarginColor(event.yesMargin)}`}>
                    {event.yesMargin > 0 ? '+' : ''}{(event.yesMargin * 100).toFixed(1)}%
                  </td>
                  <td className={`px-3 py-2 text-right hide-mobile ${event.sumNoAsks < nMinus1 * 0.97 ? 'text-purple-500' : 'text-zinc-400'}`}>
                    {(event.sumNoAsks * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-600 hide-mobile">{nMinus1 * 100}%</td>
                  <td className={`px-3 py-2 text-right font-medium ${getMarginColorPurple(event.noMargin)}`}>
                    {event.noMargin > 0 ? '+' : ''}{(event.noMargin * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right hide-mobile">
                    <span className={getMeStatusColor(event.meStatus)}>{event.meStatus ?? '--'}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-600 hide-mobile">{formatCurrency(event.totalLiquidity)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-zinc-600">
        showing {Math.min(30, events.length)} of {events.length} events
      </div>
    </div>
  )
}

function getMarginColor(margin: number): string {
  if (margin > 0.02) return 'text-green-500'
  if (margin > 0) return 'text-yellow-500'
  return 'text-red-500'
}

function getMarginColorPurple(margin: number): string {
  if (margin > 0.02) return 'text-purple-500'
  if (margin > 0) return 'text-yellow-500'
  return 'text-red-500'
}

function getMeStatusColor(status?: string): string {
  if (status === 'yes') return 'text-green-500'
  if (status === 'no') return 'text-red-500'
  return 'text-zinc-500'
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}
