/**
 * CGEM - Coastal Generalized Ecosystem Model
 * Core TypeScript definitions matching EPA CGEM Fortran model structure
 */

export type DimensionMode = '0D_box' | '1D_column' | '2D_estuary';

export interface PhytoplanktonParams {
  id: string;
  name: string;
  color: string;
  umax: number;          // max growth rate (1/day) - e.g. 1.12
  CChla: number;         // Fixed Carbon to Chlorophyll-a ratio (mg C / mg Chl) - e.g. 180
  alpha: number;         // Initial slope of P-I curve - e.g. 3.96e-16
  beta: number;          // Photoinhibition parameter - e.g. 1.1e-18
  respg: number;         // Growth respiration fraction - e.g. 0.10
  respb: number;         // Basal respiration rate (1/day) - e.g. 0.02
  QminN: number;         // Min N cell quota (mmol N / cell) - e.g. 1.53e-10
  QmaxN: number;         // Max N cell quota (mmol N / cell) - e.g. 6.85e-9
  QminP: number;         // Min P cell quota (mmol P / cell) - e.g. 1.07e-11
  QmaxP: number;         // Max P cell quota (mmol P / cell) - e.g. 4.28e-10
  Kn: number;            // Half-saturation for N (mmol N / m3) - e.g. 1.13
  Kp: number;            // Half-saturation for P (mmol P / m3) - e.g. 0.51
  Ksi: number;           // Half-saturation for Si (mmol Si / m3) - e.g. 1.13 (diatoms)
  volcell: number;       // Cell volume (um^3) - e.g. 513
  Qc: number;            // Carbon per cell (mmol C / cell) - e.g. 4.54e-8
  sinkA: number;         // Sinking velocity (m / day) - e.g. 0.29
  mA: number;            // Natural mortality rate (1/day) - e.g. 0.11
  isDiatom?: boolean;    // Requires silica
}

export interface ZooplanktonParams {
  id: string;
  name: string;
  color: string;
  Zeffic: number;        // Assimilation efficiency fraction - e.g. 0.40
  Zslop: number;         // Fraction lost to sloppy feeding - e.g. 0.25
  ZKa: number;           // Grazing half-saturation (mmol C / m3) - e.g. 15.0
  Zrespg: number;        // Growth respiration factor - e.g. 0.20
  Zrespb: number;        // Basal respiration (1/day) - e.g. 0.10
  Zumax: number;         // Max ingestion rate (1/day) - e.g. 0.95
  Zm: number;            // Mortality constant (quadratic or linear) - e.g. 0.05
}

export interface CGEMModelParams {
  // Formulation switches (matching Which_* from GEM_InputFile)
  switchTemperature: 1 | 2 | 3;  // 1: Sigmoidal, 2: Optimum Temp (Cerco & Noel), 3: Arrhenius (Geider)
  switchUptake: 1 | 2 | 3;       // 1: Michaelis-Menten, 2: Geider, 3: Flynn
  switchQuota: 1 | 2;            // 1: Droop quota kinetics, 2: Michaelis-Menten direct
  switchPhotosynthesis: 1 | 2;   // 1: Photoinhibition (Platt), 2: Without photoinhibition
  switchChlaC: 1 | 2;            // 1: Fixed C:Chl, 2: Cloern dynamic photoacclimation

  // Optics
  Kw: number;       // Light attenuation water (1/m) - e.g. 0.146
  Kcdom: number;    // Light attenuation CDOM (1/m/ppb) - e.g. 0.001
  Kspm: number;     // Light attenuation SPM (1/m/(mg/L)) - e.g. 0.029
  Kchla: number;    // Light attenuation Chl-a (1/m/(mg/m3)) - e.g. 0.024
  PARfac: number;   // Multiplier for surface PAR - e.g. 1.0

  // Temperature response parameters
  Tref: number;     // Reference optimum temperature (deg C) - e.g. 20.0
  KTg1: number;     // Below Topt temperature sensitivity - e.g. 0.0035
  KTg2: number;     // Above Topt temperature sensitivity - e.g. 0.0010
  Ea: number;       // Arrhenius activation energy (eV) - e.g. 0.61

  // Organic matter turnover rates (1/day)
  KG1: number;      // Labile OM turnover - e.g. 0.30
  KG2: number;      // Refractory OM turnover - e.g. 0.03
  nitmax: number;   // Max nitrification rate (1/day) - e.g. 0.52
  KNH4: number;     // Half-saturation for nitrification (mmol N / m3) - e.g. 1.0
  KO2: number;      // Half-sat O2 for oxic respiration (mmol O2 / m3) - e.g. 10.0
  KstarO2: number;  // O2 concentration inhibiting denitrification (mmol/m3) - e.g. 10.0
  KNO3: number;     // Half-sat NO3 for denitrification (mmol N / m3) - e.g. 5.0
  pCO2atm: number;  // Atmospheric pCO2 (ppm) - e.g. 420.0
  CDOMdecay: number;// CDOM photolysis decay (1/day) - e.g. 0.01

  // Sediment diagenesis & benthic flux
  SOC20: number;    // Sediment Oxygen Consumption at 20C (mmol O2 / m2 / day) - e.g. 25.0
  thetaSOC: number; // Arrhenius factor for SOC - e.g. 1.08
  sedNH4flux: number; // Benthic NH4 release (mmol N / m2 / day) - e.g. 3.5
  sedPO4flux: number; // Benthic PO4 release (mmol P / m2 / day) - e.g. 0.25
  sedSiflux: number;  // Benthic Si release (mmol Si / m2 / day) - e.g. 4.0
  microphytobenthos: boolean; // Bottom benthic algae production
  
  // Phytoplankton & Zooplankton configurations
  phytoplankton: PhytoplanktonParams[];
  zooplankton: ZooplanktonParams[];
}

export interface WaterQualityState {
  // Oxygen & Carbon
  O2: number;        // Dissolved Oxygen (mmol O2 / m3). 1 mg/L O2 ≈ 31.25 mmol/m3
  DIC: number;       // Dissolved Inorganic Carbon (mmol C / m3)
  Alk: number;       // Total Alkalinity (mmol eq / m3 or umol/kg)
  pH: number;        // Calculated pH (total scale)
  pCO2: number;      // Calculated pCO2 (ppm / uatm)
  omegaArag: number; // Aragonite saturation state (dimensionless, <1 = corrosive)
  omegaCalc: number; // Calcite saturation state

  // Nutrients (mmol / m3 = umol / L)
  NO3: number;       // Nitrate
  NH4: number;       // Ammonium
  PO4: number;       // Phosphate
  Si: number;        // Silicate

  // Plankton Biomasses (mmol C / m3) and Quotas
  A_biomass: number[];  // Phytoplankton biomass per group (mmol C / m3)
  A_chla: number[];     // Chlorophyll-a per group (mg Chl / m3)
  A_Qn: number[];       // Cell N quota (mmol N / cell)
  A_Qp: number[];       // Cell P quota (mmol P / cell)
  Z_biomass: number[];  // Zooplankton biomass per group (mmol C / m3)

  // Organic Matter Pools (mmol C / m3)
  OM1_A: number;     // Labile OM from phytoplankton mortality
  OM2_A: number;     // Refractory OM from phytoplankton
  OM1_Z: number;     // Labile OM from zooplankton fecal pellets
  OM2_Z: number;     // Refractory OM from zooplankton
  OM1_R: number;     // Riverine labile organic carbon
  OM2_R: number;     // Riverine refractory organic carbon
  CDOM: number;      // Colored Dissolved Organic Matter (ppb)

  // Physical and environmental forcings at this parcel
  temp: number;      // Water Temperature (deg C)
  salinity: number;  // Salinity (PSU)
  PAR: number;       // Photosynthetically Active Radiation (W/m2 or uE/m2/s)
  depth: number;     // Depth (meters)
  totalChla: number; // Total Chlorophyll-a (mg/m3)
}

export interface SimulationRecord {
  timeStep: number;     // Index
  timeDays: number;     // Elapsed simulation time (days)
  hourOfDay: number;    // 0 - 24
  dayOfYear: number;    // 1 - 365
  states: WaterQualityState[]; // In 0D: 1 element. In 1D: multi-layer depths. In 2D: spatial nodes.
  avgO2_mgL: number;
  minO2_mgL: number;
  totalChla_ugL: number;
  avgPH: number;
  avgOmegaArag: number;
  airSeaO2Flux: number;   // mmol/m2/day
  airSeaCO2Flux: number;  // mmol/m2/day
  benthicSOC: number;     // mmol/m2/day
  primaryProduction: number; // mmol C/m3/day
}

export interface ScenarioPreset {
  id: string;
  name: string;
  category: 'Coastal' | 'Estuary' | 'Mesocosm' | 'Acidification';
  mode: DimensionMode;
  description: string;
  siteName: string;
  durationDays: number;
  depthMeters: number;
  numLayers?: number;
  numTransectNodes?: number;
  params: CGEMModelParams;
  initialWater: Partial<WaterQualityState>;
  riverLoading?: {
    flowM3s: number;
    NO3: number;
    NH4: number;
    PO4: number;
    Si: number;
    OM1: number;
    CDOM: number;
  };
  environmentalForcing: {
    tempMean: number;
    tempAmp: number;
    salinity: number;
    windSpeed: number; // m/s
    surfacePARmax: number; // uE/m2/s
    latitude: number;
  };
}
