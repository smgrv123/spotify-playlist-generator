import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError } from './types';
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
  const payload: ApiError = {
    code,
    message,
  };

  if (details) {
    payload.details = details;
  }

  // Optional: For 429 errors, we could map a retryAfterSeconds property if provided in details.
  // For now, adhering strictly to the failure signature requested.

  return NextResponse.json(payload, { status });
}

export function normalizeError(error: unknown): NextResponse<ApiError> {
  if (error instanceof ZodError) {
    return fail('VALIDATION_ERROR', 'Invalid request payload', 400, formatZodErrors(error));
  }

  // Handle known ApiError-like objects if they got thrown
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    const err = error as Partial<ApiError>;
    return fail(
      err.code || 'UNKNOWN_ERROR',
      err.message || 'An unexpected error occurred',
      'status' in error && typeof (error as Record<string, unknown>).status === 'number'
        ? ((error as Record<string, unknown>).status as number)
        : 500,
      err.details
    );
  }

  // Fallback for raw errors
  console.error('📛 Unhandled API Error caught in normalizeError:', error);
  // Do NOT leak raw stack traces or unknown error messages to the client
  return fail('INTERNAL_SERVER_ERROR', 'An unexpected internal server error occurred.', 500);
}

export function parseExternalError(error: unknown, fallbackMessage: string): ApiError {
  // If the external service provides an error payload, parse it carefully.
  // We do not want to blindly stringify as it might contain upstream secrets.
  let parsedDetails: unknown = undefined;

  if (typeof error === 'object' && error !== null) {
    // Attempt to extract safe fields from common error shape (e.g. Axios or fetch)
    const err = error as Record<string, unknown>;

    // For Spotify/OpenAI typically they have error.message or error.error.message
    const responseData = (err?.response as Record<string, unknown>)?.data as Record<
      string,
      unknown
    >;
    const errorData = responseData?.error as Record<string, unknown>;
    const externalMessage = errorData?.message || errorData || err?.message;

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
