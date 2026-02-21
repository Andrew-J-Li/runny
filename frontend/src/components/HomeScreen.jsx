import { useState } from 'react'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { Droplets, Factory, MapPin, ChevronRight, Zap } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

function ClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Austin preset sites for quick start
const PRESETS = [
  { name: 'Austin, TX', lat: 30.27, lng: -97.74 },
  { name: 'Houston, TX', lat: 29.76, lng: -95.37 },
  { name: 'Dallas, TX', lat: 32.78, lng: -96.80 },
  { name: 'Denver, CO', lat: 39.74, lng: -104.99 },
  { name: 'Atlanta, GA', lat: 33.75, lng: -84.39 },
  { name: 'Chicago, IL', lat: 41.88, lng: -87.63 },
]

export default function HomeScreen({ onStartAnalysis }) {
  const [hoveredPreset, setHoveredPreset] = useState(null)

  const handleClick = (lat, lng) => {
    onStartAnalysis(lat, lng)
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white">
      {/* Hero header */}
      <div className="relative z-10 bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent">
        <div className="max-w-6xl mx-auto px-6 pt-14 pb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-blue-600 rounded-xl p-4 shadow-lg shadow-blue-600/20">
              <Droplets className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
            Runny
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-3">
            Stormwater Runoff Forecasting for Industrial Site Planning
          </p>
          <p className="text-sm text-slate-500 max-w-xl mx-auto mb-4">
            Click anywhere on the map to analyze a location, or choose a city below.
            Real soil, rainfall, flood, and elevation data is fetched from USDA, NOAA, FEMA, and USGS.
          </p>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-6">
            <Zap className="w-3 h-3 text-yellow-400" />
            Powered by EPA SWMM Engine
          </div>

          {/* Quick-start presets */}
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => handleClick(p.lat, p.lng)}
                onMouseEnter={() => setHoveredPreset(p.name)}
                onMouseLeave={() => setHoveredPreset(null)}
                className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-full text-sm
                  border transition-all cursor-pointer
                  ${hoveredPreset === p.name
                    ? 'bg-blue-600 border-blue-500 text-white scale-105'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-blue-500/50'}
                `}
              >
                <MapPin className="w-3.5 h-3.5" />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Full-screen map */}
      <div className="flex-1 relative -mt-10">
        <div className="absolute inset-0 z-0">
          <MapContainer
            center={[39.0, -98.0]}
            zoom={4}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <ClickHandler onLocationSelect={handleClick} />
          </MapContainer>
        </div>

        {/* Click prompt overlay */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl px-6 py-3 flex items-center gap-3">
            <div className="animate-pulse w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-sm text-slate-300">Click anywhere on the map to begin site analysis</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
        </div>
      </div>
    </div>
  )
}
