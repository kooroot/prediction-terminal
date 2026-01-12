import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/kalshi')({
  component: KalshiPage,
})

function KalshiPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-green-500">$</span>
          <span className="text-zinc-100">fetch --source kalshi</span>
        </div>
        <p className="text-xs text-zinc-600">// CFTC-regulated • centralized exchange</p>
      </div>

      {/* Status Box */}
      <div className="border border-zinc-800 bg-zinc-900/30">
        <div className="border-b border-zinc-800 px-4 py-2">
          <span className="text-xs text-zinc-500">status</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-yellow-500">!</span>
            <div className="space-y-2">
              <p className="text-sm text-yellow-500">RSA authentication required</p>
              <p className="text-xs text-zinc-600">
                kalshi API requires RSA key pair for authentication
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <div className="space-y-2 text-xs">
              <p className="text-zinc-500">// configure environment variables:</p>
              <div className="bg-zinc-900 border border-zinc-800 p-3 space-y-1">
                <p className="text-zinc-400">
                  <span className="text-cyan-500">KALSHI_KEY_ID</span>=your_key_id
                </p>
                <p className="text-zinc-400">
                  <span className="text-cyan-500">KALSHI_PRIVATE_KEY</span>=your_rsa_private_key
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-zinc-600 flex items-center gap-2">
        <span>status:</span>
        <span className="text-yellow-500">pending_auth</span>
      </div>
    </div>
  )
}
