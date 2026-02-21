import { DollarSign, TrendingUp, AlertTriangle, PiggyBank } from 'lucide-react'

function fmt(val) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

const RATING_COLORS = {
  Excellent: 'text-emerald-400',
  Good: 'text-lime-400',
  Fair: 'text-yellow-400',
  Expensive: 'text-red-400',
}

export default function CostPanel({ costs }) {
  if (!costs) return null

  const { summary, breakdown, annual_costs, risk_factors } = costs

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-yellow-400" />
        Cost-Benefit Analysis
      </h3>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500 mb-1">Upfront Cost</div>
          <div className="text-lg font-bold">{fmt(summary.total_upfront)}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500 mb-1">Annual Cost</div>
          <div className="text-lg font-bold">{fmt(summary.total_annual)}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500 mb-1">20-Year Lifecycle</div>
          <div className="text-lg font-bold">{fmt(summary.total_20yr_lifecycle)}</div>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2 mb-4">
        <PiggyBank className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-400">Cost Rating:</span>
        <span className={`text-sm font-semibold ${RATING_COLORS[summary.cost_rating] || 'text-slate-300'}`}>
          {summary.cost_rating}
        </span>
        <span className="text-xs text-slate-500">({summary.cost_per_sqft}/sqft)</span>
      </div>

      {/* Breakdown */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Upfront Breakdown</h4>
        <div className="space-y-1.5">
          {[
            ['Land Acquisition', breakdown.land],
            ['Construction', breakdown.construction],
            ['Site Preparation', breakdown.site_prep],
            ['Stormwater Mitigation', breakdown.stormwater_mitigation],
            ['Permits & Fees', breakdown.permits],
          ].map(([label, val]) => {
            const pct = summary.total_upfront > 0 ? (val / summary.total_upfront) * 100 : 0
            return (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-mono">{fmt(val)}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Annual costs */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Annual Costs</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['Operations', annual_costs.operations],
            ['Water Usage', annual_costs.water],
            ['SW Fees', annual_costs.stormwater_fees],
            ['BMP Maint.', annual_costs.bmp_maintenance],
          ].map(([label, val]) => (
            <div key={label} className="bg-slate-800/30 rounded-lg px-3 py-2">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="text-sm font-semibold">{fmt(val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk factors */}
      {risk_factors && risk_factors.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Risk Factors</h4>
          <div className="space-y-2">
            {risk_factors.map((rf, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                  rf.severity === 'high'
                    ? 'bg-red-950/20 border border-red-800/30'
                    : 'bg-amber-950/20 border border-amber-800/30'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
                  rf.severity === 'high' ? 'text-red-400' : 'text-amber-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm">{rf.factor}</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{fmt(rf.lifetime_impact)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
