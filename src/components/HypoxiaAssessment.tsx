import React from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, Droplets, Gauge, Flame, Sparkles } from 'lucide-react';
import { SimulationRecord } from '../types/cgem';

interface HypoxiaAssessmentProps {
  currentRecord: SimulationRecord | undefined;
}

export const HypoxiaAssessment: React.FC<HypoxiaAssessmentProps> = ({ currentRecord }) => {
  if (!currentRecord) return null;

  const minO2 = currentRecord.minO2_mgL;
  const avgO2 = currentRecord.avgO2_mgL;
  const chla = currentRecord.totalChla_ugL;
  const pH = currentRecord.avgPH;
  const omega = currentRecord.avgOmegaArag;

  // Hypoxia classification according to EPA Northern Gulf of Mexico criteria
  let o2Status = {
    label: 'Normoxic / Good',
    desc: 'Dissolved oxygen > 5.0 mg/L supports healthy fishery ecosystems',
    color: 'emerald',
    icon: CheckCircle2,
    badgeBg: 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400',
    ringColor: 'ring-emerald-500/20'
  };

  if (minO2 < 0.2) {
    o2Status = {
      label: 'Severe Anoxia',
      desc: 'Deadly anoxic bottom conditions (DO < 0.2 mg/L), hydrogen sulfide formation risk',
      color: 'purple',
      icon: AlertCircle,
      badgeBg: 'bg-purple-950/90 border-purple-700/70 text-purple-300 animate-pulse',
      ringColor: 'ring-purple-500/30'
    };
  } else if (minO2 < 2.0) {
    o2Status = {
      label: 'Hypoxic "Dead Zone"',
      desc: 'Critical hypoxia (DO < 2.0 mg/L) causes fish kills and benthos mortality',
      color: 'rose',
      icon: AlertTriangle,
      badgeBg: 'bg-rose-950/90 border-rose-700/70 text-rose-300 animate-pulse',
      ringColor: 'ring-rose-500/30'
    };
  } else if (minO2 < 5.0) {
    o2Status = {
      label: 'Biological Stress',
      desc: 'Moderate oxygen depletion (2.0 - 5.0 mg/L) causing sublethal behavioral stress',
      color: 'amber',
      icon: AlertTriangle,
      badgeBg: 'bg-amber-950/80 border-amber-700/60 text-amber-400',
      ringColor: 'ring-amber-500/20'
    };
  }

  // Acidification classification
  const isCorrosive = omega < 1.0;
  const acidStatus = isCorrosive
    ? {
        label: 'Corrosive / Undersaturated (Ω < 1)',
        desc: 'Aragonite shell dissolution risk for larval oysters, clams, and pteropods',
        badgeBg: 'bg-red-950/80 border-red-700/60 text-red-300'
      }
    : {
        label: 'Supersaturated (Ω > 1.0)',
        desc: 'Favorable carbonate conditions for calcium carbonate calcification',
        badgeBg: 'bg-cyan-950/80 border-cyan-700/60 text-cyan-300'
      };

  // Trophic state
  let trophicLabel = 'Oligotrophic';
  if (chla > 25.0) trophicLabel = 'Hyper-Eutrophic (Algal Bloom)';
  else if (chla > 8.0) trophicLabel = 'Eutrophic';
  else if (chla > 2.5) trophicLabel = 'Mesotrophic';

  const O2Icon = o2Status.icon;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Dissolved Oxygen & Hypoxia Status */}
      <div className={`p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-sm relative overflow-hidden ring-1 ${o2Status.ringColor}`}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Dissolved Oxygen (DO)
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-white">
                {minO2.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">mg/L</span>
              <span className="text-[10px] text-slate-500 font-mono">
                (avg: {avgO2.toFixed(1)})
              </span>
            </div>
          </div>
          <div className={`p-2 rounded-lg ${o2Status.badgeBg}`}>
            <O2Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-semibold text-slate-300">{o2Status.label}</span>
            <span className="text-slate-500 font-mono">Threshold: 2.0 mg/L</span>
          </div>
          {/* Mini threshold gauge */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-300 ${
                minO2 < 2.0 ? 'bg-rose-500' : minO2 < 5.0 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (minO2 / 10.0) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{o2Status.desc}</p>
        </div>
      </div>

      {/* 2. Carbonate System & Coastal Acidification */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Acidification & Aragonite
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-white">
                {pH.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">pH</span>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                Ωarag: {omega.toFixed(2)}
              </span>
            </div>
          </div>
          <div className={`p-2 rounded-lg ${acidStatus.badgeBg}`}>
            <Droplets className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className={`font-semibold ${isCorrosive ? 'text-red-400' : 'text-slate-300'}`}>
              {acidStatus.label}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-2">{acidStatus.desc}</p>
        </div>
      </div>

      {/* 3. Phytoplankton Biomass & Eutrophication */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Chlorophyll-a & Bloom
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {chla.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">μg/L</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-semibold text-slate-300">{trophicLabel}</span>
            <span className="text-slate-500 font-mono">Prod: {currentRecord.primaryProduction} mmol/m³</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, (chla / 30.0) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Primary production fixed from dissolved inorganic carbon
          </p>
        </div>
      </div>

      {/* 4. Benthic Oxygen Demand (SOC) & Gas Fluxes */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Benthic Sediment Demand
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-amber-300">
                {currentRecord.benthicSOC.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">mmol O₂/m²/d</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-400">
            <Flame className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-400">Air-Sea O₂ Flux:</span>
            <span className="font-mono text-slate-200">
              {currentRecord.airSeaO2Flux > 0 ? '+' : ''}{currentRecord.airSeaO2Flux.toFixed(1)} mmol/m²/d
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Sediment diagenesis mineralizes settling dead algal particulate carbon
          </p>
        </div>
      </div>
    </div>
  );
};
