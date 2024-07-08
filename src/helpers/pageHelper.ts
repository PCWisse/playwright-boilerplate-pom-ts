import { Page } from '@playwright/test';

export default class PageHelper {
  static async isLoaderVisible(page: Page): Promise<boolean> {
    return await page.locator('[test-id="main-loader"]').isVisible();
  }

  static async reloadPage(page: Page): Promise<void> {
    await page.reload({ waitUntil: 'domcontentloaded' });
    if (await PageHelper.isLoaderVisible(page)) {
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
  }

  static async reloadOnLoader(page: Page): Promise<void> {
    if (await PageHelper.isLoaderVisible(page)) {
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
  }
}
