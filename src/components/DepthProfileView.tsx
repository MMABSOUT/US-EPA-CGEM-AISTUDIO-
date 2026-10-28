import React, { useState } from 'react';
import { SimulationRecord } from '../types/cgem';

interface DepthProfileViewProps {
  currentRecord: SimulationRecord | undefined;
  totalDepth: number;
}

export const DepthProfileView: React.FC<DepthProfileViewProps> = ({
  currentRecord,
  totalDepth
}) => {
  const [selectedVar, setSelectedVar] = useState<'O2' | 'temp' | 'chla' | 'nutrients' | 'pH'>('O2');
  const [hoverDepthIdx, setHoverDepthIdx] = useState<number | null>(null);

  if (!currentRecord || !currentRecord.states || currentRecord.states.length <= 1) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
        <p className="text-sm">Depth profile is available in 1D Water Column mode.</p>
      </div>
    );
  }

  const states = currentRecord.states;
  const numLayers = states.length;

  // Chart dimensions
  const width = 450;
  const height = 340;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const getY = (depth: number) => {
    return padTop + (depth / totalDepth) * chartH;
  };

  // Variable configurations
  let xMin = 0;
  let xMax = 10;
  let unit = '';
  let varName = '';
  let thresholdVal: number | null = null;
  let thresholdLabel = '';

  interface LineItem {
    name: string;
    color: string;
    vals: number[];
  }

  let lines: LineItem[] = [];

  if (selectedVar === 'O2') {
    varName = 'Dissolved Oxygen';
    unit = 'mg/L';
    xMin = 0;
    xMax = 10;
    thresholdVal = 2.0;
    thresholdLabel = 'Hypoxia (2.0 mg/L)';
    lines = [
      {
        name: 'Dissolved Oxygen',
        color: '#f43f5e',
        vals: states.map((s) => (s.O2 * 32.0) / 1000.0)
      }
    ];
  } else if (selectedVar === 'temp') {
    varName = 'Water Temperature';
    unit = '°C';
    xMin = 18;
    xMax = 32;
    lines = [
      {
        name: 'Temperature',
        color: '#f97316',
        vals: states.map((s) => s.temp)
      }
    ];
  } else if (selectedVar === 'chla') {
    varName = 'Chlorophyll-a Biomass';
    unit = 'μg/L';
    xMin = 0;
    xMax = Math.max(15, ...states.map((s) => s.totalChla * 1.2));
    lines = [
      {
        name: 'Total Chl-a',
        color: '#10b981',
        vals: states.map((s) => s.totalChla)
      },
      {
        name: 'Diatoms Chl-a',
        color: '#eab308',
        vals: states.map((s) => s.A_chla[0] || 0)
      }
    ];
  } else if (selectedVar === 'nutrients') {
    varName = 'Dissolved Inorganic Nutrients';
    unit = 'mmol/m³';
    xMin = 0;
    xMax = 35;
    lines = [
      {
        name: 'Nitrate (NO₃⁻)',
        color: '#3b82f6',
        vals: states.map((s) => s.NO3)
      },
      {
        name: 'Ammonium (NH₄⁺)',
        color: '#06b6d4',
        vals: states.map((s) => s.NH4)
      },
      {
        name: 'Silicate (Si)',
        color: '#eab308',
        vals: states.map((s) => s.Si)
      }
    ];
  } else {
    // pH
    varName = 'Seawater pH';
    unit = 'pH';
    xMin = 7.0;
    xMax = 8.6;
    lines = [
      {
        name: 'pH',
        color: '#8b5cf6',
        vals: states.map((s) => s.pH)
      }
    ];
  }

  const getX = (val: number) => {
    const fraction = (val - xMin) / (xMax - xMin);
    return padLeft + Math.max(0, Math.min(1, fraction)) * chartW;
  };

  const hoveredState = hoverDepthIdx !== null ? states[hoverDepthIdx] : null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
      {/* Header and variable selector */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              1D Vertical Water Column Profile
            </h3>
            <p className="text-[11px] text-slate-400">
              Depth Stratification & Benthic Boundary Layer
            </p>
          </div>

          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            {(['O2', 'temp', 'chla', 'nutrients', 'pH'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVar(v)}
                className={`px-2 py-0.5 rounded font-medium transition ${
                  selectedVar === v
                    ? 'bg-cyan-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {v === 'O2' ? 'DO' : v === 'temp' ? 'Temp' : v === 'chla' ? 'Chl-a' : v === 'nutrients' ? 'Nutrients' : 'pH'}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Depth Profile Graph */}
        <div className="mt-3 relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            onMouseLeave={() => setHoverDepthIdx(null)}
          >
            {/* Depth Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
              const y = padTop + frac * chartH;
              const depthM = (frac * totalDepth).toFixed(0);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#64748b"
                    fontFamily="monospace"
                  >
                    {depthM}m
                  </text>
                </g>
              );
            })}

            {/* X-axis ticks */}
            {[0, 0.5, 1].map((frac, idx) => {
              const x = padLeft + frac * chartW;
              const val = (xMin + frac * (xMax - xMin)).toFixed(1);
              return (
                <g key={idx}>
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={padTop + chartH}
                    stroke="#1e293b"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={x}
                    y={height - 14}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#64748b"
                    fontFamily="monospace"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Threshold guideline (e.g. 2.0 mg/L DO) */}
            {thresholdVal !== null && (
              <g>
                <line
                  x1={getX(thresholdVal)}
                  y1={padTop}
                  x2={getX(thresholdVal)}
                  y2={padTop + chartH}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x={getX(thresholdVal) + 4}
                  y={padTop + 12}
                  fontSize="8"
                  fill="#ef4444"
                  fontWeight="bold"
                >
                  {thresholdLabel}
                </text>
              </g>
            )}

            {/* Seabed indicator */}
            <rect
              x={padLeft}
              y={padTop + chartH}
              width={chartW}
              height={6}
              fill="#78350f"
              opacity="0.8"
            />
            <text
              x={padLeft + chartW / 2}
              y={padTop + chartH + 16}
              textAnchor="middle"
              fontSize="9"
              fill="#b45309"
              fontWeight="600"
            >
              Seabed & Sediment Diagenesis Layer (SOC: {currentRecord.benthicSOC} mmol/m²/d)
            </text>

            {/* Profile lines */}
            {lines.map((line, lIdx) => {
              const pts = line.vals.map((v, k) => {
                const x = getX(v);
                const y = getY(states[k].depth);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              });
              return (
                <g key={lIdx}>
                  <path
                    d={`M ${pts.join(' L ')}`}
                    fill="none"
                    stroke={line.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Layer points */}
                  {line.vals.map((v, k) => (
                    <circle
                      key={k}
                      cx={getX(v)}
                      cy={getY(states[k].depth)}
                      r={hoverDepthIdx === k ? 5 : 3}
                      fill={line.color}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoverDepthIdx(k)}
                    />
                  ))}
                </g>
              );
            })}

            {/* Hovered layer highlight line */}
            {hoverDepthIdx !== null && (
              <line
                x1={padLeft}
                y1={getY(states[hoverDepthIdx].depth)}
                x2={width - padRight}
                y2={getY(states[hoverDepthIdx].depth)}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Layer detail footer */}
      <div className="mt-2 pt-2 border-t border-slate-800 text-xs">
        {hoveredState ? (
          <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono">
            <span className="text-cyan-400 font-semibold">
              Depth {hoveredState.depth.toFixed(1)}m
            </span>
            <span className="text-rose-400">
              DO: {((hoveredState.O2 * 32) / 1000).toFixed(2)} mg/L
            </span>
            <span className="text-emerald-400">
              Chl-a: {hoveredState.totalChla.toFixed(1)} μg/L
            </span>
            <span className="text-amber-400">
              {hoveredState.temp.toFixed(1)}°C
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Hover over layer points to inspect depth values</span>
            <span>Surface: {states[0]?.depth.toFixed(1)}m | Bottom: {states[numLayers - 1]?.depth.toFixed(1)}m</span>
          </div>
        )}
      </div>
    </div>
  );
};
