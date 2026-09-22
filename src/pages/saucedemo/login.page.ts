import { test, type Locator, type Page } from '@playwright/test';

import { BasePage } from '../base.page';

/**
 * Models the Swag Labs sign-in page at https://www.saucedemo.com/.
 *
 * Every locator here is role-based. The site exposes `data-test` attributes
 * too, but this project's `testIdAttribute` is `data-testid`, so `getByTestId`
 * would not match them. Roles work regardless and are the better lesson.
 */
export class SauceLoginPage extends BasePage {
  protected readonly path = '/';

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' });
    // The site renders failures into a live region, so `alert` is the role.
    this.errorMessage = page.getByRole('alert');
  }

  async login(username: string, password: string): Promise<void> {
    await test.step(`Sign in as ${username}`, async () => {
      await this.usernameInput.fill(username);
      await this.passwordInput.fill(password);
      await this.loginButton.click();
    });
  }
}
