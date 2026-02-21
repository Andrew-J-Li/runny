import { useState, useEffect, useCallback } from 'react'
import HomeScreen from './components/HomeScreen'
import SiteMap from './components/SiteMap'
import ScoreCard from './components/ScoreCard'
import ForecastChart from './components/ForecastChart'
import StormComparison from './components/StormComparison'
import SitePanel from './components/SitePanel'
import FactorySelector from './components/FactorySelector'
import GreenInfraPanel from './components/GreenInfraPanel'
import CompliancePanel from './components/CompliancePanel'
import CostPanel from './components/CostPanel'
import Header from './components/Header'
import {
  Droplets, ArrowLeft, FileDown, Loader2
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

  const handleStartAnalysis = (lat, lng) => {
    setHomeLat(lat)
    setHomeLng(lng)
    setView('analysis')
    // Place a custom pin and analyze it
    const pin = { lat, lng, label: `Pin ${customPins.length + 1}` }
    setCustomPins([pin])
    runCustomAnalysis(lat, lng)
  }

  const handleBackHome = () => {
    setView('home')
    setAnalysis(null)
    setSelectedSite(null)
    setGeoData(null)
    setCustomPins([])
  }

  const handleSelectSite = useCallback((site) => {
    setSelectedSite(site)
    setLoading(true)
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

  const runCustomAnalysis = useCallback((lat, lng) => {
    setSelectedSite(null)
    setLoading(true)
    setGeoLoading(true)

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
      })
  }, [fracImperv, selectedFactory])

  const handleMapClick = (lat, lng) => {
    const pin = { lat, lng, label: `Pin ${customPins.length + 1}` }
    setCustomPins(prev => [...prev, pin])
    runCustomAnalysis(lat, lng)
  }

  // Re-analyze when factory type or imperviousness changes
  useEffect(() => {
    if (view !== 'analysis') return
    if (selectedSite) {
      handleSelectSite(selectedSite)
    } else if (customPins.length > 0) {
      const last = customPins[customPins.length - 1]
      runCustomAnalysis(last.lat, last.lng)
    }
  }, [fracImperv, selectedFactory])

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
      a.download = 'runny-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  // =============== HOME SCREEN ===============
  if (view === 'home') {
    return <HomeScreen onStartAnalysis={handleStartAnalysis} />
  }

  // =============== ANALYSIS VIEW ===============
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      <Header>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackHome}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </button>
          {analysis && !loading && (
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {exporting ? 'Generating…' : 'Export PDF'}
            </button>
          )}
        </div>
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
            {geoData && !selectedSite && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Site Data (Live API)</h3>
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
              analysis={analysis}
              loading={loading}
              fracImperv={fracImperv}
              onFracImpervChange={setFracImperv}
            />

            {analysis && !loading && (
              <ScoreCard score={analysis.score} />
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

        {/* New analysis panels row */}
        {analysis && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {analysis.green_infra && (
              <GreenInfraPanel recommendations={analysis.green_infra} />
            )}
            {analysis.compliance && (
              <CompliancePanel compliance={analysis.compliance} />
            )}
            {analysis.costs && (
              <CostPanel costs={analysis.costs} />
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-slate-400">
              {geoLoading ? 'Fetching site data from USDA, NOAA, FEMA, USGS…' : 'Running SWMM simulation…'}
            </span>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
