import { z } from 'zod';

/**
 * The contract an item must satisfy on every response that returns one.
 *
 * `ApiClient.unwrap` parses each response against a schema before handing it
 * back, so a backend that renames a field or starts sending `price` as a string
 * fails the request with the exact field path, rather than surfacing three
 * assertions later as a confusing `undefined`.
 */
export const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});

/**
 * `GET /items` returns a bare JSON array, not an envelope object. Every element
 * is validated, so one malformed row fails the call.
 */
export const itemListSchema = z.array(itemSchema);

/**
 * Validates `POST /login`. `token` is required and non-empty, which is what
 * lets `ApiClient.login` return `body.token` with no null check.
 */
export const loginResponseSchema = z.object({
  token: z.string().min(1),
  username: z.string().min(1),
});

/**
 * The 4xx error envelope. Unlike the schemas above, this one never reaches
 * `ApiClient.unwrap`, which throws on an unexpected status before it parses
 * anything. Negative-path specs apply it themselves to the raw `APIResponse`
 * returned by `ApiClient.createItemRaw`; see `tests/api/validation.spec.ts`.
 */
export const errorSchema = z.object({
  error: z.string().min(1),
  field: z.string().optional(),
});

/**
 * Inferred from the schema rather than declared alongside it, so the runtime
 * check and the static type cannot drift apart.
 */
export type Item = z.infer<typeof itemSchema>;
/** Also inferred, for the same reason: one definition, enforced at both times. */
export type LoginResponse = z.infer<typeof loginResponseSchema>;

/**
 * The request body for creating or updating an item.
 *
 * Hand-written on purpose, not inferred: the client never sends `id` or
 * `createdAt` (the server assigns both), so deriving this from `itemSchema`
 * would demand two fields a caller cannot supply.
 */
export interface ItemInput {
  name: string;
  price: number;
  quantity: number;
}
