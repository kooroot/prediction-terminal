import crypto from 'crypto'

export interface KalshiCredentials {
  keyId: string
  privateKey: string
}

/**
 * Generate RSA-SHA256 signature for Kalshi API authentication
 *
 * Kalshi requires the following headers:
 * - KALSHI-ACCESS-KEY: Your API key ID
 * - KALSHI-ACCESS-SIGNATURE: RSA-SHA256 signature of (timestamp + method + path)
 * - KALSHI-ACCESS-TIMESTAMP: Unix timestamp in milliseconds
 */
export function signRequest(
  privateKey: string,
  timestamp: string,
  method: string,
  path: string
): string {
  const message = timestamp + method.toUpperCase() + path

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(message)
  sign.end()

  return sign.sign(privateKey, 'base64')
}

/**
 * Create authenticated headers for Kalshi API requests
 */
export function createKalshiHeaders(
  credentials: KalshiCredentials,
  method: string,
  path: string
): Record<string, string> {
  const timestamp = Date.now().toString()
  const signature = signRequest(credentials.privateKey, timestamp, method, path)

  return {
    'Content-Type': 'application/json',
    'KALSHI-ACCESS-KEY': credentials.keyId,
    'KALSHI-ACCESS-SIGNATURE': signature,
    'KALSHI-ACCESS-TIMESTAMP': timestamp,
  }
}

/**
 * Make an authenticated GET request to Kalshi API
 */
export async function kalshiFetch<T>(
  credentials: KalshiCredentials,
  path: string
): Promise<T> {
  const baseUrl = 'https://api.elections.kalshi.com/trade-api/v2'
  const url = `${baseUrl}${path}`
  const headers = createKalshiHeaders(credentials, 'GET', path)

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(`Kalshi API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}
