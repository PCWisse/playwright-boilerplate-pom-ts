import { test, type Locator, type Page } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * Models `login.html`, the one page reachable without a session, and the entry
 * point `src/setup/auth.setup.ts` drives to produce the shared storage state.
 *
 * On success the app stores its token in localStorage and moves to the
 * inventory page. On failure it fills `errorMessage` and clears the element's
 * `hidden` attribute; until then the element is in the DOM but outside the
 * accessibility tree, so the `alert` role matches nothing and a plain
 * `toBeVisible()` is a sound assertion either way.
 */
export class LoginPage extends BasePage {
  protected readonly path = '/login.html';

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByLabel('Username');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async login(username: string, password: string): Promise<void> {
    await test.step(`Sign in as "${username}"`, async () => {
      await this.usernameInput.fill(username);
      await this.passwordInput.fill(password);
      await this.submitButton.click();
    });
  }
}
