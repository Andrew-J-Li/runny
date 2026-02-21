/**
 * SiteAsset — Isometric 3D factory illustrations per factory type.
 * Shows a "being constructed" visual when a site is selected.
 */

const COLORS = {
  building: '#334155',
  buildingLight: '#475569',
  buildingTop: '#1e293b',
  window: '#38bdf8',
  windowDim: '#1e3a5f',
  crane: '#f59e0b',
  scaffold: '#94a3b8',
  ground: '#166534',
  groundLight: '#22c55e',
  accent: '#3b82f6',
  tank: '#64748b',
  tankTop: '#94a3b8',
  cooling: '#06b6d4',
}

function DataCenterSVG() {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground */}
      <path d="M0 220 L200 260 L400 220 L200 180 Z" fill={COLORS.ground} opacity="0.3" />

      {/* Main building - isometric */}
      <path d="M80 180 L80 100 L200 60 L200 140 Z" fill={COLORS.building} />
      <path d="M200 60 L320 100 L320 180 L200 140 Z" fill={COLORS.buildingLight} />
      <path d="M80 100 L200 60 L320 100 L200 140 Z" fill={COLORS.buildingTop} />

      {/* Server room windows (left face) */}
      {[110, 130, 150, 170].map((y, i) => (
        <g key={i}>
          <rect x="95" y={y - 35} width="6" height="12" fill={COLORS.window} opacity={0.8 - i * 0.1} rx="1" transform={`skewY(-25) translate(${i * 2}, ${i * 8})`} />
          <rect x="115" y={y - 35} width="6" height="12" fill={COLORS.window} opacity={0.7 - i * 0.1} rx="1" transform={`skewY(-25) translate(${i * 2}, ${i * 8})`} />
          <rect x="135" y={y - 35} width="6" height="12" fill={COLORS.windowDim} opacity={0.6} rx="1" transform={`skewY(-25) translate(${i * 2}, ${i * 8})`} />
        </g>
      ))}

      {/* Right face windows */}
      {[0, 1, 2, 3].map(i => (
        <g key={`r${i}`}>
          <rect x={220 + i * 22} y={90 + i * 5} width="8" height="14" fill={COLORS.window} opacity={0.6 + i * 0.05} rx="1" />
          <rect x={220 + i * 22} y={112 + i * 5} width="8" height="14" fill={COLORS.windowDim} opacity={0.5} rx="1" />
          <rect x={220 + i * 22} y={134 + i * 5} width="8" height="14" fill={COLORS.window} opacity={0.4 + i * 0.1} rx="1" />
        </g>
      ))}

      {/* Cooling units on top */}
      <rect x="120" y="65" width="30" height="20" fill={COLORS.cooling} opacity="0.7" rx="2" transform="skewX(-30) translate(60, -5)" />
      <rect x="180" y="55" width="30" height="20" fill={COLORS.cooling} opacity="0.6" rx="2" transform="skewX(-30) translate(40, 0)" />

      {/* Construction crane */}
      <line x1="340" y1="20" x2="340" y2="180" stroke={COLORS.crane} strokeWidth="4" />
      <line x1="340" y1="25" x2="240" y2="25" stroke={COLORS.crane} strokeWidth="3" />
      <line x1="340" y1="25" x2="370" y2="25" stroke={COLORS.crane} strokeWidth="3" />
      <line x1="340" y1="28" x2="260" y2="60" stroke={COLORS.scaffold} strokeWidth="1" strokeDasharray="4 2" />
      {/* Crane cable */}
      <line x1="270" y1="25" x2="270" y2="70" stroke={COLORS.scaffold} strokeWidth="1.5" />
      <rect x="263" y="70" width="14" height="10" fill={COLORS.crane} opacity="0.8" rx="1" />

      {/* Scaffolding on right side */}
      <line x1="320" y1="100" x2="320" y2="180" stroke={COLORS.scaffold} strokeWidth="1.5" opacity="0.5" />
      <line x1="330" y1="95" x2="330" y2="180" stroke={COLORS.scaffold} strokeWidth="1.5" opacity="0.5" />
      {[120, 140, 160].map(y => (
        <line key={y} x1="320" y1={y} x2="330" y2={y} stroke={COLORS.scaffold} strokeWidth="1" opacity="0.4" />
      ))}

      {/* Label */}
      <text x="200" y="270" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">Data Center — Under Construction</text>
    </svg>
  )
}

function ChemicalPlantSVG() {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground */}
      <path d="M0 220 L200 260 L400 220 L200 180 Z" fill={COLORS.ground} opacity="0.3" />

      {/* Main facility building */}
      <path d="M60 190 L60 120 L160 90 L160 160 Z" fill={COLORS.building} />
      <path d="M160 90 L240 110 L240 180 L160 160 Z" fill={COLORS.buildingLight} />
      <path d="M60 120 L160 90 L240 110 L140 140 Z" fill={COLORS.buildingTop} />

      {/* Storage tanks (cylinders) */}
      <ellipse cx="290" cy="130" rx="25" ry="10" fill={COLORS.tankTop} />
      <rect x="265" y="130" width="50" height="55" fill={COLORS.tank} />
      <ellipse cx="290" cy="185" rx="25" ry="10" fill={COLORS.tank} opacity="0.8" />

      <ellipse cx="340" cy="140" rx="20" ry="8" fill={COLORS.tankTop} opacity="0.9" />
      <rect x="320" y="140" width="40" height="45" fill={COLORS.tank} opacity="0.9" />
      <ellipse cx="340" cy="185" rx="20" ry="8" fill={COLORS.tank} opacity="0.7" />

      {/* Pipes connecting tanks to building */}
      <line x1="240" y1="140" x2="265" y2="150" stroke={COLORS.scaffold} strokeWidth="3" />
      <line x1="265" y1="160" x2="320" y2="160" stroke={COLORS.scaffold} strokeWidth="2.5" />

      {/* Chimney / flare stack */}
      <rect x="100" y="50" width="10" height="70" fill={COLORS.scaffold} />
      <path d="M95 50 Q105 35 115 50" fill="#f97316" opacity="0.6" />

      {/* Containment berm */}
      <path d="M250 190 Q290 200 350 190" stroke="#f59e0b" strokeWidth="2" fill="none" strokeDasharray="4 3" />

      {/* Construction crane */}
      <line x1="50" y1="15" x2="50" y2="190" stroke={COLORS.crane} strokeWidth="3.5" />
      <line x1="50" y1="20" x2="150" y2="20" stroke={COLORS.crane} strokeWidth="2.5" />
      <line x1="120" y1="20" x2="120" y2="60" stroke={COLORS.scaffold} strokeWidth="1.5" />

      {/* Scaffolding */}
      <line x1="240" y1="110" x2="240" y2="180" stroke={COLORS.scaffold} strokeWidth="1.5" opacity="0.5" />
      <line x1="248" y1="108" x2="248" y2="180" stroke={COLORS.scaffold} strokeWidth="1.5" opacity="0.5" />
      {[130, 150, 170].map(y => (
        <line key={y} x1="240" y1={y} x2="248" y2={y} stroke={COLORS.scaffold} strokeWidth="1" opacity="0.4" />
      ))}

      <text x="200" y="270" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">Chemical Plant — Under Construction</text>
    </svg>
  )
}

function WarehouseSVG() {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground */}
      <path d="M0 220 L200 260 L400 220 L200 180 Z" fill={COLORS.ground} opacity="0.3" />

      {/* Main warehouse - wide and low */}
      <path d="M40 200 L40 130 L200 90 L200 160 Z" fill={COLORS.building} />
      <path d="M200 90 L360 130 L360 200 L200 160 Z" fill={COLORS.buildingLight} />
      <path d="M40 130 L200 90 L360 130 L200 170 Z" fill={COLORS.buildingTop} />

      {/* Loading dock doors (left face) */}
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={60 + i * 30} y={145 + i * 4} width="20" height="35" fill="#1e293b" opacity="0.8" rx="1"
              transform={`skewY(-20) translate(${i}, ${i * 10})`} />
      ))}

      {/* Right face - truck bays */}
      {[0, 1, 2].map(i => (
        <rect key={`tb${i}`} x={220 + i * 40} y={140 + i * 4} width="25" height="40" fill="#1e293b" opacity="0.7" rx="1" />
      ))}

      {/* Trucks at dock */}
      <rect x="225" y="185" width="30" height="15" fill="#64748b" rx="2" />
      <rect x="270" y="188" width="25" height="12" fill="#475569" rx="2" />

      {/* Construction crane */}
      <line x1="370" y1="10" x2="370" y2="200" stroke={COLORS.crane} strokeWidth="4" />
      <line x1="370" y1="15" x2="260" y2="15" stroke={COLORS.crane} strokeWidth="3" />
      <line x1="290" y1="15" x2="290" y2="55" stroke={COLORS.scaffold} strokeWidth="1.5" />
      <rect x="283" y="55" width="14" height="8" fill={COLORS.crane} opacity="0.7" rx="1" />

      <text x="200" y="270" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">Warehouse — Under Construction</text>
    </svg>
  )
}

function FoodProcessingSVG() {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground */}
      <path d="M0 220 L200 260 L400 220 L200 180 Z" fill={COLORS.ground} opacity="0.3" />

      {/* Main building */}
      <path d="M70 190 L70 110 L190 75 L190 155 Z" fill={COLORS.building} />
      <path d="M190 75 L310 110 L310 190 L190 155 Z" fill={COLORS.buildingLight} />
      <path d="M70 110 L190 75 L310 110 L190 145 Z" fill={COLORS.buildingTop} />

      {/* Refrigeration units on top */}
      <rect x="130" y="60" width="25" height="18" fill={COLORS.cooling} opacity="0.6" rx="2" transform="skewX(-20)" />
      <rect x="170" y="55" width="25" height="18" fill={COLORS.cooling} opacity="0.5" rx="2" transform="skewX(-20)" />

      {/* Loading docks */}
      <rect x="225" y="135" width="25" height="35" fill="#1e293b" opacity="0.7" rx="1" />
      <rect x="260" y="140" width="25" height="35" fill="#1e293b" opacity="0.6" rx="1" />

      {/* Wash bay area */}
      <path d="M320 160 L320 190 L370 190 L370 160 Z" fill={COLORS.accent} opacity="0.2" />
      <text x="345" y="180" textAnchor="middle" fill={COLORS.accent} fontSize="7" opacity="0.6">WASH</text>

      {/* Crane */}
      <line x1="50" y1="15" x2="50" y2="190" stroke={COLORS.crane} strokeWidth="3.5" />
      <line x1="50" y1="20" x2="160" y2="20" stroke={COLORS.crane} strokeWidth="2.5" />
      <line x1="130" y1="20" x2="130" y2="50" stroke={COLORS.scaffold} strokeWidth="1.5" />

      <text x="200" y="270" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">Food Processing — Under Construction</text>
    </svg>
  )
}

function LightManufacturingSVG() {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground */}
      <path d="M0 220 L200 260 L400 220 L200 180 Z" fill={COLORS.ground} opacity="0.3" />

      {/* Main building */}
      <path d="M60 195 L60 110 L180 75 L180 160 Z" fill={COLORS.building} />
      <path d="M180 75 L300 110 L300 195 L180 160 Z" fill={COLORS.buildingLight} />
      <path d="M60 110 L180 75 L300 110 L180 145 Z" fill={COLORS.buildingTop} />

      {/* Sawtooth roof */}
      <path d="M80 108 L120 95 L120 108 Z" fill={COLORS.window} opacity="0.3" />
      <path d="M120 100 L160 88 L160 100 Z" fill={COLORS.window} opacity="0.3" />

      {/* Windows (left) */}
      {[0, 1, 2].map(i => (
        <rect key={i} x={80 + i * 25} y={125 + i * 6} width="12" height="20" fill={COLORS.window} opacity={0.5 + i * 0.1} rx="1"
              transform={`skewY(-22) translate(${i}, ${i * 5})`} />
      ))}

      {/* Side extension */}
      <path d="M300 130 L300 195 L360 195 L360 150 Z" fill={COLORS.buildingLight} opacity="0.8" />
      <path d="M300 130 L360 150 L360 150 L300 130 Z" fill={COLORS.buildingTop} opacity="0.7" />

      {/* Small chimney */}
      <rect x="140" y="55" width="8" height="25" fill={COLORS.scaffold} opacity="0.8" />
      <ellipse cx="144" cy="50" rx="6" ry="3" fill="#94a3b8" opacity="0.3" />

      {/* Crane */}
      <line x1="370" y1="15" x2="370" y2="195" stroke={COLORS.crane} strokeWidth="3.5" />
      <line x1="370" y1="20" x2="280" y2="20" stroke={COLORS.crane} strokeWidth="2.5" />
      <line x1="310" y1="20" x2="310" y2="60" stroke={COLORS.scaffold} strokeWidth="1.5" />
      <rect x="303" y="60" width="14" height="8" fill={COLORS.crane} opacity="0.7" rx="1" />

      {/* Scaffolding */}
      <line x1="300" y1="110" x2="300" y2="195" stroke={COLORS.scaffold} strokeWidth="1.5" opacity="0.4" />
      <line x1="308" y1="108" x2="308" y2="195" stroke={COLORS.scaffold} strokeWidth="1.5" opacity="0.4" />

      <text x="200" y="270" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">Light Manufacturing — Under Construction</text>
    </svg>
  )
}

const FACTORY_SVGS = {
  data_center: DataCenterSVG,
  chemical_plant: ChemicalPlantSVG,
  warehouse: WarehouseSVG,
  food_processing: FoodProcessingSVG,
  light_manufacturing: LightManufacturingSVG,
}

export default function SiteAsset({ factoryType, siteName }) {
  const SVGComponent = FACTORY_SVGS[factoryType] || LightManufacturingSVG

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="relative">
        {/* Gradient overlay at top */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 to-transparent pointer-events-none z-10" style={{ height: '30%' }} />

        {/* Construction badge */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-amber-600/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-white">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Under Construction
        </div>

        {/* SVG illustration */}
        <div className="px-4 pt-3 pb-2" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
          <SVGComponent />
        </div>
      </div>

      {/* Caption */}
      {siteName && (
        <div className="px-4 py-2.5 border-t border-slate-800">
          <div className="text-xs text-slate-500">Site Visualization</div>
          <div className="text-sm font-medium text-slate-300">{siteName}</div>
        </div>
      )}
    </div>
  )
}
