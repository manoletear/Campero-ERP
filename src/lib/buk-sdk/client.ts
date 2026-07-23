/**
 * BUK API Client — Server-side only
 *
 * Cliente HTTP base para la API de Buk Chile.
 * Maneja autenticación (auth_token header), paginación automática,
 * rate limiting y error handling.
 *
 * Ref: https://documenter.getpostman.com/view/1587820/SzYW3LFa
 */

// ── Types ──

export interface BukPagination {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
}

export interface BukListResponse<T> {
  data: T[];
  pagination: BukPagination;
}

export interface BukSingleResponse<T> {
  data: T;
}

export interface BukClientConfig {
  apiToken: string;
  baseUrl?: string;
  /** Default page_size for list requests (25-100) */
  defaultPageSize?: number;
  /** Timeout in ms (default: 30000) */
  timeout?: number;
}

export interface BukRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  params?: Record<string, string | number | boolean | undefined>;
  /** Override default timeout for this request */
  timeout?: number;
}

// ── Error Classes ──

export class BukApiError extends Error {
  status: number;
  endpoint: string;
  responseBody?: string;

  constructor(message: string, status: number, endpoint: string, responseBody?: string) {
    super(message);
    this.name = 'BukApiError';
    this.status = status;
    this.endpoint = endpoint;
    this.responseBody = responseBody;
  }

  get isNotFound() { return this.status === 404; }
  get isUnauthorized() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isRateLimited() { return this.status === 429; }
  get isServerError() { return this.status >= 500; }
}

export class BukConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BukConfigError';
  }
}

// ── Client ──

export class BukHttpClient {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  readonly defaultPageSize: number;
  private readonly timeout: number;

  constructor(config: BukClientConfig) {
    if (!config.apiToken) {
      throw new BukConfigError('BUK API token is required. Set BUK_API_TOKEN env var.');
    }

    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl || 'https://app.buk.cl/api/v1/chile').replace(/\/$/, '');
    this.defaultPageSize = Math.min(Math.max(config.defaultPageSize || 50, 25), 100);
    this.timeout = config.timeout || 30000;
  }

  /**
   * Single request to a BUK endpoint.
   */
  async request<T>(
    endpoint: string,
    options: BukRequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, params, timeout } = options;

    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout || this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          'auth_token': this.apiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new BukApiError(
          `BUK API ${method} ${endpoint}: ${response.status} ${response.statusText}`,
          response.status,
          endpoint,
          errorText
        );
      }

      // Some DELETE endpoints return 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof BukApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new BukApiError(
          `BUK API timeout after ${timeout || this.timeout}ms: ${method} ${endpoint}`,
          408,
          endpoint
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * GET a single resource.
   */
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<BukSingleResponse<T>> {
    return this.request<BukSingleResponse<T>>(endpoint, { params });
  }

  /**
   * GET a paginated list.
   */
  async list<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
    page = 1,
    pageSize?: number
  ): Promise<BukListResponse<T>> {
    return this.request<BukListResponse<T>>(endpoint, {
      params: {
        ...params,
        page: page,
        page_size: pageSize || this.defaultPageSize,
      },
    });
  }

  /**
   * GET all pages of a paginated endpoint.
   * Automatically follows pagination until all results are fetched.
   */
  async listAll<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
    pageSize?: number
  ): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await this.list<T>(endpoint, params, page, pageSize);
      allItems.push(...response.data);
      totalPages = response.pagination.total_pages;
      page++;
    } while (page <= totalPages);

    return allItems;
  }

  /**
   * POST to create a resource.
   */
  async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  /**
   * PUT to update a resource.
   */
  async put<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  /**
   * DELETE a resource.
   */
  async delete(endpoint: string): Promise<void> {
    await this.request(endpoint, { method: 'DELETE' });
  }
}

// ── Factory ──

let _defaultClient: BukHttpClient | null = null;

/**
 * Returns a singleton BukHttpClient configured from env vars.
 */
export function getDefaultClient(): BukHttpClient {
  if (!_defaultClient) {
    _defaultClient = new BukHttpClient({
      apiToken: process.env.BUK_API_TOKEN || '',
      baseUrl: process.env.BUK_API_BASE_URL || 'https://app.buk.cl/api/v1/chile',
      defaultPageSize: Number(process.env.BUK_PAGE_SIZE) || 50,
    });
  }
  return _defaultClient;
}
