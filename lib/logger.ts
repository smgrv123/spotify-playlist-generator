/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Simple structured logger for API routes.
 * Ensures sensitive data like access tokens or secrets are not leaked to stdout.
 */

const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'Authorization',
  'authorization',
  'access_token',
  'refresh_token',
  'client_secret',
  'cookie',
  'sp_state',
]);

function redactItem(key: string, value: any): any {
  if (SENSITIVE_KEYS.has(key)) {
    return REDACTED;
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map((v) => redactObject(v));
    }
    return redactObject(value);
  }
  return value;
}

function redactObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;

  const redactedObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    redactedObj[key] = redactItem(key, value);
  }
  return redactedObj;
}

export const logger = {
  info: (message: string, meta: Record<string, any> = {}) => {
    console.log(
      JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        message,
        ...redactObject(meta),
      })
    );
  },
  error: (message: string, error?: any, meta: Record<string, any> = {}) => {
    const errorData =
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : error;

    console.error(
      JSON.stringify({
        level: 'ERROR',
        timestamp: new Date().toISOString(),
        message,
        error: errorData,
        ...redactObject(meta),
      })
    );
  },
  warn: (message: string, meta: Record<string, any> = {}) => {
    console.warn(
      JSON.stringify({
        level: 'WARN',
        timestamp: new Date().toISOString(),
        message,
        ...redactObject(meta),
      })
    );
  },
};
