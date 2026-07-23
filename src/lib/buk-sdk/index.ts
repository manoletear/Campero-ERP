/**
 * BUK SDK para Chile
 *
 * SDK tipado para interactuar con la API de Buk.
 * Uso exclusivo en server-side (API routes de Next.js).
 *
 * @example
 * ```ts
 * import { buk } from '@/lib/buk-sdk';
 *
 * // Listar empleados activos
 * const employees = await buk.employees.listActive();
 *
 * // Detalle de un empleado
 * const emp = await buk.employees.get(123);
 *
 * // Liquidaciones de un proceso
 * const items = await buk.payroll.listAllItems(456);
 *
 * // Vacaciones de un empleado
 * const vacations = await buk.absences.listAllVacations(123);
 *
 * // Estructura organizacional
 * const departments = await buk.organization.listAllDepartments();
 * ```
 */

import { BukHttpClient, getDefaultClient, type BukClientConfig } from './client';
import { EmployeesModule } from './modules/employees';
import { PayrollModule } from './modules/payroll';
import { AbsencesModule } from './modules/absences';
import { OrganizationModule } from './modules/organization';
import { OvertimeModule } from './modules/overtime';
import { DocumentsModule } from './modules/documents';

export class BukSDK {
  readonly employees: EmployeesModule;
  readonly payroll: PayrollModule;
  readonly absences: AbsencesModule;
  readonly organization: OrganizationModule;
  readonly overtime: OvertimeModule;
  readonly documents: DocumentsModule;

  private readonly client: BukHttpClient;

  constructor(config?: BukClientConfig) {
    this.client = config ? new BukHttpClient(config) : getDefaultClient();
    this.employees = new EmployeesModule(this.client);
    this.payroll = new PayrollModule(this.client);
    this.absences = new AbsencesModule(this.client);
    this.organization = new OrganizationModule(this.client);
    this.overtime = new OvertimeModule(this.client);
    this.documents = new DocumentsModule(this.client);
  }

  /**
   * Health check — verifica conectividad con la API.
   * Hace un request liviano (page_size=1) a /employees.
   */
  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.client.list('/employees', undefined, 1, 25);
      return { ok: true, latencyMs: Date.now() - start };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ── Singleton para uso en API routes ──

let _instance: BukSDK | null = null;

/**
 * Singleton del SDK configurado desde env vars.
 * Usar en API routes de Next.js.
 */
export function getBukSDK(): BukSDK {
  if (!_instance) {
    _instance = new BukSDK();
  }
  return _instance;
}

/** Alias corto */
export const buk = new Proxy({} as BukSDK, {
  get(_, prop) {
    return (getBukSDK() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ── Re-exports ──

export { BukSDK as default };
export { BukHttpClient, BukApiError, BukConfigError } from './client';
export type { BukClientConfig, BukListResponse, BukSingleResponse, BukPagination } from './client';
export * from './types';
