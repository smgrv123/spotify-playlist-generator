import 'server-only';
import { z } from 'zod';
import { formatZodErrors } from './utils';

const envSchema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1, 'SPOTIFY_CLIENT_ID is required'),
  SPOTIFY_CLIENT_SECRET: z.string().min(1, 'SPOTIFY_CLIENT_SECRET is required'),
  SPOTIFY_REDIRECT_URI: z
    .url('SPOTIFY_REDIRECT_URI must be a valid URL')
    .default('http://localhost:3000/api/auth/callback'),
  SPOTIFY_SCOPES: z.string().min(1, 'SPOTIFY_SCOPES is required'),
  APP_BASE_URL: z.url('APP_BASE_URL must be a valid URL'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
});

export function parseEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', formatZodErrors(parsed.error));
    throw new Error('Invalid environment variables. Check server logs for details.');
  }

  return parsed.data;
}

export const env = parseEnv();
