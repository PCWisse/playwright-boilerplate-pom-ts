import { randomItemName, randomPrice, randomQuantity } from '../../src/utils/generator';
import { expect, test } from '../../src/fixtures';

test.describe('Items API', () => {
  test('lists the seeded catalogue', { tag: ['@smoke', '@api'] }, async ({ api }) => {
    const items = await api.listItems();

    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.map((item) => item.name)).toContain('Ergonomic Keyboard');
  });

  test('creates, reads, updates and deletes an item', { tag: ['@api'] }, async ({ api }) => {
    const created = await api.createItem({
      name: randomItemName(),
      price: randomPrice(),
      quantity: randomQuantity(),
    });
    expect(created.id).not.toBe('');

    const fetched = await api.getItem(created.id);
    expect(fetched).toEqual(created);

    const updated = await api.updateItem(created.id, {
      name: created.name,
      price: 1.23,
      quantity: 7,
    });
    expect(updated.price).toBe(1.23);
    expect(updated.quantity).toBe(7);

    await api.deleteItem(created.id);

    const remaining = await api.listItems();
    expect(remaining.map((item) => item.id)).not.toContain(created.id);
  });

  test('cleans up its own fixture data', { tag: ['@api'] }, async ({ api, seededItem }) => {
    const found = await api.getItem(seededItem.id);

    expect(found.name).toBe(seededItem.name);
  });
});
