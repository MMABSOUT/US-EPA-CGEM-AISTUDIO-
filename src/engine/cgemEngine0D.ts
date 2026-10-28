/**
 * CGEM 0D Box Model Simulation Engine
 * Simulates a well-mixed parcel of water with air-sea gas exchange and sediment interaction
 */

import { ScenarioPreset, SimulationRecord, WaterQualityState } from '../types/cgem';
import { calcLightAttenuation, calcO2Sat, calcSchmidtCO2, calcSchmidtO2, calcSolarRadiation } from './cgemPhysics';
import { solveCarbonateSystem } from './carbonateChem';
import { computeCGEMDerivatives } from './cgemBiochem';

export function run0DSimulation(
  scenario: ScenarioPreset,
  onProgress?: (progress: number) => void
): SimulationRecord[] {
  const records: SimulationRecord[] = [];
  const params = scenario.params;
  const forcing = scenario.environmentalForcing;
  const depth = scenario.depthMeters;

  // Time step in days (e.g. 1 hour = 1/24 day)
  const dtDays = 1.0 / 24.0; // 1-hour resolution
  const totalSteps = Math.round(scenario.durationDays / dtDays);

  // Initialize state
  const init = scenario.initialWater;
  let O2 = init.O2 ?? 220;
  let DIC = init.DIC ?? 2000;
  let Alk = init.Alk ?? 2300;
  let NO3 = init.NO3 ?? 20;
  let NH4 = init.NH4 ?? 2;
  let PO4 = init.PO4 ?? 1.5;
  let Si = init.Si ?? 15;
  let A_biomass = [...(init.A_biomass ?? [2.5, 1.2, 0.4])];
  let Z_biomass = [...(init.Z_biomass ?? [0.8, 0.4])];
  let OM1_A = init.OM1_A ?? 2.0;
  let OM2_A = init.OM2_A ?? 8.0;
  let OM1_Z = init.OM1_Z ?? 1.0;
  let OM2_Z = init.OM2_Z ?? 4.0;
  let OM1_R = init.OM1_R ?? 5.0;
  let OM2_R = init.OM2_R ?? 15.0;
  let CDOM = init.CDOM ?? 10.0;

  // Initialize cell quotas
  const A_Qn = params.phytoplankton.map(p => (p.QminN + p.QmaxN) * 0.5);
  const A_Qp = params.phytoplankton.map(p => (p.QminP + p.QmaxP) * 0.5);

  let elapsedDays = 0;
  const baseDayOfYear = 180; // Summer solstice baseline ~ July

  for (let step = 0; step <= totalSteps; step++) {
    elapsedDays = step * dtDays;
    const hourOfDay = (elapsedDays * 24) % 24;
    const currentDayOfYear = (baseDayOfYear + Math.floor(elapsedDays)) % 365;

    // Environmental temperature with diurnal fluctuation
    const diurnalTemp = forcing.tempMean + forcing.tempAmp * Math.sin(((hourOfDay - 9) * Math.PI) / 12);
    const salinity = forcing.salinity;

    // Diurnal surface PAR
    const surfacePAR = calcSolarRadiation(currentDayOfYear, hourOfDay, forcing.latitude, forcing.surfacePARmax) * params.PARfac;

    // Phytoplankton chlorophyll calculations
    const A_chla = A_biomass.map((bio, i) => {
      const p = params.phytoplankton[i];
      // Fixed or dynamic Cloern
      return (bio * 12.0) / p.CChla; // mg Chl/m3
    });
    const totalChla = A_chla.reduce((sum, c) => sum + c, 0);

    // Light attenuation in parcel (mid-depth calculation: z = depth / 2)
    const spm = 5.0; // mg/L baseline
    const Kd = calcLightAttenuation(params.Kw, params.Kcdom, CDOM, params.Kspm, spm, params.Kchla, totalChla);
    const midPAR = surfacePAR * Math.exp(-Kd * (depth / 2));

    // Carbonate chemistry
    const carb = solveCarbonateSystem(DIC, Alk, diurnalTemp, salinity, forcing.windSpeed, params.pCO2atm);

    // Assemble current state
    const currentState: WaterQualityState = {
      O2,
      DIC,
      Alk,
      pH: carb.pH,
      pCO2: carb.pCO2,
      omegaArag: carb.omegaArag,
      omegaCalc: carb.omegaCalc,
      NO3,
      NH4,
      PO4,
      Si,
      A_biomass: [...A_biomass],
      A_chla: [...A_chla],
      A_Qn: [...A_Qn],
      A_Qp: [...A_Qp],
      Z_biomass: [...Z_biomass],
      OM1_A,
      OM2_A,
      OM1_Z,
      OM2_Z,
      OM1_R,
      OM2_R,
      CDOM,
      temp: diurnalTemp,
      salinity,
      PAR: midPAR,
      depth,
      totalChla
    };

    // Calculate biochemical derivatives
    const deriv = computeCGEMDerivatives(currentState, params, midPAR, diurnalTemp);

    // Air-sea oxygen exchange flux: F_O2 = k * (O2_sat - O2) / depth (mmol/m3/day)
    const o2Sat = calcO2Sat(diurnalTemp, salinity);
    const scO2 = calcSchmidtO2(diurnalTemp);
    const k660 = 0.251 * Math.pow(forcing.windSpeed, 2);
    const kO2 = k660 * Math.pow(scO2 / 660, -0.5) * 0.24; // m/day
    const airSeaO2Flux_m2 = kO2 * (o2Sat - O2); // mmol/m2/day
    const airSeaO2_vol = airSeaO2Flux_m2 / depth; // mmol/m3/day

    // Air-sea CO2 exchange
    const airSeaCO2_vol = carb.co2Flux / depth; // mmol/m3/day

    // Benthic sediment exchange (scaled by 1 / depth)
    const tFactSed = Math.pow(params.thetaSOC, diurnalTemp - 20.0);
    const o2LimSed = O2 / (15.0 + O2);
    const soc = params.SOC20 * tFactSed * o2LimSed; // mmol O2/m2/day
    const soc_vol = soc / depth;

    const sedNH4_vol = (params.sedNH4flux * tFactSed) / depth;
    const sedPO4_vol = (params.sedPO4flux * tFactSed) / depth;
    const sedSi_vol = (params.sedSiflux * tFactSed) / depth;

    // Record sample (every hour)
    const o2_mgL = (O2 * 32.0) / 1000.0;
    records.push({
      timeStep: step,
      timeDays: Number(elapsedDays.toFixed(2)),
      hourOfDay: Number(hourOfDay.toFixed(1)),
      dayOfYear: currentDayOfYear,
      states: [currentState],
      avgO2_mgL: Number(o2_mgL.toFixed(2)),
      minO2_mgL: Number(o2_mgL.toFixed(2)),
      totalChla_ugL: Number(totalChla.toFixed(2)),
      avgPH: Number(carb.pH.toFixed(3)),
      avgOmegaArag: Number(carb.omegaArag.toFixed(2)),
      airSeaO2Flux: Number(airSeaO2Flux_m2.toFixed(1)),
      airSeaCO2Flux: Number(carb.co2Flux.toFixed(1)),
      benthicSOC: Number(soc.toFixed(1)),
      primaryProduction: Number(deriv.grossPrimaryProduction.toFixed(2))
    });

    // Numerical integration (Euler / RK-step with non-negativity protection)
    O2 = Math.max(0.1, O2 + (deriv.dO2 + airSeaO2_vol - soc_vol) * dtDays);
    DIC = Math.max(500, DIC + (deriv.dDIC + airSeaCO2_vol + soc_vol * 0.85) * dtDays);
    Alk = Math.max(500, Alk + deriv.dAlk * dtDays);
    NO3 = Math.max(0.01, NO3 + deriv.dNO3 * dtDays);
    NH4 = Math.max(0.01, NH4 + (deriv.dNH4 + sedNH4_vol) * dtDays);
    PO4 = Math.max(0.005, PO4 + (deriv.dPO4 + sedPO4_vol) * dtDays);
    Si = Math.max(0.01, Si + (deriv.dSi + sedSi_vol) * dtDays);

    for (let i = 0; i < params.phytoplankton.length; i++) {
      A_biomass[i] = Math.max(0.001, A_biomass[i] + deriv.dA_biomass[i] * dtDays);
      A_Qn[i] = Math.max(params.phytoplankton[i].QminN, A_Qn[i] + deriv.dA_Qn[i] * dtDays);
      A_Qp[i] = Math.max(params.phytoplankton[i].QminP, A_Qp[i] + deriv.dA_Qp[i] * dtDays);
    }

    for (let j = 0; j < params.zooplankton.length; j++) {
      Z_biomass[j] = Math.max(0.001, Z_biomass[j] + deriv.dZ_biomass[j] * dtDays);
    }

    OM1_A = Math.max(0, OM1_A + deriv.dOM1_A * dtDays);
    OM2_A = Math.max(0, OM2_A + deriv.dOM2_A * dtDays);
    OM1_Z = Math.max(0, OM1_Z + deriv.dOM1_Z * dtDays);
    OM2_Z = Math.max(0, OM2_Z + deriv.dOM2_Z * dtDays);
    OM1_R = Math.max(0, OM1_R + deriv.dOM1_R * dtDays);
    OM2_R = Math.max(0, OM2_R + deriv.dOM2_R * dtDays);
    CDOM = Math.max(0, CDOM + deriv.dCDOM * dtDays);

    if (onProgress && step % 50 === 0) {
      onProgress(step / totalSteps);
    }
  }

  return records;
}
