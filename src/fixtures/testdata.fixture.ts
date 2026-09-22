import type { Item } from '../api/schemas';
import { randomItemName, randomPrice, randomQuantity } from '../utils/generator';
import { apiTest } from './api.fixture';

/**
 * State a test needs to already exist. Seeding over the API rather than by
 * driving the UI keeps a spec asserting on only the behaviour it is about, and
 * is far faster than clicking through a form to set up a precondition.
 */
export interface TestDataFixtures {
  /** An item created over the API before the test and removed afterwards. */
  seededItem: Item;
}

/**
 * Extends `apiTest`, so asking for `seededItem` also pulls in `api` and the
 * worker-scoped `authToken`.
 *
 * Teardown deletes the item and tolerates exactly one failure — a 404, meaning
 * the test already removed it. Everything else is re-thrown, so broken cleanup
 * can never be mistaken for a clean run.
 */
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
