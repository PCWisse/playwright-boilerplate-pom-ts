import { test as base, request as playwrightRequest } from '@playwright/test';

import { ApiClient } from '../api/api-client';
import { STANDARD_USER } from '../data/users';
import { env } from '../utils/env';

// `APIRequestContext` resolves relative request paths against `baseURL` using
// standard URL-merge rules: without a trailing slash, the last path segment
// (here, `/api`) is dropped instead of kept as a directory prefix. `env.apiURL`
// is normalised in `src/utils/env.ts` to always end with `/`, so it can be
// used directly here without any local workaround.

/**
 * Worker-scoped state. The login happens once per worker process and the token
 * is reused by every test that worker runs, instead of paying for a round trip
 * per test.
 */
export interface ApiWorkerFixtures {
  authToken: string;
}

/**
 * Test-scoped state. Each test gets its own `ApiClient` over a fresh
 * `APIRequestContext` that is disposed when the test ends; only the token
 * underneath it is shared across the worker.
 */
export interface ApiTestFixtures {
  api: ApiClient;
}

/**
 * Base test object for API work. `testDataTest` extends it, and
 * `src/fixtures/index.ts` merges the result into the shared `test` that specs
 * import.
 *
 * @example
 * test('lists items', async ({ api }) => {
 *   expect(await api.listItems()).toBeInstanceOf(Array);
 * });
 */
export const apiTest = base.extend<ApiTestFixtures, ApiWorkerFixtures>({
  // Worker-scoped: log in once per worker instead of once per test.
  authToken: [
    // Playwright inspects this function's source and REQUIRES the first
    // argument to be an object destructuring pattern, even when the fixture
    // needs nothing from it — `async (_fixtures, use)` fails at runtime with
    // "First argument must use the object destructuring pattern". So the empty
    // pattern is mandatory here and the lint rule has to yield, not the code.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const context = await playwrightRequest.newContext({ baseURL: env.apiURL });
      const token = await ApiClient.login(context, STANDARD_USER.username, STANDARD_USER.password);
      await use(token);
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  api: async ({ authToken }, use) => {
    const context = await playwrightRequest.newContext({ baseURL: env.apiURL });
    await use(new ApiClient(context, authToken));
    await context.dispose();
  },
});
