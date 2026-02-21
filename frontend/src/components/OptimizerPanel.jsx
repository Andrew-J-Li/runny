import { useState } from 'react'
import { Zap, Target, DollarSign, Shield, TrendingUp, Loader2 } from 'lucide-react'
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
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="font-semibold text-white mb-1">Score: {d.score} · {fmtCost(d.lifetime_cost)} lifetime</div>
      <div className="text-slate-400">Imperviousness: {(d.imperv * 100).toFixed(0)}%</div>
      <div className="text-slate-400">
        BMPs: {d.bmps?.length ? d.bmps.map(b => b.replace(/_/g, ' ')).join(', ') : 'None'}
      </div>
      {d.compliant != null && (
        <div className={d.compliant ? 'text-emerald-400' : 'text-red-400'}>
          {d.compliant ? '✓ Compliant' : '✗ Non-compliant'}
        </div>
      )}
    </div>
  )
}

const MARKERS = [
  { key: 'best_score', label: 'Best Score', fill: '#22d3ee', icon: TrendingUp },
  { key: 'best_compliant', label: 'Best Compliant', fill: '#34d399', icon: Shield },
  { key: 'best_balanced', label: 'Best Balanced', fill: '#fbbf24', icon: Target },
]

export default function OptimizerPanel({ onRunOptimize, siteReady }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  const handleRun = async () => {
    setLoading(true)
    setSelected(null)
    try {
      const data = await onRunOptimize()
      setResult(data)
    } catch (err) {
      console.error('Optimize failed:', err)
    } finally {
      setLoading(false)
    }
  }

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

      {!result && !loading && (
        <p className="text-sm text-slate-500 text-center py-6">
          Sweep imperviousness levels &amp; BMP combinations to find the best score-vs-cost tradeoffs.
        </p>
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

      {result && !loading && (
        <>
          {/* Pareto frontier chart */}
          <div className="mb-4">
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="lifetime_cost"
                  name="20-Year Cost"
                  tickFormatter={fmtCost}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{ value: '20-Year Lifetime Cost', position: 'bottom', offset: 0, fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  dataKey="score"
                  name="Score"
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
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
                      x={pt.lifetime_cost}
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
          </div>

          {/* Legend for special markers */}
          <div className="flex flex-wrap gap-3 mb-4 justify-center">
            {MARKERS.map(m => {
              const pt = result[m.key]
              if (!pt) return null
              const MIcon = m.icon
              return (
                <button
                  key={m.key}
                  onClick={() => setSelected(pt)}
                  className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.fill }} />
                  <MIcon className="w-3 h-3" style={{ color: m.fill }} />
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Selected configuration details */}
          {selected && (
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 animate-fadeIn">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-yellow-400" />
                Configuration Details
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center mb-3">
                <div>
                  <div className="text-xs text-slate-500">Score</div>
                  <div className="text-lg font-bold text-blue-400">{selected.score}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Imperviousness</div>
                  <div className="text-lg font-bold text-slate-200">{(selected.imperv * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Lifetime Cost</div>
                  <div className="text-lg font-bold text-amber-400">{fmtCost(selected.lifetime_cost)}</div>
                </div>
              </div>
              {selected.bmps?.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Active BMPs</div>
                  <div className="flex flex-wrap gap-1">
                    {selected.bmps.map(b => (
                      <span key={b} className="text-xs bg-emerald-900/30 text-emerald-300 px-2 py-0.5 rounded">
                        {b.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-2 text-xs">
                {selected.compliant
                  ? <span className="text-emerald-400">✓ Meets all compliance requirements</span>
                  : <span className="text-red-400">✗ Does not meet all compliance requirements</span>
                }
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-slate-800/30 rounded-lg p-2">
              <div className="text-xs text-slate-500">Configs Evaluated</div>
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
        </>
      )}
    </div>
  )
}
