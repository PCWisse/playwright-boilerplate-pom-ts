import { test as base } from '@playwright/test';

import { A11yPage } from '../pages/a11y.page';
import { FormPage } from '../pages/form.page';
import { InventoryPage } from '../pages/inventory.page';
import { LoginPage } from '../pages/login.page';

/**
 * One entry per page object. Fixtures are lazy, so listing them all costs a
 * spec nothing: only the page objects a test actually destructures are ever
 * constructed.
 */
export interface PomFixtures {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  formPage: FormPage;
  a11yPage: A11yPage;
}

/**
 * Hands specs ready-made page objects so no test body calls `new`.
 *
 * Each is built on the test's own `page`, which carries the project's
 * `storageState` — so in the projects that declare `dependencies: ['setup']`,
 * `inventoryPage` and `formPage` are already past the login guard.
 */
export const pomTest = base.extend<PomFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  formPage: async ({ page }, use) => {
    await use(new FormPage(page));
  },
  a11yPage: async ({ page }, use) => {
    await use(new A11yPage(page));
  },
});
