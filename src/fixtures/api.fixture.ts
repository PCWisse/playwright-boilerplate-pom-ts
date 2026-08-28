import { test as base, request as playwrightRequest } from '@playwright/test';

import { ApiClient } from '../api/api-client';
import { STANDARD_USER } from '../data/users';
import { env } from '../utils/env';

// `APIRequestContext` resolves relative request paths against `baseURL` using
// standard URL-merge rules: without a trailing slash, the last path segment
// (here, `/api`) is dropped instead of kept as a directory prefix. `env.apiURL`
// is normalised in `src/utils/env.ts` to always end with `/`, so it can be
// used directly here without any local workaround.

export interface ApiWorkerFixtures {
  authToken: string;
}

export interface ApiTestFixtures {
  api: ApiClient;
}

export const apiTest = base.extend<ApiTestFixtures, ApiWorkerFixtures>({
  // Worker-scoped: log in once per worker instead of once per test.
  authToken: [
    // eslint-disable-next-line no-empty-pattern -- Playwright fixture signature requires the destructured first argument even when unused.
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
