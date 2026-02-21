import { useState } from 'react'
import { Leaf, CheckCircle, XCircle, DollarSign, Sparkles, Plus, Minus, ArrowRight, Loader2 } from 'lucide-react'

function fmt(val) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

export default function GreenInfraPanel({ recommendations, highlightedBmps, appliedBmps, onApplyBmp, onRemoveBmp, applyingBmp }) {
  const [tab, setTab] = useState('available') // 'available' | 'applied'

  if (!recommendations || recommendations.length === 0) return null

  const highlightSet = new Set(highlightedBmps || [])
  const appliedSet = new Set(appliedBmps || [])
  const hasHighlights = highlightSet.size > 0

  const availableBmps = recommendations.filter(b => !appliedSet.has(b.id))
  const appliedBmpsList = recommendations.filter(b => appliedSet.has(b.id))

  // Sort: highlighted first, then suitable, then the rest
  const sortBmps = (list) => [...list].sort((a, b) => {
    const aH = highlightSet.has(a.id) ? 0 : 1
    const bH = highlightSet.has(b.id) ? 0 : 1
    if (aH !== bH) return aH - bH
    if (a.suitable !== b.suitable) return a.suitable ? -1 : 1
    return 0
  })

  const renderBmp = (bmp, isApplied) => {
    const isHighlighted = highlightSet.has(bmp.id)
    const isLoading = applyingBmp === bmp.id
    return (
      <div
        key={bmp.id}
        className={`rounded-lg border p-4 transition-all duration-300 ${
          isHighlighted
            ? 'bg-blue-950/30 border-blue-500/60 ring-1 ring-blue-500/40 shadow-lg shadow-blue-500/10'
            : isApplied
              ? 'bg-emerald-950/30 border-emerald-600/50'
              : bmp.suitable
                ? 'bg-emerald-950/20 border-emerald-800/40'
                : 'bg-slate-800/30 border-slate-700/40'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold">{bmp.name}</h4>
              {isHighlighted && (
                <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Fix
                </span>
              )}
              {isApplied && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Active
                </span>
              )}
              {!isApplied && bmp.suitable ? (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Recommended</span>
              ) : !isApplied ? (
                <span className="text-xs bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">Limited</span>
              ) : null}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{bmp.description}</p>
          </div>

          {/* Apply / Remove button */}
          {isApplied ? (
            <button
              onClick={() => onRemoveBmp?.(bmp.id)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-red-900/30 text-red-300 border border-red-800/40 hover:bg-red-900/50 transition-colors ml-3 flex-shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Minus className="w-3 h-3" />}
              Remove
            </button>
          ) : (
            <button
              onClick={() => onApplyBmp?.(bmp.id)}
              disabled={isLoading || !bmp.suitable}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-emerald-900/30 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/50 transition-colors ml-3 flex-shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Apply
            </button>
          )}
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
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Leaf className="w-5 h-5 text-emerald-400" />
        Green Infrastructure
      </h3>

      {/* Tabs */}
      <div className="flex rounded-lg bg-slate-800/50 p-0.5 mb-4">
        <button
          onClick={() => setTab('available')}
          className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all cursor-pointer ${
            tab === 'available'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Available ({availableBmps.length})
        </button>
        <button
          onClick={() => setTab('applied')}
          className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all cursor-pointer ${
            tab === 'applied'
              ? 'bg-emerald-900/60 text-emerald-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Applied ({appliedBmpsList.length})
        </button>
      </div>

      {hasHighlights && tab === 'available' && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-blue-950/30 border border-blue-800/40 text-xs text-blue-300 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Highlighted BMPs address the selected compliance issue
        </div>
      )}

      {/* Applied summary banner */}
      {appliedBmpsList.length > 0 && tab === 'available' && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5" />
            {appliedBmpsList.length} BMP{appliedBmpsList.length !== 1 ? 's' : ''} applied — analysis updated
          </span>
          <button onClick={() => setTab('applied')} className="flex items-center gap-1 underline cursor-pointer hover:text-emerald-200">
            View <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="space-y-3">
        {tab === 'available' && sortBmps(availableBmps).map(bmp => renderBmp(bmp, false))}
        {tab === 'applied' && appliedBmpsList.length === 0 && (
          <div className="text-center py-6 text-sm text-slate-500">
            No BMPs applied yet. Apply recommendations from the Available tab.
          </div>
        )}
        {tab === 'applied' && appliedBmpsList.map(bmp => renderBmp(bmp, true))}
      </div>
    </div>
  )
}
