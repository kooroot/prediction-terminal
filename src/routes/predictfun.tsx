import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/predictfun')({
  component: PredictfunPage,
})

function PredictfunPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-green-500">$</span>
          <span className="text-zinc-100">fetch --source predict.fun</span>
        </div>
        <p className="text-xs text-zinc-600">// blast chain • hybrid CLOB</p>
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
              <p className="text-sm text-yellow-500">authentication required</p>
              <p className="text-xs text-zinc-600">
                predict.fun API requires an API key for data access
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <div className="space-y-2 text-xs">
              <p className="text-zinc-500">// configure environment variables:</p>
              <div className="bg-zinc-900 border border-zinc-800 p-3 space-y-1">
                <p className="text-zinc-400">
                  <span className="text-cyan-500">PREDICT_FUN_API_KEY</span>=your_api_key
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
