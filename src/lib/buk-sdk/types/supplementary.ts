/**
 * Tipos para módulos complementarios de Buk Chile:
 * Horas Extra, Documentos, Cargos, Departamentos, Centros de Costo, Empresas
 */

// ── Horas Extra ──

export interface BukOvertime {
  id: number;
  employee_id: number;
  date: string;
  hours: number;
  overtime_type: string; // 50%, 100%, etc.
  amount?: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  observations?: string;
  created_at?: string;
}

export interface CreateOvertimeRequest {
  employee_id: number;
  date: string;
  hours: number;
  overtime_type?: string;
  observations?: string;
}

// ── Documentos ──

export interface BukDocument {
  id: number;
  employee_id?: number;
  document_type: string;
  name: string;
  file_url?: string;
  file_name?: string;
  created_at?: string;
  updated_at?: string;
}

// ── Estructura Organizacional ──

export interface BukRole {
  id: number;
  name: string;
  description?: string;
  department_id?: number;
  active: boolean;
}

export interface BukDepartment {
  id: number;
  name: string;
  parent_id?: number | null;
  manager_id?: number | null;
  active: boolean;
}

export interface BukCostCenter {
  id: number;
  name: string;
  code?: string;
  active: boolean;
}

export interface BukLocation {
  id: number;
  name: string;
  address?: string;
  city?: string;
  region?: string;
  active: boolean;
}

export interface BukCompany {
  id: number;
  name: string;
  rut: string;
  business_name?: string; // razón social
  address?: string;
  active: boolean;
}

// ── AFP y Salud ──

export interface BukAfp {
  id: number;
  name: string;
  rate: number; // tasa de cotización
}

export interface BukHealthPlan {
  id: number;
  name: string;
  type: 'fonasa' | 'isapre';
}

// ── KPIs / Indicadores ──

export interface BukKpi {
  id: number;
  name: string;
  description?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  period?: string;
  employee_id?: number;
}
