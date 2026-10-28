/**
 * CGEM Environmental Physics & Air-Sea Gas Exchange
 * Implements Solar Radiation, Attenuation Optics, Wanninkhof Gas Transfer, and Oxygen Solubility
 */

// Garcia & Gordon (1992) Oxygen Saturation (umol/kg -> converted to mmol/m3)
export function calcO2Sat(tempC: number, salinityPSU: number): number {
  const T = tempC + 273.15;
  const Ts = Math.log((298.15 - tempC) / T);
  
  // Coefficients for Garcia & Gordon (1992)
  const A0 = 2.00907;
  const A1 = 3.22014;
  const A2 = 4.05010;
  const A3 = 4.94457;
  const A4 = -0.256847;
  const A5 = 3.88767;

  const B0 = -0.00624523;
  const B1 = -0.00737614;
  const B2 = -0.0103410;
  const B3 = -0.00817083;

  const C0 = -0.000000488682;

  const lnC = A0 + A1 * Ts + A2 * Math.pow(Ts, 2) + A3 * Math.pow(Ts, 3) + A4 * Math.pow(Ts, 4) + A5 * Math.pow(Ts, 5)
    + salinityPSU * (B0 + B1 * Ts + B2 * Math.pow(Ts, 2) + B3 * Math.pow(Ts, 3))
    + C0 * Math.pow(salinityPSU, 2);

  // Solubility in umol/kg. Seawater density ~ 1025 kg/m3 -> umol/kg * 1.025 = mmol/m3
  const density = 1.025; // kg/L or g/cm3
  const o2Sat_mmol_m3 = Math.exp(lnC) * density;
  return Math.max(0, o2Sat_mmol_m3);
}

// Schmidt Number for O2 in seawater as a function of temperature (Wanninkhof 2014)
export function calcSchmidtO2(tempC: number): number {
  return Math.max(100, 1920.4 - 135.6 * tempC + 5.2122 * Math.pow(tempC, 2) - 0.0939 * Math.pow(tempC, 3));
}

// Schmidt Number for CO2 in seawater (Wanninkhof 2014)
export function calcSchmidtCO2(tempC: number): number {
  return Math.max(100, 2116.8 - 136.25 * tempC + 4.7353 * Math.pow(tempC, 2) - 0.092307 * Math.pow(tempC, 3));
}

// Wanninkhof (2014) Air-Sea gas transfer velocity (m/day)
export function calcGasTransferVelocity(windSpeed_m_s: number, schmidtNumber: number): number {
  // k660 in cm/h: k660 = 0.251 * (windSpeed)^2
  const k660_cm_h = 0.251 * Math.pow(windSpeed_m_s, 2);
  // Scale with Schmidt number: k = k660 * (Sc / 660)^(-0.5)
  const k_cm_h = k660_cm_h * Math.pow(schmidtNumber / 660, -0.5);
  // Convert cm/h to m/day: (cm/h) * 0.01 m/cm * 24 h/day = 0.24 * k
  return k_cm_h * 0.24;
}

// Diurnal Solar Radiation (uE/m2/s) based on day of year, hour, and latitude
export function calcSolarRadiation(dayOfYear: number, hourOfDay: number, latitudeDeg: number, maxPAR: number): number {
  // Solar declination (rad)
  const latRad = (latitudeDeg * Math.PI) / 180;
  const declination = 0.409 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
  
  // Hour angle
  const hourAngle = ((hourOfDay - 12) * Math.PI) / 12;

  // Zenith angle cosine
  const cosZenith = Math.sin(latRad) * Math.sin(declination) + Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);

  if (cosZenith <= 0) {
    return 0; // Nighttime
  }

  // Daylight radiation curve with atmospheric clearing factor
  const PAR = maxPAR * Math.pow(cosZenith, 1.15);
  return Math.max(0, PAR);
}

// Total diffuse attenuation coefficient Kd (1/m)
export function calcLightAttenuation(
  Kw: number,
  Kcdom: number,
  cdom: number,
  Kspm: number,
  spm: number,
  Kchla: number,
  totalChla: number
): number {
  const Kd = Kw + (Kcdom * cdom) + (Kspm * spm) + (Kchla * totalChla);
  return Math.max(0.05, Kd);
}

// Temperature kinetic factor f(T) for growth and biological metabolic rates
export function calcTemperatureFactor(
  switchMode: 1 | 2 | 3,
  tempC: number,
  Tref: number,
  KTg1: number,
  KTg2: number,
  Ea: number
): number {
  if (switchMode === 1) {
    // Sigmoidal formulation (CGEM switch 1)
    const f0 = 0.1;
    const r = 0.3;
    const f1 = 1.0 / f0 - 1.0;
    const r1 = r * (46.5 / 18.0);
    const denom = 1.0 + f1 * Math.exp(-r1 * (tempC - Tref));
    return 0.3 * (1.0 / denom) + 0.7;
  } else if (switchMode === 2) {
    // Optimum temperature threshold (Cerco & Noel 2004)
    if (tempC <= Tref) {
      return Math.exp(-KTg1 * Math.pow(tempC - Tref, 2));
    } else {
      return Math.exp(-KTg2 * Math.pow(Tref - tempC, 2));
    }
  } else {
    // Arrhenius (Geider 1997)
    const kB = 8.6173303e-5; // Boltzmann constant in eV/K
    const T_K = tempC + 273.15;
    const Tref_K = Tref + 273.15;
    return Math.exp(-(Ea / kB) * (1.0 / T_K - 1.0 / Tref_K));
  }
}
