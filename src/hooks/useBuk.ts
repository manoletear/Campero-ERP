'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PoppinsEmployee, PoppinsLiquidacion, PoppinsVacacion, BukBenefit } from '@/types/buk';

interface ApiResponse<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface MutationResult<T> {
  mutate: (body: Record<string, unknown>) => Promise<T | null>;
  loading: boolean;
  error: string | null;
}

function useApi<T>(url: string, autoFetch = true): ApiResponse<T> {
  const [data, setData] = useState<T>([] as unknown as T);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (autoFetch) fetchData();
  }, [autoFetch, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ── Mutation hook for POST/PUT/DELETE ──

function useMutation<T>(url: string, method: 'POST' | 'PUT' | 'DELETE' = 'POST'): MutationResult<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (body: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return (json.data as T) || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [url, method]
  );

  return { mutate, loading, error };
}

// ── Existing hooks ──

export function useEmployees() {
  return useApi<PoppinsEmployee[]>('/api/buk/employees');
}

export function useEmployee(id: number | null) {
  return useApi<PoppinsEmployee | null>(
    id ? `/api/buk/employees/${id}` : '',
    id !== null
  );
}

export function usePayroll(employeeId?: number) {
  const url = employeeId
    ? `/api/buk/payroll?employeeId=${employeeId}`
    : '/api/buk/payroll';
  return useApi<PoppinsLiquidacion[]>(url);
}

export function useAbsences(employeeId?: number) {
  const url = employeeId
    ? `/api/buk/absences?employeeId=${employeeId}`
    : '/api/buk/absences';
  return useApi<PoppinsVacacion[]>(url);
}

export function useBenefits() {
  return useApi<BukBenefit[]>('/api/buk/benefits');
}

// ── New hooks ──

export function useVacations(employeeId: number | null) {
  return useApi<unknown[]>(
    employeeId ? `/api/buk/vacations?employeeId=${employeeId}` : '',
    employeeId !== null
  );
}

export function useOvertime(filters?: {
  employeeId?: number;
  startDate?: string;
  endDate?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.employeeId) params.set('employeeId', String(filters.employeeId));
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString();
  return useApi<unknown[]>(`/api/buk/overtime${qs ? `?${qs}` : ''}`);
}

export function useOrganization(
  type: 'departments' | 'cost_centers' | 'roles' | 'companies' | 'locations'
) {
  return useApi<unknown[]>(`/api/buk/organization?type=${type}`);
}

export function useCreateVacation() {
  return useMutation<unknown>('/api/buk/vacations');
}

export function useCreateOvertime() {
  return useMutation<unknown>('/api/buk/overtime');
}

export function useCreateAbsence() {
  return useMutation<unknown>('/api/buk/absences', 'POST');
}

export function useHealthCheck() {
  return useApi<{ ok: boolean; latencyMs: number; error?: string }>(
    '/api/buk/health-check',
    false
  );
}
