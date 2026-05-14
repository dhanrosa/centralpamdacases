const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: 'Falha na requisição.' }));
    throw new ApiError(data.message ?? 'Falha na requisição.', response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
