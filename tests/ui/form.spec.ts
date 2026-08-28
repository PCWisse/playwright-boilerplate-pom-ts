import { randomItemName, randomPrice, randomQuantity } from '../../src/utils/generator';
import { expect, test } from '../../src/fixtures';

test.describe('Item form', () => {
  test.beforeEach(async ({ formPage }) => {
    await formPage.goto();
  });

  test('creates an item', { tag: ['@smoke'] }, async ({ formPage }) => {
    const name = randomItemName();

    await formPage.createItem({
      name,
      price: randomPrice().toFixed(2),
      quantity: String(randomQuantity()),
    });

    await expect(formPage.successMessage).toBeVisible();
    await expect(formPage.successMessage).toHaveText(`Created ${name}`);
  });

  test('reports every invalid field at once', { tag: ['@regression'] }, async ({ formPage }) => {
    await formPage.createItem({ name: '', price: '-5', quantity: '2.5' });

    // Soft assertions collect all three failures instead of stopping at the
    // first one, so a single run tells you every field that is wrong.
    await expect.soft(formPage.fieldError('name')).toHaveText('Name is required');
    await expect
      .soft(formPage.fieldError('price'))
      .toHaveText('Price must be a number of 0 or more');
    await expect
      .soft(formPage.fieldError('quantity'))
      .toHaveText('Quantity must be a whole number of 0 or more');
    await expect(formPage.successMessage).toBeHidden();
  });
});
