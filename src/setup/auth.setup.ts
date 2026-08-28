import { expect, test as setup } from '@playwright/test';

import { STANDARD_USER } from '../data/users';
import { LoginPage } from '../pages/login.page';
import { STORAGE_STATE } from '../utils/paths';

setup('authenticate', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(STANDARD_USER.username, STANDARD_USER.password);

  await expect(page.getByRole('heading', { name: 'Inventory', level: 1 })).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
