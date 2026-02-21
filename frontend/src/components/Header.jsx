import { Droplets, Factory, Zap } from 'lucide-react'

export default function Header({ children, onLogoClick }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="bg-blue-600 rounded-lg p-2">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-tight">
              Runny
            </h1>
            <p className="text-xs text-slate-400">
              Stormwater Runoff Forecasting
            </p>
          </div>
        </button>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          {children}
          <div className="flex items-center gap-1.5">
            <Factory className="w-4 h-4" />
            <span>Factory Site Planner</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-800 px-2.5 py-1 rounded-full">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span>Powered by EPA SWMM Engine</span>
          </div>
        </div>
      </div>
    </header>
  )
}
