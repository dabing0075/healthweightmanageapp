// 通用 API 请求工具 + 数值安全格式化工具

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

// 安全格式化：非有限值返回空字符串
export function safeToFixed(value: number | string | null | undefined, digits = 1): string {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(digits);
}

// 安全数字：非有限值返回 0
export function safeNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export const API_BASE = (
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE ||
  'http://localhost:9091'
).replace(/\/$/, '');

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function setOnUnauthorized(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

export interface ApiResponse<T = any> {
  code: number;
  msg?: string;
  data?: T;
}

export async function apiFetch<T = any>(
  path: string,
  options: { method?: string; body?: any; headers?: Record<string, string> } = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {} } = options;
  const finalHeaders: Record<string, string> = { ...headers };
  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (authToken) {
    finalHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    onUnauthorized?.();
  }

  return (await res.json()) as ApiResponse<T>;
}
