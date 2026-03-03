/**
 * UTILIDADES DE FETCH
 */

export async function fetchWithAuth(
  url: string, 
  options: RequestInit = {},
  token?: string
): Promise<Response> {
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

export async function safeJsonParse<T>(text: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateId(): string {
  return crypto.randomUUID();
}

import crypto from 'crypto';

export function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}
