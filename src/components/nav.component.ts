import type { Locator, Page } from '@playwright/test';

import { BaseComponent } from './base.component';

export type NavDestination = 'Inventory' | 'New item';

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
