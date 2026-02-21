import { useEffect } from 'react'
import { MapContainer, TileLayer, Rectangle, Popup, useMap, useMapEvents, Tooltip as LTooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const GRADE_COLORS = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#eab308',
  D: '#f97316',
  F: '#ef4444',
}

// Compute a rectangular bounds around a lat/lng
// offset controls the visual size of the rectangle on the map
function siteBounds(lat, lng, offset = 0.004) {
  return [
    [lat - offset * 0.6, lng - offset],
    [lat + offset * 0.6, lng + offset],
  ]
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

// Handle map clicks to place custom pins
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

export default function SiteMap({ sites, customPins, selectedSite, analysis, onSelectSite, onMapClick, geoError }) {
  // Austin center
  const defaultCenter = [30.35, -97.65]
  const center = selectedSite
    ? [selectedSite.lat, selectedSite.lng]
    : defaultCenter

  // Map site IDs to grades from analysis cache
  const siteGrades = {}
  if (analysis && analysis.score) {
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
      <ClickHandler onMapClick={onMapClick} />

      {/* Preset sites as rectangles */}
      {sites.map(site => {
        const isSelected = selectedSite?.id === site.id
        const grade = siteGrades[site.id]
        const color = grade ? GRADE_COLORS[grade] : '#6366f1'
        const bounds = siteBounds(site.lat, site.lng, isSelected ? 0.005 : 0.004)

        return (
          <Rectangle
            key={site.id}
            bounds={bounds}
            pathOptions={{
              color: isSelected ? '#ffffff' : color,
              fillColor: color,
              fillOpacity: isSelected ? 0.5 : 0.3,
              weight: isSelected ? 3 : 2,
              dashArray: isSelected ? null : '6 3',
            }}
            eventHandlers={{
              click: () => onSelectSite(site),
            }}
          >
            <LTooltip direction="top" offset={[0, -10]} permanent={isSelected}>
              <span style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400 }}>
                {site.name}
                {grade && ` (${grade})`}
              </span>
            </LTooltip>
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
          </Rectangle>
        )
      })}

      {/* User-placed custom pins as rectangles */}
      {(customPins || []).map((pin, idx) => {
        const isSelected = selectedSite?.id === pin.id
        const grade = isSelected && analysis?.score ? analysis.score.grade : null
        const color = grade ? GRADE_COLORS[grade] : '#3b82f6'
        const hasError = geoError && isSelected
        const bounds = siteBounds(pin.lat, pin.lng, isSelected ? 0.005 : 0.004)

        return (
          <Rectangle
            key={pin.id || `pin-${idx}`}
            bounds={bounds}
            pathOptions={{
              color: hasError ? '#ef4444' : isSelected ? '#ffffff' : color,
              fillColor: hasError ? '#ef4444' : color,
              fillOpacity: isSelected ? 0.5 : 0.3,
              weight: isSelected ? 3 : 2,
              dashArray: hasError ? '4 4' : isSelected ? null : '6 3',
            }}
            eventHandlers={{
              click: () => onSelectSite(pin),
            }}
          >
            <LTooltip direction="top" offset={[0, -10]}>
              <span style={{ fontSize: 12 }}>
                {pin.name || pin.label || 'Custom Site'}
                {grade && ` (${grade})`}
                {hasError && ' — Data unavailable'}
              </span>
            </LTooltip>
            <Popup>
              <div style={{ color: '#1e293b', minWidth: 160 }}>
                <strong style={{ fontSize: 14 }}>{pin.name || pin.label || 'Custom Pin'}</strong>
                <br />
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {pin.lat.toFixed(3)}°N, {Math.abs(pin.lng).toFixed(3)}°W
                </span>
                {hasError && (
                  <span style={{ display: 'block', fontSize: 11, color: '#ef4444', marginTop: 4 }}>
                    ⚠️ Could not fetch environmental data for this location
                  </span>
                )}
                {pin.soil_group && (
                  <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Soil: {pin.soil_group} | Slope: {((pin.slope || 0) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </Popup>
          </Rectangle>
        )
      })}
    </MapContainer>
  )
}
