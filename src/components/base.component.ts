import type { Locator, Page } from '@playwright/test';

/**
 * A component is a reusable piece of UI scoped to a root locator. Scoping means
 * the same component class works anywhere the markup appears, and its locators
 * can never accidentally match an element elsewhere on the page.
 */
export abstract class BaseComponent {
  protected readonly page: Page;
  readonly root: Locator;

  constructor(page: Page, root: Locator) {
    this.page = page;
    this.root = root;
  }

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }
}
