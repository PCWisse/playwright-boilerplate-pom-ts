import { errorSchema } from '../../src/api/schemas';
import { expect, test } from '../../src/fixtures';

test.describe('Items API validation', () => {
  const invalidPayloads = [
    { label: 'missing name', body: { price: 1, quantity: 1 }, field: 'name' },
    { label: 'negative price', body: { name: 'X', price: -1, quantity: 1 }, field: 'price' },
    {
      label: 'fractional quantity',
      body: { name: 'X', price: 1, quantity: 1.5 },
      field: 'quantity',
    },
  ];

  for (const { label, body, field } of invalidPayloads) {
    test(`rejects a payload with a ${label}`, { tag: ['@api'] }, async ({ api }) => {
      const response = await api.createItemRaw(body);

      expect(response.status()).toBe(400);
      const parsed = errorSchema.parse(await response.json());
      expect(parsed.field).toBe(field);
    });
  }
});
