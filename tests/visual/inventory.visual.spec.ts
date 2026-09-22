import { CATALOGUE } from '../../src/data/catalogue';
import { mockItems } from '../../src/utils/mock';
import { expect, test } from '../../src/fixtures';

test.describe('Inventory visuals', () => {
  test.beforeEach(async ({ page }) => {
    // A screenshot baseline is only stable if the rendered data is fixed.
    await mockItems(page, CATALOGUE);
  });

  test('full page matches the baseline', { tag: ['@visual'] }, async ({ inventoryPage, page }) => {
    await inventoryPage.goto();
    await expect(inventoryPage.table.rows()).toHaveCount(CATALOGUE.length);

    await expect(page).toHaveScreenshot('inventory-full-page.png', {
      fullPage: true,
      // The user name comes from storage state and would differ per run in a
      // real application; masking keeps the baseline stable. Use the nav
      // component's locator rather than re-deriving the test id here, so a
      // markup change has one place to update.
      //
      // Caveat worth knowing before you copy this: a mask rectangle is the
      // element's bounding box, and this span is text-sized. The name resolves
      // from TEST_USERNAME, so changing that env var changes the box width and
      // invalidates the baseline — and a developer whose .env differs from
      // CI's will disagree with CI on the same commit. Pin TEST_USERNAME, or
      // mask a fixed-size container instead.
      mask: [inventoryPage.nav.currentUser],
      animations: 'disabled',
    });
  });

  test('empty state matches the baseline', { tag: ['@visual'] }, async ({ inventoryPage, page }) => {
    await inventoryPage.goto();
    // Wait for the mocked rows before filtering. Without this the table may
    // still be empty when the search runs, and the test would pass without
    // the filter having done anything.
    await expect(inventoryPage.table.rows()).toHaveCount(CATALOGUE.length);

    await inventoryPage.search('nothing-matches-this');
    await expect(inventoryPage.emptyState).toBeVisible();

    await expect(page).toHaveScreenshot('inventory-empty-state.png', {
      mask: [inventoryPage.nav.currentUser],
      animations: 'disabled',
    });
  });
});
