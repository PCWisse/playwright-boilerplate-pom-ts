import type { Item } from '../api/schemas';
import { randomItemName, randomPrice, randomQuantity } from '../utils/generator';
import { apiTest } from './api.fixture';

export interface TestDataFixtures {
  /** An item created over the API before the test and removed afterwards. */
  seededItem: Item;
}

export const testDataTest = apiTest.extend<TestDataFixtures>({
  seededItem: async ({ api }, use) => {
    const item = await api.createItem({
      name: randomItemName(),
      price: randomPrice(),
      quantity: randomQuantity(),
    });

    await use(item);

    // Teardown runs even when the test fails, so no run leaves data behind.
    try {
      await api.deleteItem(item.id);
    } catch {
      // Already deleted by the test itself; nothing to clean up.
    }
  },
});
