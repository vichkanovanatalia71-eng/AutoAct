// Platform-agnostic API client
// Web: uses localStorage for token
// Mobile: uses SecureStore for token (passed via configure)

export interface ApiClientConfig {
  baseUrl: string;
  getToken: () => Promise<string | null> | string | null;
  setToken: (token: string | null) => Promise<void> | void;
  onUnauthorized?: () => void;
}

let config: ApiClientConfig = {
  baseUrl: "http://localhost:3001",
  getToken: () => null,
  setToken: () => {},
};

export function configureApiClient(cfg: Partial<ApiClientConfig>) {
  config = { ...config, ...cfg };
}

export function getApiConfig() {
  return config;
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = await config.getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    config.onUnauthorized?.();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `API error: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
