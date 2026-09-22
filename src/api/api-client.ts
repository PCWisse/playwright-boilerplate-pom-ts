import { test, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { ZodType } from 'zod';

import { sanitiseBody } from '../utils/reporting';
import { itemListSchema, itemSchema, loginResponseSchema, type Item, type ItemInput } from './schemas';

/**
 * Typed client over Playwright's APIRequestContext.
 *
 * Every response is validated against a zod schema, so a contract change fails
 * the test with the exact field path rather than surfacing later as an
 * unrelated `undefined`.
 *
 * Request paths passed to `this.request` are relative (e.g. `'items'`, never
 * `'/items'`). `APIRequestContext` resolves relative paths against `baseURL`
 * with standard URL-merge rules: a `baseURL` WITHOUT a trailing slash drops
 * its last path segment when merged, and a request path WITH a leading slash
 * resets to the origin root regardless of `baseURL`. Concretely,
 * `new URL('/items', 'http://host/api')` and `new URL('items', 'http://host/api')`
 * both resolve to `http://host/items`, silently losing `/api`. The context
 * supplied to this class's constructor and to `login` must therefore have a
 * `baseURL` that ends with `/` (see `src/fixtures/api.fixture.ts`).
 */
export class ApiClient {
  private readonly request: APIRequestContext;
  private readonly token: string;

  constructor(request: APIRequestContext, token: string) {
    this.request = request;
    this.token = token;
  }

  static async login(request: APIRequestContext, username: string, password: string): Promise<string> {
    const response = await request.post('login', { data: { username, password } });
    const body = await ApiClient.unwrap(response, loginResponseSchema, 'POST /login', 201);
    return body.token;
  }

  private get headers(): Record<string, string> {
    return { authorization: `Bearer ${this.token}` };
  }

  private static async unwrap<T>(response: APIResponse, schema: ZodType<T>, context: string, expectedStatus: number): Promise<T> {
    const raw = await response.text();

    // Best-effort: `test.info()` throws whenever no test is running, and this
    // class is reachable from places where that is true: a `globalSetup`, a
    // worker-fixture teardown, or any plain script that constructs an
    // `ApiClient`. (Worker-fixture *setup*, such as `authToken` in
    // `src/fixtures/api.fixture.ts`, does run inside the first test that asks
    // for it, so that path attaches normally.) A missing attachment must never
    // turn a passing request into a failure; the body is still included in the
    // error messages below.
    try {
      await test.info().attach(`${context} response`, {
        // Never attach a raw body: this one carries an auth token, and
        // attachments reach the blob report that CI publishes as an artifact.
        body: sanitiseBody(raw),
        contentType: 'application/json',
      });
    } catch {
      // Outside a test scope; the error is still thrown below with the body.
    }

    if (response.status() !== expectedStatus) {
      throw new Error(`${context} expected HTTP ${String(expectedStatus)} but got ${String(response.status())}.\n` + `URL: ${response.url()}\nBody: ${raw}`);
    }
    const parsed = schema.safeParse(JSON.parse(raw) as unknown);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`).join('\n');
      throw new Error(`${context} returned a body that does not match its schema:\n${issues}\nBody: ${raw}`);
    }
    return parsed.data;
  }

  async listItems(): Promise<Item[]> {
    const response = await this.request.get('items', { headers: this.headers });
    return ApiClient.unwrap(response, itemListSchema, 'GET /items', 200);
  }

  async getItem(id: string): Promise<Item> {
    const response = await this.request.get(`items/${id}`, { headers: this.headers });
    return ApiClient.unwrap(response, itemSchema, `GET /items/${id}`, 200);
  }

  async createItem(input: ItemInput): Promise<Item> {
    const response = await this.request.post('items', { headers: this.headers, data: input });
    return ApiClient.unwrap(response, itemSchema, 'POST /items', 201);
  }

  async updateItem(id: string, input: ItemInput): Promise<Item> {
    const response = await this.request.put(`items/${id}`, {
      headers: this.headers,
      data: input,
    });
    return ApiClient.unwrap(response, itemSchema, `PUT /items/${id}`, 200);
  }

  async deleteItem(id: string): Promise<void> {
    const response = await this.request.delete(`items/${id}`, { headers: this.headers });
    if (response.status() !== 204) {
      throw new Error(`DELETE /items/${id} expected HTTP 204 but got ${String(response.status())}: ${await response.text()}`);
    }
  }

  /** Escape hatch for negative tests that assert on non-2xx responses. */
  async createItemRaw(body: unknown): Promise<APIResponse> {
    return this.request.post('items', { headers: this.headers, data: body });
  }
}
