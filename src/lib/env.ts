import { config } from 'dotenv';
import { parseEnvRecord, type ParsedEnv } from './env-schema.js';

config();

let parsedEnv: ParsedEnv;

try {
  parsedEnv = parseEnvRecord(process.env ?? {});
} catch (error) {
  /* eslint-disable no-console */
  console.error('Invalid environment configuration:', error);
  /* eslint-enable no-console */
  throw new Error('Unable to start. See environment validation errors above.');
}

export type AppEnv = ParsedEnv;

export const env: AppEnv = parsedEnv;

export function requireEnv<K extends keyof AppEnv>(key: K): AppEnv[K] {
  const value = env[key];
  if (typeof value === 'string' && value.length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
