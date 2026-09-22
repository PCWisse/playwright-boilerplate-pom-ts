import { expect, test } from '../../src/fixtures';

test.describe('API-seeded UI state', () => {
  test('shows an item created over the API', { tag: ['@regression'] }, async ({ inventoryPage, seededItem }) => {
    // Setting up through the API keeps the test focused on the one UI
    // behaviour it verifies, instead of re-testing the create form.
    await inventoryPage.goto();
    await inventoryPage.search(seededItem.name);

    await expect(inventoryPage.table.rows()).toHaveCount(1);
    expect(await inventoryPage.table.cellText(0, 'Name')).toBe(seededItem.name);
    expect(await inventoryPage.table.cellText(0, 'Quantity')).toBe(String(seededItem.quantity));
  });
});
