import type { SauceBuyer } from '../pages/saucedemo/checkout.page';

/**
 * Credentials for the public Swag Labs demo site.
 *
 * These are not secrets: the site prints them on its own login page for anyone
 * to use. Real credentials never belong in a committed file, they go in your
 * CI provider's secret store. See `docs/conventions.md`.
 */
export const SAUCE_USERS = {
  standard: { username: 'standard_user', password: 'secret_sauce' },
  lockedOut: { username: 'locked_out_user', password: 'secret_sauce' },
} as const;

/** An arbitrary buyer. The site validates only that the fields are non-empty. */
export const SAUCE_BUYER: SauceBuyer = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  postalCode: '1011AB',
};

/** Sales tax the site applies to the item total, as a fraction. */
export const SAUCE_TAX_RATE = 0.08;
