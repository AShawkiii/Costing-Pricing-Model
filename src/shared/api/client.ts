/**
 * HTTP client for the Finance Support API.
 *
 * One place that knows how to call the backend, so every module gets the same
 * error handling: a failed request always arrives as an ApiError with a
 * message worth showing the user, never a raw fetch rejection.
 */

import type { ApiErrorBody } from '../contracts/products';

/** False in the standalone single-file build, which runs without a server. */
export const API_ENABLED = __API_ENABLED__;

const BASE_URL = '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorBody['error']['code'] | 'offline';
  readonly details: string[];

  constructor(message: string, status: number, code: ApiError['code'], details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the server could not be reached at all. */
  get isOffline(): boolean {
    return this.code === 'offline';
  }
}

const OFFLINE_MESSAGE =
  'The Finance Support server is not reachable. Start it with `npm start` (or `npm run dev`) and try again.';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_ENABLED) {
    throw new ApiError(
      'This standalone copy of Finance Support runs without a server, so saved products are not available here. Run the app with `npm start` to use the Product Library.',
      0,
      'offline',
    );
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0, 'offline');
  }

  if (response.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ApiError(
      error?.message ?? `The server returned ${response.status}.`,
      response.status,
      error?.code ?? 'server_error',
      error?.details ?? [],
    );
  }

  return body as T;
}

/** Turns anything thrown by a request into a message fit for the UI. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.details.length > 0 ? `${error.message} ${error.details.join(' ')}` : error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}
