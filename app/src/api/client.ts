import { setToken, token } from '../state/session';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const BASE: string = (import.meta.env?.VITE_API_BASE as string | undefined) ?? '';

export async function apiFetch<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const headers: Record<string, string> = { ...(rest.headers as Record<string, string> | undefined) };
  if (token.value) headers.Authorization = `Bearer ${token.value}`;
  let body = rest.body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  const res = await fetch(BASE + path, { ...rest, headers, body });
  if (!res.ok) {
    let message = res.statusText || `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data && data.error) message = data.error;
    } catch { /* corpo non JSON */ }
    if (res.status === 401) await setToken(null);
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function login(password: string): Promise<void> {
  const data = await apiFetch<{ token: string; expiresAt: number }>('/api/login', { method: 'POST', json: { password } });
  await setToken(data.token);
}
