import type { Locator, Page } from '@playwright/test';

import { BasePage } from '../base.page';

/** Models the Swag Labs cart at /cart.html. */
export class SauceCartPage extends BasePage {
  protected readonly path = '/cart.html';

  readonly title: Locator;
  readonly items: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.getByText('Your Cart', { exact: true });
    this.items = page.locator('[data-test="inventory-item"]');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' });
    this.continueShoppingButton = page.getByRole('button', { name: 'Continue Shopping' });
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
  }
}
