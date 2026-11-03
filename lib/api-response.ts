import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { API_ERROR_CODE, ApiErrorCode } from './constants';
import { logger } from './logger';
import { ApiError } from './types';
import { isApiErrorShape } from './type-guards';
import { formatZodErrors } from './utils';

export function ok<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

export function fail(
  code: ApiErrorCode,
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
    return fail(
      API_ERROR_CODE.VALIDATION_ERROR,
      'Invalid request payload',
      400,
      formatZodErrors(error)
    );
  }

  if (isApiErrorShape(error)) {
    const statusValue = 'status' in error && typeof error.status === 'number' ? error.status : 500;
    return NextResponse.json(
      {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined && { details: error.details }),
      },
      { status: statusValue }
    );
  }

  logger.error('Unhandled error caught in normalizeError', error);
  return fail(
    API_ERROR_CODE.INTERNAL_SERVER_ERROR,
    'An unexpected internal server error occurred.',
    500
  );
}

export function parseExternalError(error: unknown, fallbackMessage: string): ApiError {
  let parsedDetails: unknown = undefined;

  if (typeof error === 'object' && error !== null) {
    const directError = 'error' in error ? error.error : undefined;
    const externalMessage =
      (typeof directError === 'object' && directError !== null && 'message' in directError
        ? directError.message
        : undefined) ||
      ('message' in error ? error.message : undefined) ||
      ('error_description' in error ? error.error_description : undefined);

    if (typeof externalMessage === 'string') {
      parsedDetails = { externalMessage };
    }
  }

  return {
    code: API_ERROR_CODE.EXTERNAL_SERVICE_ERROR,
    message: fallbackMessage,
    details: parsedDetails,
  };
}
