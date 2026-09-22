import type { Item } from '../api/schemas';

/** Mirrors the demo app's seed. Used to pin inventory data in specs. */
export const CATALOGUE: readonly Item[] = Object.freeze([
  {
    id: 'item-1',
    name: 'Ergonomic Keyboard',
    price: 89.99,
    quantity: 12,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item-2',
    name: 'Mechanical Mouse',
    price: 45.5,
    quantity: 30,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item-3',
    name: 'USB-C Hub',
    price: 62.0,
    quantity: 7,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item-4',
    name: '27-inch Monitor',
    price: 329.0,
    quantity: 4,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item-5',
    name: 'Laptop Stand',
    price: 39.95,
    quantity: 21,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]);
