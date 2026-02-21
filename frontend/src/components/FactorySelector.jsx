import { Factory, FlaskConical, UtensilsCrossed, Warehouse, Server, Wrench } from 'lucide-react'

const ICONS = {
  flask: FlaskConical,
  utensils: UtensilsCrossed,
  warehouse: Warehouse,
  server: Server,
  wrench: Wrench,
}

export default function FactorySelector({ factories, selectedFactory, onSelect }) {
  if (!factories || factories.length === 0) return null

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Factory className="w-4 h-4 text-blue-400" />
        Factory Type
      </h3>
      <div className="grid grid-cols-1 gap-1.5">
        {factories.map(f => {
          const isSelected = selectedFactory === f.id
          const Icon = ICONS[f.icon] || Factory
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer
                ${isSelected
                  ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                  : 'bg-slate-800/40 border border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
              `}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{f.name}</div>
                <div className="text-xs text-slate-500 truncate">{f.default_frac_imperv * 100}% imperv · {f.lot_size_acres} acres</div>
              </div>
              {isSelected && (
                <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
