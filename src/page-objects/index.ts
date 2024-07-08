import { test as baseTest } from '@playwright/test';

import landingAppIndex from './landing-app/landingApp.index';

export const test = baseTest.extend<{
    landingApp: landingAppIndex;
    // loginPage: Login;
    // logoutPage: Logout;
  }>({
    landingApp: async ({ page }, use) => {
      await use(new landingAppIndex(page));
    },
    // loginPage: async ({ page }, use) => {
    //   await use(new Login(page));
    // },
    // logoutPage: async ({ page }, use) => {
    //   await use(new Logout(page));
    // },
  });
  