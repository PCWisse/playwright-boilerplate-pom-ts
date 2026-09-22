import { expect, test as base } from '@playwright/test';

import { SauceCartPage } from '../pages/saucedemo/cart.page';
import { SauceCheckoutPage } from '../pages/saucedemo/checkout.page';
import { SauceInventoryPage } from '../pages/saucedemo/inventory.page';
import { SauceLoginPage } from '../pages/saucedemo/login.page';

/** Page objects for the public Swag Labs demo site. */
export interface SauceFixtures {
  saucePages: {
    login: SauceLoginPage;
    inventory: SauceInventoryPage;
    cart: SauceCartPage;
    checkout: SauceCheckoutPage;
  };
}

/**
 * A `test` for the Swag Labs examples only.
 *
 * Deliberately NOT merged into `src/fixtures/index.ts`. Those fixtures target
 * the bundled demo app, which is the thing the real suite tests; mixing a
 * third-party site into the same bag would invite an internal spec to reach
 * for it by accident. See `docs/conventions.md`, "Third-party dependencies".
 */
export const sauceTest = base.extend<SauceFixtures>({
  saucePages: async ({ page }, use) => {
    await use({
      login: new SauceLoginPage(page),
      inventory: new SauceInventoryPage(page),
      cart: new SauceCartPage(page),
      checkout: new SauceCheckoutPage(page),
    });
  },
});

export { expect };
