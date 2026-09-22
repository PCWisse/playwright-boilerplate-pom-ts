export interface Item {
  id: string;
  name: string;
  price: number;
  quantity: number;
  createdAt: string;
}

export interface ItemInput {
  name: string;
  price: number;
  quantity: number;
}

const SEED: ItemInput[] = [
  { name: 'Ergonomic Keyboard', price: 89.99, quantity: 12 },
  { name: 'Mechanical Mouse', price: 45.5, quantity: 30 },
  { name: 'USB-C Hub', price: 62.0, quantity: 7 },
  { name: '27-inch Monitor', price: 329.0, quantity: 4 },
  { name: 'Laptop Stand', price: 39.95, quantity: 21 },
];

export const VALID_CREDENTIALS = {
  username: 'standard_user',
  password: 'secret_sauce',
};

/** In-memory store. Resets on every server start, so tests are repeatable. */
export class ItemStore {
  private items = new Map<string, Item>();
  private counter = 0;

  constructor() {
    for (const seed of SEED) {
      this.create(seed);
    }
  }

  list(): Item[] {
    return [...this.items.values()];
  }

  get(id: string): Item | undefined {
    return this.items.get(id);
  }

  create(input: ItemInput): Item {
    this.counter += 1;
    const item: Item = {
      id: `item-${String(this.counter)}`,
      name: input.name,
      price: input.price,
      quantity: input.quantity,
      createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    };
    this.items.set(item.id, item);
    return item;
  }

  update(id: string, input: ItemInput): Item | undefined {
    const existing = this.items.get(id);
    if (existing === undefined) {
      return undefined;
    }
    const updated: Item = { ...existing, ...input };
    this.items.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }
}

/** Returns the first validation error for an item payload, or null if valid. */
export function validateItemInput(body: unknown): { error: string; field: string } | null {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be a JSON object', field: 'body' };
  }
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.name !== 'string' || candidate.name.trim() === '') {
    return { error: 'name is required', field: 'name' };
  }
  if (typeof candidate.price !== 'number' || candidate.price < 0) {
    return { error: 'price must be a number >= 0', field: 'price' };
  }
  if (typeof candidate.quantity !== 'number' || !Number.isInteger(candidate.quantity) || candidate.quantity < 0) {
    return { error: 'quantity must be an integer >= 0', field: 'quantity' };
  }
  return null;
}
