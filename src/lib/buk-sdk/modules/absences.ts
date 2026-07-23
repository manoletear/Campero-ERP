/**
 * Módulo Absences — Vacaciones, Licencias, Permisos
 *
 * Endpoints:
 *   GET    /employees/{id}/vacations       → Vacaciones de un empleado
 *   GET    /absences                       → Ausencias generales
 *   POST   /absences                       → Crear ausencia
 *   PUT    /absences/{id}                  → Actualizar ausencia
 *   GET    /licenses                       → Licencias médicas
 *   POST   /licenses                       → Crear licencia
 *   GET    /permissions                    → Permisos
 *   POST   /permissions                    → Crear permiso
 */

import { BukHttpClient, type BukListResponse } from '../client';
import type {
  BukVacation,
  BukVacationBalance,
  CreateVacationRequest,
  BukLicense,
  CreateLicenseRequest,
  BukPermission,
  CreatePermissionRequest,
  BukAbsence,
  AbsenceFilters,
  VacationFilters,
} from '../types/absences';

export class AbsencesModule {
  constructor(private readonly client: BukHttpClient) {}

  // ── Vacaciones ──

  /**
   * Listar vacaciones de un empleado.
   */
  async listVacations(
    employeeId: number,
    filters?: VacationFilters,
    page = 1,
    pageSize?: number
  ): Promise<BukListResponse<BukVacation>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;

    return this.client.list<BukVacation>(
      `/employees/${employeeId}/vacations`,
      params,
      page,
      pageSize
    );
  }

  /**
   * Todas las vacaciones de un empleado (auto-paginación).
   */
  async listAllVacations(employeeId: number, filters?: VacationFilters): Promise<BukVacation[]> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;

    return this.client.listAll<BukVacation>(`/employees/${employeeId}/vacations`, params);
  }

  /**
   * Crear solicitud de vacaciones.
   */
  async createVacation(data: CreateVacationRequest): Promise<BukVacation> {
    return this.client.post<BukVacation>('/vacations', data as unknown as Record<string, unknown>);
  }

  /**
   * Saldo de vacaciones de un empleado.
   * Nota: Este endpoint puede no estar disponible en todas las versiones de Buk.
   */
  async getVacationBalance(employeeId: number): Promise<BukVacationBalance> {
    const response = await this.client.get<BukVacationBalance>(
      `/employees/${employeeId}/vacation_balance`
    );
    return response.data;
  }

  // ── Licencias Médicas ──

  /**
   * Listar licencias médicas.
   */
  async listLicenses(
    filters?: AbsenceFilters,
    page = 1,
    pageSize?: number
  ): Promise<BukListResponse<BukLicense>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.employee_id) params.employee_id = filters.employee_id;
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;
    if (filters?.status) params.status = filters.status;

    return this.client.list<BukLicense>('/licenses', params, page, pageSize);
  }

  /**
   * Todas las licencias (auto-paginación).
   */
  async listAllLicenses(filters?: AbsenceFilters): Promise<BukLicense[]> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.employee_id) params.employee_id = filters.employee_id;
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;
    if (filters?.status) params.status = filters.status;

    return this.client.listAll<BukLicense>('/licenses', params);
  }

  /**
   * Crear licencia médica.
   */
  async createLicense(data: CreateLicenseRequest): Promise<BukLicense> {
    return this.client.post<BukLicense>('/licenses', data as unknown as Record<string, unknown>);
  }

  // ── Permisos ──

  /**
   * Listar permisos.
   */
  async listPermissions(
    filters?: AbsenceFilters,
    page = 1,
    pageSize?: number
  ): Promise<BukListResponse<BukPermission>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.employee_id) params.employee_id = filters.employee_id;
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;
    if (filters?.status) params.status = filters.status;

    return this.client.list<BukPermission>('/permissions', params, page, pageSize);
  }

  /**
   * Todos los permisos (auto-paginación).
   */
  async listAllPermissions(filters?: AbsenceFilters): Promise<BukPermission[]> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.employee_id) params.employee_id = filters.employee_id;
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;
    if (filters?.status) params.status = filters.status;

    return this.client.listAll<BukPermission>('/permissions', params);
  }

  /**
   * Crear permiso.
   */
  async createPermission(data: CreatePermissionRequest): Promise<BukPermission> {
    return this.client.post<BukPermission>('/permissions', data as unknown as Record<string, unknown>);
  }

  // ── Ausencias (vista unificada) ──

  /**
   * Listar todas las ausencias.
   */
  async listAbsences(
    filters?: AbsenceFilters,
    page = 1,
    pageSize?: number
  ): Promise<BukListResponse<BukAbsence>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.employee_id) params.employee_id = filters.employee_id;
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;
    if (filters?.status) params.status = filters.status;
    if (filters?.absence_type) params.absence_type = filters.absence_type;

    return this.client.list<BukAbsence>('/absences', params, page, pageSize);
  }

  /**
   * Todas las ausencias de un empleado en un rango de fechas.
   */
  async getEmployeeAbsences(
    employeeId: number,
    startDate?: string,
    endDate?: string
  ): Promise<BukAbsence[]> {
    return this.client.listAll<BukAbsence>('/absences', {
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate,
    });
  }
}
