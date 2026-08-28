import type { Locator, Page } from '@playwright/test';

import { BasePage } from './base.page';

export class A11yPage extends BasePage {
  protected readonly path = '/a11y.html';

  readonly heading: Locator;
  readonly accessibleRegion: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Accessibility playground', level: 1 });
    this.accessibleRegion = page.getByTestId('accessible-region');
  }
}
