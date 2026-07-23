/**
 * Tipos para el módulo de Liquidaciones (Payroll) de Buk Chile.
 *
 * Ref: GET /payroll_processes, GET /payroll_processes/{id}/payroll_items
 */

/** Proceso de liquidación */
export interface BukPayrollProcess {
  id: number;
  name?: string;
  month: number;
  year: number;
  period: string; // "2025-03" format
  status: 'draft' | 'calculating' | 'calculated' | 'closed' | 'paid';
  company?: { id: number; name: string };
  created_at?: string;
  updated_at?: string;
}

/** Haberes individuales dentro de una liquidación */
export interface BukPayrollEarning {
  id: number;
  name: string;
  code?: string;
  amount: number;
  is_taxable: boolean;
  is_pensionable: boolean;
}

/** Descuentos individuales dentro de una liquidación */
export interface BukPayrollDeduction {
  id: number;
  name: string;
  code?: string;
  amount: number;
}

/** Ítem de liquidación (una liquidación por empleado por proceso) */
export interface BukPayrollItem {
  id: number;
  employee_id: number;
  employee_rut?: string;
  employee_name?: string;
  payroll_process_id: number;
  period: string;

  // Haberes
  base_salary: number;
  gratification: number;
  overtime_amount: number;
  bonuses: number;
  commissions: number;
  other_taxable_earnings: number;
  non_taxable_earnings: number;
  total_earnings: number;
  taxable_income: number;   // renta imponible
  tributable_income: number; // sueldo tributable

  // Descuentos legales
  afp_amount: number;
  afp_name?: string;
  health_amount: number;
  health_name?: string;
  sis_amount: number; // Seguro de Invalidez y Sobrevivencia
  unemployment_insurance: number; // Seguro de Cesantía
  tax_amount: number; // Impuesto Único

  // Descuentos voluntarios
  voluntary_savings?: number;
  apv?: number; // Ahorro Previsional Voluntario
  other_deductions: number;

  total_deductions: number;
  net_salary: number; // Sueldo líquido

  // Costos empleador
  employer_sis?: number;
  employer_unemployment?: number;
  employer_mutual?: number;
  total_employer_cost?: number;

  // Detalle desglosado (si está disponible)
  earnings_detail?: BukPayrollEarning[];
  deductions_detail?: BukPayrollDeduction[];

  status: string;
  payment_date?: string | null;
}

/** Filtros para listar procesos de liquidación */
export interface PayrollProcessFilters {
  /** Año */
  year?: number;
  /** Mes (1-12) */
  month?: number;
  /** Estado del proceso */
  status?: BukPayrollProcess['status'];
  /** ID de empresa */
  company_id?: number;
}

/** Filtros para listar ítems de liquidación */
export interface PayrollItemFilters {
  /** ID de empleado */
  employee_id?: number;
}
