/**
 * Tipos para el módulo de Colaboradores (Employees) de Buk Chile.
 *
 * Ref: GET /employees, GET /employees/{id}
 * Los campos se basan en la documentación real de la API.
 */

export interface BukCompanyIdentifier {
  id: number;
  name: string;
  rut?: string;
}

export interface BukRole {
  id: number;
  name: string;
}

export interface BukCustomAttribute {
  id: number;
  name: string;
  value: string | number | boolean | null;
}

/**
 * Colaborador tal como viene de GET /employees (listado).
 * El shape del listado es más liviano que el de detalle.
 */
export interface BukEmployeeSummary {
  id: number;
  rut: string;
  first_name: string;
  last_name: string;
  second_last_name?: string;
  full_name: string;
  email?: string;
  personal_email?: string;
  phone?: string;
  current_job?: {
    id: number;
    role?: BukRole;
    department?: { id: number; name: string };
    cost_center?: { id: number; name: string };
    location?: { id: number; name: string };
    company?: BukCompanyIdentifier;
    start_date?: string;
    end_date?: string | null;
  };
  active: boolean;
  /** URL foto perfil */
  picture_url?: string | null;
}

/**
 * Colaborador con detalle completo — GET /employees/{id}
 */
export interface BukEmployeeDetail extends BukEmployeeSummary {
  gender?: string;
  nationality?: string;
  marital_status?: string;
  birth_date?: string;
  address?: string;
  district?: string; // comuna
  city?: string;
  region?: string;
  country?: string;
  bank?: string;
  bank_account_type?: string;
  bank_account_number?: string;
  afp?: { id: number; name: string };
  health_plan?: { id: number; name: string; type: 'fonasa' | 'isapre' };
  health_plan_uf?: number;
  contract_type?: string;
  hire_date?: string;
  termination_date?: string | null;
  termination_reason?: string | null;
  base_salary?: number;
  gratification_type?: string;
  custom_attributes?: BukCustomAttribute[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Datos para crear un colaborador — POST /employees
 */
export interface BukCreateEmployee {
  rut: string;
  first_name: string;
  last_name: string;
  second_last_name?: string;
  email?: string;
  personal_email?: string;
  phone?: string;
  gender?: string;
  birth_date?: string;
  nationality?: string;
  marital_status?: string;
  address?: string;
  district?: string;
  city?: string;
  region?: string;
  hire_date: string;
  role_id?: number;
  department_id?: number;
  cost_center_id?: number;
  location_id?: number;
  company_id?: number;
  contract_type?: string;
  base_salary?: number;
  bank?: string;
  bank_account_type?: string;
  bank_account_number?: string;
  afp_id?: number;
  health_plan_id?: number;
  health_plan_uf?: number;
  gratification_type?: string;
  /** Atributos personalizados */
  custom_attributes?: Record<string, string | number | boolean>;
}

/**
 * Datos para actualizar un colaborador — PUT /employees/{id}
 * Todos los campos son opcionales.
 */
export type BukUpdateEmployee = Partial<BukCreateEmployee>;

/**
 * Filtros para listar colaboradores
 */
export interface EmployeeListFilters {
  /** Filtrar por estado activo/inactivo */
  status?: 'active' | 'inactive' | 'all';
  /** Filtrar por empresa (multi-empresa) */
  company_id?: number;
  /** Filtrar por departamento */
  department_id?: number;
  /** Filtrar por centro de costo */
  cost_center_id?: number;
  /** Filtrar por ubicación */
  location_id?: number;
  /** Búsqueda por nombre o rut */
  search?: string;
}
