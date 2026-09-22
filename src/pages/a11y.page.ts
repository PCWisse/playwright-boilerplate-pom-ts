import type { Locator, Page } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * Models `a11y.html`, whose markup carries DELIBERATE violations (a missing
 * image alt, an unlabelled input, insufficient contrast, an empty link) as
 * fixture data for the axe specs. Do not "fix" them; the tests assert on them.
 *
 * `accessibleRegion` is the one clean section, there to demonstrate a scoped
 * scan. The page has no auth guard, which is why the `a11y` project declares
 * neither `storageState` nor `dependencies`.
 */
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
