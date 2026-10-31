import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, FastForward, SkipBack, SkipForward, Sun, Moon, Clock } from 'lucide-react';
import { SimulationRecord } from '../types/cgem';

interface SimulationControlsProps {
  records: SimulationRecord[];
  currentIndex: number;
  onIndexChange: React.Dispatch<React.SetStateAction<number>> | ((index: number | ((prev: number) => number)) => void);
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  totalDurationDays: number;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  records,
  currentIndex,
  onIndexChange,
  isPlaying,
  onTogglePlay,
  onReset,
  totalDurationDays
}) => {
  const [speed, setSpeed] = useState<number>(2); // 2x default

  useEffect(() => {
    let interval: any;
    if (isPlaying && records.length > 0) {
      const delay = Math.max(20, Math.floor(100 / speed));
      interval = setInterval(() => {
        onIndexChange((prev) => {
          if (prev >= records.length - 1) {
            return 0; // loop
          }
          return prev + 1;
        });
      }, delay);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed, records.length, onIndexChange]);

  const currentRecord = records[currentIndex] || records[0];
  const hour = currentRecord ? currentRecord.hourOfDay : 0;
  const isDaytime = hour >= 6 && hour <= 19;
  const elapsedDays = currentRecord ? currentRecord.timeDays : 0;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Playback & Step Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
            title="Reset to Day 0"
            aria-label="Reset simulation to Day 0"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
            title="Step Back 1 hour"
            aria-label="Step back 1 hour"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none active:scale-95 text-white font-medium text-xs rounded-lg shadow-sm transition"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            onClick={() => onIndexChange(Math.min(records.length - 1, currentIndex + 1))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
            title="Step Forward 1 hour"
            aria-label="Step forward 1 hour"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 ml-1 text-xs" role="group" aria-label="Playback speed">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                aria-label={`${s}x speed`}
                className={`px-2 py-0.5 rounded font-mono focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none ${
                  speed === s ? 'bg-cyan-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Time Status Badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 font-mono text-cyan-300">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>Day {elapsedDays.toFixed(1)} / {totalDurationDays}</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950 border border-slate-800 font-mono text-slate-300">
            {isDaytime ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
            )}
            <span>{Math.floor(hour).toString().padStart(2, '0')}:00 UTC</span>
          </div>
        </div>
      </div>

      {/* Scrubbing Timeline Slider */}
      <div className="mt-2.5 pt-1.5 border-t border-slate-800/80">
        <div className="flex items-center gap-3">
          <label htmlFor="simulation-timeline-slider" className="sr-only">
            Simulation timeline scrubber
          </label>
          <input
            id="simulation-timeline-slider"
            type="range"
            min={0}
            max={Math.max(1, records.length - 1)}
            value={currentIndex}
            onChange={(e) => onIndexChange(Number(e.target.value))}
            aria-label="Simulation timeline scrubber"
            aria-valuemin={0}
            aria-valuemax={Math.max(1, records.length - 1)}
            aria-valuenow={currentIndex}
            aria-valuetext={`Day ${elapsedDays.toFixed(1)}, ${Math.floor(hour).toString().padStart(2, '0')}:00 UTC`}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
          <span>Simulation Start (Day 0)</span>
          <span>Day {(totalDurationDays * 0.5).toFixed(0)}</span>
          <span>End (Day {totalDurationDays})</span>
        </div>
      </div>
    </div>
  );
};
