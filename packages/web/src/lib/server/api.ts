import { json } from '@sveltejs/kit';

// --- Error codes ---

export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  DUPLICATE_IMPORT: 'DUPLICATE_IMPORT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_READY: 'NOT_READY',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// --- Response types ---

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  path?: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

// --- Default status codes per error code ---

const defaultStatuses: Record<string, number> = {
  VALIDATION_FAILED: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  DUPLICATE_IMPORT: 409,
  INTERNAL_ERROR: 500,
  RATE_LIMITED: 429,
  NOT_READY: 503,
};

// --- Helper functions ---

export function apiSuccess<T>(
  data: T,
  options?: { status?: number; meta?: Record<string, unknown> },
) {
  const body: ApiSuccessResponse<T> = { data };
  if (options?.meta) {
    body.meta = options.meta;
  }
  return json(body, { status: options?.status ?? 200 });
}

export function apiError(
  code: ErrorCode,
  message: string,
  options?: { status?: number; details?: ApiErrorDetail[] },
) {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(options?.details ? { details: options.details } : {}),
    },
  };
  return json(body, { status: options?.status ?? defaultStatuses[code] ?? 500 });
}
