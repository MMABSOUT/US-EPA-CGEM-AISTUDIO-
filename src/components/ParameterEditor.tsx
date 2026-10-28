import React, { useState } from 'react';
import { Settings2, RotateCcw, Sliders, Check } from 'lucide-react';
import { CGEMModelParams } from '../types/cgem';

interface ParameterEditorProps {
  params: CGEMModelParams;
  onChangeParams: (params: CGEMModelParams) => void;
  onResetDefaults: () => void;
}

export const ParameterEditor: React.FC<ParameterEditorProps> = ({
  params,
  onChangeParams,
  onResetDefaults
}) => {
  const [activeCategory, setActiveCategory] = useState<'switches' | 'optics' | 'phyto' | 'benthic' | 'organic'>('switches');

  const updateParam = (field: keyof CGEMModelParams, value: any) => {
    onChangeParams({
      ...params,
      [field]: value
    });
  };

  const updatePhyto = (index: number, field: string, value: any) => {
    const updated = [...params.phytoplankton];
    updated[index] = { ...updated[index], [field]: value };
    onChangeParams({ ...params, phytoplankton: updated });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            CGEM Model Parameters & Formulation Switches
          </h3>
          <p className="text-[11px] text-slate-400">
            Directly replicates EPA GEM_InputFile kinetics and rate constants
          </p>
        </div>

        <button
          onClick={onResetDefaults}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset to Calibrated Defaults</span>
        </button>
      </div>

      {/* Categories Tabs */}
      <div className="flex flex-wrap gap-1.5 mt-3 border-b border-slate-800/80 pb-2 text-xs">
        {[
          { id: 'switches', label: 'Formulation Switches' },
          { id: 'optics', label: 'Optics & Light' },
          { id: 'phyto', label: 'Phytoplankton Kinetics' },
          { id: 'organic', label: 'Organic Matter & Nitrification' },
          { id: 'benthic', label: 'Benthic Sediment (SOC)' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as any)}
            className={`px-3 py-1 font-medium rounded-md transition ${
              activeCategory === tab.id
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="mt-4 text-xs">
        {activeCategory === 'switches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="block text-slate-300 font-semibold mb-1">
                Temperature Reaction Model (Which_temperature)
              </label>
              <select
                value={params.switchTemperature}
                onChange={(e) => updateParam('switchTemperature', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200"
              >
                <option value={1}>1: Sigmoidal Function</option>
                <option value={2}>2: Optimum Temperature Threshold (Cerco & Noel 2004)</option>
                <option value={3}>3: Arrhenius Form (Geider 1997)</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Governs temperature dependence of algal growth, respiration, and mineralization.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="block text-slate-300 font-semibold mb-1">
                Nutrient Growth Model (Which_quota)
              </label>
              <select
                value={params.switchQuota}
                onChange={(e) => updateParam('switchQuota', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200"
              >
                <option value={1}>1: Droop Cell Quota Kinetics (Variable N:C & P:C)</option>
                <option value={2}>2: Direct Michaelis-Menten External Substrate</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Droop model tracks internal cellular nitrogen and phosphorus reserves.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="block text-slate-300 font-semibold mb-1">
                Photosynthesis-Irradiance Curve (Which_photosynthesis)
              </label>
              <select
                value={params.switchPhotosynthesis}
                onChange={(e) => updateParam('switchPhotosynthesis', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200"
              >
                <option value={1}>1: With Photoinhibition (Platt et al. 1980)</option>
                <option value={2}>2: Without Photoinhibition (Monod/Smith curve)</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Platt model suppresses primary production at excess midday surface irradiance.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="block text-slate-300 font-semibold mb-1">
                Chlorophyll-a to Carbon Ratio (Which_chlaC)
              </label>
              <select
                value={params.switchChlaC}
                onChange={(e) => updateParam('switchChlaC', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200"
              >
                <option value={1}>1: Fixed C:Chl-a Ratio</option>
                <option value={2}>2: Cloern Photoacclimation Model</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Cloern dynamic photoacclimation adjusts chlorophyll cellular quota based on light.
              </p>
            </div>
          </div>
        )}

        {activeCategory === 'optics' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-400 font-medium">Kw (Water Attenuation)</label>
              <input
                type="number"
                step="0.01"
                value={params.Kw}
                onChange={(e) => updateParam('Kw', Number(e.target.value))}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-cyan-300"
              />
              <span className="text-[10px] text-slate-500">1/m (Pure seawater: 0.04 - 0.15)</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-400 font-medium">Kcdom (CDOM Attenuation)</label>
              <input
                type="number"
                step="0.0005"
                value={params.Kcdom}
                onChange={(e) => updateParam('Kcdom', Number(e.target.value))}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-cyan-300"
              />
              <span className="text-[10px] text-slate-500">1/m/ppb (Riverine humic color)</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-400 font-medium">Kspm (Sediment SPM Atten)</label>
              <input
                type="number"
                step="0.005"
                value={params.Kspm}
                onChange={(e) => updateParam('Kspm', Number(e.target.value))}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-cyan-300"
              />
              <span className="text-[10px] text-slate-500">1/m/(mg/L) Suspended sediment</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-400 font-medium">Kchla (Chl-a Self-Shading)</label>
              <input
                type="number"
                step="0.002"
                value={params.Kchla}
                onChange={(e) => updateParam('Kchla', Number(e.target.value))}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-cyan-300"
              />
              <span className="text-[10px] text-slate-500">1/m/(mg/m³) Phytoplankton shading</span>
            </div>
          </div>
        )}

        {activeCategory === 'phyto' && (
          <div className="space-y-3">
            {params.phytoplankton.map((p, idx) => (
              <div key={p.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="font-semibold text-slate-200">{p.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {p.id}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400">μmax (Max Growth 1/d)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={p.umax}
                      onChange={(e) => updatePhyto(idx, 'umax', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Kn (N Half-Sat mmol/m³)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={p.Kn}
                      onChange={(e) => updatePhyto(idx, 'Kn', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Kp (P Half-Sat mmol/m³)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={p.Kp}
                      onChange={(e) => updatePhyto(idx, 'Kp', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">sinkA (Sinking Velocity m/d)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={p.sinkA}
                      onChange={(e) => updatePhyto(idx, 'sinkA', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono text-slate-200"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeCategory === 'organic' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-400 font-medium">KG1 (Labile OM Turnover)</label>
              <input
                type="number"
                step="0.05"
                value={params.KG1}
                onChange={(e) => updateParam('KG1', Number(e.target.value))}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-rose-300"
              />
              <span className="text-[10px] text-slate-500">1/day (Rapid microbial decay)</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-400 font-medium">KG2 (Refractory OM Turnover)</label>
              <input
                type="number"
                step="0.005"
                value={params.KG2}
                onChange={(e) => updateParam('KG2', Number(e.target.value))}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-slate-300"
              />
              <span className="text-[10px] text-slate-500">1/day (Slow recalcitrant breakdown)</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-400 font-medium">nitmax (Max Nitrification)</label>
              <input
                type="number"
                step="0.05"
                value={params.nitmax}
                onChange={(e) => updateParam('nitmax', Number(e.target.value))}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-cyan-300"
              />
              <span className="text-[10px] text-slate-500">1/day (NH₄⁺ → NO₃⁻ oxidation)</span>
            </div>
          </div>
        )}

        {activeCategory === 'benthic' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-400 font-medium">SOC20 (Sediment O₂ Demand)</label>
              <input
                type="number"
                step="1.0"
                value={params.SOC20}
                onChange={(e) => updateParam('SOC20', Number(e.target.value))}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-amber-300"
              />
              <span className="text-[10px] text-slate-500">mmol O₂/m²/day at 20°C</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-400 font-medium">sedNH4flux (Benthic NH₄)</label>
              <input
                type="number"
                step="0.5"
                value={params.sedNH4flux}
                onChange={(e) => updateParam('sedNH4flux', Number(e.target.value))}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-cyan-300"
              />
              <span className="text-[10px] text-slate-500">mmol N/m²/day benthic release</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-400 font-medium">sedPO4flux (Benthic PO₄)</label>
              <input
                type="number"
                step="0.05"
                value={params.sedPO4flux}
                onChange={(e) => updateParam('sedPO4flux', Number(e.target.value))}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-pink-300"
              />
              <span className="text-[10px] text-slate-500">mmol P/m²/day benthic release</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-400 font-medium">sedSiflux (Benthic Silica)</label>
              <input
                type="number"
                step="0.5"
                value={params.sedSiflux}
                onChange={(e) => updateParam('sedSiflux', Number(e.target.value))}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-amber-300"
              />
              <span className="text-[10px] text-slate-500">mmol Si/m²/day benthic release</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
