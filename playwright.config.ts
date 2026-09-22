import { defineConfig, devices } from '@playwright/test';

import allureCategories from './allure-categories.json';
import { env } from './src/utils/env';
import { STORAGE_STATE } from './src/utils/paths';

const isCI = Boolean(process.env.CI);

// The Allure reporter's `categories` option takes the parsed array, not a path:
// whatever is passed is serialised straight into `allure-results/categories.json`,
// so a filename string would silently produce an unusable report. Keeping the
// definitions in `allure-categories.json` and importing them here means the file
// stays editable on its own while the reporter still gets an array.
const allureOptions = {
  resultsDir: 'allure-results',
  detail: false,
  categories: allureCategories,
  environmentInfo: {
    base_url: env.baseURL,
    api_url: env.apiURL,
    node: process.version,
    ci: String(isCI),
  },
};

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  reporter: isCI ? [['github'], ['blob'], ['allure-playwright', allureOptions]] : [['list'], ['html', { open: 'never' }], ['allure-playwright', allureOptions]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{platform}/{testFilePath}/{arg}{ext}',
  use: {
    baseURL: env.baseURL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: 'npm run demo',
    url: env.baseURL,
    reuseExistingServer: !isCI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'setup',
      testDir: './src/setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testDir: './tests/ui',
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      testDir: './tests/ui',
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      testDir: './tests/ui',
      use: { ...devices['Pixel 7'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: env.apiURL },
    },
    {
      name: 'a11y',
      testDir: './tests/a11y',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Examples against the public Swag Labs demo site. Deliberately excluded
      // from `npm run test:ci`: it depends on a third party, and an outage
      // there must never fail a pull request. Run it with
      // `npm run test:saucedemo`.
      name: 'saucedemo',
      testDir: './tests/external',
      use: { ...devices['Desktop Chrome'], baseURL: 'https://www.saucedemo.com' },
    },
    {
      // Chromium only, so baselines stay stable. Regenerate inside Docker to
      // match the CI platform: see docs/ci.md.
      name: 'visual',
      testDir: './tests/visual',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],
});
