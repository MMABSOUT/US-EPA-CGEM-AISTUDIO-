/**
 * CGEM 1D Stratified Water Column Simulation Engine
 * Multi-layer vertical grid with surface mixing, pycnocline stratification,
 * depth-attenuated irradiance, particle sinking, and benthic sediment diagenesis
 */

import { ScenarioPreset, SimulationRecord, WaterQualityState } from '../types/cgem';
import { calcLightAttenuation, calcO2Sat, calcSchmidtCO2, calcSchmidtO2, calcSolarRadiation } from './cgemPhysics';
import { solveCarbonateSystem } from './carbonateChem';
import { computeCGEMDerivatives } from './cgemBiochem';

export function run1DSimulation(
  scenario: ScenarioPreset,
  onProgress?: (progress: number) => void
): SimulationRecord[] {
  const records: SimulationRecord[] = [];
  const params = scenario.params;
  const forcing = scenario.environmentalForcing;
  const totalDepth = scenario.depthMeters;
  const numLayers = scenario.numLayers || 10;
  const dz = totalDepth / numLayers;

  const dtDays = 1.0 / 24.0; // 1-hour time step
  const totalSteps = Math.round(scenario.durationDays / dtDays);

  // Initialize depth coordinates for each layer (midpoints)
  const depths = Array.from({ length: numLayers }, (_, k) => (k + 0.5) * dz);

  // Thermal and salinity stratification profile:
  // Surface layer warm (e.g. 29C), bottom layer cooler (e.g. 23C)
  // Surface lower salinity (e.g. 24 PSU from river plume), bottom high salinity (e.g. 34 PSU)
  const layerTemps = depths.map(z => {
    const fraction = z / totalDepth;
    return forcing.tempMean + (1 - fraction) * 2.0 - fraction * 3.0;
  });
  const layerSalinity = depths.map(z => {
    const fraction = z / totalDepth;
    return forcing.salinity - (1 - fraction) * 3.5 + fraction * 4.0;
  });

  // Vertical eddy diffusion coefficient Kz (m2/day):
  // High at surface (wind mixed: ~20 m2/day), suppressed across pycnocline (~0.8 m2/day), slightly higher near bed
  const Kz = depths.map(z => {
    const pycMid = totalDepth * 0.45;
    const pycDist = Math.abs(z - pycMid);
    if (z < pycMid) return 15.0 - (z / pycMid) * 13.0; // 15 down to 2
    return 1.2 + (pycDist / (totalDepth * 0.55)) * 2.5; // low across pycnocline
  });

  // Initialize layer state arrays
  const init = scenario.initialWater;
  let O2 = depths.map(() => init.O2 ?? 210);
  let DIC = depths.map(() => init.DIC ?? 2020);
  let Alk = depths.map(() => init.Alk ?? 2320);
  let NO3 = depths.map(z => (init.NO3 ?? 25) * (1 - 0.2 * (z / totalDepth)));
  let NH4 = depths.map(() => init.NH4 ?? 2.5);
  let PO4 = depths.map(() => init.PO4 ?? 1.5);
  let Si = depths.map(() => init.Si ?? 16.0);
  let OM1_A = depths.map(() => init.OM1_A ?? 3.0);
  let OM2_A = depths.map(() => init.OM2_A ?? 12.0);
  let OM1_Z = depths.map(() => init.OM1_Z ?? 1.5);
  let OM2_Z = depths.map(() => init.OM2_Z ?? 6.0);
  let OM1_R = depths.map(z => (init.OM1_R ?? 10.0) * Math.exp(-z / 6));
  let OM2_R = depths.map(z => (init.OM2_R ?? 30.0) * Math.exp(-z / 10));
  let CDOM = depths.map(z => (init.CDOM ?? 16.0) * Math.exp(-z / 8));

  let A_biomass = depths.map(() => [...(init.A_biomass ?? [4.0, 1.8, 0.6])]);
  let Z_biomass = depths.map(() => [...(init.Z_biomass ?? [1.0, 0.5])]);
  let A_Qn = depths.map(() => params.phytoplankton.map(p => (p.QminN + p.QmaxN) * 0.5));
  let A_Qp = depths.map(() => params.phytoplankton.map(p => (p.QminP + p.QmaxP) * 0.5));

  let elapsedDays = 0;
  const baseDayOfYear = 190; // Mid-July (peak Gulf hypoxia season)

  for (let step = 0; step <= totalSteps; step++) {
    elapsedDays = step * dtDays;
    const hourOfDay = (elapsedDays * 24) % 24;
    const currentDayOfYear = (baseDayOfYear + Math.floor(elapsedDays)) % 365;

    // Surface PAR
    const surfacePAR = calcSolarRadiation(currentDayOfYear, hourOfDay, forcing.latitude, forcing.surfacePARmax) * params.PARfac;

    // Chlorophyll profile and optical attenuation
    const layerChla = A_biomass.map(bios =>
      bios.map((b, i) => (b * 12.0) / params.phytoplankton[i].CChla)
    );
    const layerTotalChla = layerChla.map(cs => cs.reduce((sum, c) => sum + c, 0));

    // Cumulative light attenuation with depth
    const layerPAR: number[] = [];
    let cumOpticalDepth = 0;
    for (let k = 0; k < numLayers; k++) {
      const spm = 6.0 * Math.exp(-depths[k] / 8) + 1.5;
      const Kd = calcLightAttenuation(params.Kw, params.Kcdom, CDOM[k], params.Kspm, spm, params.Kchla, layerTotalChla[k]);
      cumOpticalDepth += Kd * dz;
      layerPAR.push(surfacePAR * Math.exp(-cumOpticalDepth));
    }

    // Solve carbonate system and biochemistry for each layer
    const layerStates: WaterQualityState[] = [];
    const layerDerivs = [];
    let totalWaterColumnProd = 0;

    for (let k = 0; k < numLayers; k++) {
      const carb = solveCarbonateSystem(
        DIC[k],
        Alk[k],
        layerTemps[k],
        layerSalinity[k],
        k === 0 ? forcing.windSpeed : 0,
        params.pCO2atm
      );

      const st: WaterQualityState = {
        O2: O2[k],
        DIC: DIC[k],
        Alk: Alk[k],
        pH: carb.pH,
        pCO2: carb.pCO2,
        omegaArag: carb.omegaArag,
        omegaCalc: carb.omegaCalc,
        NO3: NO3[k],
        NH4: NH4[k],
        PO4: PO4[k],
        Si: Si[k],
        A_biomass: [...A_biomass[k]],
        A_chla: [...layerChla[k]],
        A_Qn: [...A_Qn[k]],
        A_Qp: [...A_Qp[k]],
        Z_biomass: [...Z_biomass[k]],
        OM1_A: OM1_A[k],
        OM2_A: OM2_A[k],
        OM1_Z: OM1_Z[k],
        OM2_Z: OM2_Z[k],
        OM1_R: OM1_R[k],
        OM2_R: OM2_R[k],
        CDOM: CDOM[k],
        temp: layerTemps[k],
        salinity: layerSalinity[k],
        PAR: layerPAR[k],
        depth: depths[k],
        totalChla: layerTotalChla[k]
      };
      layerStates.push(st);

      const deriv = computeCGEMDerivatives(st, params, layerPAR[k], layerTemps[k]);
      layerDerivs.push(deriv);
      totalWaterColumnProd += deriv.grossPrimaryProduction * dz;
    }

    // Surface air-sea fluxes (k = 0)
    const o2SatSfc = calcO2Sat(layerTemps[0], layerSalinity[0]);
    const scO2 = calcSchmidtO2(layerTemps[0]);
    const k660 = 0.251 * Math.pow(forcing.windSpeed, 2);
    const kO2 = k660 * Math.pow(scO2 / 660, -0.5) * 0.24; // m/day
    const airSeaO2Flux = kO2 * (o2SatSfc - O2[0]); // mmol/m2/day
    const airSeaCO2Flux = layerStates[0].pCO2 < params.pCO2atm ? 8.0 : -12.0;

    // Bottom sediment fluxes (k = numLayers - 1)
    const botIdx = numLayers - 1;
    const tFactSed = Math.pow(params.thetaSOC, layerTemps[botIdx] - 20.0);
    const o2LimSed = O2[botIdx] / (12.0 + O2[botIdx]);
    const soc = params.SOC20 * tFactSed * o2LimSed; // mmol O2/m2/day
    const sedNH4 = params.sedNH4flux * tFactSed;
    const sedPO4 = params.sedPO4flux * tFactSed;
    const sedSi = params.sedSiflux * tFactSed;

    // Record sample
    const o2Values_mgL = O2.map(val => (val * 32.0) / 1000.0);
    const avgO2 = o2Values_mgL.reduce((sum, v) => sum + v, 0) / numLayers;
    const minO2 = Math.min(...o2Values_mgL);
    const avgChla = layerTotalChla.reduce((sum, v) => sum + v, 0) / numLayers;
    const avgPH = layerStates.reduce((sum, s) => sum + s.pH, 0) / numLayers;
    const avgOmega = layerStates.reduce((sum, s) => sum + s.omegaArag, 0) / numLayers;

    // Log every 2 hours to avoid overwhelming state
    if (step % 2 === 0) {
      records.push({
        timeStep: step,
        timeDays: Number(elapsedDays.toFixed(2)),
        hourOfDay: Number(hourOfDay.toFixed(1)),
        dayOfYear: currentDayOfYear,
        states: layerStates,
        avgO2_mgL: Number(avgO2.toFixed(2)),
        minO2_mgL: Number(minO2.toFixed(2)),
        totalChla_ugL: Number(avgChla.toFixed(2)),
        avgPH: Number(avgPH.toFixed(3)),
        avgOmegaArag: Number(avgOmega.toFixed(2)),
        airSeaO2Flux: Number(airSeaO2Flux.toFixed(1)),
        airSeaCO2Flux: Number(airSeaCO2Flux.toFixed(1)),
        benthicSOC: Number(soc.toFixed(1)),
        primaryProduction: Number((totalWaterColumnProd / totalDepth).toFixed(2))
      });
    }

    // Vertical transport helper (diffusion + advection/sinking)
    const applyVerticalDiffusion = (arr: number[]): number[] => {
      const diff = new Array(numLayers).fill(0);
      for (let k = 0; k < numLayers; k++) {
        // Flux with layer above (k - 1)
        if (k > 0) {
          const Kz_inter = 0.5 * (Kz[k - 1] + Kz[k]);
          const fluxUp = Kz_inter * ((arr[k - 1] - arr[k]) / dz);
          diff[k] += fluxUp / dz;
        }
        // Flux with layer below (k + 1)
        if (k < numLayers - 1) {
          const Kz_inter = 0.5 * (Kz[k] + Kz[k + 1]);
          const fluxDown = Kz_inter * ((arr[k + 1] - arr[k]) / dz);
          diff[k] += fluxDown / dz;
        }
      }
      return diff;
    };

    // Calculate vertical diffusion fluxes
    const diffO2 = applyVerticalDiffusion(O2);
    const diffDIC = applyVerticalDiffusion(DIC);
    const diffAlk = applyVerticalDiffusion(Alk);
    const diffNO3 = applyVerticalDiffusion(NO3);
    const diffNH4 = applyVerticalDiffusion(NH4);
    const diffPO4 = applyVerticalDiffusion(PO4);
    const diffSi = applyVerticalDiffusion(Si);
    const diffOM1A = applyVerticalDiffusion(OM1_A);
    const diffOM2A = applyVerticalDiffusion(OM2_A);

    // Apply sinking of particulate OM (OM1: ~6 m/day) and phytoplankton (ws: ~0.3 m/day)
    const wsOM1 = 6.0; // m/day
    const sinkOM1_A = new Array(numLayers).fill(0);
    for (let k = 0; k < numLayers; k++) {
      const fluxIn = k > 0 ? (wsOM1 * OM1_A[k - 1]) / dz : 0;
      const fluxOut = (wsOM1 * OM1_A[k]) / dz;
      sinkOM1_A[k] = fluxIn - fluxOut;
    }

    // Step state forward in time
    for (let k = 0; k < numLayers; k++) {
      const deriv = layerDerivs[k];

      // Surface boundary condition on layer 0
      const sfcO2 = k === 0 ? airSeaO2Flux / dz : 0;
      const sfcDIC = k === 0 ? airSeaCO2Flux / dz : 0;

      // Bottom boundary condition on layer botIdx
      const benthO2 = k === botIdx ? -soc / dz : 0;
      const benthDIC = k === botIdx ? (soc * 0.85) / dz : 0;
      const benthNH4 = k === botIdx ? sedNH4 / dz : 0;
      const benthPO4 = k === botIdx ? sedPO4 / dz : 0;
      const benthSi = k === botIdx ? sedSi / dz : 0;

      O2[k] = Math.max(0.05, O2[k] + (deriv.dO2 + diffO2[k] + sfcO2 + benthO2) * dtDays);
      DIC[k] = Math.max(500, DIC[k] + (deriv.dDIC + diffDIC[k] + sfcDIC + benthDIC) * dtDays);
      Alk[k] = Math.max(500, Alk[k] + (deriv.dAlk + diffAlk[k]) * dtDays);
      NO3[k] = Math.max(0.01, NO3[k] + (deriv.dNO3 + diffNO3[k]) * dtDays);
      NH4[k] = Math.max(0.01, NH4[k] + (deriv.dNH4 + diffNH4[k] + benthNH4) * dtDays);
      PO4[k] = Math.max(0.005, PO4[k] + (deriv.dPO4 + diffPO4[k] + benthPO4) * dtDays);
      Si[k] = Math.max(0.01, Si[k] + (deriv.dSi + diffSi[k] + benthSi) * dtDays);

      OM1_A[k] = Math.max(0, OM1_A[k] + (deriv.dOM1_A + diffOM1A[k] + sinkOM1_A[k]) * dtDays);
      OM2_A[k] = Math.max(0, OM2_A[k] + (deriv.dOM2_A + diffOM2A[k]) * dtDays);
      OM1_Z[k] = Math.max(0, OM1_Z[k] + deriv.dOM1_Z * dtDays);
      OM2_Z[k] = Math.max(0, OM2_Z[k] + deriv.dOM2_Z * dtDays);
      OM1_R[k] = Math.max(0, OM1_R[k] + deriv.dOM1_R * dtDays);
      OM2_R[k] = Math.max(0, OM2_R[k] + deriv.dOM2_R * dtDays);
      CDOM[k] = Math.max(0, CDOM[k] + deriv.dCDOM * dtDays);

      for (let i = 0; i < params.phytoplankton.length; i++) {
        // Phytoplankton sinking
        const ws = params.phytoplankton[i].sinkA;
        const sinkIn = k > 0 ? (ws * A_biomass[k - 1][i]) / dz : 0;
        const sinkOut = (ws * A_biomass[k][i]) / dz;
        const sinkNet = sinkIn - sinkOut;

        A_biomass[k][i] = Math.max(0.001, A_biomass[k][i] + (deriv.dA_biomass[i] + sinkNet) * dtDays);
        A_Qn[k][i] = Math.max(params.phytoplankton[i].QminN, A_Qn[k][i] + deriv.dA_Qn[i] * dtDays);
        A_Qp[k][i] = Math.max(params.phytoplankton[i].QminP, A_Qp[k][i] + deriv.dA_Qp[i] * dtDays);
      }

      for (let j = 0; j < params.zooplankton.length; j++) {
        Z_biomass[k][j] = Math.max(0.001, Z_biomass[k][j] + deriv.dZ_biomass[j] * dtDays);
      }
    }

    if (onProgress && step % 40 === 0) {
      onProgress(step / totalSteps);
    }
  }

  return records;
}
