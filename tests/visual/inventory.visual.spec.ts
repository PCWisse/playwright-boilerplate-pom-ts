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
      // real application; masking keeps the baseline stable.
      mask: [page.getByTestId('current-user')],
      animations: 'disabled',
    });
  });

  test(
    'empty state matches the baseline',
    { tag: ['@visual'] },
    async ({ inventoryPage, page }) => {
      await inventoryPage.goto();
      // Wait for the mocked rows before filtering. Without this the table may
      // still be empty when the search runs, and the test would pass without
      // the filter having done anything.
      await expect(inventoryPage.table.rows()).toHaveCount(CATALOGUE.length);

      await inventoryPage.search('nothing-matches-this');
      await expect(inventoryPage.emptyState).toBeVisible();

      await expect(page).toHaveScreenshot('inventory-empty-state.png', {
        mask: [page.getByTestId('current-user')],
        animations: 'disabled',
      });
    },
  );
});
