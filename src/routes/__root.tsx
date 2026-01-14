import {
  createRootRoute,
  Outlet,
  Link,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Prediction Market Dashboard' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-200">
        {/* Terminal Header */}
        <header className="border-b border-zinc-800/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex h-auto min-h-12 flex-col items-start gap-2 py-3 sm:h-12 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:py-0">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 text-zinc-100">
                <span className="text-green-500">~</span>
                <span className="font-medium text-sm sm:text-base">arb-scanner</span>
              </Link>

              {/* Navigation */}
              <nav className="flex flex-wrap items-center gap-1">
                <NavLink to="/">home</NavLink>
                <span className="text-zinc-700 hidden sm:inline">/</span>
                <NavLink to="/polymarket">polymarket</NavLink>
                <span className="text-zinc-700 hidden sm:inline">/</span>
                <NavLink to="/predictfun">predict.fun</NavLink>
                <span className="text-zinc-700 hidden sm:inline">/</span>
                <NavLink to="/kalshi">kalshi</NavLink>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800/50 py-4 text-center text-sm text-zinc-600">
          <span className="text-green-500/70">$</span> arbitrage scanner v1.0
        </footer>
      </div>
    </RootDocument>
  )
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-2 py-1 text-sm text-zinc-500 transition-colors hover:text-zinc-200 [&.active]:text-green-500"
    >
      {children}
    </Link>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
