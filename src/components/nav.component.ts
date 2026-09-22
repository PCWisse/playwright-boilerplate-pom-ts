import type { Locator, Page } from '@playwright/test';

import { BaseComponent } from './base.component';

/**
 * The link labels in the main nav, as a closed set: a typo is then a compile
 * error instead of a test that times out hunting a link which never existed.
 */
export type NavDestination = 'Inventory' | 'New item';

/**
 * The `Main` navigation landmark, present on every authenticated page.
 *
 * Because it is scoped to the navigation role, `goTo` cannot accidentally match
 * a same-named link in the page body. `currentUser` shows which account the
 * browser is actually running as, which is the quickest way to confirm a
 * storage-state session is the one you expected.
 */
export class NavComponent extends BaseComponent {
  readonly currentUser: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page, page.getByRole('navigation', { name: 'Main' }));
    this.currentUser = this.root.getByTestId('current-user');
    this.logoutButton = this.root.getByTestId('logout');
  }

  async goTo(name: NavDestination): Promise<void> {
    await this.root.getByRole('link', { name, exact: true }).click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
