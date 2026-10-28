/**
 * CGEM 2D River-Estuary Longitudinal Transect Simulation Engine
 * Models the spatial gradient from riverine discharge, estuarine mixing,
 * light clearing bloom triggering, to seaward bottom hypoxia
 */

import { ScenarioPreset, SimulationRecord, WaterQualityState } from '../types/cgem';
import { calcLightAttenuation, calcO2Sat, calcSchmidtCO2, calcSchmidtO2, calcSolarRadiation } from './cgemPhysics';
import { solveCarbonateSystem } from './carbonateChem';
import { computeCGEMDerivatives } from './cgemBiochem';

export function run2DSimulation(
  scenario: ScenarioPreset,
  onProgress?: (progress: number) => void
): SimulationRecord[] {
  const records: SimulationRecord[] = [];
  const params = scenario.params;
  const forcing = scenario.environmentalForcing;
  const numNodes = scenario.numTransectNodes || 10;
  const totalLengthKm = 60.0; // 60 km estuary transect
  const dx = (totalLengthKm * 1000) / numNodes; // meters per cell
  const depth = scenario.depthMeters || 12;

  const dtDays = 1.0 / 24.0;
  const totalSteps = Math.round(scenario.durationDays / dtDays);

  // Longitudinal transect coordinates (km from river mouth)
  const nodeKm = Array.from({ length: numNodes }, (_, i) => ((i + 0.5) * totalLengthKm) / numNodes);

  // Salinity gradient: 0 PSU at river head, increasing to 33 PSU at ocean boundary
  const nodeSalinity = nodeKm.map(km => {
    const fraction = km / totalLengthKm;
    return 1.0 + 32.0 * Math.pow(fraction, 0.8);
  });

  // Suspended particulate matter (SPM) settles out rapidly from river mouth (high turbidity -> clear shelf)
  const nodeSPM = nodeKm.map(km => 45.0 * Math.exp(-km / 12.0) + 2.5);

  // River loading boundary concentrations
  const riverNO3 = scenario.riverLoading?.NO3 ?? 90.0;
  const riverNH4 = scenario.riverLoading?.NH4 ?? 6.0;
  const riverPO4 = scenario.riverLoading?.PO4 ?? 3.5;
  const riverSi = scenario.riverLoading?.Si ?? 65.0;
  const riverCDOM = scenario.riverLoading?.CDOM ?? 35.0;
  const riverOM1 = scenario.riverLoading?.OM1 ?? 20.0;

  // Initialize node arrays
  let O2 = nodeKm.map(() => 230);
  let DIC = nodeKm.map(km => 1800 + 300 * (km / totalLengthKm));
  let Alk = nodeKm.map(km => 2000 + 350 * (km / totalLengthKm));
  let NO3 = nodeKm.map(km => riverNO3 * Math.exp(-km / 22.0) + 2.0);
  let NH4 = nodeKm.map(km => riverNH4 * Math.exp(-km / 15.0) + 0.5);
  let PO4 = nodeKm.map(km => riverPO4 * Math.exp(-km / 25.0) + 0.2);
  let Si = nodeKm.map(km => riverSi * Math.exp(-km / 25.0) + 4.0);
  let CDOM = nodeKm.map(km => riverCDOM * Math.exp(-km / 18.0) + 2.0);
  let OM1_R = nodeKm.map(km => riverOM1 * Math.exp(-km / 16.0));
  let OM2_R = nodeKm.map(km => 30.0 * Math.exp(-km / 25.0));

  let OM1_A = nodeKm.map(() => 3.0);
  let OM2_A = nodeKm.map(() => 10.0);
  let OM1_Z = nodeKm.map(() => 1.0);
  let OM2_Z = nodeKm.map(() => 4.0);

  let A_biomass = nodeKm.map(() => [2.0, 1.2, 0.4]);
  let Z_biomass = nodeKm.map(() => [0.6, 0.3]);
  let A_Qn = nodeKm.map(() => params.phytoplankton.map(p => (p.QminN + p.QmaxN) * 0.5));
  let A_Qp = nodeKm.map(() => params.phytoplankton.map(p => (p.QminP + p.QmaxP) * 0.5));

  // Advection velocity: seaward estuarine residual flow (e.g. 0.08 m/s = ~6900 m/day)
  const u_m_day = 6500.0;
  // Longitudinal dispersion coefficient (m2/day)
  const Ex = 1.5e7;

  let elapsedDays = 0;
  const baseDayOfYear = 175;

  for (let step = 0; step <= totalSteps; step++) {
    elapsedDays = step * dtDays;
    const hourOfDay = (elapsedDays * 24) % 24;
    const currentDayOfYear = (baseDayOfYear + Math.floor(elapsedDays)) % 365;

    // Surface PAR
    const surfacePAR = calcSolarRadiation(currentDayOfYear, hourOfDay, forcing.latitude, forcing.surfacePARmax) * params.PARfac;

    // Calculate node states and local reaction derivatives
    const nodeStates: WaterQualityState[] = [];
    const nodeDerivs = [];
    let transectAvgChla = 0;

    for (let i = 0; i < numNodes; i++) {
      const chla_group = A_biomass[i].map((b, pIdx) => (b * 12.0) / params.phytoplankton[pIdx].CChla);
      const totalChla = chla_group.reduce((sum, c) => sum + c, 0);
      transectAvgChla += totalChla;

      // Optical attenuation: high turbidity at river mouth limits light; optical clearing mid-estuary triggers bloom
      const Kd = calcLightAttenuation(params.Kw, params.Kcdom, CDOM[i], params.Kspm, nodeSPM[i], params.Kchla, totalChla);
      const midPAR = surfacePAR * Math.exp(-Kd * (depth * 0.4));

      const carb = solveCarbonateSystem(
        DIC[i],
        Alk[i],
        forcing.tempMean,
        nodeSalinity[i],
        forcing.windSpeed,
        params.pCO2atm
      );

      const st: WaterQualityState = {
        O2: O2[i],
        DIC: DIC[i],
        Alk: Alk[i],
        pH: carb.pH,
        pCO2: carb.pCO2,
        omegaArag: carb.omegaArag,
        omegaCalc: carb.omegaCalc,
        NO3: NO3[i],
        NH4: NH4[i],
        PO4: PO4[i],
        Si: Si[i],
        A_biomass: [...A_biomass[i]],
        A_chla: chla_group,
        A_Qn: [...A_Qn[i]],
        A_Qp: [...A_Qp[i]],
        Z_biomass: [...Z_biomass[i]],
        OM1_A: OM1_A[i],
        OM2_A: OM2_A[i],
        OM1_Z: OM1_Z[i],
        OM2_Z: OM2_Z[i],
        OM1_R: OM1_R[i],
        OM2_R: OM2_R[i],
        CDOM: CDOM[i],
        temp: forcing.tempMean,
        salinity: nodeSalinity[i],
        PAR: midPAR,
        depth: depth,
        totalChla
      };
      nodeStates.push(st);

      const deriv = computeCGEMDerivatives(st, params, midPAR, forcing.tempMean);
      nodeDerivs.push(deriv);
    }
    transectAvgChla /= numNodes;

    // Air-sea gas fluxes and benthic demand per node
    const o2_mgL_list = O2.map(val => (val * 32.0) / 1000.0);
    const avgO2 = o2_mgL_list.reduce((sum, v) => sum + v, 0) / numNodes;
    const minO2 = Math.min(...o2_mgL_list);
    const avgPH = nodeStates.reduce((sum, s) => sum + s.pH, 0) / numNodes;
    const avgOmega = nodeStates.reduce((sum, s) => sum + s.omegaArag, 0) / numNodes;

    if (step % 2 === 0) {
      records.push({
        timeStep: step,
        timeDays: Number(elapsedDays.toFixed(2)),
        hourOfDay: Number(hourOfDay.toFixed(1)),
        dayOfYear: currentDayOfYear,
        states: nodeStates,
        avgO2_mgL: Number(avgO2.toFixed(2)),
        minO2_mgL: Number(minO2.toFixed(2)),
        totalChla_ugL: Number(transectAvgChla.toFixed(2)),
        avgPH: Number(avgPH.toFixed(3)),
        avgOmegaArag: Number(avgOmega.toFixed(2)),
        airSeaO2Flux: 12.0,
        airSeaCO2Flux: -4.0,
        benthicSOC: Number(params.SOC20.toFixed(1)),
        primaryProduction: Number((nodeDerivs[Math.floor(numNodes / 2)].grossPrimaryProduction).toFixed(2))
      });
    }

    // 1D longitudinal advection & dispersion operator
    const applyAdvectionDispersion = (arr: number[], riverInflowConc: number): number[] => {
      const net = new Array(numNodes).fill(0);
      for (let i = 0; i < numNodes; i++) {
        // Upstream advective flux
        const upConc = i === 0 ? riverInflowConc : arr[i - 1];
        const advFluxIn = (u_m_day * upConc) / dx;
        const advFluxOut = (u_m_day * arr[i]) / dx;
        net[i] += (advFluxIn - advFluxOut);

        // Dispersion
        if (i > 0) {
          const dispUp = (Ex * (arr[i - 1] - arr[i])) / (dx * dx);
          net[i] += dispUp;
        }
        if (i < numNodes - 1) {
          const dispDown = (Ex * (arr[i + 1] - arr[i])) / (dx * dx);
          net[i] += dispDown;
        }
      }
      return net;
    };

    const transO2 = applyAdvectionDispersion(O2, 240);
    const transNO3 = applyAdvectionDispersion(NO3, riverNO3);
    const transNH4 = applyAdvectionDispersion(NH4, riverNH4);
    const transPO4 = applyAdvectionDispersion(PO4, riverPO4);
    const transSi = applyAdvectionDispersion(Si, riverSi);

    // Update spatial nodes
    for (let i = 0; i < numNodes; i++) {
      const deriv = nodeDerivs[i];

      // Air-sea gas exchange
      const o2Sat = calcO2Sat(forcing.tempMean, nodeSalinity[i]);
      const scO2 = calcSchmidtO2(forcing.tempMean);
      const k660 = 0.251 * Math.pow(forcing.windSpeed, 2);
      const kO2 = k660 * Math.pow(scO2 / 660, -0.5) * 0.24;
      const airSeaO2 = (kO2 * (o2Sat - O2[i])) / depth;

      // Sediment oxygen consumption increases seaward where organic matter accumulates
      const socMultiplier = 1.0 + 1.5 * (i / numNodes);
      const soc = (params.SOC20 * socMultiplier * (O2[i] / (15.0 + O2[i]))) / depth;

      O2[i] = Math.max(0.05, O2[i] + (deriv.dO2 + transO2[i] + airSeaO2 - soc) * dtDays);
      DIC[i] = Math.max(500, DIC[i] + deriv.dDIC * dtDays);
      Alk[i] = Math.max(500, Alk[i] + deriv.dAlk * dtDays);
      NO3[i] = Math.max(0.01, NO3[i] + (deriv.dNO3 + transNO3[i]) * dtDays);
      NH4[i] = Math.max(0.01, NH4[i] + (deriv.dNH4 + transNH4[i]) * dtDays);
      PO4[i] = Math.max(0.005, PO4[i] + (deriv.dPO4 + transPO4[i]) * dtDays);
      Si[i] = Math.max(0.01, Si[i] + (deriv.dSi + transSi[i]) * dtDays);

      for (let pIdx = 0; pIdx < params.phytoplankton.length; pIdx++) {
        A_biomass[i][pIdx] = Math.max(0.001, A_biomass[i][pIdx] + deriv.dA_biomass[pIdx] * dtDays);
        A_Qn[i][pIdx] = Math.max(params.phytoplankton[pIdx].QminN, A_Qn[i][pIdx] + deriv.dA_Qn[pIdx] * dtDays);
        A_Qp[i][pIdx] = Math.max(params.phytoplankton[pIdx].QminP, A_Qp[i][pIdx] + deriv.dA_Qp[pIdx] * dtDays);
      }

      for (let zIdx = 0; zIdx < params.zooplankton.length; zIdx++) {
        Z_biomass[i][zIdx] = Math.max(0.001, Z_biomass[i][zIdx] + deriv.dZ_biomass[zIdx] * dtDays);
      }
    }

    if (onProgress && step % 40 === 0) {
      onProgress(step / totalSteps);
    }
  }

  return records;
}
