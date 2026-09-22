import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  BASE_URL: z.url().default('http://127.0.0.1:4173'),
  API_URL: z.url().default('http://127.0.0.1:4173/api'),
  DEMO_PORT: z.coerce.number().int().positive().default(4173),
  TEST_USERNAME: z.string().min(1).default('standard_user'),
  TEST_PASSWORD: z.string().min(1).default('secret_sauce'),
  TICKET_BASE_URL: z.url().default('https://example.invalid/browse/'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration. Copy .env.example to .env and fix:\n${issues}`);
}

/**
 * Validated, typed configuration, parsed once when this module is first
 * imported — which `playwright.config.ts` does. A missing or malformed variable
 * therefore throws while the config is loading, before any test runs, instead
 * of reappearing as a baffling failure in the middle of a suite.
 *
 * Every variable has a default pointing at the bundled demo app, so the
 * template runs with no `.env` at all. Copy `.env.example` and override only
 * what your project genuinely differs on.
 */
export const env = {
  baseURL: parsed.data.BASE_URL,
  // Playwright's `APIRequestContext` (and `new URL(path, base)`, which it
  // uses internally) resolves relative request paths against `baseURL` with
  // standard URL-merge rules: a base WITHOUT a trailing slash drops its last
  // path segment instead of treating it as a directory. `API_URL` normally
  // ends in `/api`, so an un-normalised base would silently turn
  // `new URL('items', 'http://host/api')` into `http://host/items`, dropping
  // `/api` and 404ing. Normalising here — once, at the source — means every
  // consumer (the `api` Playwright project, `api.fixture.ts`, anything a
  // template user copies) gets a safe value for free. Do not remove this.
  apiURL: parsed.data.API_URL.endsWith('/') ? parsed.data.API_URL : `${parsed.data.API_URL}/`,
  demoPort: parsed.data.DEMO_PORT,
  username: parsed.data.TEST_USERNAME,
  password: parsed.data.TEST_PASSWORD,
  ticketBaseUrl: parsed.data.TICKET_BASE_URL,
} as const;
