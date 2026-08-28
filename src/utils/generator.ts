import { faker } from '@faker-js/faker';
import { addDays, format } from 'date-fns';

export function randomItemName(): string {
  return `${faker.commerce.productAdjective()} ${faker.commerce.product()} ${faker.string.alphanumeric(5).toUpperCase()}`;
}

export function randomPrice(): number {
  return Number(faker.commerce.price({ min: 1, max: 500, dec: 2 }));
}

export function randomQuantity(): number {
  return faker.number.int({ min: 1, max: 99 });
}

export function randomEmail(): string {
  return faker.internet.email({ provider: 'example.invalid' }).toLowerCase();
}

export function randomIban(): string {
  return faker.finance.iban();
}

/** date-fns format pattern, e.g. 'yyyy-MM-dd'. */
export function todayAs(pattern: string): string {
  return format(new Date(), pattern);
}

export function daysFromNow(days: number, pattern: string): string {
  return format(addDays(new Date(), days), pattern);
}
