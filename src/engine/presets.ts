/**
 * Calibrated Scenario Presets for CGEM
 * Derived from EPA CGEM case studies (Louisiana Continental Shelf, Lake Ontario, FishTank)
 */

import { CGEMModelParams, ScenarioPreset } from '../types/cgem';

export const defaultCGEMParams: CGEMModelParams = {
  switchTemperature: 1,      // Sigmoidal
  switchUptake: 1,           // Michaelis-Menten
  switchQuota: 1,            // Droop cell quotas
  switchPhotosynthesis: 2,   // Without photoinhibition
  switchChlaC: 1,            // Fixed C:Chl-a

  Kw: 0.146,                 // Water light attenuation (1/m)
  Kcdom: 0.001,              // CDOM attenuation
  Kspm: 0.029,               // Suspended sediment attenuation
  Kchla: 0.024,              // Chlorophyll attenuation
  PARfac: 1.0,

  Tref: 20.0,
  KTg1: 0.0035,
  KTg2: 0.0010,
  Ea: 0.61,

  KG1: 0.25,                 // 1/day labile OM turnover
  KG2: 0.03,                 // 1/day refractory OM turnover
  nitmax: 0.52,              // 1/day maximum nitrification
  KNH4: 1.0,                 // mmol N/m3
  KO2: 10.0,                 // mmol O2/m3
  KstarO2: 10.0,             // mmol O2/m3
  KNO3: 5.0,                 // mmol N/m3
  pCO2atm: 420.0,            // uatm atmospheric CO2
  CDOMdecay: 0.015,

  SOC20: 22.0,               // mmol O2/m2/day sediment oxygen demand
  thetaSOC: 1.08,            // Temperature multiplier for SOC
  sedNH4flux: 3.5,           // mmol N/m2/day
  sedPO4flux: 0.25,          // mmol P/m2/day
  sedSiflux: 3.8,            // mmol Si/m2/day
  microphytobenthos: true,

  phytoplankton: [
    {
      id: 'diatoms',
      name: 'Diatoms (Large / Silicified)',
      color: '#eab308', // amber
      umax: 1.25,
      CChla: 160.0,
      alpha: 4.2e-16,
      beta: 1.1e-18,
      respg: 0.10,
      respb: 0.02,
      QminN: 1.5e-10,
      QmaxN: 6.8e-9,
      QminP: 1.0e-11,
      QmaxP: 4.2e-10,
      Kn: 1.2,
      Kp: 0.5,
      Ksi: 1.2,
      volcell: 650,
      Qc: 5.0e-8,
      sinkA: 0.35,
      mA: 0.10,
      isDiatom: true,
    },
    {
      id: 'greens',
      name: 'Flagellates & Green Algae',
      color: '#22c55e', // green
      umax: 1.05,
      CChla: 180.0,
      alpha: 3.8e-16,
      beta: 1.0e-18,
      respg: 0.10,
      respb: 0.02,
      QminN: 1.2e-10,
      QmaxN: 5.5e-9,
      QminP: 0.9e-11,
      QmaxP: 3.8e-10,
      Kn: 0.9,
      Kp: 0.4,
      Ksi: 0.0,
      volcell: 420,
      Qc: 3.8e-8,
      sinkA: 0.12,
      mA: 0.09,
      isDiatom: false,
    },
    {
      id: 'cyanobacteria',
      name: 'Cyanobacteria (Small / Diazotrophs)',
      color: '#06b6d4', // cyan
      umax: 0.85,
      CChla: 200.0,
      alpha: 3.2e-16,
      beta: 0.8e-18,
      respg: 0.08,
      respb: 0.015,
      QminN: 0.8e-10,
      QmaxN: 4.0e-9,
      QminP: 0.7e-11,
      QmaxP: 2.9e-10,
      Kn: 0.6,
      Kp: 0.3,
      Ksi: 0.0,
      volcell: 200,
      Qc: 2.2e-8,
      sinkA: 0.05,
      mA: 0.08,
      isDiatom: false,
    }
  ],

  zooplankton: [
    {
      id: 'microzoo',
      name: 'Microzooplankton (Ciliates / Rotifers)',
      color: '#f97316', // orange
      Zeffic: 0.45,
      Zslop: 0.15,
      ZKa: 12.0,
      Zrespg: 0.18,
      Zrespb: 0.08,
      Zumax: 0.95,
      Zm: 0.04,
    },
    {
      id: 'mesozoo',
      name: 'Mesozooplankton (Copepods)',
      color: '#ec4899', // pink
      Zeffic: 0.40,
      Zslop: 0.25,
      ZKa: 20.0,
      Zrespg: 0.22,
      Zrespb: 0.12,
      Zumax: 0.70,
      Zm: 0.03,
    }
  ]
};

export const scenarioPresets: ScenarioPreset[] = [
  {
    id: 'la_shelf_hypoxia',
    name: 'Louisiana Shelf Hypoxia (Gulf of Mexico "Dead Zone")',
    category: 'Coastal',
    mode: '1D_column',
    siteName: 'Northern Gulf of Mexico (Station C6B)',
    description: 'Simulates the development of bottom-water hypoxia and coastal acidification driven by Mississippi-Atchafalaya River nutrient discharge, summer thermal stratification, and benthic sediment oxygen demand.',
    durationDays: 28,
    depthMeters: 20,
    numLayers: 10,
    params: {
      ...defaultCGEMParams,
      SOC20: 28.0,
      sedNH4flux: 4.5,
      Kw: 0.18,
    },
    initialWater: {
      O2: 210, // ~6.7 mg/L
      DIC: 2040,
      Alk: 2320,
      NO3: 28.0,
      NH4: 3.5,
      PO4: 1.8,
      Si: 18.0,
      A_biomass: [4.5, 2.0, 0.8],
      Z_biomass: [1.2, 0.6],
      OM1_A: 5.0,
      OM2_A: 15.0,
      OM1_Z: 2.0,
      OM2_Z: 8.0,
      OM1_R: 12.0,
      OM2_R: 35.0,
      CDOM: 18.0,
      temp: 28.0,
      salinity: 28.0,
    },
    riverLoading: {
      flowM3s: 18000,
      NO3: 110.0,
      NH4: 8.0,
      PO4: 4.2,
      Si: 85.0,
      OM1: 30.0,
      CDOM: 45.0,
    },
    environmentalForcing: {
      tempMean: 27.5,
      tempAmp: 2.5,
      salinity: 28.0,
      windSpeed: 4.2,
      surfacePARmax: 1850,
      latitude: 29.0,
    }
  },
  {
    id: 'hypoxia_reduction_20',
    name: 'Mississippi Action Plan (20% Nutrient Reduction Scenario)',
    category: 'Coastal',
    mode: '1D_column',
    siteName: 'Louisiana Continental Shelf (Reduced Loading)',
    description: 'EPA management scenario evaluating the Gulf Hypoxia Task Force goal: 20% reduction in riverine nitrogen and phosphorus loading to evaluate oxygen recovery and bottom water remediation.',
    durationDays: 28,
    depthMeters: 20,
    numLayers: 10,
    params: {
      ...defaultCGEMParams,
      SOC20: 21.0,
      sedNH4flux: 3.0,
    },
    initialWater: {
      O2: 215,
      DIC: 2020,
      Alk: 2320,
      NO3: 22.4, // 20% lower
      NH4: 2.8,
      PO4: 1.44, // 20% lower
      Si: 18.0,
      A_biomass: [3.6, 1.6, 0.6],
      Z_biomass: [1.0, 0.5],
      OM1_A: 4.0,
      OM2_A: 12.0,
      OM1_Z: 1.6,
      OM2_Z: 6.5,
      OM1_R: 9.6,
      OM2_R: 28.0,
      CDOM: 14.5,
      temp: 28.0,
      salinity: 28.0,
    },
    riverLoading: {
      flowM3s: 18000,
      NO3: 88.0,
      NH4: 6.4,
      PO4: 3.36,
      Si: 85.0,
      OM1: 24.0,
      CDOM: 40.0,
    },
    environmentalForcing: {
      tempMean: 27.5,
      tempAmp: 2.5,
      salinity: 28.0,
      windSpeed: 4.2,
      surfacePARmax: 1850,
      latitude: 29.0,
    }
  },
  {
    id: 'estuary_transect_2d',
    name: 'Estuary-to-Ocean Plume Gradient (2D Spatial Transect)',
    category: 'Estuary',
    mode: '2D_estuary',
    siteName: 'Coastal Estuary / River Plume System',
    description: 'Two-dimensional longitudinal transect from turbid freshwater river mouth across the brackish estuary out to the blue shelf. Captures sediment settling, light clearing, bloom triggering, and seaward hypoxia zone.',
    durationDays: 21,
    depthMeters: 14,
    numLayers: 6,
    numTransectNodes: 12,
    params: {
      ...defaultCGEMParams,
      Kw: 0.12,
      Kspm: 0.035,
    },
    initialWater: {
      O2: 240,
      DIC: 1950,
      Alk: 2280,
      NO3: 45.0,
      NH4: 5.0,
      PO4: 2.8,
      Si: 40.0,
      A_biomass: [1.8, 1.2, 0.5],
      Z_biomass: [0.6, 0.3],
      OM1_A: 3.0,
      OM2_A: 10.0,
      OM1_Z: 1.0,
      OM2_Z: 4.0,
      OM1_R: 15.0,
      OM2_R: 40.0,
      CDOM: 25.0,
      temp: 24.0,
      salinity: 12.0,
    },
    environmentalForcing: {
      tempMean: 24.0,
      tempAmp: 2.0,
      salinity: 18.0,
      windSpeed: 4.8,
      surfacePARmax: 1750,
      latitude: 30.2,
    }
  },
  {
    id: 'diel_estuary_swing',
    name: 'Estuarine Diurnal Diel Swing & Ocean Acidification',
    category: 'Acidification',
    mode: '0D_box',
    siteName: 'Shallow Coastal Embayment / Salt Marsh Lagoon',
    description: 'Shallow 2-meter photic zone demonstrating dramatic diurnal oscillations: extreme daytime photosynthesis (supersaturated DO > 12 mg/L, pH > 8.5) followed by intense nighttime respiration leading to dawn hypoxia and corrosive pH < 7.4.',
    durationDays: 7,
    depthMeters: 2.2,
    params: {
      ...defaultCGEMParams,
      SOC20: 35.0,
      microphytobenthos: true,
      switchPhotosynthesis: 1, // With photoinhibition
    },
    initialWater: {
      O2: 220,
      DIC: 1850,
      Alk: 2250,
      NO3: 16.0,
      NH4: 4.2,
      PO4: 1.6,
      Si: 12.0,
      A_biomass: [8.5, 6.0, 2.5],
      Z_biomass: [2.5, 1.2],
      OM1_A: 8.0,
      OM2_A: 18.0,
      OM1_Z: 3.5,
      OM2_Z: 10.0,
      OM1_R: 4.0,
      OM2_R: 12.0,
      CDOM: 12.0,
      temp: 26.0,
      salinity: 24.0,
    },
    environmentalForcing: {
      tempMean: 25.0,
      tempAmp: 3.5,
      salinity: 24.0,
      windSpeed: 2.8,
      surfacePARmax: 1950,
      latitude: 31.5,
    }
  },
  {
    id: 'mesocosm_fishtank',
    name: 'EPA FishTank / Controlled Mesocosm Incubation',
    category: 'Mesocosm',
    mode: '0D_box',
    siteName: 'EPA CEAM Laboratory Chemostat (CGEM/data/FishTank)',
    description: 'Direct reproduction of the EPA CGEM validation benchmark: laboratory water parcel incubated under controlled photoperiod, temperature, and nutrient spikes to benchmark algal kinetics against Fortran runs.',
    durationDays: 14,
    depthMeters: 1.0,
    params: {
      ...defaultCGEMParams,
      SOC20: 5.0,
      Kw: 0.10,
    },
    initialWater: {
      O2: 250,
      DIC: 1900,
      Alk: 2300,
      NO3: 35.0,
      NH4: 1.5,
      PO4: 2.2,
      Si: 25.0,
      A_biomass: [2.0, 1.5, 0.4],
      Z_biomass: [0.5, 0.2],
      OM1_A: 1.0,
      OM2_A: 5.0,
      OM1_Z: 0.5,
      OM2_Z: 2.0,
      OM1_R: 0.0,
      OM2_R: 0.0,
      CDOM: 2.0,
      temp: 20.0,
      salinity: 30.0,
    },
    environmentalForcing: {
      tempMean: 20.0,
      tempAmp: 0.0,
      salinity: 30.0,
      windSpeed: 1.5,
      surfacePARmax: 1200,
      latitude: 30.0,
    }
  }
];
