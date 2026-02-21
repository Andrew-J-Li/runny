import { Shield, CheckCircle, XCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react'

const STATUS_STYLES = {
  pass: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-950/20', border: 'border-emerald-800/40' },
  fail: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-950/20', border: 'border-red-800/40' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-950/20', border: 'border-amber-800/40' },
  required: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-950/20', border: 'border-amber-800/40' },
  'not-required': { icon: Info, color: 'text-slate-400', bg: 'bg-slate-800/30', border: 'border-slate-700/40' },
  advisory: { icon: Info, color: 'text-slate-400', bg: 'bg-slate-800/30', border: 'border-slate-700/40' },
}

const OVERALL_STYLES = {
  'non-compliant': { bg: 'bg-red-600', text: 'Non-Compliant' },
  'conditional': { bg: 'bg-amber-600', text: 'Conditional' },
  'compliant': { bg: 'bg-emerald-600', text: 'Compliant' },
}

export default function CompliancePanel({ compliance, activeCheckId, onCheckClick }) {
  if (!compliance) return null

  const overall = OVERALL_STYLES[compliance.overall_status] || OVERALL_STYLES.conditional

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-400" />
        Regulatory Compliance
      </h3>

      {/* Overall status badge */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${overall.bg}`}>
          {overall.text}
        </span>
        <span className="text-sm text-slate-400">
          {compliance.pass_count} pass · {compliance.warning_count} warnings · {compliance.fail_count} fail
        </span>
      </div>

      {/* Individual checks */}
      <div className="space-y-2">
        {compliance.checks.map(check => {
          const style = STATUS_STYLES[check.status] || STATUS_STYLES.advisory
          const Icon = style.icon
          const hasBmps = check.remediation_bmps && check.remediation_bmps.length > 0
          const isActive = activeCheckId === check.id
          return (
            <div
              key={check.id}
              onClick={() => hasBmps && onCheckClick?.(isActive ? null : check)}
              className={`rounded-lg border p-3 transition-all ${style.bg} ${style.border} ${
                hasBmps ? 'cursor-pointer hover:ring-1 hover:ring-blue-500/50' : ''
              } ${isActive ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/10' : ''}`}
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{check.name}</span>
                    <span className="text-xs text-slate-500">{check.category}</span>
                    {hasBmps && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-blue-400">
                        <ArrowRight className="w-3 h-3" />
                        {check.remediation_bmps.length} BMP{check.remediation_bmps.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{check.description}</p>
                  {check.action && (
                    <p className="text-xs text-blue-400 mt-1 italic">→ {check.action}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
