/**
 * Módulo Employees — CRUD de Colaboradores
 *
 * Endpoints:
 *   GET    /employees          → Listar colaboradores
 *   GET    /employees/{id}     → Detalle de colaborador
 *   POST   /employees          → Crear colaborador
 *   PUT    /employees/{id}     → Actualizar colaborador
 */

import { BukHttpClient, type BukListResponse } from '../client';
import type {
  BukEmployeeSummary,
  BukEmployeeDetail,
  BukCreateEmployee,
  BukUpdateEmployee,
  EmployeeListFilters,
} from '../types/employees';

export class EmployeesModule {
  constructor(private readonly client: BukHttpClient) {}

  /**
   * Listar colaboradores con paginación.
   */
  async list(
    filters?: EmployeeListFilters,
    page = 1,
    pageSize?: number
  ): Promise<BukListResponse<BukEmployeeSummary>> {
    const params: Record<string, string | number | boolean | undefined> = {};

    if (filters?.status && filters.status !== 'all') {
      params.status = filters.status;
    }
    if (filters?.company_id) params.company_id = filters.company_id;
    if (filters?.department_id) params.department_id = filters.department_id;
    if (filters?.cost_center_id) params.cost_center_id = filters.cost_center_id;
    if (filters?.location_id) params.location_id = filters.location_id;
    if (filters?.search) params.search = filters.search;

    return this.client.list<BukEmployeeSummary>('/employees', params, page, pageSize);
  }

  /**
   * Obtener todos los colaboradores (auto-paginación).
   */
  async listAll(filters?: EmployeeListFilters): Promise<BukEmployeeSummary[]> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.status && filters.status !== 'all') params.status = filters.status;
    if (filters?.company_id) params.company_id = filters.company_id;
    if (filters?.department_id) params.department_id = filters.department_id;
    if (filters?.cost_center_id) params.cost_center_id = filters.cost_center_id;
    if (filters?.location_id) params.location_id = filters.location_id;
    if (filters?.search) params.search = filters.search;

    return this.client.listAll<BukEmployeeSummary>('/employees', params);
  }

  /**
   * Detalle de un colaborador por ID.
   */
  async get(id: number): Promise<BukEmployeeDetail> {
    const response = await this.client.get<BukEmployeeDetail>(`/employees/${id}`);
    return response.data;
  }

  /**
   * Crear un nuevo colaborador.
   */
  async create(data: BukCreateEmployee): Promise<BukEmployeeDetail> {
    return this.client.post<BukEmployeeDetail>('/employees', data as unknown as Record<string, unknown>);
  }

  /**
   * Actualizar un colaborador existente.
   */
  async update(id: number, data: BukUpdateEmployee): Promise<BukEmployeeDetail> {
    return this.client.put<BukEmployeeDetail>(`/employees/${id}`, data as unknown as Record<string, unknown>);
  }

  /**
   * Buscar colaborador por RUT.
   * Recorre la lista hasta encontrar match exacto.
   */
  async findByRut(rut: string): Promise<BukEmployeeSummary | null> {
    // Normalizar RUT (sin puntos ni guión)
    const normalizedRut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();

    const employees = await this.listAll({ search: rut });
    return employees.find(e => {
      const empRut = e.rut?.replace(/\./g, '').replace(/-/g, '').toUpperCase();
      return empRut === normalizedRut;
    }) || null;
  }

  /**
   * Obtener colaboradores activos solamente.
   */
  async listActive(page = 1, pageSize?: number): Promise<BukListResponse<BukEmployeeSummary>> {
    return this.list({}, page, pageSize);
  }

  /**
   * Contar colaboradores por estado.
   */
  async count(status?: 'active' | 'inactive'): Promise<number> {
    const response = await this.list(
      status ? { status } : undefined,
      1,
      25 // page_size mínimo para solo obtener el count
    );
    return response.pagination.count;
  }
}
