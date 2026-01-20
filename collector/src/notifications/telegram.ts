import type { MarketData } from '../types'

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot'

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

function formatMarginPercent(margin: number): string {
  return `${(margin * 100).toFixed(1)}%`
}

function formatMarketLine(index: number, market: MarketData): string {
  const vol = formatVolume(market.volume24h ?? 0)
  const margin = formatMarginPercent(market.margin)
  const expiry = market.daysToExpiry ? ` | ${market.daysToExpiry}d` : ''

  return `${index}. ${market.title}
   Vol: ${vol} | Yes: ${market.askYes.toFixed(2)} | No: ${market.askNo.toFixed(2)} | Margin: ${margin}${expiry}`
}

function buildMessage(data: TopVolumeData, period: 'AM' | 'PM'): string {
  const lines: string[] = []
  const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })

  lines.push(`📊 Daily Top Markets (${period} - ${timestamp})`)
  lines.push('')

  // Polymarket
  if (data.polymarket.length > 0) {
    lines.push('🔵 Polymarket Top 20')
    data.polymarket.slice(0, 20).forEach((market, i) => {
      lines.push(formatMarketLine(i + 1, market))
    })
    lines.push('')
  }

  // Predict.fun
  if (data.predictfun.length > 0) {
    lines.push('🟣 Predict.fun Top 20')
    data.predictfun.slice(0, 20).forEach((market, i) => {
      lines.push(formatMarketLine(i + 1, market))
    })
    lines.push('')
  }

  // Kalshi
  if (data.kalshi.length > 0) {
    lines.push('🟢 Kalshi Top 20')
    data.kalshi.slice(0, 20).forEach((market, i) => {
      lines.push(formatMarketLine(i + 1, market))
    })
    lines.push('')
  }

  return lines.join('\n')
}

export async function sendTelegramMessage(
  config: TelegramConfig,
  message: string
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
      console.error('[Telegram] Failed to send message:', error)
      return false
    }

    console.log('[Telegram] Message sent successfully')
    return true
  } catch (error) {
    console.error('[Telegram] Error sending message:', error)
    return false
  }
}

export async function sendTopVolumeAlert(
  config: TelegramConfig,
  data: TopVolumeData,
  period: 'AM' | 'PM'
): Promise<boolean> {
  const message = buildMessage(data, period)
  return sendTelegramMessage(config, message)
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
