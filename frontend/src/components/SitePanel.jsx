import { MapPin, Layers, AlertTriangle, Droplets, Loader2 } from 'lucide-react'

export default function SitePanel({ site, analysis, loading, fracImperv, onFracImpervChange }) {
  if (!site) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 flex items-center justify-center h-48">
        <p className="text-slate-500 text-sm">Select a site on the map to begin analysis</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            {site.name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {site.lat.toFixed(3)}°N, {Math.abs(site.lng).toFixed(3)}°W
          </p>
        </div>
        {loading && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
      </div>

      <p className="text-sm text-slate-300 mb-4 leading-relaxed">
        {site.description}
      </p>

      {/* Site properties */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-800/50 rounded-lg px-3 py-2">
          <div className="text-xs text-slate-500">Soil Group</div>
          <div className="text-sm font-semibold">{site.soil_group}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg px-3 py-2">
          <div className="text-xs text-slate-500">Slope</div>
          <div className="text-sm font-semibold">{(site.slope * 100).toFixed(1)}%</div>
        </div>
        {site.flood_zone && (
          <div className="col-span-2 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-300">Located in flood zone</span>
          </div>
        )}
        {site.near_water && (
          <div className="col-span-2 bg-amber-950/30 border border-amber-900/50 rounded-lg px-3 py-2 flex items-center gap-2">
            <Droplets className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-300">Near water body</span>
          </div>
        )}
      </div>

      {/* Imperviousness slider */}
      <div className="bg-slate-800/30 rounded-lg px-3 py-3">
        <label className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400">Factory Impervious Cover</span>
          <span className="text-sm font-mono font-bold text-blue-300">{Math.round(fracImperv * 100)}%</span>
        </label>
        <input
          type="range"
          min="0.1"
          max="0.95"
          step="0.05"
          value={fracImperv}
          onChange={e => onFracImpervChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>10%</span>
          <span>95%</span>
        </div>
      </div>
    </div>
  )
}
