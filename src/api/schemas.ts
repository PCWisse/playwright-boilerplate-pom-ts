import { z } from 'zod';

// Minimal for Task 6: src/utils/mock.ts needs the Item type to type its
// mockItems() helper. Task 7 owns this file and adds the remaining schemas
// (ItemInput, request/response schemas, etc.) — do not add them here.
export const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  createdAt: z.string(),
});

export type Item = z.infer<typeof itemSchema>;
