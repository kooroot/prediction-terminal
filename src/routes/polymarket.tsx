import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { fetchBinaryMarketsFromCache, fetchDutchingEventsFromCache } from '~/lib/cache/client'
import type { MarketData, DutchingEvent } from '~/lib/types'

// Cache server URL - set via environment variable
const CACHE_SERVER_URL = process.env.CACHE_SERVER_URL || 'http://localhost:3001'

const getBinaryMarkets = createServerFn({ method: 'GET' }).handler(async () => {
  return await fetchBinaryMarketsFromCache('polymarket', CACHE_SERVER_URL)
})

const getDutchingEvents = createServerFn({ method: 'GET' }).handler(async () => {
  return await fetchDutchingEventsFromCache('polymarket', CACHE_SERVER_URL)
})

export const Route = createFileRoute('/polymarket')({
  component: PolymarketPage,
  pendingComponent: LoadingPage,
  loader: async () => {
    const [binary, dutching] = await Promise.all([getBinaryMarkets(), getDutchingEvents()])
    return { binary, dutching }
  },
})

function LoadingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-green-500">$</span>
          <span className="text-zinc-100">fetch --source polymarket</span>
          <span className="cursor" />
        </div>
        <p className="text-xs text-zinc-600">// polygon chain • decentralized CLOB</p>
      </div>

      {/* Loading State */}
      <div className="border border-zinc-800 bg-zinc-900/30 p-8">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="animate-pulse">▓</span>
            <span className="animate-pulse" style={{ animationDelay: '0.1s' }}>▓</span>
            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>▓</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-zinc-400">fetching orderbooks...</p>
            <p className="text-xs text-zinc-600">connecting to polymarket API</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PolymarketPage() {
  const { binary, dutching } = Route.useLoaderData()
  const [activeTab, setActiveTab] = useState<'binary' | 'dutching'>('binary')

  const binaryOpps = binary.filter((m) => m.margin > 0.005)
  const dutchingYesOpps = dutching.filter((e) => e.yesMargin > 0.01)
  const dutchingNoOpps = dutching.filter((e) => e.noMargin > 0.01)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-green-500">$</span>
            <span className="text-zinc-100">scan --market polymarket --mode {activeTab}</span>
          </div>
          <p className="text-xs text-zinc-600">// polygon chain • decentralized CLOB</p>
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
      <div className="flex items-center gap-6 text-xs">
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
      className={`px-4 py-2 text-xs transition-colors ${
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
      {/* Opportunities Alert */}
      {opportunities > 0 && (
        <div className="border border-green-500/30 bg-green-500/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500">▲</span>
            <span className="text-green-500">{opportunities} arbitrage opportunities detected</span>
          </div>
          <p className="mt-1 text-xs text-zinc-600">condition: ask(YES) + ask(NO) &lt; 1.00</p>
        </div>
      )}

      {/* Table */}
      <div className="border border-zinc-800 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-3 py-2 text-left font-medium text-zinc-500">#</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">MARKET</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">ASK_YES</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">ASK_NO</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">SUM</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">MARGIN</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">LIQ</th>
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
                  <td className="px-3 py-2 text-zinc-600">{String(i + 1).padStart(2, '0')}</td>
                  <td className="max-w-[300px] truncate px-3 py-2 text-zinc-300">{market.title}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{(market.askYes * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{(market.askNo * 100).toFixed(1)}%</td>
                  <td className={`px-3 py-2 text-right ${market.sumAsks < 0.98 ? 'text-green-500' : 'text-zinc-400'}`}>
                    {(market.sumAsks * 100).toFixed(1)}%
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${getMarginColor(market.margin)}`}>
                    {market.margin > 0 ? '+' : ''}{(market.margin * 100).toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-600">{formatCurrency(market.liquidity)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-xs text-zinc-600">
        showing {Math.min(50, markets.length)} of {markets.length} markets
      </div>
    </div>
  )
}

function DutchingEventsTable({ events, yesOpps, noOpps }: { events: DutchingEvent[]; yesOpps: number; noOpps: number }) {
  return (
    <div className="space-y-4">
      {/* Opportunities Alert */}
      {(yesOpps > 0 || noOpps > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {yesOpps > 0 && (
            <div className="border border-green-500/30 bg-green-500/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500">▲</span>
                <span className="text-green-500">{yesOpps} BUY_ALL_YES opportunities</span>
              </div>
              <p className="mt-1 text-xs text-zinc-600">condition: Σ(YES asks) &lt; 1.00</p>
            </div>
          )}
          {noOpps > 0 && (
            <div className="border border-purple-500/30 bg-purple-500/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-purple-500">▲</span>
                <span className="text-purple-500">{noOpps} BUY_ALL_NO opportunities</span>
              </div>
              <p className="mt-1 text-xs text-zinc-600">condition: Σ(NO asks) &lt; (N-1)</p>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border border-zinc-800 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-3 py-2 text-left font-medium text-zinc-500">#</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">EVENT</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">N</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">Σ_YES</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">Y_MGN</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">Σ_NO</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">N-1</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">N_MGN</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">DAYS</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">LIQ</th>
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
                  <td className="px-3 py-2 text-zinc-600">{String(i + 1).padStart(2, '0')}</td>
                  <td className="max-w-[240px] truncate px-3 py-2 text-zinc-300">{event.title}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{event.outcomeCount}</td>
                  <td className={`px-3 py-2 text-right ${event.sumYesAsks < 0.97 ? 'text-green-500' : 'text-zinc-400'}`}>
                    {(event.sumYesAsks * 100).toFixed(1)}%
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${getMarginColor(event.yesMargin)}`}>
                    {event.yesMargin > 0 ? '+' : ''}{(event.yesMargin * 100).toFixed(1)}%
                  </td>
                  <td className={`px-3 py-2 text-right ${event.sumNoAsks < nMinus1 * 0.97 ? 'text-purple-500' : 'text-zinc-400'}`}>
                    {(event.sumNoAsks * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-600">{nMinus1 * 100}%</td>
                  <td className={`px-3 py-2 text-right font-medium ${getMarginColorPurple(event.noMargin)}`}>
                    {event.noMargin > 0 ? '+' : ''}{(event.noMargin * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-600">{event.daysToExpiry?.toFixed(0) ?? '--'}</td>
                  <td className="px-3 py-2 text-right text-zinc-600">{formatCurrency(event.totalLiquidity)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-xs text-zinc-600">
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

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}
