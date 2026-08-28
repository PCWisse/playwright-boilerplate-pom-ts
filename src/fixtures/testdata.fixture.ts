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
    } catch (error) {
      // `ApiClient.deleteItem` throws an Error whose message embeds the
      // response status when it isn't 204. Only tolerate a 404: that means
      // the test itself already deleted the item, so there is nothing left
      // to clean up. Anything else (auth failure, network error, 5xx) is a
      // genuine teardown failure and must surface, not be swallowed.
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('404')) {
        throw error;
      }
    }
  },
});
