/**
 * Simulation Runner Dispatcher
 */

import { ScenarioPreset, SimulationRecord } from '../types/cgem';
import { run0DSimulation } from './cgemEngine0D';
import { run1DSimulation } from './cgemEngine1D';
import { run2DSimulation } from './cgemEngine2D';

export function runSimulation(
  scenario: ScenarioPreset,
  onProgress?: (prog: number) => void
): SimulationRecord[] {
  if (scenario.mode === '0D_box') {
    return run0DSimulation(scenario, onProgress);
  } else if (scenario.mode === '1D_column') {
    return run1DSimulation(scenario, onProgress);
  } else {
    return run2DSimulation(scenario, onProgress);
  }
}
