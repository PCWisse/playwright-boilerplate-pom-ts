import { expect, mergeTests } from '@playwright/test';

import { a11yTest } from './a11y.fixture';
import { pomTest } from './pom.fixture';
import { testDataTest } from './testdata.fixture';

/**
 * The single `test` object every spec imports.
 *
 * `testDataTest` extends `apiTest`, so merging it also brings in the `api` and
 * `authToken` fixtures. Fixtures are lazy: a spec that never names `api` never
 * pays for the login.
 */
export const test = mergeTests(pomTest, testDataTest, a11yTest);
export { expect };
