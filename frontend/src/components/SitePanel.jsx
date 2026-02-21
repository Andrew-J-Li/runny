import { MapPin, Layers, AlertTriangle, Droplets, Loader2, Navigation } from 'lucide-react'

export default function SitePanel({ site, customPin, geoData, analysis, loading, fracImperv, onFracImpervChange }) {
  const hasCustom = !site && customPin

  if (!site && !hasCustom) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 flex flex-col items-center justify-center h-48 gap-3">
        <Navigation className="w-8 h-8 text-slate-600" />
        <p className="text-slate-500 text-sm text-center">Select a site on the map or click a city to begin analysis</p>
      </div>
    )
  }

  const displayName = site ? site.name : (customPin?.label || 'Custom Site')
  const lat = site ? site.lat : customPin?.lat
  const lng = site ? site.lng : customPin?.lng
  const soilGroup = site ? site.soil_group : geoData?.soil_group
  const slope = site ? site.slope : geoData?.slope
  const floodZone = site ? site.flood_zone : geoData?.flood_zone
  const nearWater = site ? site.near_water : geoData?.near_water

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            {displayName}
          </h2>
          {lat != null && (
            <p className="text-xs text-slate-400 mt-1">
              {lat.toFixed(3)}°N, {Math.abs(lng).toFixed(3)}°W
            </p>
          )}
        </div>
        {loading && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
      </div>

      {site?.description && (
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          {site.description}
        </p>
      )}

      {/* Site properties */}
      {soilGroup && (
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-800/50 rounded-lg px-3 py-2">
          <div className="text-xs text-slate-500">Soil Group</div>
          <div className="text-sm font-semibold">{soilGroup}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg px-3 py-2">
          <div className="text-xs text-slate-500">Slope</div>
          <div className="text-sm font-semibold">{((slope || 0) * 100).toFixed(1)}%</div>
        </div>
        {floodZone && (
          <div className="col-span-2 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-300">Located in flood zone</span>
          </div>
        )}
        {nearWater && (
          <div className="col-span-2 bg-amber-950/30 border border-amber-900/50 rounded-lg px-3 py-2 flex items-center gap-2">
            <Droplets className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-300">Near water body</span>
          </div>
        )}
      </div>
      )}

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
