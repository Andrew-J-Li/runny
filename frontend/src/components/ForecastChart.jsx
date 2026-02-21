import { useMemo } from 'react'
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export default function ForecastChart({ timeseries }) {
  if (!timeseries) return null

  // Downsample for performance — pick every 4th point to keep ~24 data points per hour
  const data = useMemo(() => {
    const raw = timeseries.time_hours.map((t, i) => ({
      time: t,
      rainfall: timeseries.rainfall_in_hr[i],
      factoryRunoff: timeseries.factory_runoff_cfs[i],
      baselineRunoff: timeseries.baseline_runoff_cfs[i],
    }))
    // Downsample: every 4th point
    return raw.filter((_, i) => i % 4 === 0)
  }, [timeseries])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="text-slate-300 font-medium mb-1">Hour {label?.toFixed(1)}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="flex justify-between gap-4">
            <span>{p.name}:</span>
            <span className="font-mono font-bold">
              {p.name === 'Rainfall' ? `${p.value.toFixed(2)} in/hr` : `${p.value.toFixed(4)} cfs`}
            </span>
          </p>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="time"
          stroke="#64748b"
          fontSize={11}
          tickFormatter={v => `${v}h`}
        />
        <YAxis
          yAxisId="rain"
          orientation="right"
          stroke="#64748b"
          fontSize={11}
          reversed
          label={{ value: 'Rain (in/hr)', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#64748b' } }}
        />
        <YAxis
          yAxisId="flow"
          stroke="#64748b"
          fontSize={11}
          label={{ value: 'Runoff (cfs)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="line"
        />

        {/* Rainfall as inverted bar from top */}
        <Bar
          yAxisId="rain"
          dataKey="rainfall"
          name="Rainfall"
          fill="#3b82f6"
          opacity={0.4}
          barSize={4}
        />

        {/* Baseline (pre-development) runoff */}
        <Area
          yAxisId="flow"
          type="monotone"
          dataKey="baselineRunoff"
          name="Pre-Development"
          stroke="#22c55e"
          fill="#22c55e"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={false}
        />

        {/* Factory runoff */}
        <Area
          yAxisId="flow"
          type="monotone"
          dataKey="factoryRunoff"
          name="With Factory"
          stroke="#ef4444"
          fill="#ef4444"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
