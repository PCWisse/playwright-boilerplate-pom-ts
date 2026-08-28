import { z } from 'zod';

export const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});

export const itemListSchema = z.array(itemSchema);

export const loginResponseSchema = z.object({
  token: z.string().min(1),
  username: z.string().min(1),
});

export const errorSchema = z.object({
  error: z.string().min(1),
  field: z.string().optional(),
});

export type Item = z.infer<typeof itemSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export interface ItemInput {
  name: string;
  price: number;
  quantity: number;
}
