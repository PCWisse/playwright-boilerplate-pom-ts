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
  const issues = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(
    `Invalid environment configuration. Copy .env.example to .env and fix:\n${issues}`,
  );
}

export const env = {
  baseURL: parsed.data.BASE_URL,
  apiURL: parsed.data.API_URL,
  demoPort: parsed.data.DEMO_PORT,
  username: parsed.data.TEST_USERNAME,
  password: parsed.data.TEST_PASSWORD,
  ticketBaseUrl: parsed.data.TICKET_BASE_URL,
} as const;
