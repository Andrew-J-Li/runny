import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export default function StormComparison({ comparison }) {
  if (!comparison || comparison.length === 0) return null

  const data = comparison.map(c => ({
    name: c.storm_id.replace('-24hr', '').replace('yr', '-yr'),
    'Pre-Development': Math.round(c.baseline_runoff_ft3),
    'With Factory': Math.round(c.factory_runoff_ft3),
    totalRain: c.total_rain_in,
    label: c.label,
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const item = data.find(d => d.name === label)
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="text-slate-300 font-medium mb-1">{item?.label || label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="flex justify-between gap-4">
            <span>{p.name}:</span>
            <span className="font-mono font-bold">{p.value.toLocaleString()} ft³</span>
          </p>
        ))}
        {payload.length === 2 && (
          <p className="text-red-400 mt-1 pt-1 border-t border-slate-700 flex justify-between gap-4">
            <span>Increase:</span>
            <span className="font-mono font-bold">
              +{(payload[1].value - payload[0].value).toLocaleString()} ft³
              {' '}
              ({payload[0].value > 0
                ? ((payload[1].value - payload[0].value) / payload[0].value * 100).toFixed(0)
                : '∞'}%)
            </span>
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            label={{ value: 'Runoff Volume (ft³)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Pre-Development" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="With Factory" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend table */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-800">
              <th className="text-left py-1 px-2">Storm</th>
              <th className="text-right py-1 px-2">Rain (in)</th>
              <th className="text-right py-1 px-2">Peak Flow (Factory)</th>
              <th className="text-right py-1 px-2">Peak Flow (Baseline)</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map(c => (
              <tr key={c.storm_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="py-1.5 px-2 text-slate-300">{c.label}</td>
                <td className="py-1.5 px-2 text-right font-mono text-blue-300">{c.total_rain_in}"</td>
                <td className="py-1.5 px-2 text-right font-mono text-red-400">{c.factory_peak_cfs.toFixed(3)} cfs</td>
                <td className="py-1.5 px-2 text-right font-mono text-emerald-400">{c.baseline_peak_cfs.toFixed(3)} cfs</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
