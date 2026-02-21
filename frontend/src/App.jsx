import { useState, useEffect, useCallback } from 'react'
import HomeScreen from './components/HomeScreen'
import SiteMap from './components/SiteMap'
import ScoreCard from './components/ScoreCard'
import ForecastChart from './components/ForecastChart'
import StormComparison from './components/StormComparison'
import SitePanel from './components/SitePanel'
import SiteAsset from './components/SiteAsset'
import FactorySelector from './components/FactorySelector'
import GreenInfraPanel from './components/GreenInfraPanel'
import CompliancePanel from './components/CompliancePanel'
import CostPanel from './components/CostPanel'
import OptimizerPanel from './components/OptimizerPanel'
import Header from './components/Header'
import {
  Droplets, FileDown, Loader2
} from 'lucide-react'

function App() {
  // --- view state ---
  const [view, setView] = useState('home') // 'home' | 'analysis'
  const [homeLat, setHomeLat] = useState(null)
  const [homeLng, setHomeLng] = useState(null)

  // --- preset sites ---
  const [sites, setSites] = useState([])

  // --- factory types ---
  const [factories, setFactories] = useState([])
  const [selectedFactory, setSelectedFactory] = useState('light_manufacturing')

  // --- custom pins placed by user ---
  const [customPins, setCustomPins] = useState([])

  // --- analysis state ---
  const [selectedSite, setSelectedSite] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fracImperv, setFracImperv] = useState(0.65)

  // --- PDF export ---
  const [exporting, setExporting] = useState(false)

  // --- geodata loading ---
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoData, setGeoData] = useState(null)
  const [geoError, setGeoError] = useState(false)

  // --- applied BMPs ---
  const [appliedBmps, setAppliedBmps] = useState([])
  const [applyingBmp, setApplyingBmp] = useState(null)

  // --- compliance → green infra linking ---
  const [activeComplianceCheck, setActiveComplianceCheck] = useState(null)
  const highlightedBmps = activeComplianceCheck?.remediation_bmps || []

  // Fetch preset sites + factory types on mount
  useEffect(() => {
    fetch('/api/sites')
      .then(r => r.json())
      .then(data => setSites(data.sites))
      .catch(err => console.error('Failed to load sites:', err))

    fetch('/api/factories')
      .then(r => r.json())
      .then(data => setFactories(data.factories))
      .catch(err => console.error('Failed to load factories:', err))
  }, [])

  // When entering analysis view, auto-select first preset site
  useEffect(() => {
    if (view === 'analysis' && sites.length > 0 && !selectedSite && !homeLat) {
      handleSelectSite(sites[0])
    }
  }, [view, sites])

  // --- handlers ---

  const handleStartAnalysis = (lat, lng, isPreset = false) => {
    setHomeLat(lat)
    setHomeLng(lng)
    setView('analysis')
    setAppliedBmps([])
    setGeoError(false)
    if (isPreset) {
      // For preset cities: load nearby preset sites, no custom pin
      setCustomPins([])
      // Select the nearest preset site once sites are loaded
      if (sites.length > 0) {
        const nearest = sites.reduce((best, s) => {
          const d = Math.hypot(s.lat - lat, s.lng - lng)
          return d < best.d ? { site: s, d } : best
        }, { site: sites[0], d: Infinity })
        handleSelectSite(nearest.site)
      }
    } else {
      // For custom map clicks: place a pin and analyze
      const pin = { lat, lng, label: `Pin ${customPins.length + 1}` }
      setCustomPins([pin])
      runCustomAnalysis(lat, lng)
    }
  }

  const handleBackHome = () => {
    setView('home')
    setAnalysis(null)
    setSelectedSite(null)
    setGeoData(null)
    setGeoError(false)
    setCustomPins([])
    setAppliedBmps([])
  }

  const handleSelectSite = useCallback((site) => {
    setSelectedSite(site)
    setLoading(true)
    setAppliedBmps([])
    setGeoError(false)
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: site.id,
        frac_imperv: fracImperv,
        factory_type: selectedFactory,
      }),
    })
      .then(r => r.json())
      .then(data => {
        setAnalysis(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Analysis failed:', err)
        setLoading(false)
      })
  }, [fracImperv, selectedFactory])

  const runCustomAnalysis = useCallback((lat, lng, bmps = []) => {
    setSelectedSite(null)
    setLoading(true)
    setGeoLoading(true)
    setGeoError(false)

    // Fetch geodata first for display, then run full analysis
    fetch('/api/geodata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    })
      .then(r => r.json())
      .then(geo => {
        setGeoData(geo)
        setGeoLoading(false)
        // Check if critical geodata is N/A
        if (!geo.soil_group || geo.soil_group === 'N/A') {
          setGeoError(true)
        }
        // Now run full analysis
        return fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lng,
            soil_group: geo.soil_group,
            slope: geo.slope,
            flood_zone: geo.flood_zone,
            near_water: geo.near_water,
            frac_imperv: fracImperv,
            factory_type: selectedFactory,
            applied_bmps: bmps.length > 0 ? bmps : undefined,
          }),
        })
      })
      .then(r => r.json())
      .then(data => {
        setAnalysis(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Analysis failed:', err)
        setLoading(false)
        setGeoLoading(false)
        setGeoError(true)
      })
  }, [fracImperv, selectedFactory])

  const handleMapClick = (lat, lng) => {
    const pin = { lat, lng, label: `Pin ${customPins.length + 1}` }
    setCustomPins(prev => [...prev, pin])
    setAppliedBmps([])
    runCustomAnalysis(lat, lng)
  }

  // Re-analyze when factory type or imperviousness changes
  useEffect(() => {
    if (view !== 'analysis') return
    if (selectedSite) {
      handleSelectSite(selectedSite)
    } else if (customPins.length > 0) {
      const last = customPins[customPins.length - 1]
      runCustomAnalysis(last.lat, last.lng, appliedBmps)
    }
  }, [fracImperv, selectedFactory])

  // --- BMP apply / remove handlers ---
  const reAnalyzeWithBmps = useCallback((bmps) => {
    if (selectedSite) {
      setLoading(true)
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: selectedSite.id,
          frac_imperv: fracImperv,
          factory_type: selectedFactory,
          applied_bmps: bmps.length > 0 ? bmps : undefined,
        }),
      })
        .then(r => r.json())
        .then(data => {
          setAnalysis(data)
          setLoading(false)
          setApplyingBmp(null)
        })
        .catch(err => {
          console.error('Re-analysis failed:', err)
          setLoading(false)
          setApplyingBmp(null)
        })
    } else if (customPins.length > 0) {
      const last = customPins[customPins.length - 1]
      setLoading(true)
      setGeoLoading(false) // Skip geodata refetch on BMP toggle
      const geo = geoData || {}
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: last.lat,
          lng: last.lng,
          soil_group: geo.soil_group,
          slope: geo.slope,
          flood_zone: geo.flood_zone,
          near_water: geo.near_water,
          frac_imperv: fracImperv,
          factory_type: selectedFactory,
          applied_bmps: bmps.length > 0 ? bmps : undefined,
        }),
      })
        .then(r => r.json())
        .then(data => {
          setAnalysis(data)
          setLoading(false)
          setApplyingBmp(null)
        })
        .catch(err => {
          console.error('Re-analysis failed:', err)
          setLoading(false)
          setApplyingBmp(null)
        })
    }
  }, [selectedSite, customPins, geoData, fracImperv, selectedFactory])

  const handleApplyBmp = (bmpId) => {
    setApplyingBmp(bmpId)
    const next = [...appliedBmps, bmpId]
    setAppliedBmps(next)
    reAnalyzeWithBmps(next)
  }

  const handleRemoveBmp = (bmpId) => {
    setApplyingBmp(bmpId)
    const next = appliedBmps.filter(id => id !== bmpId)
    setAppliedBmps(next)
    reAnalyzeWithBmps(next)
  }

  const handleExportPDF = async () => {
    if (!analysis) return
    setExporting(true)
    try {
      const lastPin = customPins.length > 0 ? customPins[customPins.length - 1] : null
      const body = {
        site_name: analysis.site_name || 'Custom Site',
        factory_type: selectedFactory,
        lat: selectedSite?.lat || lastPin?.lat || homeLat,
        lng: selectedSite?.lng || lastPin?.lng || homeLng,
        frac_imperv: fracImperv,
      }
      const resp = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!resp.ok) throw new Error('PDF generation failed')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'runny-swppp-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const handleRunOptimize = async () => {
    const lastPin = customPins.length > 0 ? customPins[customPins.length - 1] : null
    const body = {
      lat: selectedSite?.lat || lastPin?.lat || homeLat,
      lng: selectedSite?.lng || lastPin?.lng || homeLng,
      factory_type: selectedFactory,
      ...(selectedSite ? {
        soil_group: selectedSite.soil_group,
        slope: selectedSite.slope,
        flood_zone: selectedSite.flood_zone,
        near_water: selectedSite.near_water,
      } : geoData ? {
        soil_group: geoData.soil_group,
        slope: geoData.slope,
        flood_zone: geoData.flood_zone,
        near_water: geoData.near_water,
      } : {}),
    }
    const resp = await fetch('/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!resp.ok) throw new Error('Optimization failed')
    return resp.json()
  }

  // Clear compliance selection when analysis changes
  useEffect(() => {
    setActiveComplianceCheck(null)
  }, [analysis])

  // Also clear applied BMPs state when we switch to a different site
  useEffect(() => {
    setAppliedBmps([])
    setApplyingBmp(null)
  }, [selectedSite])

  // =============== HOME SCREEN ===============
  if (view === 'home') {
    return <HomeScreen onStartAnalysis={handleStartAnalysis} />
  }

  // =============== ANALYSIS VIEW ===============
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      <Header onLogoClick={handleBackHome}>
        {analysis && !loading && (
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {exporting ? 'Generating…' : 'Export SWPPP'}
          </button>
        )}
      </Header>

      <main className="flex-1 overflow-y-auto max-w-[1600px] w-full mx-auto px-4 pb-4">
        {/* Top row: Map + Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 mt-4">
          {/* Map */}
          <div className="lg:col-span-2 h-[clamp(350px,60vh,900px)] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <SiteMap
              sites={sites}
              customPins={customPins}
              selectedSite={selectedSite}
              analysis={analysis}
              onSelectSite={handleSelectSite}
              onMapClick={handleMapClick}
              geoError={geoError}
            />
          </div>

          {/* Side panel stack */}
          <div className="flex flex-col gap-4 min-h-0 overflow-y-auto custom-scrollbar lg:max-h-[clamp(350px,60vh,900px)]">
            <FactorySelector
              factories={factories}
              selectedFactory={selectedFactory}
              onSelect={setSelectedFactory}
            />

            {/* Geodata summary for custom pins */}
            {geoError && !selectedSite && (
              <div className="bg-red-950/30 rounded-xl border border-red-800/50 p-4">
                <h3 className="text-sm font-semibold text-red-300 mb-2 flex items-center gap-2">
                  ⚠️ Data Unavailable
                </h3>
                <p className="text-xs text-red-400">
                  Could not fetch environmental data for this location. The site may be outside the coverage area of USDA/NOAA/FEMA/USGS data services. Try selecting a location within the contiguous US.
                </p>
              </div>
            )}
            {geoData && !selectedSite && !geoError && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Site Data
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-slate-500">Soil Group</div>
                    <div className="text-white font-medium">{geoData.soil_group}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-slate-500">Slope</div>
                    <div className="text-white font-medium">{(geoData.slope * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-slate-500">Flood Zone</div>
                    <div className={`font-medium ${geoData.flood_zone ? 'text-red-400' : 'text-green-400'}`}>
                      {geoData.flood_zone ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-slate-500">Elevation</div>
                    <div className="text-white font-medium">{geoData.elevation_ft?.toFixed(0) || '—'} ft</div>
                  </div>
                </div>
                {geoData.rainfall_depths && Object.keys(geoData.rainfall_depths).length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-slate-500 mb-1">Rainfall (NOAA Atlas 14)</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(geoData.rainfall_depths).map(([storm, depth]) => (
                        <span key={storm} className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded">
                          {storm}: {depth}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <SitePanel
              site={selectedSite}
              customPin={customPins.length > 0 ? customPins[customPins.length - 1] : null}
              geoData={geoData}
              analysis={analysis}
              loading={loading}
              fracImperv={fracImperv}
              onFracImpervChange={setFracImperv}
            />

            {analysis && !loading && (
              <ScoreCard score={analysis.score} />
            )}

            {/* Isometric factory asset */}
            {analysis && !loading && (
              <SiteAsset
                factoryType={selectedFactory}
                siteName={analysis.site_name || 'Custom Site'}
              />
            )}
          </div>
        </div>

        {/* Charts row */}
        {analysis && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-400" />
                Runoff Hydrograph (10-Year Storm)
              </h3>
              <ForecastChart timeseries={analysis.timeseries} />
            </div>
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h3 className="text-lg font-semibold mb-4">
                Storm Scenario Comparison
              </h3>
              <StormComparison comparison={analysis.comparison} />
            </div>
          </div>
        )}

        {/* Analysis panels row */}
        {analysis && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {analysis.green_infra && (
              <GreenInfraPanel
                recommendations={analysis.green_infra}
                highlightedBmps={highlightedBmps}
                appliedBmps={appliedBmps}
                onApplyBmp={handleApplyBmp}
                onRemoveBmp={handleRemoveBmp}
                applyingBmp={applyingBmp}
              />
            )}
            {analysis.compliance && (
              <CompliancePanel
                compliance={analysis.compliance}
                activeCheckId={activeComplianceCheck?.id}
                onCheckClick={(check) => setActiveComplianceCheck(check)}
              />
            )}
            {analysis.costs && (
              <CostPanel costs={analysis.costs} />
            )}
          </div>
        )}

        {/* Optimizer — full width */}
        {analysis && !loading && (
          <div className="mb-4">
            <OptimizerPanel
              onRunOptimize={handleRunOptimize}
              siteReady={!!analysis}
            />
          </div>
        )}

        {/* Water-flow loading state */}
        {loading && (
          <>
            {/* Full-width water bar across the top */}
            <div className="fixed top-[57px] left-0 right-0 z-[60] water-bar" />

            <div className="flex flex-col items-center justify-center py-20 gap-6">
              {/* Animated water loader pill */}
              <div className="water-loader w-48 h-3 bg-slate-800/60">
                <div className="wave wave-1" />
                <div className="wave wave-2" />
                <div className="wave wave-3" />
              </div>

              {/* Droplet icon with bob */}
              <div className="relative">
                <div style={{ animation: 'water-rise 2s ease-in-out infinite' }}>
                  <Droplets className="w-10 h-10 text-blue-400" />
                </div>
                {/* Bubbles */}
                <div className="water-droplet" style={{ left: '8px', bottom: '-4px', animationDelay: '0s' }} />
                <div className="water-droplet" style={{ left: '22px', bottom: '-2px', animationDelay: '0.5s' }} />
                <div className="water-droplet" style={{ left: '36px', bottom: '-6px', animationDelay: '1s' }} />
              </div>

              <div className="text-center">
                <p className="text-slate-300 font-medium">
                  {geoLoading ? 'Fetching site data…' : 'Running SWMM simulation…'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {geoLoading
                    ? 'Querying USDA, NOAA, FEMA & USGS APIs'
                    : 'Computing runoff, compliance & cost analysis'}
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
