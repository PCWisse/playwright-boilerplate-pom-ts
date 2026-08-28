import { expect, test } from '../../src/fixtures';

test.describe('Network mocking', () => {
  test(
    'renders whatever the API returns',
    { tag: ['@regression'] },
    async ({ inventoryPage, page }) => {
      // Mocking pins the data the UI receives, so the assertion cannot be
      // broken by a change in the backing store.
      await page.route('**/api/items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'item-mock', name: 'Mocked Widget', price: 9.99, quantity: 3, createdAt: '' },
          ]),
        });
      });

      await inventoryPage.goto();

      await expect(inventoryPage.table.rows()).toHaveCount(1);
      expect(await inventoryPage.table.cellText(0, 'Name')).toBe('Mocked Widget');
    },
  );

  test('surfaces an empty list when the API returns nothing', async ({ inventoryPage, page }) => {
    await page.route('**/api/items', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await inventoryPage.goto();

    await expect(inventoryPage.emptyState).toBeVisible();
  });
});
