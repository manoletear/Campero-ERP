/**
 * Módulo Overtime — Horas Extra
 *
 * Endpoints:
 *   GET    /overtimes            → Listar horas extra
 *   POST   /overtimes            → Registrar horas extra
 *   PUT    /overtimes/{id}       → Actualizar
 *   DELETE /overtimes/{id}       → Eliminar
 */

import { BukHttpClient, type BukListResponse } from '../client';
import type { BukOvertime, CreateOvertimeRequest } from '../types/supplementary';

export class OvertimeModule {
  constructor(private readonly client: BukHttpClient) {}

  /**
   * Listar horas extra.
   */
  async list(
    filters?: {
      employee_id?: number;
      start_date?: string;
      end_date?: string;
      status?: string;
    },
    page = 1,
    pageSize?: number
  ): Promise<BukListResponse<BukOvertime>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.employee_id) params.employee_id = filters.employee_id;
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;
    if (filters?.status) params.status = filters.status;

    return this.client.list<BukOvertime>('/overtimes', params, page, pageSize);
  }

  /**
   * Todas las horas extra (auto-paginación).
   */
  async listAll(filters?: {
    employee_id?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<BukOvertime[]> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.employee_id) params.employee_id = filters.employee_id;
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;
    if (filters?.status) params.status = filters.status;

    return this.client.listAll<BukOvertime>('/overtimes', params);
  }

  /**
   * Registrar horas extra.
   */
  async create(data: CreateOvertimeRequest): Promise<BukOvertime> {
    return this.client.post<BukOvertime>('/overtimes', data as unknown as Record<string, unknown>);
  }

  /**
   * Actualizar registro de horas extra.
   */
  async update(id: number, data: Partial<CreateOvertimeRequest>): Promise<BukOvertime> {
    return this.client.put<BukOvertime>(`/overtimes/${id}`, data as unknown as Record<string, unknown>);
  }

  /**
   * Eliminar registro de horas extra.
   */
  async delete(id: number): Promise<void> {
    return this.client.delete(`/overtimes/${id}`);
  }

  /**
   * Horas extra de un empleado en un mes específico.
   */
  async getEmployeeMonthly(employeeId: number, year: number, month: number): Promise<BukOvertime[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    return this.listAll({
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate,
    });
  }
}
