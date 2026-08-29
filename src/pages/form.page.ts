import { test, type Locator, type Page } from '@playwright/test';

import { NavComponent } from '../components/nav.component';
import { BasePage } from './base.page';

export type ItemFormField = 'name' | 'price' | 'quantity';

export interface ItemFormInput {
  name: string;
  price: string;
  quantity: string;
}

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
