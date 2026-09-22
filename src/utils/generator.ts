import { faker } from '@faker-js/faker';
import { addDays, format } from 'date-fns';

/**
 * A distinct name on every call.
 *
 * The helpers in this file exist so specs never share fixed data: a hard-coded
 * 'Test item' works on a single worker and then collides the moment the suite
 * runs in parallel, which is the most common way a green suite starts flaking.
 * The alphanumeric suffix keeps names unique even when faker repeats an
 * adjective/product pair.
 */
export function randomItemName(): string {
  return `${faker.commerce.productAdjective()} ${faker.commerce.product()} ${faker.string.alphanumeric(5).toUpperCase()}`;
}

/**
 * A positive amount with two decimal places. Returned as a number for API
 * payloads; the UI form takes strings, so call `.toFixed(2)` there.
 */
export function randomPrice(): number {
  return Number(faker.commerce.price({ min: 1, max: 500, dec: 2 }));
}

/**
 * A positive integer. The API rejects fractional and negative quantities, so
 * this can never produce a payload that is invalid by accident. Use a literal
 * when you want one that is invalid on purpose.
 */
export function randomQuantity(): number {
  return faker.number.int({ min: 1, max: 99 });
}

/**
 * Uses the reserved `.invalid` TLD (RFC 2606), so a test that accidentally
 * triggers a real mail send cannot reach a real inbox.
 *
 * Unused by the bundled specs; kept as the pattern to copy once your
 * application has a sign-up or invite flow.
 */
export function randomEmail(): string {
  return faker.internet.email({ provider: 'example.invalid' }).toLowerCase();
}

/**
 * A syntactically valid IBAN: the check digits are correct, so client-side
 * validation accepts it, while the account itself does not exist. Unused by the
 * bundled specs; kept as the pattern for payment fields.
 */
export function randomIban(): string {
  return faker.finance.iban();
}

/** date-fns format pattern, e.g. 'yyyy-MM-dd'. */
export function todayAs(pattern: string): string {
  return format(new Date(), pattern);
}

/**
 * A date relative to today, for forms that demand one in the future or the
 * past. A hard-coded date passes until it silently drifts out of range months
 * later; this cannot.
 *
 * @param days Negative for a date in the past.
 * @param pattern A date-fns format pattern, e.g. 'yyyy-MM-dd'.
 */
export function daysFromNow(days: number, pattern: string): string {
  return format(addDays(new Date(), days), pattern);
}
