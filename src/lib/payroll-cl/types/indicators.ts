// ============================================================
// Poppins Payroll Chile — Tipos del snapshot de indicadores (§3)
// El snapshot es inmutable una vez usado en una nómina cerrada.
// ============================================================

import type { SnapshotStatus, UfPolicy } from './enums';

/** Tramo de la tabla de Impuesto Único de 2ª Categoría (§3.9). */
export interface TaxBracket {
  /** Periodicidad de la tabla: 'MENSUAL'. */
  periodicity: string;
  /** Desde (CLP). */
  fromAmount: number;
  /** Hasta (CLP). null = sin tope superior (último tramo). */
  toAmount: number | null;
  /** Factor multiplicador. */
  factor: number;
  /** Cantidad a rebajar (CLP). */
  deductionAmount: number;
  /** Tasa máxima efectiva del tramo (informativa). */
  effectiveMaxRate?: number;
}

/** Tasa de una AFP (§3.9). */
export interface AfpRate {
  afpCode: string;
  afpName: string;
  /** Cotización obligatoria (típ. 0.10). */
  mandatoryRate: number;
  /** Comisión de la AFP. */
  commissionRate: number;
  /** Tasa total trabajador = mandatory + commission. */
  totalWorkerRate: number;
  /** Tasa empleador (reforma previsional; 0 si no aplica). */
  employerRate?: number;
  source?: string;
}

/** Tramo de asignación familiar (§3.9). */
export interface FamilyAllowanceTranche {
  trancheCode: string;
  amount: number;
  incomeFrom: number;
  incomeTo: number | null;
}

/** Snapshot mensual de indicadores legales/previsionales (§3.4, §3.8). */
export interface IndicatorSnapshot {
  id: string;
  country: string; // 'CL'
  period: string; // 'YYYY-MM'
  status: SnapshotStatus;

  // UF
  ufPeriodEndValue: number;
  ufPolicy: UfPolicy;
  ufSource?: string;

  // UTM / UTA / IPC
  utmValue: number;
  utaValue: number;
  ipcIndexValue?: number;
  ipcMonthlyVariation?: number;
  ipcAccumulatedVariation?: number;
  ipcLast12MonthsVariation?: number;

  // Topes imponibles (en UF y su conversión a CLP del período)
  afpHealthMutualCapUf: number;
  unemploymentCapUf: number;
  afpHealthMutualCapClp: number;
  unemploymentCapClp: number;

  // Tasas
  healthLegalRate: number; // 0.07
  afcTcpEmployerRate: number; // 0.03 (TCP)
  caiTcpRate: number; // 0.0111 (TCP)
  sisRate: number;
  socialSecurityLifeExpectancyRate: number;
  socialSecurityProtectedProfitabilityRate: number;

  // Rentas mínimas
  minimumIncomeGeneral: number;
  minimumIncomeHouseholdWorker: number;
  minimumIncomeUnder18Over65: number;
  minimumIncomeNonRemunerational: number;

  // Previred
  previredFormatType: string; // 'LARGO_VARIABLE_SEPARADOR'
  previredFormatVersion: string; // '82'
  previredFieldCount: number; // 105

  // Tablas hijas
  afpRates: AfpRate[];
  taxBrackets: TaxBracket[];
  familyAllowanceTranches: FamilyAllowanceTranche[];

  // Metadata
  sourcePayload?: unknown;
  approvedBy?: string;
  approvedAt?: string;
  lockedAt?: string;
}

/** Resultado de validación de un snapshot (§3.13). */
export interface SnapshotValidationResult {
  ok: boolean;
  /** Errores críticos: impiden cerrar nómina (§3.14). */
  criticalErrors: string[];
  /** Warnings no críticos: permiten cierre con aprobación explícita. */
  warnings: string[];
  /** Campos faltantes detectados. */
  missingValues: string[];
}
