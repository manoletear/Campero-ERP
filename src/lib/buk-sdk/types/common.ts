/**
 * Tipos comunes compartidos por todos los módulos del SDK.
 */

// Re-export pagination and response types from client
export type { BukPagination, BukListResponse, BukSingleResponse } from '../client';

/** Filtros de fecha comunes en endpoints de Buk */
export interface DateRangeFilter {
  /** Fecha inicio formato YYYY-MM-DD */
  start_date?: string;
  /** Fecha fin formato YYYY-MM-DD */
  end_date?: string;
}

/** Estado genérico activo/inactivo */
export type ActiveStatus = 'active' | 'inactive';

/** Respuesta de creación/actualización genérica */
export interface MutationResponse {
  id: number;
  message?: string;
}
