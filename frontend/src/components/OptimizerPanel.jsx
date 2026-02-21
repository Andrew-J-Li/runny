import { useState } from 'react'
import { Zap, Target, DollarSign, Shield, TrendingUp, Loader2, ClipboardList, ArrowRight, AlertTriangle } from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot, Legend, Cell
} from 'recharts'

function fmtCost(val) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const isCompliant = d.compliance_status === 'compliant'
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="font-semibold text-white mb-1">Score: {d.score} · Grade: {d.grade} · {fmtCost(d.total_20yr)} lifecycle</div>
      <div className="text-slate-400">Imperviousness: {(d.frac_imperv * 100).toFixed(0)}%</div>
      <div className="text-slate-400">
        BMPs: {d.bmp_names?.length ? d.bmp_names.join(', ') : 'None'}
      </div>
      <div className={isCompliant ? 'text-emerald-400' : 'text-red-400'}>
        {isCompliant ? '✓ Compliant' : '✗ Non-compliant'}
      </div>
    </div>
  )
}

const MARKERS = [
  { key: 'best_score', label: 'Best Score', fill: '#22d3ee', icon: TrendingUp, desc: 'Highest environmental score' },
  { key: 'best_compliant', label: 'Best Compliant', fill: '#34d399', icon: Shield, desc: 'Best score that meets all regulations' },
  { key: 'best_balanced', label: 'Best Balanced', fill: '#fbbf24', icon: Target, desc: 'Optimal score-to-cost ratio' },
]

export default function OptimizerPanel({ onRunOptimize, siteReady }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)

  const handleRun = async () => {
    setLoading(true)
    setSelected(null)
    setError(null)
    try {
      const data = await onRunOptimize()
      setResult(data)
      // Auto-select the best balanced option
      if (data.best_balanced) setSelected(data.best_balanced)
      else if (data.best_compliant) setSelected(data.best_compliant)
      else if (data.best_score) setSelected(data.best_score)
    } catch (err) {
      console.error('Optimize failed:', err)
      setError('Optimization failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const hasData = result && result.pareto?.length > 0

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Pareto Optimizer
        </h3>
        <button
          onClick={handleRun}
          disabled={loading || !siteReady}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Optimizing…' : 'Find Optimal'}
        </button>
      </div>

      {!result && !loading && !error && (
        <p className="text-sm text-slate-500 text-center py-6">
          Sweep imperviousness levels &amp; BMP combinations to find the best score-vs-cost tradeoffs.
        </p>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center py-8 gap-3 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="water-loader w-32 h-2 bg-slate-800/60">
            <div className="wave wave-1" />
            <div className="wave wave-2" />
          </div>
          <p className="text-xs text-slate-400">Evaluating configurations…</p>
        </div>
      )}

      {result && !loading && !hasData && (
        <div className="flex flex-col items-center py-8 gap-3 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <p className="text-sm text-amber-300">No valid configurations found</p>
          <p className="text-xs text-slate-500 max-w-sm">
            The optimizer could not find any viable BMP + imperviousness combinations for this site.
            Try adjusting the factory type or selecting a different location.
          </p>
        </div>
      )}

      {hasData && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT: Pareto frontier chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 24, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="total_20yr"
                  name="20-Year Cost"
                  tickFormatter={fmtCost}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{ value: '20-Year Lifecycle Cost', position: 'bottom', offset: 4, fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  dataKey="score"
                  name="Score"
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{ value: 'Env. Score', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* All evaluated points (faded) */}
                <Scatter name="All Configs" data={result.all_points} fill="#475569" fillOpacity={0.3} r={3}>
                  {result.all_points.map((_, i) => (
                    <Cell key={i} fill="#475569" fillOpacity={0.25} />
                  ))}
                </Scatter>

                {/* Pareto frontier line */}
                <Scatter
                  name="Pareto Frontier"
                  data={result.pareto}
                  fill="#3b82f6"
                  fillOpacity={0.8}
                  r={5}
                  line={{ stroke: '#3b82f6', strokeWidth: 2, strokeOpacity: 0.5 }}
                  onClick={(data) => setSelected(data)}
                />

                {/* Special markers */}
                {MARKERS.map(m => {
                  const pt = result[m.key]
                  if (!pt) return null
                  return (
                    <ReferenceDot
                      key={m.key}
                      x={pt.total_20yr}
                      y={pt.score}
                      r={8}
                      fill={m.fill}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  )
                })}
              </ScatterChart>
            </ResponsiveContainer>

            {/* Legend for special markers */}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {MARKERS.map(m => {
                const pt = result[m.key]
                if (!pt) return null
                const MIcon = m.icon
                const isActive = selected === pt
                return (
                  <button
                    key={m.key}
                    onClick={() => setSelected(pt)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-all cursor-pointer ${
                      isActive ? 'border-white/40 bg-slate-800' : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.fill }} />
                    <MIcon className="w-3 h-3" style={{ color: m.fill }} />
                    {m.label}
                  </button>
                )
              })}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="bg-slate-800/30 rounded-lg p-2">
                <div className="text-xs text-slate-500">Evaluated</div>
                <div className="text-sm font-bold">{result.all_points?.length || 0}</div>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-2">
                <div className="text-xs text-slate-500">Pareto Optimal</div>
                <div className="text-sm font-bold text-blue-400">{result.pareto?.length || 0}</div>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-2">
                <div className="text-xs text-slate-500">Best Score</div>
                <div className="text-sm font-bold text-cyan-400">{result.best_score?.score || '—'}</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Action plan */}
          <div>
            {selected ? (
              <div className="animate-fadeIn">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-yellow-400" />
                  Recommended Action Plan
                </h4>

                {/* Grade & score header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`text-3xl font-black ${
                    selected.grade === 'A' ? 'text-emerald-400' :
                    selected.grade === 'B' ? 'text-lime-400' :
                    selected.grade === 'C' ? 'text-yellow-400' :
                    selected.grade === 'D' ? 'text-orange-400' : 'text-red-400'
                  }`}>
                    {selected.grade}
                  </div>
                  <div>
                    <div className="text-lg font-bold">{selected.score}/100</div>
                    <div className="text-xs text-slate-500">Environmental Score</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-lg font-bold text-amber-400">{fmtCost(selected.total_20yr)}</div>
                    <div className="text-xs text-slate-500">20-Year Cost</div>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-2.5 mb-4">
                  <div className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                    <div>
                      <div className="text-sm font-medium">Set Impervious Cover</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Target <span className="text-blue-300 font-semibold">{(selected.frac_imperv * 100).toFixed(0)}%</span> imperviousness
                        — adjust building footprint, parking, and landscaping to hit this target.
                      </div>
                    </div>
                  </div>

                  {selected.bmp_names?.length > 0 ? (
                    <div className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                      <div>
                        <div className="text-sm font-medium">Install BMPs</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selected.bmp_names.map(b => (
                            <span key={b} className="text-xs bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded">
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                      <div>
                        <div className="text-sm font-medium">No additional BMPs needed</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          This configuration achieves the target score without additional stormwater controls.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-3">
                    <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                    <div>
                      <div className="text-sm font-medium">Compliance Status</div>
                      <div className="text-xs mt-0.5">
                        {selected.compliance_status === 'compliant' ? (
                          <span className="text-emerald-400">✓ Meets all regulatory requirements</span>
                        ) : (
                          <span className="text-red-400">✗ {selected.fail_count || 0} compliance issue(s) — permits or mitigation may be required</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comparison with current */}
                <div className="bg-slate-800/20 border border-slate-700/50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1 font-medium">Configuration Summary</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="text-slate-400">Imperviousness</div>
                    <div className="text-right font-mono">{(selected.frac_imperv * 100).toFixed(0)}%</div>
                    <div className="text-slate-400">BMPs Active</div>
                    <div className="text-right font-mono">{selected.bmps?.length || 0}</div>
                    <div className="text-slate-400">Env. Score</div>
                    <div className="text-right font-mono">{selected.score}/100</div>
                    <div className="text-slate-400">Grade</div>
                    <div className="text-right font-mono">{selected.grade}</div>
                    <div className="text-slate-400">20-Year Cost</div>
                    <div className="text-right font-mono">{fmtCost(selected.total_20yr)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Target className="w-8 h-8 text-slate-600 mb-3" />
                <p className="text-sm text-slate-500">Click a point on the chart or a marker button to see the action plan</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
