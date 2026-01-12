# prediction-dashboard

Prediction market arbitrage scanner with a terminal-style UI.

## Overview

Real-time orderbook scanner for prediction markets. Detects arbitrage opportunities across multiple platforms.

```
$ scan --market polymarket --mode binary

markets: 142    opportunities: 3    updated: 17:21:37
```

## Supported Markets

| Platform     | Chain     | Type     | Status  |
|--------------|-----------|----------|---------|
| Polymarket   | Polygon   | CLOB     | Active  |
| Predict.fun  | Blast     | CLOB     | Pending |
| Kalshi       | Regulated | Exchange | Pending |

## Arbitrage Strategies

### Binary Arbitrage
```
when ask(YES) + ask(NO) < 1.00 → buy both sides → guaranteed profit
```

### Dutching (Multi-Outcome)
```
when sum(YES asks) < 1.00 in mutually exclusive markets → buy all outcomes
```

## Tech Stack

- **Framework**: TanStack React Start
- **Runtime**: Cloudflare Workers
- **Styling**: Tailwind CSS 4
- **Font**: JetBrains Mono

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+

### Installation

```bash
git clone https://github.com/your-username/prediction-dashboard.git
cd prediction-dashboard
bun install
```

### Development

```bash
bun run dev
```

Open http://localhost:3000

### Build & Deploy

```bash
bun run build
bun run deploy  # deploys to Cloudflare Workers
```

## Configuration

Create a `.dev.vars` file for local development:

```env
# Predict.fun (optional)
PREDICT_FUN_API_KEY=your_api_key

# Kalshi (optional)
KALSHI_KEY_ID=your_key_id
KALSHI_PRIVATE_KEY=your_rsa_private_key
```

## Project Structure

```
src/
├── routes/
│   ├── __root.tsx      # Root layout
│   ├── index.tsx       # Home page
│   ├── polymarket.tsx  # Polymarket scanner
│   ├── predictfun.tsx  # Predict.fun scanner
│   └── kalshi.tsx      # Kalshi scanner
├── lib/
│   ├── api/            # API integrations
│   └── types.ts        # TypeScript types
└── styles/
    └── app.css         # Global styles
```

## Disclaimer

This tool is for educational and research purposes only. Displayed margins do not account for:
- Slippage
- Trading fees
- Execution risk
- Gas costs (for on-chain markets)

Always do your own research before trading.

## License

MIT
