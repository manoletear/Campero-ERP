/**
 * Módulo Documents — Documentos de empleados
 *
 * Endpoints:
 *   GET /employees/{id}/documents     → Documentos de un empleado
 *   GET /documents                    → Todos los documentos
 */

import { BukHttpClient, type BukListResponse } from '../client';
import type { BukDocument } from '../types/supplementary';

export class DocumentsModule {
  constructor(private readonly client: BukHttpClient) {}

  /**
   * Listar documentos de un empleado.
   */
  async listByEmployee(
    employeeId: number,
    page = 1,
    pageSize?: number
  ): Promise<BukListResponse<BukDocument>> {
    return this.client.list<BukDocument>(
      `/employees/${employeeId}/documents`,
      undefined,
      page,
      pageSize
    );
  }

  /**
   * Todos los documentos de un empleado.
   */
  async listAllByEmployee(employeeId: number): Promise<BukDocument[]> {
    return this.client.listAll<BukDocument>(`/employees/${employeeId}/documents`);
  }

  /**
   * Listar todos los documentos del sistema.
   */
  async list(
    filters?: { document_type?: string },
    page = 1,
    pageSize?: number
  ): Promise<BukListResponse<BukDocument>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.document_type) params.document_type = filters.document_type;

    return this.client.list<BukDocument>('/documents', params, page, pageSize);
  }
}
