import React, { useState } from 'react';
import { X, Code2, Download, Copy, Check, FileText } from 'lucide-react';
import { CGEMModelParams } from '../types/cgem';

interface FortranCodeInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentParams: CGEMModelParams;
}

export const FortranCodeInspector: React.FC<FortranCodeInspectorProps> = ({
  isOpen,
  onClose,
  currentParams
}) => {
  const [copied, setCopied] = useState(false);
  const [activeFile, setActiveFile] = useState<'inputfile' | 'cgem_f90' | 'calc_chla' | 'equations'>('inputfile');

  if (!isOpen) return null;

  // Generate real GEM_InputFile formatted text based on currentParams
  const generatedInputFile = `"CGEM 1.0 AI Studio Custom Simulation Run" !Code_ID: Identifier for run, appears in netCDF file

!Simulation Specifics
2022     1     1      0     0     0		!- starting time Yr, Mon, Day, Hr, Min, Sec
2022     1    29      0     0     0		!- ending   time Yr, Mon, Day, Hr, Min, Sec
10 3600 8640 	        !- dT (timestep, seconds); dT_out (output interval, seconds); dT_sed (sediment diagenesis timestep, seconds)

!Switches in GEM
1 1 1 0 1 0 0 0 !Which_fluxes: Toggle on(1) off(0): O2surf, DICsurf, Sediment Oxygen Consumption, Microphytobenthos, Sediment Nutrient Fluxes
${currentParams.switchTemperature}		!Which_temperature: 1==Sigmoidal, 2==Optimum Temp. Thresh., 3==Arrenhius, 4==WQEM
${currentParams.switchUptake}		!Which_uptake: 1==Michaelis-Menten, 2==Geider (needs nfQs), 3==Roelke, Nutrient uptake rate
${currentParams.switchQuota}		!Which_quota:  1==Droop, 2==Nyholm, 3==Flynn, Nutrient dependent growth, 4==WQEM
1		!Which_irradiance: 1==IOP (inherent optical properties), 2==AOP (apparent optical properties), 3==WQEM
${currentParams.switchChlaC}		!Which_chlaC: 1==fixed C:Chl-a, 2==Cloern chl:C
${currentParams.switchPhotosynthesis}		!Which_photosynthesis: 1==photoinhibition, 2==without photoinhibition, 3==nutrient dependent, 4==WQEM
1		!Which_growth: 1==minimum, 2==product formulation, 3==umax is nutrient dependent, Specific growth rate
0 0 0 0         !ReadVars: Solar=Calculate(0),Read(1); Wind== 5mph(0) or Read(1), Temp== cosine w/params(0) or Read(1), Sal== Read one value(0) or Read(1)
0		!InitializeHow: 0==Read File, 1==Salinity Regression

!Optics
${currentParams.Kw.toFixed(3)}		!Kw: AOP, light attenuation due to water
${currentParams.Kcdom.toFixed(4)}		!Kcdom: AOP, light attenuation due to CDOM
${currentParams.Kspm.toFixed(3)}		!Kspm: AOP, light attenuation due to SPM
${currentParams.Kchla.toFixed(3)}		!Kchla: AOP, light attenuation due to chla 
0.0375		!astar490: Chla specific absorption at 490 nm 
0.015		!aw490: seawater absorption at 490 nm
${currentParams.PARfac.toFixed(1)} 		!PARfac: Multiplies surface PAR

!Temperature
${currentParams.Tref.toFixed(1)} ${currentParams.Tref.toFixed(1)} 22.0 26.0 	!Tref(nospA+nospZ): Optimum temperature for growth(C)
${currentParams.KTg1} ${currentParams.KTg1} 0.0035 0.0035	!KTg1(nospA+nospZ): Effect of T below Topt(C^2)
${currentParams.KTg2} ${currentParams.KTg2} 0.0010 0.0010 	!KTg2(nospA+nospZ): Effect of T above Topt(C^2)
${currentParams.Ea.toFixed(2)} ${currentParams.Ea.toFixed(2)} 0.61 0.61   !Ea(nospA+nospZ): Slope of Arrhenius plot(eV)

!Phytoplankton (Diatoms & Greens)
${currentParams.phytoplankton.map(p => p.umax.toFixed(2)).join(' ')}            !umax: maximum growth rate
${currentParams.phytoplankton.map(p => p.CChla.toFixed(1)).join(' ')} !Fixed C:Chla ratio
${currentParams.phytoplankton.map(p => p.Kn.toFixed(2)).join(' ')}		!Kn: half-saturation constant for N
${currentParams.phytoplankton.map(p => p.Kp.toFixed(2)).join(' ')} 		!Kp: half-saturation constant for P
${currentParams.phytoplankton.map(p => p.sinkA.toFixed(2)).join(' ')}		!sink A: sinking rate of phytoplankton cells
${currentParams.phytoplankton.map(p => p.mA.toFixed(2)).join(' ')}		!mA: mortality coefficient

!Organic Matter & Sediment
${currentParams.KG1.toFixed(2)}		!KG1: turnover rate for OM1_A and OM1_Z
${currentParams.KG2.toFixed(2)}		!KG2: turnover rate for OM2_A and OM2_Z
${currentParams.nitmax.toFixed(2)}            !nitmax: maximum rate of nitrification per day
${currentParams.KNH4.toFixed(1)}               !KNH4: NH4 rate constant for nitrification
${currentParams.KO2.toFixed(1)}		!KO2: half-saturation concentration for O2 utilization
${currentParams.pCO2atm.toFixed(1)}		!pCO2: atmospheric CO2 
${currentParams.SOC20.toFixed(1)}		!SOC20: Sediment Oxygen Demand (mmol O2/m2/d)`;

  const fortranCodeSnippets = {
    cgem_f90: `! =========================================================================
! US EPA Coastal Generalized Ecosystem Model (CGEM)
! Core Fortran Module: CGEM.F90 (Excerpt)
! =========================================================================
MODULE CGEM_vars
  IMPLICIT NONE
  SAVE

  INTEGER, DIMENSION(:), ALLOCATABLE :: iA(:)   ! Phytoplankton abundance (cells/m3)
  INTEGER, DIMENSION(:), ALLOCATABLE :: iQn(:)  ! N Quota (mmol-N/cell)
  INTEGER, DIMENSION(:), ALLOCATABLE :: iQp(:)  ! P Quota (mmol-P/cell)
  INTEGER, DIMENSION(:), ALLOCATABLE :: iZ(:)   ! Zooplankton density (ind/m3)
  INTEGER :: iNO3, iNH4, iPO4, iSi, iDIC, iO2
  INTEGER :: iOM1_A, iOM2_A, iOM1_Z, iOM2_Z, iOM1_R, iOM2_R, iCDOM
END MODULE CGEM_vars

SUBROUTINE Flux_CGEM(TC_8, istep, myid, numprocs)
  USE Model_dim
  USE CGEM_vars
  USE gasx
  IMPLICIT NONE
  
  ! Surface Oxygen Gas Exchange (Garcia & Gordon + Wanninkhof)
  Sc = SchmidtNumber(Sal_sfc, T_sfc, 0)
  Op_umole = o2sat(Sal_sfc, T_sfc)
  Vtrans = 0.251 * (Wind_speed**2) * ((Sc/660.0)**(-0.5)) * 0.24
  O2_atF = Vtrans * (Op_umole - O2_sfc)
  
  ! Carbonate Chemistry & pH Solver (MOCSY integration)
  CALL varsolver(temp, sal, alk, dic, sil, phos, patm, &
                 ph_calc, pco2_calc, fco2, co2, hco3, co3, omegaa, omegac)
END SUBROUTINE Flux_CGEM`,

    calc_chla: `! =========================================================================
! MODULE Calc_Chla: Chlorophyll-a computation from phytoplankton biomass
! Options: 1) Fixed C:Chl-a ratio  2) Cloern et al. (1995) dynamic acclimation
! =========================================================================
MODULE Calc_Chla
CONTAINS
  FUNCTION Fixed_CChla(A_k, nz) RESULT(Chla_tot)
    USE Model_dim
    USE INPUT_VARS_CGEM, ONLY: Qc, CChla
    IMPLICIT NONE
    REAL, INTENT(IN) :: A_k(nospA, km)
    INTEGER, INTENT(IN) :: nz
    REAL :: Chla_tot(km)
    INTEGER :: k, isp

    DO k = 1, nz
       Chla_tot(k) = 0.0
       DO isp = 1, nospA
          Chla_tot(k) = Chla_tot(k) + A_k(isp,k) * Qc(isp) * 12.0 * (1.0 / CChla(isp))
       ENDDO
    ENDDO
  END FUNCTION Fixed_CChla
END MODULE Calc_Chla`,

    equations: `# CGEM Core Governing Equations Reference

## 1. Phytoplankton Growth & Quota Dynamics (Droop 1968)
\\mu_i = \\mu_{max,i} \\cdot f(T) \\cdot f(E) \\cdot \\min\\left(1 - \\frac{Q_{min,N,i}}{Q_{N,i}}, 1 - \\frac{Q_{min,P,i}}{Q_{P,i}}\\right)

\\frac{dQ_{N,i}}{dt} = V_{N,i} - \\mu_i Q_{N,i}

## 2. Air-Sea Oxygen Exchange (Wanninkhof 2014 & Garcia-Gordon 1992)
F_{O_2} = k_{660} \\left(\\frac{Sc_{O_2}}{660}\\right)^{-0.5} (O_{2,sat}(T, S) - O_{2,sfc})

## 3. Seawater Carbonate Equilibrium & Saturation State
\\text{Alk} = [\\text{HCO}_3^-] + 2[\\text{CO}_3^{2-}] + [\\text{B(OH)}_4^-] + [\\text{OH}^-] - [\\text{H}^+]
\\Omega_{arag} = \\frac{[\\text{Ca}^{2+}][\\text{CO}_3^{2-}]}{K'_{sp,arag}(T, S)}

## 4. Nitrification & Sediment Oxygen Consumption (SOC)
R_{nit} = nit_{max} \\cdot f(T) \\cdot \\left(\\frac{\\text{NH}_4}{K_{NH_4} + \\text{NH}_4}\\right) \\cdot \\left(\\frac{O_2}{K_{O_2} + O_2}\\right)
\\text{SOC} = \\text{SOC}_{20} \\cdot \\theta^{(T - 20)} \\cdot \\left(\\frac{O_2}{K_{O_2,sed} + O_2}\\right)`
  };

  const currentText =
    activeFile === 'inputfile'
      ? generatedInputFile
      : activeFile === 'cgem_f90'
      ? fortranCodeSnippets.cgem_f90
      : activeFile === 'calc_chla'
      ? fortranCodeSnippets.calc_chla
      : fortranCodeSnippets.equations;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile === 'inputfile' ? 'GEM_InputFile' : `${activeFile}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Code2 className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                EPA CGEM Fortran Architecture & GEM_InputFile Inspector
              </h2>
              <p className="text-[11px] text-slate-400">
                Official EPA CEAM Model Source Code, NAMELIST input, and Mathematical Formulations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveFile('inputfile')}
              className={`px-3 py-1 font-medium rounded-md transition ${
                activeFile === 'inputfile' ? 'bg-cyan-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              GEM_InputFile (Current Run)
            </button>
            <button
              onClick={() => setActiveFile('cgem_f90')}
              className={`px-3 py-1 font-medium rounded-md transition ${
                activeFile === 'cgem_f90' ? 'bg-cyan-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CGEM.F90 & Flux
            </button>
            <button
              onClick={() => setActiveFile('calc_chla')}
              className={`px-3 py-1 font-medium rounded-md transition ${
                activeFile === 'calc_chla' ? 'bg-cyan-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Calc_Chla.F90
            </button>
            <button
              onClick={() => setActiveFile('equations')}
              className={`px-3 py-1 font-medium rounded-md transition ${
                activeFile === 'equations' ? 'bg-cyan-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Governing Equations
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-lg border border-slate-700 transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white font-medium rounded-lg transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed">
          <pre className="whitespace-pre-wrap">{currentText}</pre>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>EPA Center for Exposure Assessment Modeling (CEAM) — CGEM v1.0</span>
          <span>Fortran 90 / MPI / NetCDF-4</span>
        </div>
      </div>
    </div>
  );
};
