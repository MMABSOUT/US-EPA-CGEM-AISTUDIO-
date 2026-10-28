import React, { useState } from 'react';
import { SimulationRecord } from '../types/cgem';

interface EstuaryTransectViewProps {
  currentRecord: SimulationRecord | undefined;
}

export const EstuaryTransectView: React.FC<EstuaryTransectViewProps> = ({ currentRecord }) => {
  const [selectedMetric, setSelectedMetric] = useState<'DO' | 'chla' | 'NO3' | 'salinity'>('DO');

  if (!currentRecord || !currentRecord.states || currentRecord.states.length <= 1) {
    return null;
  }

  const nodes = currentRecord.states;
  const numNodes = nodes.length;
  const totalLengthKm = 60.0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            2D Longitudinal River-to-Coast Spatial Transect
          </h3>
          <p className="text-[11px] text-slate-400">
            River Plume Inflow → Optical Clearing Bloom → Shelf Hypoxia Zone
          </p>
        </div>

        <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
          {(['DO', 'chla', 'NO3', 'salinity'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMetric(m)}
              className={`px-2.5 py-1 rounded font-medium transition ${
                selectedMetric === m
                  ? 'bg-cyan-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'DO' ? 'Dissolved O₂' : m === 'chla' ? 'Chl-a Bloom' : m === 'NO3' ? 'Nitrate' : 'Salinity'}
            </button>
          ))}
        </div>
      </div>

      {/* Spatial transect heat nodes */}
      <div className="mt-4">
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {nodes.map((node, i) => {
            const km = ((i + 0.5) * totalLengthKm) / numNodes;
            const do_mgL = (node.O2 * 32.0) / 1000.0;
            const chla = node.totalChla;
            const no3 = node.NO3;
            const sal = node.salinity;

            let bgColor = 'bg-slate-800';
            let displayVal = '';

            if (selectedMetric === 'DO') {
              displayVal = `${do_mgL.toFixed(1)} mg/L`;
              if (do_mgL < 2.0) bgColor = 'bg-rose-950 border-rose-600/80 text-rose-300';
              else if (do_mgL < 5.0) bgColor = 'bg-amber-950/70 border-amber-700/60 text-amber-300';
              else bgColor = 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300';
            } else if (selectedMetric === 'chla') {
              displayVal = `${chla.toFixed(1)} μg/L`;
              if (chla > 20) bgColor = 'bg-emerald-700 border-emerald-400 text-white font-bold';
              else if (chla > 10) bgColor = 'bg-emerald-900 border-emerald-700 text-emerald-200';
              else bgColor = 'bg-slate-900 border-slate-700 text-slate-300';
            } else if (selectedMetric === 'NO3') {
              displayVal = `${no3.toFixed(1)}`;
              if (no3 > 30) bgColor = 'bg-blue-900 border-blue-600 text-blue-200';
              else if (no3 > 10) bgColor = 'bg-blue-950 border-blue-800 text-blue-300';
              else bgColor = 'bg-slate-900 border-slate-700 text-slate-300';
            } else {
              displayVal = `${sal.toFixed(0)} PSU`;
              bgColor = 'bg-cyan-950 border-cyan-800 text-cyan-300';
            }

            return (
              <div
                key={i}
                className={`p-2 rounded-lg border flex flex-col items-center justify-between text-center transition ${bgColor}`}
              >
                <span className="text-[9px] text-slate-400 font-mono">
                  {km.toFixed(0)} km
                </span>
                <span className="text-xs font-mono font-bold my-1">
                  {displayVal}
                </span>
                <span className="text-[9px] text-slate-500 truncate w-full">
                  {i === 0 ? 'River Head' : i === numNodes - 1 ? 'Open Gulf' : 'Estuary'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Transect ecological zone labels */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800 font-medium">
          <div className="flex items-center gap-1.5 text-blue-400">
            <span>Turbid River Discharge</span>
            <span className="text-slate-600">→</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span>Light Clearing & Massive Bloom Peak</span>
            <span className="text-slate-600">→</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <span>Benthic Stratification & Dead Zone Hypoxia</span>
          </div>
        </div>
      </div>
    </div>
  );
};
