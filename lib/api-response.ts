import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';
import { ApiError } from './types';
import { isApiErrorShape } from './type-guards';
import { formatZodErrors } from './utils';

export function ok<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

export function fail(
  code: string,
  message: string,
  status: number = 500,
  details?: unknown
): NextResponse<ApiError> {
  const payload: ApiError = { code, message };

  if (details !== undefined) {
    payload.details = details;
  }

  return NextResponse.json(payload, { status });
}

export function normalizeError(error: unknown): NextResponse<ApiError> {
  if (error instanceof ZodError) {
    return fail('VALIDATION_ERROR', 'Invalid request payload', 400, formatZodErrors(error));
  }

  if (isApiErrorShape(error)) {
    const statusValue =
      typeof (error as Record<string, unknown>).status === 'number'
        ? ((error as Record<string, unknown>).status as number)
        : 500;
    return fail(error.code, error.message, statusValue, error.details);
  }

  logger.error('Unhandled error caught in normalizeError', error);
  return fail('INTERNAL_SERVER_ERROR', 'An unexpected internal server error occurred.', 500);
}

export function parseExternalError(error: unknown, fallbackMessage: string): ApiError {
  let parsedDetails: unknown = undefined;

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    const directError = err?.error as Record<string, unknown> | string | undefined;
    const externalMessage =
      (typeof directError === 'object' && directError !== null ? directError.message : undefined) ||
      err?.message ||
      err?.error_description;

    if (typeof externalMessage === 'string') {
      parsedDetails = { externalMessage };
    }
  }

  return {
    code: 'EXTERNAL_SERVICE_ERROR',
    message: fallbackMessage,
    details: parsedDetails,
  };
}
