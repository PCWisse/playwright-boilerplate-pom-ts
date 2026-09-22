import { test, type Locator, type Page } from '@playwright/test';

import { NavComponent } from '../components/nav.component';
import { BasePage } from './base.page';

/**
 * The fields that render a `<field>-error` element, so `fieldError` can only be
 * asked for an error message the form is actually able to show.
 */
export type ItemFormField = 'name' | 'price' | 'quantity';

/**
 * Strings, not numbers: these values are typed into `<input>` elements
 * verbatim. That is deliberate — it lets a spec submit '-1', '1.5' or 'abc' to
 * exercise validation, which a numeric type would make unrepresentable.
 */
export interface ItemFormInput {
  name: string;
  price: string;
  quantity: string;
}

/**
 * Models `form.html`, the create-item form, reached from the nav as 'New item'.
 *
 * Behind the same localStorage token guard as the inventory page: without a
 * session it redirects straight to the login page. `createItem` wraps its fills
 * in a `test.step`, so the trace and the report show one named action instead
 * of four anonymous ones.
 */
export class FormPage extends BasePage {
  protected readonly path = '/form.html';

  readonly nameInput: Locator;
  readonly priceInput: Locator;
  readonly quantityInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly nav: NavComponent;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.getByLabel('Name');
    this.priceInput = page.getByLabel('Price');
    this.quantityInput = page.getByLabel('Quantity');
    this.submitButton = page.getByRole('button', { name: 'Create item' });
    this.successMessage = page.getByRole('status');
    this.nav = new NavComponent(page);
  }

  fieldError(field: ItemFormField): Locator {
    return this.page.getByTestId(`${field}-error`);
  }

  async createItem(input: ItemFormInput): Promise<void> {
    await test.step(`Create item "${input.name}"`, async () => {
      await this.nameInput.fill(input.name);
      await this.priceInput.fill(input.price);
      await this.quantityInput.fill(input.quantity);
      await this.submitButton.click();
    });
  }
}
