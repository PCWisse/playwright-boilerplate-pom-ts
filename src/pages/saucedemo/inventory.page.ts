import { test, type Locator, type Page } from '@playwright/test';

import { BasePage } from '../base.page';

/** The sort orders the Swag Labs product list offers. */
export type SauceSortOption = 'Name (A to Z)' | 'Name (Z to A)' | 'Price (low to high)' | 'Price (high to low)';

/**
 * Models the Swag Labs product list, reached after a successful sign-in.
 *
 * The cart button carries its count in its accessible name (`Cart, empty`,
 * then `Cart, 1 items`), which is why `cartButton` is asserted on directly
 * rather than through a separate badge locator.
 */
export class SauceInventoryPage extends BasePage {
  protected readonly path = '/inventory.html';

  readonly title: Locator;
  readonly cartButton: Locator;
  readonly sortSelect: Locator;
  readonly productNames: Locator;
  readonly prices: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.getByText('Products', { exact: true });
    this.cartButton = page.getByRole('button', { name: /^Cart/ });
    this.sortSelect = page.getByRole('combobox', { name: 'Sort products' });
    // CSS, deliberately, and worth understanding before you copy it.
    //
    // Each card exposes the SAME accessible name twice: once on the product
    // image and once on the title, both as `View details for <product>`. So
    // getByRole('button', { name: /^View details for / }) matches 12 elements
    // for 6 products, and a toHaveCount(6) written from the visible page is
    // simply wrong. Duplicate accessible names are common in real catalogues.
    //
    // The site does publish `data-test` attributes, but this project sets
    // `testIdAttribute` to `data-testid`, so getByTestId cannot reach them.
    // An attribute selector is the documented last resort here.
    this.productNames = page.locator('[data-test="inventory-item-name"]');
    this.prices = page.locator('[data-test="inventory-item-price"]');
  }

  /** The add-to-cart button inside one product's card, found by product name. */
  addToCartButton(product: string): Locator {
    return this.page
      .locator('[data-test="inventory-item"]')
      .filter({ hasText: product })
      .getByRole('button', { name: /Add to cart|Remove/ });
  }

  async addToCart(product: string): Promise<void> {
    await test.step(`Add ${product} to the cart`, async () => {
      await this.addToCartButton(product).click();
    });
  }

  async sortBy(option: SauceSortOption): Promise<void> {
    await this.sortSelect.selectOption({ label: option });
  }

  async openCart(): Promise<void> {
    await this.cartButton.click();
  }
}
