import { TrendingUp, TrendingDown, Shield, Droplets, Mountain, AlertTriangle } from 'lucide-react'

const GRADE_STYLES = {
  A: { bg: 'bg-emerald-500', text: 'text-emerald-400', ring: 'ring-emerald-500/30', glow: 'grade-a' },
  B: { bg: 'bg-lime-500', text: 'text-lime-400', ring: 'ring-lime-500/30', glow: '' },
  C: { bg: 'bg-yellow-500', text: 'text-yellow-400', ring: 'ring-yellow-500/30', glow: '' },
  D: { bg: 'bg-orange-500', text: 'text-orange-400', ring: 'ring-orange-500/30', glow: '' },
  F: { bg: 'bg-red-500', text: 'text-red-400', ring: 'ring-red-500/30', glow: '' },
}

const GRADE_LABELS = {
  A: 'Excellent',
  B: 'Good',
  C: 'Moderate',
  D: 'Poor',
  F: 'Severe Impact',
}

function ScoreBar({ label, value, max = 100, icon: Icon, color = 'bg-blue-500' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </div>
        <span className="text-xs font-mono font-semibold">{value.toFixed(0)}</span>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full score-bar ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function ScoreCard({ score }) {
  if (!score) return null

  const style = GRADE_STYLES[score.grade] || GRADE_STYLES.C

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      {/* Grade + Overall Score */}
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-16 h-16 rounded-xl ${style.bg} ring-4 ${style.ring} ${style.glow} flex items-center justify-center`}>
          <span className="text-2xl font-black text-white">{score.grade}</span>
        </div>
        <div>
          <div className="text-2xl font-bold">{score.overall.toFixed(0)}<span className="text-sm font-normal text-slate-400">/100</span></div>
          <div className={`text-sm font-medium ${style.text}`}>
            {GRADE_LABELS[score.grade]}
          </div>
          <div className="text-xs text-slate-500">Environmental Impact Score</div>
        </div>
      </div>

      {/* Metrics */}
      <ScoreBar
        label="Soil Suitability"
        value={score.soil_suitability}
        icon={Mountain}
        color="bg-emerald-500"
      />
      <ScoreBar
        label="Flood Resistance"
        value={score.flood_risk}
        icon={Shield}
        color="bg-blue-500"
      />

      {/* Increase metrics */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-slate-500">Runoff Increase</span>
          </div>
          <div className="text-lg font-bold text-red-400">
            +{score.runoff_increase_pct.toFixed(0)}%
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-500">Peak Flow</span>
          </div>
          <div className="text-lg font-bold text-amber-400">
            +{score.peak_flow_increase_pct.toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  )
}
