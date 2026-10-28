import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SimulationControls } from './components/SimulationControls';
import { HypoxiaAssessment } from './components/HypoxiaAssessment';
import { TimeSeriesCharts } from './components/TimeSeriesCharts';
import { DepthProfileView } from './components/DepthProfileView';
import { EstuaryTransectView } from './components/EstuaryTransectView';
import { EcosystemDiagram } from './components/EcosystemDiagram';
import { ParameterEditor } from './components/ParameterEditor';
import { FortranCodeInspector } from './components/FortranCodeInspector';
import { scenarioPresets, defaultCGEMParams } from './engine/presets';
import { runSimulation } from './engine/simulationRunner';
import { CGEMModelParams, DimensionMode, ScenarioPreset, SimulationRecord } from './types/cgem';

export function App() {
  const [scenarios] = useState<ScenarioPreset[]>(scenarioPresets);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioPreset>(scenarioPresets[0]);
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>(scenarioPresets[0].mode);
  const [currentParams, setCurrentParams] = useState<CGEMModelParams>(scenarioPresets[0].params);

  const [records, setRecords] = useState<SimulationRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isCodeInspectorOpen, setIsCodeInspectorOpen] = useState<boolean>(false);

  // Run simulation whenever scenario or parameters change
  const executeSimulation = useCallback((scenario: ScenarioPreset, params: CGEMModelParams, mode: DimensionMode) => {
    setIsSimulating(true);
    // Use timeout to allow UI spinner
    setTimeout(() => {
      const activeScenario: ScenarioPreset = {
        ...scenario,
        mode,
        params
      };
      const results = runSimulation(activeScenario);
      setRecords(results);
      setCurrentIndex(0);
      setIsSimulating(false);
    }, 20);
  }, []);

  // Initial load
  useEffect(() => {
    executeSimulation(selectedScenario, currentParams, dimensionMode);
  }, [selectedScenario, currentParams, dimensionMode, executeSimulation]);

  // Handle Scenario Selection
  const handleSelectScenario = (sc: ScenarioPreset) => {
    setSelectedScenario(sc);
    setDimensionMode(sc.mode);
    setCurrentParams({ ...sc.params });
  };

  // Handle Mode Change (0D, 1D, 2D)
  const handleSelectMode = (mode: DimensionMode) => {
    setDimensionMode(mode);
  };

  // Re-run model with current parameters
  const handleRerun = () => {
    executeSimulation(selectedScenario, currentParams, dimensionMode);
  };

  // Reset to original preset defaults
  const handleResetDefaults = () => {
    setCurrentParams({ ...selectedScenario.params });
  };

  // Export time series data to CSV
  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'Day',
      'Hour',
      'Min_DO_mgL',
      'Avg_DO_mgL',
      'Total_Chla_ugL',
      'Avg_pH',
      'Aragonite_Omega',
      'AirSea_O2Flux_mmol_m2_d',
      'Benthic_SOC_mmol_m2_d',
      'Primary_Production_mmol_m3_d',
      'NO3_surface_mmol_m3',
      'NH4_surface_mmol_m3',
      'PO4_surface_mmol_m3',
      'Si_surface_mmol_m3'
    ];

    const rows = records.map((r) => {
      const st0 = r.states[0] || {};
      return [
        r.timeDays,
        r.hourOfDay,
        r.minO2_mgL,
        r.avgO2_mgL,
        r.totalChla_ugL,
        r.avgPH,
        r.avgOmegaArag,
        r.airSeaO2Flux,
        r.benthicSOC,
        r.primaryProduction,
        st0.NO3?.toFixed(2) ?? '',
        st0.NH4?.toFixed(2) ?? '',
        st0.PO4?.toFixed(2) ?? '',
        st0.Si?.toFixed(2) ?? ''
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CGEM_${selectedScenario.id}_output.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentRecord = records[currentIndex] || records[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-slate-950">
      {/* Navigation Header */}
      <Navbar
        scenarios={scenarios}
        selectedScenario={selectedScenario}
        onSelectScenario={handleSelectScenario}
        dimensionMode={dimensionMode}
        onSelectMode={handleSelectMode}
        onOpenCodeInspector={() => setIsCodeInspectorOpen(true)}
        onExportCSV={handleExportCSV}
        isSimulating={isSimulating}
        onRerun={handleRerun}
      />

      {/* Main Simulation Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-4">
        {/* Scenario Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                {selectedScenario.category}
              </span>
              <h2 className="text-base font-bold text-white">
                {selectedScenario.name}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              {selectedScenario.description}
            </p>
          </div>
          <div className="text-right flex-shrink-0 text-xs font-mono text-slate-400">
            <span className="block text-slate-300 font-semibold">{selectedScenario.siteName}</span>
            <span>Duration: {selectedScenario.durationDays} Days | Depth: {selectedScenario.depthMeters}m</span>
          </div>
        </div>

        {/* Playback Controls & Timeline Scrubber */}
        <SimulationControls
          records={records}
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onReset={() => {
            setIsPlaying(false);
            setCurrentIndex(0);
          }}
          totalDurationDays={selectedScenario.durationDays}
        />

        {/* EPA Water Quality & Hypoxia Assessment Cards */}
        <HypoxiaAssessment currentRecord={currentRecord} />

        {/* Core Visualization Grid: Time Series & Profile/Transect */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Time Series Charts */}
          <div className={dimensionMode === '1D_column' ? 'lg:col-span-8' : 'lg:col-span-12'}>
            <TimeSeriesCharts
              records={records}
              currentIndex={currentIndex}
              onSelectIndex={setCurrentIndex}
              scenarioMode={dimensionMode}
            />
          </div>

          {/* 1D Depth Profile View */}
          {dimensionMode === '1D_column' && (
            <div className="lg:col-span-4">
              <DepthProfileView
                currentRecord={currentRecord}
                totalDepth={selectedScenario.depthMeters}
              />
            </div>
          )}
        </div>

        {/* 2D Longitudinal Transect View (When in 2D mode) */}
        {dimensionMode === '2D_estuary' && (
          <EstuaryTransectView currentRecord={currentRecord} />
        )}

        {/* Coupled Biogeochemical Reaction Network Diagram */}
        <EcosystemDiagram currentRecord={currentRecord} />

        {/* EPA GEM_InputFile Parameter Editor & Kinetics Switches */}
        <ParameterEditor
          params={currentParams}
          onChangeParams={setCurrentParams}
          onResetDefaults={handleResetDefaults}
        />
      </main>

      {/* Fortran Source Code & GEM_InputFile Inspector Modal */}
      <FortranCodeInspector
        isOpen={isCodeInspectorOpen}
        onClose={() => setIsCodeInspectorOpen(false)}
        currentParams={currentParams}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          Coastal Generalized Ecosystem Model (CGEM) — U.S. Environmental Protection Agency (EPA) CEAM Codebase Migration.
        </p>
      </footer>
    </div>
  );
}
export default App;
