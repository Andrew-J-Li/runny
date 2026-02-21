import { Leaf, CheckCircle, XCircle, DollarSign } from 'lucide-react'

function fmt(val) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

export default function GreenInfraPanel({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Leaf className="w-5 h-5 text-emerald-400" />
        Green Infrastructure Recommendations
      </h3>

      <div className="space-y-3">
        {recommendations.map(bmp => (
          <div
            key={bmp.id}
            className={`rounded-lg border p-4 ${
              bmp.suitable
                ? 'bg-emerald-950/20 border-emerald-800/40'
                : 'bg-slate-800/30 border-slate-700/40'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">{bmp.name}</h4>
                  {bmp.suitable ? (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Recommended</span>
                  ) : (
                    <span className="text-xs bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">Limited</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{bmp.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="text-center">
                <div className="text-xs text-slate-500">Vol. Reduction</div>
                <div className="text-sm font-semibold text-emerald-400">{bmp.volume_reduction_pct.toFixed(0)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">Peak Reduction</div>
                <div className="text-sm font-semibold text-blue-400">{bmp.peak_reduction_pct.toFixed(0)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">Install Cost</div>
                <div className="text-sm font-semibold text-slate-300">{fmt(bmp.install_cost)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">Annual Maint.</div>
                <div className="text-sm font-semibold text-slate-300">{fmt(bmp.annual_maintenance)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
