/**
 * Módulo Organization — Estructura organizacional
 *
 * Endpoints:
 *   GET /companies         → Empresas (multi-empresa)
 *   GET /departments       → Departamentos / Áreas
 *   GET /cost_centers      → Centros de costo
 *   GET /locations          → Ubicaciones / Sucursales
 *   GET /roles              → Cargos
 *   GET /afps               → AFPs disponibles
 *   GET /health_plans       → Planes de salud (Fonasa/Isapres)
 */

import { BukHttpClient, type BukListResponse } from '../client';
import type {
  BukCompany,
  BukDepartment,
  BukCostCenter,
  BukLocation,
  BukRole,
  BukAfp,
  BukHealthPlan,
} from '../types/supplementary';

export class OrganizationModule {
  constructor(private readonly client: BukHttpClient) {}

  // ── Empresas ──

  async listCompanies(page = 1, pageSize?: number): Promise<BukListResponse<BukCompany>> {
    return this.client.list<BukCompany>('/companies', undefined, page, pageSize);
  }

  async listAllCompanies(): Promise<BukCompany[]> {
    return this.client.listAll<BukCompany>('/companies');
  }

  // ── Departamentos ──

  async listDepartments(page = 1, pageSize?: number): Promise<BukListResponse<BukDepartment>> {
    return this.client.list<BukDepartment>('/departments', undefined, page, pageSize);
  }

  async listAllDepartments(): Promise<BukDepartment[]> {
    return this.client.listAll<BukDepartment>('/departments');
  }

  // ── Centros de Costo ──

  async listCostCenters(page = 1, pageSize?: number): Promise<BukListResponse<BukCostCenter>> {
    return this.client.list<BukCostCenter>('/cost_centers', undefined, page, pageSize);
  }

  async listAllCostCenters(): Promise<BukCostCenter[]> {
    return this.client.listAll<BukCostCenter>('/cost_centers');
  }

  // ── Ubicaciones ──

  async listLocations(page = 1, pageSize?: number): Promise<BukListResponse<BukLocation>> {
    return this.client.list<BukLocation>('/locations', undefined, page, pageSize);
  }

  async listAllLocations(): Promise<BukLocation[]> {
    return this.client.listAll<BukLocation>('/locations');
  }

  // ── Cargos ──

  async listRoles(page = 1, pageSize?: number): Promise<BukListResponse<BukRole>> {
    return this.client.list<BukRole>('/roles', undefined, page, pageSize);
  }

  async listAllRoles(): Promise<BukRole[]> {
    return this.client.listAll<BukRole>('/roles');
  }

  // ── AFP ──

  async listAfps(): Promise<BukAfp[]> {
    return this.client.listAll<BukAfp>('/afps');
  }

  // ── Planes de Salud ──

  async listHealthPlans(): Promise<BukHealthPlan[]> {
    return this.client.listAll<BukHealthPlan>('/health_plans');
  }
}
