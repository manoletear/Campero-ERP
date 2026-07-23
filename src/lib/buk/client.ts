/**
 * BUK API Client — Server-side only
 * Centraliza todas las llamadas a la API de BUK.
 * Se usa SOLO en API routes de Next.js (server-side), nunca en el browser.
 */

const BUK_API_BASE_URL = process.env.BUK_API_BASE_URL || 'https://app.buk.cl/api/v1';
const BUK_API_TOKEN = process.env.BUK_API_TOKEN || '';

interface BukRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}

interface BukApiResponse<T> {
  data: T;
  pagination?: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

class BukApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'BukApiError';
    this.status = status;
  }
}

async function bukFetch<T>(
  endpoint: string,
  options: BukRequestOptions = {}
): Promise<BukApiResponse<T>> {
  const { method = 'GET', body, params } = options;

  const url = new URL(`${BUK_API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const headers: HeadersInit = {
    'Authorization': `Bearer ${BUK_API_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new BukApiError(
      `BUK API error: ${response.status} - ${errorText}`,
      response.status
    );
  }

  return response.json();
}

// ── Employees ──

export async function getEmployees(page = 1, perPage = 50) {
  return bukFetch<unknown[]>('/employees', {
    params: { page: String(page), per_page: String(perPage) },
  });
}

export async function getEmployee(id: number) {
  return bukFetch<unknown>(`/employees/${id}`);
}

export async function createEmployee(data: Record<string, unknown>) {
  return bukFetch<unknown>('/employees', { method: 'POST', body: data });
}

export async function updateEmployee(id: number, data: Record<string, unknown>) {
  return bukFetch<unknown>(`/employees/${id}`, { method: 'PUT', body: data });
}

// ── Payroll ──

export async function getPayrollProcesses(page = 1) {
  return bukFetch<unknown[]>('/payroll_processes', {
    params: { page: String(page) },
  });
}

export async function getPayrollItems(processId: number) {
  return bukFetch<unknown[]>(`/payroll_processes/${processId}/payroll_items`);
}

// ── Absences ──

export async function getAbsenceRequests(page = 1) {
  return bukFetch<unknown[]>('/absence_requests', {
    params: { page: String(page) },
  });
}

export async function createAbsenceRequest(data: Record<string, unknown>) {
  return bukFetch<unknown>('/absence_requests', { method: 'POST', body: data });
}

export async function updateAbsenceRequest(id: number, data: Record<string, unknown>) {
  return bukFetch<unknown>(`/absence_requests/${id}`, { method: 'PUT', body: data });
}

// ── Benefits ──

export async function getBenefits() {
  return bukFetch<unknown[]>('/benefits');
}

export async function getEmployeeBenefits() {
  return bukFetch<unknown[]>('/employee_benefits');
}

export { BukApiError };
