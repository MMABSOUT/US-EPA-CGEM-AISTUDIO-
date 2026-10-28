/**
 * CGEM Biogeochemical Kinetics & Mass Balance Engine
 * Implements Phytoplankton growth (Droop/Michaelis-Menten), Zooplankton grazing,
 * Nitrification, Denitrification, Aerobic Remineralization, and Stoichiometric Mass Balances
 */

import { CGEMModelParams, WaterQualityState } from '../types/cgem';
import { calcTemperatureFactor } from './cgemPhysics';

export interface Derivatives {
  dO2: number;
  dDIC: number;
  dAlk: number;
  dNO3: number;
  dNH4: number;
  dPO4: number;
  dSi: number;
  dA_biomass: number[];
  dA_Qn: number[];
  dA_Qp: number[];
  dZ_biomass: number[];
  dOM1_A: number;
  dOM2_A: number;
  dOM1_Z: number;
  dOM2_Z: number;
  dOM1_R: number;
  dOM2_R: number;
  dCDOM: number;
  grossPrimaryProduction: number;
  totalRespiration: number;
  nitrificationRate: number;
  denitrificationRate: number;
}

export function computeCGEMDerivatives(
  state: WaterQualityState,
  params: CGEMModelParams,
  PAR: number,
  tempC: number
): Derivatives {
  const numA = params.phytoplankton.length;
  const numZ = params.zooplankton.length;

  const dA_biomass = new Array(numA).fill(0);
  const dA_Qn = new Array(numA).fill(0);
  const dA_Qp = new Array(numA).fill(0);
  const dZ_biomass = new Array(numZ).fill(0);

  // Temperature factor
  const Tadj = calcTemperatureFactor(
    params.switchTemperature,
    tempC,
    params.Tref,
    params.KTg1,
    params.KTg2,
    params.Ea
  );

  // Total available nitrogen (mmol/m3)
  const totalN = Math.max(0.01, state.NO3 + state.NH4);
  const totalP = Math.max(0.001, state.PO4);
  const totalSi = Math.max(0.01, state.Si);

  let grossPrimaryProduction = 0; // mmol C / m3 / day
  let totalPhytoRespiration = 0;   // mmol C / m3 / day
  let totalPhytoMortality = 0;     // mmol C / m3 / day
  let totalNuptake = 0;            // mmol N / m3 / day
  let totalPuptake = 0;            // mmol P / m3 / day
  let totalSiuptake = 0;           // mmol Si / m3 / day
  let diatomMortalitySiRecycle = 0; // mmol Si / m3 / day

  // Phytoplankton growth and dynamics
  for (let i = 0; i < numA; i++) {
    const p = params.phytoplankton[i];
    const A = Math.max(0.0001, state.A_biomass[i]);
    const Qn = Math.max(p.QminN, state.A_Qn[i] || (p.QminN + p.QmaxN) * 0.5);
    const Qp = Math.max(p.QminP, state.A_Qp[i] || (p.QminP + p.QmaxP) * 0.5);

    // 1. Light limitation f(E)
    let fE = 1.0;
    if (params.switchPhotosynthesis === 1) {
      // With photoinhibition (Platt et al.)
      fE = (1.0 - Math.exp(-p.alpha * PAR)) * Math.exp(-p.beta * PAR);
    } else {
      // Without photoinhibition
      fE = 1.0 - Math.exp(-p.alpha * PAR);
    }
    fE = Math.max(0, Math.min(1.0, fE));

    // 2. Nutrient limitation
    let fN = 1.0;
    let fP = 1.0;
    let fSi = 1.0;

    if (params.switchQuota === 1) {
      // Droop cell quota kinetics
      fN = Math.max(0, 1.0 - p.QminN / Qn);
      fP = Math.max(0, 1.0 - p.QminP / Qp);
    } else {
      // Michaelis-Menten
      fN = totalN / (p.Kn + totalN);
      fP = totalP / (p.Kp + totalP);
    }

    if (p.isDiatom) {
      fSi = totalSi / (p.Ksi + totalSi);
    }

    const nutrientLimitation = Math.min(fN, fP, fSi);

    // Specific growth rate (1/day)
    const mu = p.umax * Tadj * fE * nutrientLimitation;

    // Respiration: basal + growth respiration
    const resp = (p.respb * Tadj + p.respg * mu);

    // Mortality (1/day)
    const mort = p.mA * Tadj;

    // Biomass derivative before grazing (mmol C / m3 / day)
    const gpp_i = mu * A;
    const resp_i = resp * A;
    const mort_i = mort * A;

    grossPrimaryProduction += gpp_i;
    totalPhytoRespiration += resp_i;
    totalPhytoMortality += mort_i;

    dA_biomass[i] = gpp_i - resp_i - mort_i;

    // Nutrient uptake rates (mmol/cell/day)
    const cellCount = (A * 12.0) / (p.Qc * 12.0 + 1e-12); // cells/m3
    const maxVn = (p.QmaxN - Qn) * mu * 1.5;
    const maxVp = (p.QmaxP - Qp) * mu * 1.5;
    const Vn = Math.max(0, maxVn * (totalN / (p.Kn + totalN)));
    const Vp = Math.max(0, maxVp * (totalP / (p.Kp + totalP)));

    // Quota derivatives: dQ/dt = V - mu * Q
    dA_Qn[i] = Vn - mu * Qn;
    dA_Qp[i] = Vp - mu * Qp;

    // Seawater nutrient uptake
    const Nuptake_i = Vn * cellCount;
    const Puptake_i = Vp * cellCount;
    totalNuptake += Nuptake_i;
    totalPuptake += Puptake_i;

    if (p.isDiatom) {
      totalSiuptake += Nuptake_i * 1.0;
      diatomMortalitySiRecycle += mort_i * (16.0 / 106.0) * 0.2;
    }
  }

  // Zooplankton grazing
  const totalPhytoBiomass = state.A_biomass.reduce((sum, b) => sum + Math.max(0, b), 0);
  let totalZooRespiration = 0;
  let totalSloppyLoss = 0;
  let totalFecalPellets = 0;
  let totalZooMortality = 0;

  for (let j = 0; j < numZ; j++) {
    const z = params.zooplankton[j];
    const Z = Math.max(0.001, state.Z_biomass[j]);

    // Holling Type II grazing rate (1/day)
    const ingestionRate = z.Zumax * Tadj * (totalPhytoBiomass / (z.ZKa + totalPhytoBiomass));
    const totalIngested = ingestionRate * Z; // mmol C / m3 / day

    // Partition grazing among phytoplankton groups proportionally
    for (let i = 0; i < numA; i++) {
      const share = totalPhytoBiomass > 0 ? state.A_biomass[i] / totalPhytoBiomass : 0;
      dA_biomass[i] -= totalIngested * share;
    }

    // Assimilated vs sloppy vs fecal
    const assimilated = totalIngested * z.Zeffic;
    const sloppy = totalIngested * z.Zslop;
    const fecal = totalIngested * (1.0 - z.Zeffic - z.Zslop);

    totalSloppyLoss += sloppy;
    totalFecalPellets += fecal;

    // Zooplankton respiration
    const zResp = (z.Zrespb * Tadj + z.Zrespg * ingestionRate) * Z;
    totalZooRespiration += zResp;

    // Quadratic mortality (predation by higher fish/trophic levels)
    const zMort = z.Zm * Math.pow(Z, 2);
    totalZooMortality += zMort;

    // Net zooplankton biomass derivative
    dZ_biomass[j] = assimilated - zResp - zMort;
  }

  // Preferential uptake of NH4 over NO3
  const nh4InhibitionOfNO3 = Math.exp(-1.5 * state.NH4);
  const no3Fraction = (state.NO3 / totalN) * nh4InhibitionOfNO3;
  const no3Uptake = totalNuptake * Math.max(0, Math.min(1.0, no3Fraction));
  const nh4Uptake = Math.max(0, totalNuptake - no3Uptake);

  // Organic matter dynamics (Aerobic remineralization & Anaerobic denitrification)
  const o2Lim = Math.max(0, state.O2 / (params.KO2 + Math.max(0.1, state.O2)));
  const denitO2Inhib = Math.max(0, params.KstarO2 / (params.KstarO2 + Math.max(0.1, state.O2)));
  const denitNO3Lim = Math.max(0, state.NO3 / (params.KNO3 + Math.max(0.1, state.NO3)));
  const denitFactor = denitO2Inhib * denitNO3Lim;

  const rOM1 = params.KG1 * Tadj;
  const rOM2 = params.KG2 * Tadj;

  // Aerobic breakdown of OM pools
  const oxicOM1_A = rOM1 * state.OM1_A * o2Lim;
  const oxicOM2_A = rOM2 * state.OM2_A * o2Lim;
  const oxicOM1_Z = rOM1 * state.OM1_Z * o2Lim;
  const oxicOM2_Z = rOM2 * state.OM2_Z * o2Lim;
  const oxicOM1_R = rOM1 * state.OM1_R * o2Lim;
  const oxicOM2_R = rOM2 * state.OM2_R * o2Lim;
  const totalOxicOM = oxicOM1_A + oxicOM2_A + oxicOM1_Z + oxicOM2_Z + oxicOM1_R + oxicOM2_R;

  // Anaerobic denitrification breakdown of OM pools
  const denitOM1_A = rOM1 * 0.7 * state.OM1_A * denitFactor;
  const denitOM2_A = rOM2 * 0.7 * state.OM2_A * denitFactor;
  const denitOM1_Z = rOM1 * 0.7 * state.OM1_Z * denitFactor;
  const denitOM2_Z = rOM2 * 0.7 * state.OM2_Z * denitFactor;
  const denitOM1_R = rOM1 * 0.7 * state.OM1_R * denitFactor;
  const denitOM2_R = rOM2 * 0.7 * state.OM2_R * denitFactor;
  const totalDenitOM = denitOM1_A + denitOM2_A + denitOM1_Z + denitOM2_Z + denitOM1_R + denitOM2_R;

  // Total carbon decomposed
  const totalReminC = totalOxicOM + totalDenitOM;

  // Stoichiometry: Redfield ratio C:N:P = 106:16:1
  const ammonificationRate = totalReminC * (16.0 / 106.0);
  const phosphateRelease = totalReminC * (1.0 / 106.0);

  // Nitrification: NH4+ + 2 O2 -> NO3- + H2O + 2 H+
  const nitRate = params.nitmax * Tadj * (state.NH4 / (params.KNH4 + state.NH4)) * o2Lim;

  // Denitrification rate of NO3
  const denitrificationNO3Rate = totalDenitOM * 0.8;

  // Organic matter pool derivatives (mmol C / m3 / day)
  const dOM1_A = totalPhytoMortality * 0.65 + totalSloppyLoss * 0.65 - (oxicOM1_A + denitOM1_A);
  const dOM2_A = totalPhytoMortality * 0.35 + totalSloppyLoss * 0.35 - (oxicOM2_A + denitOM2_A);
  const dOM1_Z = totalFecalPellets * 0.70 + totalZooMortality * 0.70 - (oxicOM1_Z + denitOM1_Z);
  const dOM2_Z = totalFecalPellets * 0.30 + totalZooMortality * 0.30 - (oxicOM2_Z + denitOM2_Z);
  const dOM1_R = -(oxicOM1_R + denitOM1_R);
  const dOM2_R = -(oxicOM2_R + denitOM2_R);
  const dCDOM = -params.CDOMdecay * state.CDOM * (PAR > 10 ? 1.5 : 0.5);

  // Dissolved Oxygen mass balance:
  const totalRespiration = totalPhytoRespiration + totalZooRespiration + totalOxicOM + 2.0 * nitRate;
  const dO2 = grossPrimaryProduction - totalRespiration;

  // Dissolved Inorganic Carbon (DIC) mass balance:
  const dDIC = totalPhytoRespiration + totalZooRespiration + totalReminC - grossPrimaryProduction;

  // Total Alkalinity (Alk) balance:
  const dAlk = (no3Uptake - nh4Uptake) - (2.0 * nitRate) + denitrificationNO3Rate;

  // Nutrient mass balances
  const dNO3 = nitRate - no3Uptake - denitrificationNO3Rate;
  const dNH4 = ammonificationRate - nh4Uptake - nitRate;
  const dPO4 = phosphateRelease - totalPuptake;
  const dSi = -totalSiuptake + diatomMortalitySiRecycle;

  return {
    dO2,
    dDIC,
    dAlk,
    dNO3,
    dNH4,
    dPO4,
    dSi,
    dA_biomass,
    dA_Qn,
    dA_Qp,
    dZ_biomass,
    dOM1_A,
    dOM2_A,
    dOM1_Z,
    dOM2_Z,
    dOM1_R,
    dOM2_R,
    dCDOM,
    grossPrimaryProduction,
    totalRespiration,
    nitrificationRate: nitRate,
    denitrificationRate: denitrificationNO3Rate
  };
}
