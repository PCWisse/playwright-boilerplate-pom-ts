import { test, type Locator, type Page } from '@playwright/test';

import { BasePage } from '../base.page';

/** The buyer details Swag Labs asks for at checkout step one. */
export interface SauceBuyer {
  firstName: string;
  lastName: string;
  postalCode: string;
}

/**
 * Models both checkout steps and the confirmation page.
 *
 * One class rather than three because the three screens form a single flow
 * with no branch: splitting them would add files without adding clarity.
 */
export class SauceCheckoutPage extends BasePage {
  protected readonly path = '/checkout-step-one.html';

  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly finishButton: Locator;
  readonly itemTotal: Locator;
  readonly tax: Locator;
  readonly total: Locator;
  readonly confirmation: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.getByRole('textbox', { name: 'First Name' });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last Name' });
    this.postalCodeInput = page.getByRole('textbox', { name: 'Zip/Postal Code' });
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.finishButton = page.getByRole('button', { name: 'Finish' });
    this.itemTotal = page.locator('[data-test="subtotal-label"]');
    this.tax = page.locator('[data-test="tax-label"]');
    this.total = page.locator('[data-test="total-label"]');
    this.confirmation = page.getByRole('heading', { name: 'Thank you for your order!' });
  }

  async fillBuyer(buyer: SauceBuyer): Promise<void> {
    await test.step('Fill the buyer details', async () => {
      await this.firstNameInput.fill(buyer.firstName);
      await this.lastNameInput.fill(buyer.lastName);
      await this.postalCodeInput.fill(buyer.postalCode);
      await this.continueButton.click();
    });
  }

  async finish(): Promise<void> {
    await this.finishButton.click();
  }

  /** Reads a money label such as "Item total: $29.99" and returns 29.99. */
  static async amount(locator: Locator): Promise<number> {
    const text = (await locator.innerText()).trim();
    const match = /\$([\d.]+)/.exec(text);
    if (match?.[1] === undefined) {
      throw new Error(`No amount found in "${text}".`);
    }
    return Number(match[1]);
  }
}
