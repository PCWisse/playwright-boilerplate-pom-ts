import type { Locator, Page } from '@playwright/test';

export default class landingAppIndex {
  private readonly page: Page;
  private readonly parentLocator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.parentLocator = this.page.locator('');
  }

}