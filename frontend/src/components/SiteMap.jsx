import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom icons for different grades
function createIcon(color, selected = false) {
  const size = selected ? 40 : 30
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 3px solid ${selected ? '#fff' : 'rgba(255,255,255,0.6)'};
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4)${selected ? ', 0 0 20px ' + color + '80' : ''};
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const GRADE_COLORS = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#eab308',
  D: '#f97316',
  F: '#ef4444',
}

function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.flyTo(center, 12, { duration: 1.0 })
    }
  }, [center, map])
  return null
}

// Tells Leaflet to recalculate size when the container resizes
function ResizeHandler() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])
  return null
}

export default function SiteMap({ sites, selectedSite, analysis, onSelectSite }) {
  // Austin center
  const defaultCenter = [30.35, -97.65]
  const center = selectedSite
    ? [selectedSite.lat, selectedSite.lng]
    : defaultCenter

  // Map site IDs to grades from analysis cache
  const siteGrades = {}
  if (analysis && analysis.score) {
    // For now, we only have the selected site's grade in analysis
    if (selectedSite) {
      siteGrades[selectedSite.id] = analysis.score.grade
    }
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={10}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapUpdater center={center} />
      <ResizeHandler />

      {sites.map(site => {
        const isSelected = selectedSite?.id === site.id
        const grade = siteGrades[site.id]
        const color = grade ? GRADE_COLORS[grade] : '#6366f1'

        return (
          <Marker
            key={site.id}
            position={[site.lat, site.lng]}
            icon={createIcon(isSelected ? (GRADE_COLORS[grade] || '#3b82f6') : '#6366f1', isSelected)}
            eventHandlers={{
              click: () => onSelectSite(site),
            }}
          >
            <Popup>
              <div style={{ color: '#1e293b', minWidth: 180 }}>
                <strong style={{ fontSize: 14 }}>{site.name}</strong>
                <br />
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Soil: {site.soil_group} | Slope: {(site.slope * 100).toFixed(1)}%
                </span>
                {site.flood_zone && (
                  <span style={{ display: 'block', fontSize: 11, color: '#ef4444', marginTop: 4 }}>
                    ⚠️ Flood Zone
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
