/**
 * Módulo Payroll — Procesos de Liquidación
 *
 * Endpoints:
 *   GET /payroll_processes                           → Listar procesos
 *   GET /payroll_processes/{id}                      → Detalle de proceso
 *   GET /payroll_processes/{id}/payroll_items         → Ítems (liquidaciones individuales)
 *   GET /payroll_processes/{id}/payroll_items/{item_id} → Detalle de ítem
 */

import { BukHttpClient, type BukListResponse } from '../client';
import type {
  BukPayrollProcess,
  BukPayrollItem,
  PayrollProcessFilters,
  PayrollItemFilters,
} from '../types/payroll';

export class PayrollModule {
  constructor(private readonly client: BukHttpClient) {}

  // ── Procesos ──

  /**
   * Listar procesos de liquidación.
   */
  async listProcesses(
    filters?: PayrollProcessFilters,
    page = 1,
    pageSize?: number
  ): Promise<BukListResponse<BukPayrollProcess>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.year) params.year = filters.year;
    if (filters?.month) params.month = filters.month;
    if (filters?.status) params.status = filters.status;
    if (filters?.company_id) params.company_id = filters.company_id;

    return this.client.list<BukPayrollProcess>('/payroll_processes', params, page, pageSize);
  }

  /**
   * Obtener todos los procesos (auto-paginación).
   */
  async listAllProcesses(filters?: PayrollProcessFilters): Promise<BukPayrollProcess[]> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.year) params.year = filters.year;
    if (filters?.month) params.month = filters.month;
    if (filters?.status) params.status = filters.status;
    if (filters?.company_id) params.company_id = filters.company_id;

    return this.client.listAll<BukPayrollProcess>('/payroll_processes', params);
  }

  /**
   * Detalle de un proceso de liquidación.
   */
  async getProcess(processId: number): Promise<BukPayrollProcess> {
    const response = await this.client.get<BukPayrollProcess>(`/payroll_processes/${processId}`);
    return response.data;
  }

  // ── Ítems de Liquidación ──

  /**
   * Listar ítems de liquidación de un proceso.
   */
  async listItems(
    processId: number,
    filters?: PayrollItemFilters,
    page = 1,
    pageSize?: number
  ): Promise<BukListResponse<BukPayrollItem>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.employee_id) params.employee_id = filters.employee_id;

    return this.client.list<BukPayrollItem>(
      `/payroll_processes/${processId}/payroll_items`,
      params,
      page,
      pageSize
    );
  }

  /**
   * Obtener todos los ítems de un proceso (auto-paginación).
   */
  async listAllItems(processId: number, filters?: PayrollItemFilters): Promise<BukPayrollItem[]> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.employee_id) params.employee_id = filters.employee_id;

    return this.client.listAll<BukPayrollItem>(
      `/payroll_processes/${processId}/payroll_items`,
      params
    );
  }

  /**
   * Detalle de un ítem de liquidación específico.
   */
  async getItem(processId: number, itemId: number): Promise<BukPayrollItem> {
    const response = await this.client.get<BukPayrollItem>(
      `/payroll_processes/${processId}/payroll_items/${itemId}`
    );
    return response.data;
  }

  // ── Helpers ──

  /**
   * Obtener la liquidación más reciente de un empleado.
   * Busca en los procesos del más reciente al más antiguo.
   */
  async getLatestForEmployee(employeeId: number): Promise<BukPayrollItem | null> {
    const processes = await this.listAllProcesses();
    // Ordenar por período descendente
    const sorted = processes.sort((a, b) => b.period.localeCompare(a.period));

    for (const process of sorted) {
      const items = await this.listItems(process.id, { employee_id: employeeId }, 1, 25);
      const match = items.data.find(item => item.employee_id === employeeId);
      if (match) return match;
    }

    return null;
  }

  /**
   * Obtener liquidaciones de un empleado para un rango de períodos.
   */
  async getEmployeeHistory(
    employeeId: number,
    fromPeriod?: string, // "2025-01"
    toPeriod?: string     // "2025-12"
  ): Promise<BukPayrollItem[]> {
    const allProcesses = await this.listAllProcesses();
    const filtered = allProcesses.filter(p => {
      if (fromPeriod && p.period < fromPeriod) return false;
      if (toPeriod && p.period > toPeriod) return false;
      return true;
    });

    const results: BukPayrollItem[] = [];
    for (const process of filtered) {
      const items = await this.listAllItems(process.id, { employee_id: employeeId });
      results.push(...items.filter(i => i.employee_id === employeeId));
    }

    return results.sort((a, b) => a.period.localeCompare(b.period));
  }
}
