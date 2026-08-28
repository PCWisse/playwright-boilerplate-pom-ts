import { test as base } from '@playwright/test';

import { A11yPage } from '../pages/a11y.page';
import { FormPage } from '../pages/form.page';
import { InventoryPage } from '../pages/inventory.page';
import { LoginPage } from '../pages/login.page';

export interface PomFixtures {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  formPage: FormPage;
  a11yPage: A11yPage;
}

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
