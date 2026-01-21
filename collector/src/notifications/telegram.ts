import type { MarketData } from '../types'

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot'
const TELEGRAM_MESSAGE_LIMIT = 4000 // Leave some buffer from 4096
const RETRY_DELAYS = [1000, 3000, 5000] // Retry delays in ms
const MESSAGE_DELAY = 500 // Delay between messages to avoid rate limiting

interface TelegramConfig {
  botToken: string
  chatId: string
}

interface TopVolumeData {
  polymarket: MarketData[]
  predictfun: MarketData[]
  kalshi: MarketData[]
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`
  }
  return `$${volume.toFixed(0)}`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function getMarketUrl(market: MarketData): string {
  switch (market.platform) {
    case 'polymarket':
      return `https://polymarket.com/event/${market.slug || market.id}`
    case 'predictfun':
      return `https://predict.fun/market/${market.slug || market.id}`
    case 'kalshi':
      return `https://kalshi.com/markets/${market.id}`
    default:
      return '#'
  }
}

function formatCompactMarket(index: number, market: MarketData): string {
  const vol = formatVolume(market.volume24h ?? 0)
  const margin = market.margin > 0 ? `+${(market.margin * 100).toFixed(1)}%` : `${(market.margin * 100).toFixed(1)}%`
  const title = escapeHtml(market.title.length > 45 ? market.title.slice(0, 42) + '...' : market.title)
  const url = getMarketUrl(market)
  const yesPrice = (market.askYes * 100).toFixed(0)
  const noPrice = (market.askNo * 100).toFixed(0)

  return `<b>${index}.</b> <a href="${url}">${title}</a>
    💰 ${vol}  ·  Y:${yesPrice}¢ / N:${noPrice}¢  ·  ${margin}`
}

interface PlatformConfig {
  emoji: string
  name: string
  key: keyof TopVolumeData
}

const PLATFORM_CONFIG: PlatformConfig[] = [
  { emoji: '🔵', name: 'Polymarket', key: 'polymarket' },
  { emoji: '🟣', name: 'Predict.fun', key: 'predictfun' },
  { emoji: '🟢', name: 'Kalshi', key: 'kalshi' },
]

function buildPlatformMessage(
  platform: PlatformConfig,
  markets: MarketData[],
  period: 'AM' | 'PM',
  timestamp: string
): string {
  const lines: string[] = []

  lines.push(`${platform.emoji} <b>${platform.name} Top 10</b>`)
  lines.push(`📅 ${timestamp}`)
  lines.push('━━━━━━━━━━━━━━━━━━━━')

  // Limit to 10 to keep message compact
  markets.slice(0, 10).forEach((market, i) => {
    lines.push('')
    lines.push(formatCompactMarket(i + 1, market))
  })

  const totalVol = markets.slice(0, 10).reduce((sum, m) => sum + (m.volume24h ?? 0), 0)
  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━━━')
  lines.push(`📊 Total Vol: <b>${formatVolume(totalVol)}</b>`)

  return lines.join('\n')
}

function buildSummaryMessage(data: TopVolumeData, period: 'AM' | 'PM'): string {
  const timestamp = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const lines: string[] = []
  lines.push(`📊 <b>Market Summary</b>`)
  lines.push(`📅 ${timestamp} (${period})`)
  lines.push('━━━━━━━━━━━━━━━━━━━━')
  lines.push('')

  for (const platform of PLATFORM_CONFIG) {
    const markets = data[platform.key]
    if (markets.length > 0) {
      const totalVol = markets.slice(0, 10).reduce((sum, m) => sum + (m.volume24h ?? 0), 0)
      const topMarket = markets[0]
      const topTitle = escapeHtml(topMarket.title.length > 35 ? topMarket.title.slice(0, 32) + '...' : topMarket.title)
      lines.push(`${platform.emoji} <b>${platform.name}</b>`)
      lines.push(`    Vol: ${formatVolume(totalVol)}`)
      lines.push(`    #1: ${topTitle}`)
      lines.push('')
    }
  }

  return lines.join('\n').trim()
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function sendTelegramMessage(
  config: TelegramConfig,
  message: string,
  retryCount = 0
): Promise<boolean> {
  try {
    const url = `${TELEGRAM_API_BASE}${config.botToken}/sendMessage`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()

      // Check for rate limiting (429)
      if (response.status === 429 && retryCount < RETRY_DELAYS.length) {
        const retryAfter = RETRY_DELAYS[retryCount]
        console.log(`[Telegram] Rate limited, retrying in ${retryAfter}ms...`)
        await sleep(retryAfter)
        return sendTelegramMessage(config, message, retryCount + 1)
      }

      console.error('[Telegram] Failed to send message:', error)
      return false
    }

    console.log('[Telegram] Message sent successfully')
    return true
  } catch (error) {
    // Retry on network errors
    if (retryCount < RETRY_DELAYS.length) {
      const retryAfter = RETRY_DELAYS[retryCount]
      console.log(`[Telegram] Network error, retrying in ${retryAfter}ms...`, error)
      await sleep(retryAfter)
      return sendTelegramMessage(config, message, retryCount + 1)
    }

    console.error('[Telegram] Error sending message after retries:', error)
    return false
  }
}

export async function sendTopVolumeAlert(
  config: TelegramConfig,
  data: TopVolumeData,
  period: 'AM' | 'PM'
): Promise<boolean> {
  const timestamp = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  let allSuccess = true

  // Send summary message first
  const summary = buildSummaryMessage(data, period)
  const summaryResult = await sendTelegramMessage(config, summary)
  if (!summaryResult) allSuccess = false

  await sleep(MESSAGE_DELAY)

  // Send individual platform messages
  for (const platform of PLATFORM_CONFIG) {
    const markets = data[platform.key]
    if (markets.length > 0) {
      const message = buildPlatformMessage(platform, markets, period, timestamp)
      const result = await sendTelegramMessage(config, message)
      if (!result) allSuccess = false
      await sleep(MESSAGE_DELAY)
    }
  }

  return allSuccess
}

export function createTelegramConfig(): TelegramConfig | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.log('[Telegram] Bot token or chat ID not configured. Notifications disabled.')
    return null
  }

  return { botToken, chatId }
}
