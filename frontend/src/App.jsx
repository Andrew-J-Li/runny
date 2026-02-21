import { useState, useEffect, useCallback } from 'react'
import SiteMap from './components/SiteMap'
import ScoreCard from './components/ScoreCard'
import ForecastChart from './components/ForecastChart'
import StormComparison from './components/StormComparison'
import SitePanel from './components/SitePanel'
import Header from './components/Header'
import { Droplets } from 'lucide-react'

function App() {
  const [sites, setSites] = useState([])
  const [selectedSite, setSelectedSite] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fracImperv, setFracImperv] = useState(0.65)

  // Fetch candidate sites on mount
  useEffect(() => {
    fetch('/api/sites')
      .then(r => r.json())
      .then(data => {
        setSites(data.sites)
        // Auto-select first site
        if (data.sites.length > 0) {
          handleSelectSite(data.sites[0])
        }
      })
      .catch(err => console.error('Failed to load sites:', err))
  }, [])

  const handleSelectSite = useCallback((site) => {
    setSelectedSite(site)
    setLoading(true)
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: site.id,
        frac_imperv: fracImperv,
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
  }, [fracImperv])

  // Re-analyze when imperviousness changes
  useEffect(() => {
    if (selectedSite) {
      handleSelectSite(selectedSite)
    }
  }, [fracImperv])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 pb-8">
        {/* Top row: Map + Site Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Map */}
          <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden" style={{ height: '480px' }}>
            <SiteMap
              sites={sites}
              selectedSite={selectedSite}
              analysis={analysis}
              onSelectSite={handleSelectSite}
            />
          </div>

          {/* Site Panel + Score */}
          <div className="flex flex-col gap-4">
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

        {/* Bottom row: Charts */}
        {analysis && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-slate-400">Running SWMM simulation...</span>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
