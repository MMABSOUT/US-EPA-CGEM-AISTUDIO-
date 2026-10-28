/**
 * Seawater Carbonate Chemistry System (MOCSY / CO2SYS formulations)
 * Computes pH, pCO2, Carbonate Speciation, Aragonite & Calcite Saturation States
 */

export interface CarbonateOutput {
  pH: number;
  pCO2: number;        // ppm or uatm
  co2Aqueous: number;  // mmol/m3
  hco3: number;        // mmol/m3
  co3: number;         // mmol/m3
  omegaArag: number;   // dimensionless, < 1 = undersaturated/corrosive
  omegaCalc: number;
  co2Flux: number;     // mmol/m2/day
}

// Dissociation constants in seawater (Lueker et al., 2000; Dickson, 1990; Millero, 1995)
export function solveCarbonateSystem(
  dic_mmol_m3: number,   // Dissolved Inorganic Carbon (umol/kg or mmol/m3)
  alk_mmol_m3: number,   // Total Alkalinity (umol/kg or meq/m3)
  tempC: number,
  salinityPSU: number,
  windSpeed: number = 5.0,
  pCO2atm: number = 420.0
): CarbonateOutput {
  const T = tempC + 273.15;
  const S = Math.max(1, salinityPSU);
  const sqrtS = Math.sqrt(S);

  // Weiss (1974) Henry's law constant for CO2 (mol/(kg * atm))
  const lnK0 = -60.2409 + 93.4517 * (100 / T) + 23.3585 * Math.log(T / 100) +
    S * (0.023517 - 0.023656 * (T / 100) + 0.0047036 * Math.pow(T / 100, 2));
  const K0 = Math.exp(lnK0);

  // Lueker et al. (2000) K1 and K2 for carbonic acid (total hydrogen scale)
  const pK1 = 3633.86 / T - 61.2172 + 9.6777 * Math.log(T) - 0.011555 * S + 0.0001152 * Math.pow(S, 2);
  const K1 = Math.pow(10, -pK1);

  const pK2 = 471.78 / T + 25.9290 - 3.16967 * Math.log(T) - 0.01781 * S + 0.0001122 * Math.pow(S, 2);
  const K2 = Math.pow(10, -pK2);

  // Dickson (1990) KB for boric acid
  const lnKB = (-8966.90 - 2890.53 * sqrtS - 77.942 * S + 1.728 * Math.pow(S, 1.5) - 0.0996 * Math.pow(S, 2)) / T +
    (148.0248 + 137.1942 * sqrtS + 1.62142 * S) +
    (-24.4344 - 25.085 * sqrtS - 0.2474 * S) * Math.log(T) + 0.053105 * sqrtS * T;
  const KB = Math.exp(lnKB);

  // Total boron concentration (Uppström, 1974) in mol/kg
  const TB = 0.000416 * (S / 35.0);

  // Ion product of water Kw (Millero, 1995)
  const lnKw = 148.9652 - 13847.26 / T - 23.6521 * Math.log(T) +
    (118.67 / T - 5.977 + 1.0495 * Math.log(T)) * sqrtS - 0.01615 * S;
  const Kw = Math.exp(lnKw);

  // Convert inputs to mol/kg (assuming 1 m3 seawater ≈ 1025 kg -> 1 mmol/m3 ≈ 0.9756 umol/kg = 0.9756e-6 mol/kg)
  const density = 1025; // kg/m3
  const DIC_mol = (dic_mmol_m3 / density) * 0.001;
  const ALK_mol = (alk_mmol_m3 / density) * 0.001;

  // Newton-Raphson solver for [H+]
  // Alkalinity equation: Alk_carb = Alk - Alk_borate - [OH-] + [H+]
  // Alk_carb = DIC * (K1*[H] + 2*K1*K2) / ([H]^2 + K1*[H] + K1*K2)
  let pH = 8.1;
  let H = Math.pow(10, -pH);

  for (let iter = 0; iter < 40; iter++) {
    const denom = H * H + K1 * H + K1 * K2;
    const alpha1 = (K1 * H) / denom;
    const alpha2 = (K1 * K2) / denom;
    const borate = (TB * KB) / (KB + H);
    const OH = Kw / H;

    const alkModel = DIC_mol * (alpha1 + 2 * alpha2) + borate + OH - H;
    const diff = alkModel - ALK_mol;

    if (Math.abs(diff) < 1e-11) break;

    // Approximate derivative d(alk)/d([H+])
    const dDenom = 2 * H + K1;
    const dAlpha1 = (K1 * denom - K1 * H * dDenom) / (denom * denom);
    const dAlpha2 = (-K1 * K2 * dDenom) / (denom * denom);
    const dBorate = (-TB * KB) / Math.pow(KB + H, 2);
    const dOH = -Kw / (H * H);
    const dAlk_dH = DIC_mol * (dAlpha1 + 2 * dAlpha2) + dBorate + dOH - 1.0;

    let deltaH = diff / dAlk_dH;
    // Damped step to ensure H stays positive
    if (deltaH > 0.5 * H) deltaH = 0.5 * H;
    if (deltaH < -0.5 * H) deltaH = -0.5 * H;

    H = Math.max(1e-12, Math.min(1e-4, H - deltaH));
  }

  pH = -Math.log10(H);

  // Carbonate species
  const denom = H * H + K1 * H + K1 * K2;
  const co2Mol = DIC_mol * (H * H) / denom;
  const hco3Mol = DIC_mol * (K1 * H) / denom;
  const co3Mol = DIC_mol * (K1 * K2) / denom;

  // Convert back to mmol/m3
  const co2Aqueous = co2Mol * density * 1000;
  const hco3 = hco3Mol * density * 1000;
  const co3 = co3Mol * density * 1000;

  // pCO2 in uatm / ppm
  const pCO2 = (co2Mol / K0) * 1e6;

  // Calcium concentration [Ca2+] (mol/kg) ~ 0.01028 * (S / 35)
  const Ca = 0.01028 * (S / 35.0);

  // Mucci (1983) Aragonite & Calcite stoichiometric solubility products
  const logKspArag = -171.945 - 0.077993 * T + 2903.293 / T + 71.595 * Math.log10(T) +
    (-0.068393 + 0.0017276 * T + 88.135 / T) * sqrtS - 0.10018 * S + 0.0059415 * Math.pow(S, 1.5);
  const KspArag = Math.pow(10, logKspArag);

  const logKspCalc = -171.9065 - 0.077993 * T + 2839.319 / T + 71.595 * Math.log10(T) +
    (-0.77712 + 0.0028426 * T + 178.34 / T) * sqrtS - 0.07711 * S + 0.0041249 * Math.pow(S, 1.5);
  const KspCalc = Math.pow(10, logKspCalc);

  const omegaArag = Math.max(0, (Ca * co3Mol) / KspArag);
  const omegaCalc = Math.max(0, (Ca * co3Mol) / KspCalc);

  // Air-sea CO2 exchange flux: F_CO2 = k_CO2 * K0 * (pCO2_atm - pCO2_water)
  // Positive flux = uptake into ocean
  const Sc_CO2 = Math.max(100, 2116.8 - 136.25 * tempC + 4.7353 * Math.pow(tempC, 2) - 0.092307 * Math.pow(tempC, 3));
  const k660_cm_h = 0.251 * Math.pow(windSpeed, 2);
  const kCO2_m_day = k660_cm_h * Math.pow(Sc_CO2 / 660, -0.5) * 0.24;
  
  // K0 is mol/(kg * atm). 1 atm = 1e6 uatm. Density ~ 1025 kg/m3.
  const co2Flux = kCO2_m_day * (K0 * density * 1000 * 1e-6) * (pCO2atm - pCO2);

  return {
    pH: Math.max(6.0, Math.min(9.5, pH)),
    pCO2: Math.max(50, Math.min(2500, pCO2)),
    co2Aqueous,
    hco3,
    co3,
    omegaArag,
    omegaCalc,
    co2Flux
  };
}
