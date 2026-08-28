import { expect } from '@playwright/test';

export interface PollOptions {
  /** What is being waited for, used in the failure message. */
  description: string;
  timeoutMs?: number;
  intervalMs?: number;
}

/**
 * Polls an async predicate until it returns true.
 *
 * Prefer a web-first assertion (`await expect(locator).toBeVisible()`) whenever
 * one exists — Playwright retries those automatically. Use this only for
 * conditions that are not expressible as a locator assertion, such as waiting
 * on external state.
 */
export async function pollUntil(
  predicate: () => Promise<boolean>,
  options: PollOptions,
): Promise<void> {
  const { description, timeoutMs = 30_000, intervalMs = 250 } = options;
  await expect
    .poll(predicate, { timeout: timeoutMs, intervals: [intervalMs], message: description })
    .toBe(true);
}
