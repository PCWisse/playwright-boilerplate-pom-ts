import type { Page } from '@playwright/test';

import type { Item } from '../api/schemas';

/**
 * Pins the item list the inventory page receives.
 *
 * Use this in any spec that asserts on an exact row count or on specific cell
 * values. Without it the assertion depends on what other tests happen to have
 * created in the shared demo store.
 */
export async function mockItems(page: Page, items: readonly Item[]): Promise<void> {
  // The trailing `*` also matches a query string (`/api/items?page=1`) but not
  // a sub-path (`/api/items/123`), so adding pagination or a cache-buster to
  // the request cannot silently stop the mock from firing.
  await page.route('**/api/items*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(items),
    });
  });
}
