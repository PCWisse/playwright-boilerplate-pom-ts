import { CATALOGUE } from '../../src/data/catalogue';
import { mockItems } from '../../src/utils/mock';
import { expect, test } from '../../src/fixtures';

test.describe('Component visuals', () => {
  test(
    'the inventory table matches its baseline',
    { tag: ['@visual'] },
    async ({ inventoryPage, page }) => {
      await mockItems(page, CATALOGUE);
      await inventoryPage.goto();
      await expect(inventoryPage.table.rows()).toHaveCount(CATALOGUE.length);

      // Component-scoped snapshots are far less brittle than full-page ones:
      // unrelated layout changes elsewhere cannot break them.
      await expect(inventoryPage.table.element).toHaveScreenshot('inventory-table.png', {
        animations: 'disabled',
      });
    },
  );
});
