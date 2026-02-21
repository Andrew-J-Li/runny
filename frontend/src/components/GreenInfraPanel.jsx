import { Leaf, CheckCircle, XCircle, DollarSign, Sparkles } from 'lucide-react'

function fmt(val) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

export default function GreenInfraPanel({ recommendations, highlightedBmps }) {
  if (!recommendations || recommendations.length === 0) return null

  const highlightSet = new Set(highlightedBmps || [])
  const hasHighlights = highlightSet.size > 0

  // Sort: highlighted first, then suitable, then the rest
  const sorted = [...recommendations].sort((a, b) => {
    const aH = highlightSet.has(a.id) ? 0 : 1
    const bH = highlightSet.has(b.id) ? 0 : 1
    if (aH !== bH) return aH - bH
    if (a.suitable !== b.suitable) return a.suitable ? -1 : 1
    return 0
  })

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Leaf className="w-5 h-5 text-emerald-400" />
        Green Infrastructure Recommendations
      </h3>

      {hasHighlights && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-blue-950/30 border border-blue-800/40 text-xs text-blue-300 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Highlighted BMPs address the selected compliance issue
        </div>
      )}

      <div className="space-y-3">
        {sorted.map(bmp => {
          const isHighlighted = highlightSet.has(bmp.id)
          return (
          <div
            key={bmp.id}
            className={`rounded-lg border p-4 transition-all duration-300 ${
              isHighlighted
                ? 'bg-blue-950/30 border-blue-500/60 ring-1 ring-blue-500/40 shadow-lg shadow-blue-500/10'
                : bmp.suitable
                  ? 'bg-emerald-950/20 border-emerald-800/40'
                  : 'bg-slate-800/30 border-slate-700/40'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">{bmp.name}</h4>
                  {isHighlighted && (
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Fix
                    </span>
                  )}
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
          )
        })}
      </div>
    </div>
  )
}
