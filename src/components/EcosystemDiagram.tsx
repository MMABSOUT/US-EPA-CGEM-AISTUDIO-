import React from 'react';
import { Sun, Wind, Activity, ArrowDown, ArrowUp, RefreshCcw, Zap } from 'lucide-react';
import { SimulationRecord } from '../types/cgem';

interface EcosystemDiagramProps {
  currentRecord: SimulationRecord | undefined;
}

export const EcosystemDiagram: React.FC<EcosystemDiagramProps> = ({ currentRecord }) => {
  if (!currentRecord) return null;

  const st = currentRecord.states[0];
  if (!st) return null;

  const do_mgL = (st.O2 * 32.0) / 1000.0;
  const isHypoxic = currentRecord.minO2_mgL < 2.0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            CGEM Biogeochemical Reaction Network
          </h3>
          <p className="text-[11px] text-slate-400">
            Coupled Carbon, Nitrogen, Phosphorus, Oxygen & Sediment Diagenesis Fluxes
          </p>
        </div>
        <div className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400">
          PAR: {st.PAR.toFixed(0)} μE/m²/s
        </div>
      </div>

      {/* Compartments Grid */}
      <div className="space-y-3">
        {/* 1. Atmospheric Boundary */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              Atmospheric & Surface Boundary
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span>Solar Radiation (E₀)</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Wind className="h-3 w-3 text-cyan-400" />
                Air-Sea O₂ Flux: {currentRecord.airSeaO2Flux.toFixed(1)} mmol/m²/d
              </span>
            </div>
          </div>
        </div>

        {/* 2. Water Column Biogeochemical Core */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Inorganic Nutrients & Carbon */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-400 mb-2">
              <span>Inorganic Nutrients & DIC</span>
              <span className="text-[10px] text-slate-500 font-normal">Substrate</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Nitrate (NO₃⁻):</span>
                <span className="text-blue-300 font-semibold">{st.NO3.toFixed(2)} mmol/m³</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Ammonium (NH₄⁺):</span>
                <span className="text-cyan-300 font-semibold">{st.NH4.toFixed(2)} mmol/m³</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Phosphate (PO₄³⁻):</span>
                <span className="text-pink-300 font-semibold">{st.PO4.toFixed(2)} mmol/m³</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Silicate (Si):</span>
                <span className="text-amber-300 font-semibold">{st.Si.toFixed(2)} mmol/m³</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">DIC / pCO₂:</span>
                <span className="text-purple-300 font-semibold">{st.DIC.toFixed(0)} / {st.pCO2.toFixed(0)} ppm</span>
              </div>
            </div>
          </div>

          {/* Plankton Functional Types */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-2">
              <span>Phytoplankton & Grazers</span>
              <span className="text-[10px] text-slate-500 font-normal">Droop Quota</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-amber-400">Diatoms:</span>
                <span className="text-slate-200">{st.A_biomass[0]?.toFixed(2)} mmol C</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-emerald-400">Greens & Flagellates:</span>
                <span className="text-slate-200">{st.A_biomass[1]?.toFixed(2)} mmol C</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-cyan-400">Cyanobacteria:</span>
                <span className="text-slate-200">{st.A_biomass[2]?.toFixed(2)} mmol C</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-orange-400">Zooplankton:</span>
                <span className="text-slate-200">{(st.Z_biomass[0] + st.Z_biomass[1]).toFixed(2)} mmol C</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Total Chl-a:</span>
                <span className="text-emerald-400 font-bold">{st.totalChla.toFixed(1)} μg/L</span>
              </div>
            </div>
          </div>

          {/* Organic Carbon Pools & Dissolved Oxygen */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-400 mb-2">
              <span>Oxygen & Microbial Remin</span>
              <span className="text-[10px] text-slate-500 font-normal">O2 Mass Balance</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Surface DO:</span>
                <span className="text-cyan-300 font-semibold">{do_mgL.toFixed(2)} mg/L</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Min Column DO:</span>
                <span className={`font-bold ${isHypoxic ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {currentRecord.minO2_mgL.toFixed(2)} mg/L
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Labile OM (OM1):</span>
                <span className="text-slate-300">{(st.OM1_A + st.OM1_Z + st.OM1_R).toFixed(1)} mmol C</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Refractory OM (OM2):</span>
                <span className="text-slate-300">{(st.OM2_A + st.OM2_Z + st.OM2_R).toFixed(1)} mmol C</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">CDOM:</span>
                <span className="text-amber-400 font-semibold">{st.CDOM.toFixed(1)} ppb</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Benthic Sediment Layer */}
        <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              <span className="font-bold text-amber-200">
                Sediment Diagenesis Layer (Benthic Boundary)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-amber-300">
              <span>SOC: {currentRecord.benthicSOC.toFixed(1)} mmol O₂/m²/d</span>
              <span>•</span>
              <span>Benthic NH₄ Release: 3.5 mmol/m²/d</span>
              <span>•</span>
              <span>Benthic PO₄ Release: 0.25 mmol/m²/d</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
