import { z } from 'zod';

export const configSchema = z.object({
  DATABASE_URL: z.string().default('./data/credittimeline.db'),
  INGEST_API_KEY: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ALLOW_ORIGIN: z.string().default(''),
  AUTO_MIGRATE: z
    .string()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
});

export type AppConfig = z.infer<typeof configSchema>;

/**
 * Parse and validate a raw env object into a typed AppConfig.
 * Throws ZodError with detailed messages if validation fails.
 */
export function parseConfig(env: Record<string, string | undefined>): AppConfig {
  return configSchema.parse(env);
}
