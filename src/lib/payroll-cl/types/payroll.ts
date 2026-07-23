// ============================================================
// Poppins Payroll Chile — Tipos del motor de cálculo (§10)
// El motor es función pura: recibe contrato + período + snapshot + eventos,
// devuelve resultado inmutable con calculation_trace. No emite PDF ni Previred.
// ============================================================

import type {
  HealthType,
  LegalProfileType,
  WorkScheduleType,
  ConceptType,
} from './enums';
import type { IndicatorSnapshot } from './indicators';

/** Contrato relevante para el cálculo (§10.2). */
export interface PayrollContractInput {
  contractId: string;
  workerId: string;
  legalProfileType: LegalProfileType;
  startDate: string; // ISO date
  endDate?: string | null;
  baseSalary: number;
  weeklyHours: number;
  workScheduleType: WorkScheduleType;
  /** Bolsa semanal de horas adicionales (jornada parcial con pacto, §11.1). */
  partTimeBagEnabled?: boolean;
}

/** Datos previsionales del trabajador relevantes para el cálculo. */
export interface PayrollWorkerInput {
  rut: string;
  afpCode: string;
  healthType: HealthType;
  /** Solo ISAPRE: valor del plan pactado en UF. */
  isaprePlanUf?: number;
  isPensioner: boolean;
  /** Código tipo trabajador Previred. */
  workerTypePrevired: string;
  /** Nº de cargas familiares (para asignación familiar). */
  familyAllowanceCount?: number;
  /** Tramo asignación familiar forzado (si se conoce). */
  familyAllowanceTranche?: string;
}

/** Eventos del período (§10.2). */
export interface PayrollPeriodEvents {
  workedDays: number;
  medicalLeaveDays?: number;
  unpaidLeaveDays?: number;
  vacationDays?: number;
  /** Horas extraordinarias (al 50%). */
  extraHours?: number;
  unjustifiedAbsenceDays?: number;
}

/** Ítem variable de remuneración (§10.2). */
export interface PayrollVariableItem {
  conceptCode: string;
  amount: number;
  /** Sobrescribe la inferencia por código (NON_TAXABLE_CODES) cuando viene seteado. */
  imponible?: boolean;
}

/** Afiliación CCAF del empleador y descuentos voluntarios del trabajador. */
export interface PayrollCcafInput {
  /** Código Previred ('01'=Los Andes, '02'=La Araucana, '03'=Los Héroes). */
  codigoPrevired: string;
  /** Tasa aporte empleador (default 0.006 = 0.6%). */
  aportePct?: number;
  /** Descuentos voluntarios del trabajador en el período. */
  descuentos?: Array<{
    tipo: 'credito' | 'dental' | 'leasing' | 'seguro_vida' | 'otro';
    monto: number;
  }>;
}

/** Entrada completa del motor (§10.2). */
export interface PayrollEngineInput {
  payrollPeriod: string; // 'YYYY-MM'
  country: string; // 'CL'
  contract: PayrollContractInput;
  worker: PayrollWorkerInput;
  periodEvents: PayrollPeriodEvents;
  variableItems?: PayrollVariableItem[];
  /** CCAF: solo aplica si el empleador está afiliado. */
  ccaf?: PayrollCcafInput;
  /** Snapshot de indicadores aprobado/locked. */
  snapshot: IndicatorSnapshot;
  /** 'preview' no persiste; 'final' sí (lo decide el servicio, no el motor). */
  mode?: 'preview' | 'final';
}

/** Una línea de trazabilidad de fórmula (§5.9, §10). */
export interface CalculationTraceStep {
  order: number;
  code: string;
  description: string;
  formula?: string;
  inputs?: Record<string, number | string | null>;
  result: number;
}

/** Resultado por concepto, persistible en payroll_concept_results (§16). */
export interface ConceptResult {
  conceptCode: string;
  conceptName: string;
  conceptType: ConceptType;
  amount: number;
  baseAmount?: number;
  rate?: number;
  taxable: boolean;
  imponible: boolean;
  legal: boolean;
  visibleInPayslip: boolean;
  calculationOrder: number;
}

/** Salida del motor (§10.3). Inmutable. */
export interface PayrollResult {
  payrollPeriod: string;
  contractId: string;
  workerId: string;
  indicatorSnapshotId: string;

  grossIncome: number;
  taxableIncome: number;
  pensionBase: number;
  healthBase: number;
  afcBase: number;
  mutualBase: number;
  incomeTaxBase: number;

  employeeDeductions: {
    afp10: number;
    afpCommission: number;
    health7: number;
    incomeTax: number;
    advances: number;
    other: number;
  };
  employerContributions: {
    sis: number;
    afcEmployer: number;
    cai111: number;
    mutual: number;
    ccaf?: number;
  };
  /** Descuentos CCAF del trabajador (parte de "other"). */
  ccafDeductions?: number;

  netPay: number;
  totalEmployerCost: number;

  concepts: ConceptResult[];
  warnings: string[];
  calculationTrace: CalculationTraceStep[];
}
