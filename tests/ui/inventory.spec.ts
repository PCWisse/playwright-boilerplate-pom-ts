import { CATALOGUE } from '../../src/data/catalogue';
import { mockItems } from '../../src/utils/mock';
import { expect, test } from '../../src/fixtures';

test.describe('Inventory', () => {
  test.beforeEach(async ({ inventoryPage, page }) => {
    // Pin the data so row counts are deterministic no matter what the form and
    // API specs are doing in parallel against the shared demo store.
    await mockItems(page, CATALOGUE);
    await inventoryPage.goto();
  });

  test('lists the catalogue', { tag: ['@smoke'] }, async ({ inventoryPage }) => {
    await expect(inventoryPage.heading).toBeVisible();
    await expect(inventoryPage.table.rows()).toHaveCount(CATALOGUE.length);
    await expect(inventoryPage.table.rowContaining('Ergonomic Keyboard')).toBeVisible();
  });

  test('exposes the expected columns', { tag: ['@regression'] }, async ({ inventoryPage }) => {
    expect(await inventoryPage.table.headerNames()).toEqual(['Name', 'Price', 'Quantity']);
    expect(await inventoryPage.table.cellText(0, 'Price')).toBe('89.99');
  });

  test('filters rows by search term', { tag: ['@regression'] }, async ({ inventoryPage }) => {
    await inventoryPage.search('Mechanical');

    await expect(inventoryPage.table.rows()).toHaveCount(1);
    expect(await inventoryPage.table.columnValues('Name')).toEqual(['Mechanical Mouse']);
  });

  test('shows an empty state when nothing matches', async ({ inventoryPage }) => {
    await inventoryPage.search('nothing-matches-this');

    await expect(inventoryPage.table.rows()).toHaveCount(0);
    await expect(inventoryPage.emptyState).toBeVisible();
  });

  test('signs the user out', { tag: ['@regression'] }, async ({ inventoryPage, page }) => {
    await inventoryPage.nav.logout();

    await expect(page).toHaveURL(/login\.html$/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});
