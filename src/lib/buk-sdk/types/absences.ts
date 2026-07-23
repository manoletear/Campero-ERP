/**
 * Tipos para módulos de Vacaciones, Licencias, Permisos y Ausencias de Buk Chile.
 *
 * Ref: GET /employees/{id}/vacations, GET /absences, GET /licenses, GET /permissions
 */

// ── Vacaciones ──

export interface BukVacation {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  days: number;
  half_day?: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  vacation_type?: string; // legal, progresivas, adicionales
  observations?: string;
  approved_by?: string;
  created_at?: string;
}

export interface BukVacationBalance {
  employee_id: number;
  total_days: number;
  used_days: number;
  pending_days: number;
  available_days: number;
  progressive_days?: number;
  as_of_date: string;
}

export interface CreateVacationRequest {
  employee_id: number;
  start_date: string;
  end_date: string;
  days: number;
  half_day?: boolean;
  vacation_type?: string;
  observations?: string;
}

// ── Licencias Médicas ──

export interface BukLicense {
  id: number;
  employee_id: number;
  license_type: string; // enfermedad_comun, maternal, laboral, etc.
  start_date: string;
  end_date: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  medical_institution?: string;
  diagnosis_code?: string;
  folio?: string; // número de folio de la licencia
  observations?: string;
  created_at?: string;
}

export interface CreateLicenseRequest {
  employee_id: number;
  license_type: string;
  start_date: string;
  end_date: string;
  days: number;
  medical_institution?: string;
  diagnosis_code?: string;
  folio?: string;
  observations?: string;
}

// ── Permisos ──

export interface BukPermission {
  id: number;
  employee_id: number;
  permission_type: string; // administrativo, sindical, etc.
  start_date: string;
  end_date: string;
  days: number;
  hours?: number;
  with_pay: boolean;
  status: 'pending' | 'approved' | 'rejected';
  observations?: string;
  created_at?: string;
}

export interface CreatePermissionRequest {
  employee_id: number;
  permission_type: string;
  start_date: string;
  end_date: string;
  days?: number;
  hours?: number;
  with_pay?: boolean;
  observations?: string;
}

// ── Ausencias (vista unificada) ──

export interface BukAbsence {
  id: number;
  employee_id: number;
  absence_type: 'vacation' | 'license' | 'permission' | 'other';
  absence_subtype?: string;
  start_date: string;
  end_date: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  observations?: string;
  created_at?: string;
}

/** Filtros para listar ausencias */
export interface AbsenceFilters {
  employee_id?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  absence_type?: string;
}

/** Filtros para vacaciones */
export interface VacationFilters {
  status?: string;
  start_date?: string;
  end_date?: string;
}
