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
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex h-12 items-center justify-between">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 text-zinc-100">
                <span className="text-green-500">~</span>
                <span className="font-medium">prediction-dashboard</span>
              </Link>

              {/* Navigation */}
              <nav className="flex items-center gap-1">
                <NavLink to="/">home</NavLink>
                <span className="text-zinc-700">/</span>
                <NavLink to="/polymarket">polymarket</NavLink>
                <span className="text-zinc-700">/</span>
                <NavLink to="/predictfun">predict.fun</NavLink>
                <span className="text-zinc-700">/</span>
                <NavLink to="/kalshi">kalshi</NavLink>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800/50 py-4 text-center text-xs text-zinc-600">
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
