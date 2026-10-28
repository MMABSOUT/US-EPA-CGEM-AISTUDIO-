import React from 'react';
import { Waves, FileCode2, Download, Layers, ShieldCheck, RefreshCw } from 'lucide-react';
import { DimensionMode, ScenarioPreset } from '../types/cgem';

interface NavbarProps {
  scenarios: ScenarioPreset[];
  selectedScenario: ScenarioPreset;
  onSelectScenario: (scenario: ScenarioPreset) => void;
  dimensionMode: DimensionMode;
  onSelectMode: (mode: DimensionMode) => void;
  onOpenCodeInspector: () => void;
  onExportCSV: () => void;
  isSimulating: boolean;
  onRerun: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  scenarios,
  selectedScenario,
  onSelectScenario,
  dimensionMode,
  onSelectMode,
  onOpenCodeInspector,
  onExportCSV,
  isSimulating,
  onRerun
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-4 lg:px-6 py-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Model Identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-950/50">
            <Waves className="h-6 w-6 text-slate-950 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                CGEM
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/80 text-cyan-300">
                  v1.0 EPA CEAM
                </span>
              </h1>
              <span className="hidden sm:inline-block text-xs text-slate-400">
                Coastal Generalized Ecosystem Model
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>Water Quality</span>
              <span>•</span>
              <span>Biogeochemistry</span>
              <span>•</span>
              <span>Hypoxia</span>
              <span>•</span>
              <span>Acidification</span>
            </p>
          </div>
        </div>

        {/* Central Selectors: Scenario & Dimension */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dimension Mode Picker */}
          <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => onSelectMode('0D_box')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                dimensionMode === '0D_box'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="0D Well-Mixed Parcel / Mesocosm Incubation"
            >
              0D Mesocosm
            </button>
            <button
              onClick={() => onSelectMode('1D_column')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                dimensionMode === '1D_column'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="1D Multi-Layer Stratified Column (Pycnocline & Hypoxic Dead Zone)"
            >
              1D Water Column
            </button>
            <button
              onClick={() => onSelectMode('2D_estuary')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                dimensionMode === '2D_estuary'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="2D River Plume to Coastal Ocean Transect"
            >
              2D Estuary Transect
            </button>
          </div>

          {/* Scenario Presets Dropdown */}
          <div className="relative">
            <select
              value={selectedScenario.id}
              onChange={(e) => {
                const found = scenarios.find((s) => s.id === e.target.value);
                if (found) onSelectScenario(found);
              }}
              className="bg-slate-950 text-slate-200 text-xs font-medium rounded-lg px-3 py-1.5 border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer max-w-[210px] sm:max-w-xs truncate"
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  [{sc.category}] {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <button
            onClick={onRerun}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            title="Re-run simulation with current parameters"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Run Model</span>
          </button>

          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 transition-all"
            title="Export simulation time series data to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Export Data</span>
          </button>

          <button
            onClick={onOpenCodeInspector}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 transition-all"
            title="Inspect Fortran source, GEM_InputFile syntax, and NetCDF definitions"
          >
            <FileCode2 className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden md:inline">Fortran & InputFile</span>
          </button>
        </div>
      </div>
    </header>
  );
};
