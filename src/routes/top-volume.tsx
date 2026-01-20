import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import type { MarketData, Platform } from '~/lib/types'

const CACHE_SERVER_URL = process.env.CACHE_SERVER_URL || 'http://localhost:3001'

interface TopVolumeResponse {
  data: MarketData[]
  updatedAt: number
  type: string
  platform?: Platform
  scope?: string
}

const fetchTopVolumeAll = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const response = await fetch(`${CACHE_SERVER_URL}/api/top-volume/all`)
    if (!response.ok) return null
    return (await response.json()) as TopVolumeResponse
  } catch {
    return null
  }
})

const fetchTopVolumePlatform = createServerFn({ method: 'GET' })
  .validator((platform: Platform) => platform)
  .handler(async ({ data: platform }) => {
    try {
      const response = await fetch(`${CACHE_SERVER_URL}/api/top-volume/${platform}`)
      if (!response.ok) return null
      return (await response.json()) as TopVolumeResponse
    } catch {
      return null
    }
  })

export const Route = createFileRoute('/top-volume')({
  component: TopVolumePage,
  pendingComponent: LoadingPage,
  loader: async () => {
    const [all, polymarket, predictfun, kalshi] = await Promise.all([
      fetchTopVolumeAll(),
      fetchTopVolumePlatform({ data: 'polymarket' }),
      fetchTopVolumePlatform({ data: 'predictfun' }),
      fetchTopVolumePlatform({ data: 'kalshi' }),
    ])
    return { all, polymarket, predictfun, kalshi }
  },
})

function LoadingPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-green-500">$</span>
          <span className="text-zinc-100">fetch --top-volume --sort 24h</span>
          <span className="cursor" />
        </div>
        <p className="text-sm text-zinc-600">// top 20 markets by 24-hour volume</p>
      </div>

      <div className="border border-zinc-800 bg-zinc-900/30 p-8">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="animate-pulse">▓</span>
            <span className="animate-pulse" style={{ animationDelay: '0.1s' }}>▓</span>
            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>▓</span>
          </div>
          <div className="space-y-1">
            <p className="text-base text-zinc-400">loading volume data...</p>
            <p className="text-sm text-zinc-600">fetching top markets</p>
          </div>
        </div>
      </div>
    </div>
  )
}

type TabType = 'all' | 'polymarket' | 'predictfun' | 'kalshi'

function TopVolumePage() {
  const { all, polymarket, predictfun, kalshi } = Route.useLoaderData()
  const [activeTab, setActiveTab] = useState<TabType>('all')

  const hasData = all || polymarket || predictfun || kalshi

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-green-500">$</span>
            <span className="text-zinc-100">fetch --top-volume</span>
          </div>
          <p className="text-sm text-zinc-600">// top 20 markets by 24-hour volume</p>
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
                  market data is not yet cached. ensure the collector server is running and accessible.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getActiveData = (): MarketData[] => {
    switch (activeTab) {
      case 'all':
        return all?.data ?? []
      case 'polymarket':
        return polymarket?.data ?? []
      case 'predictfun':
        return predictfun?.data ?? []
      case 'kalshi':
        return kalshi?.data ?? []
    }
  }

  const activeData = getActiveData()
  const totalVolume = activeData.reduce((sum, m) => sum + (m.volume24h ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-green-500">$</span>
            <span className="text-zinc-100 text-sm sm:text-base">
              rank --by volume24h --source {activeTab}
            </span>
          </div>
          <p className="text-sm text-zinc-600 hidden sm:block">// top 20 markets by 24-hour trading volume</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex border border-zinc-800 flex-wrap">
          <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
            all
          </TabButton>
          <TabButton active={activeTab === 'polymarket'} onClick={() => setActiveTab('polymarket')}>
            polymarket
          </TabButton>
          <TabButton active={activeTab === 'predictfun'} onClick={() => setActiveTab('predictfun')}>
            predict.fun
          </TabButton>
          <TabButton active={activeTab === 'kalshi'} onClick={() => setActiveTab('kalshi')}>
            kalshi
          </TabButton>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 text-sm flex-wrap">
        <span className="text-zinc-600">
          markets: <span className="text-zinc-400">{activeData.length}</span>
        </span>
        <span className="text-zinc-600">
          total_volume: <span className="text-green-500">{formatCurrency(totalVolume)}</span>
        </span>
        <span className="text-zinc-600">
          updated: <span className="text-zinc-400">{new Date().toLocaleTimeString()}</span>
        </span>
      </div>

      {/* Volume Summary */}
      <div className="border border-blue-500/30 bg-blue-500/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-blue-500">◆</span>
          <span className="text-blue-500">
            Top 20 Markets by 24H Volume {activeTab !== 'all' && `(${activeTab})`}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          sorted by trading volume in the last 24 hours
        </p>
      </div>

      {/* Table */}
      <TopVolumeTable markets={activeData} showPlatform={activeTab === 'all'} />
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
      className={`px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-zinc-800 text-green-500'
          : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-400'
      }`}
    >
      {children}
    </button>
  )
}

function TopVolumeTable({ markets, showPlatform }: { markets: MarketData[]; showPlatform: boolean }) {
  if (markets.length === 0) {
    return (
      <div className="border border-zinc-800 bg-zinc-900/30 p-8 text-center">
        <p className="text-zinc-500">no markets available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-3 py-2 text-left font-medium text-zinc-500">#</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">MARKET</th>
              {showPlatform && (
                <th className="px-3 py-2 text-left font-medium text-zinc-500 hide-mobile">PLATFORM</th>
              )}
              <th className="px-3 py-2 text-right font-medium text-zinc-500">VOL_24H</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500 hide-mobile">YES</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500 hide-mobile">NO</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">MARGIN</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500 hide-mobile">LIQ</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500 hide-mobile">EXPIRY</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market, i) => (
              <tr key={`${market.platform}-${market.id}`} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                <td className="px-3 py-2 text-zinc-600">{String(i + 1).padStart(2, '0')}</td>
                <td className="max-w-[280px] truncate px-3 py-2 market-title">
                  <a
                    href={getMarketUrl(market)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-300 hover:text-green-400 hover:underline"
                  >
                    {market.title}
                  </a>
                </td>
                {showPlatform && (
                  <td className="px-3 py-2 hide-mobile">
                    <PlatformBadge platform={market.platform} />
                  </td>
                )}
                <td className="px-3 py-2 text-right font-medium text-green-500">
                  {formatCurrency(market.volume24h ?? 0)}
                </td>
                <td className="px-3 py-2 text-right text-zinc-400 hide-mobile">
                  {(market.askYes * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right text-zinc-400 hide-mobile">
                  {(market.askNo * 100).toFixed(1)}%
                </td>
                <td className={`px-3 py-2 text-right font-medium ${getMarginColor(market.margin)}`}>
                  {market.margin > 0 ? '+' : ''}{(market.margin * 100).toFixed(2)}%
                </td>
                <td className="px-3 py-2 text-right text-zinc-600 hide-mobile">
                  {formatCurrency(market.liquidity)}
                </td>
                <td className="px-3 py-2 text-right text-zinc-600 hide-mobile">
                  {market.daysToExpiry ? `${market.daysToExpiry}d` : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-zinc-600">
        showing {markets.length} markets sorted by 24h volume
      </div>
    </div>
  )
}

function PlatformBadge({ platform }: { platform?: Platform }) {
  const config = {
    polymarket: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'poly' },
    predictfun: { color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'pred' },
    kalshi: { color: 'text-green-400', bg: 'bg-green-500/10', label: 'kalshi' },
  }

  const c = platform ? config[platform] : { color: 'text-zinc-400', bg: 'bg-zinc-500/10', label: '???' }

  return (
    <span className={`px-2 py-0.5 text-xs ${c.color} ${c.bg} rounded`}>
      {c.label}
    </span>
  )
}

function getMarketUrl(market: MarketData): string {
  switch (market.platform) {
    case 'polymarket':
      return `https://polymarket.com/event/${market.slug || market.id}`
    case 'predictfun':
      return `https://predict.fun/category/${market.slug || market.id}`
    case 'kalshi':
      return `https://kalshi.com/markets/${market.id}`
    default:
      return '#'
  }
}

function getMarginColor(margin: number): string {
  if (margin > 0.02) return 'text-green-500'
  if (margin > 0) return 'text-yellow-500'
  return 'text-red-500'
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}
