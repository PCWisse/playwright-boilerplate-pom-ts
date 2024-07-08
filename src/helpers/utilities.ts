/*
 * Copyright (C) 2023, Alphabet International GmbH
 */

import { Locator, Page } from '@playwright/test';

export type EnumDictionary<KeyType extends string | symbol | number, Value> = {
  [Key in KeyType]: Value;
};

export default class Utilities {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async scrollDown(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  async scrollUp(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, -500));
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async getUuidFromCurrentUrl(): Promise<string> {
    const url = this.page.url();
    const matches = url.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/);
    if (matches) {
      return matches[0];
    } else {
      throw new Error('No UUID found.');
    }
  }

  async scrollToOptionIfNeeded(selector: string): Promise<void> {
    const option = this.page.locator(selector);
    await option.waitFor({ state: 'attached' });
    await option.scrollIntoViewIfNeeded();
  }

  async elementContainsClass(locator: Locator, className: string): Promise<boolean> {
    const currentClasses = await locator.getAttribute('class');
    const classesList: string[] = currentClasses ? currentClasses.split(' ') : [];
    return classesList.includes(className);
  }
}
