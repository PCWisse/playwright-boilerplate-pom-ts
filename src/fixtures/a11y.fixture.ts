import AxeBuilder from '@axe-core/playwright';
import { test as base } from '@playwright/test';
import type { Result } from 'axe-core';

/**
 * Narrows a scan. Reach for `include` or `exclude` before `disableRules`:
 * scoping leaves the rule enforced everywhere else on the page, whereas
 * disabling it blinds the entire scan to that class of defect.
 */
export interface A11yCheckOptions {
  /** CSS selector to scan. Defaults to the whole page. */
  include?: string;
  /** CSS selectors to exclude, e.g. a third-party widget you do not control. */
  exclude?: string[];
  /** Axe rule ids to switch off. Always leave a comment saying why. */
  disableRules?: string[];
  /** Axe tags. Defaults to WCAG 2.1 A and AA. An empty array falls back to the
   * default rather than running zero rules. */
  tags?: string[];
}

/**
 * `violationIds` is sorted, so it can be compared against an expected array
 * without ordering flake. `violations` keeps the full axe records for when an
 * assertion needs the offending nodes or the help URL.
 */
export interface A11yResult {
  violationIds: string[];
  violations: Result[];
}

/**
 * `checkA11y` reports rather than asserts — it never fails a test by itself.
 * Each spec therefore sets its own policy: zero violations on a new page, or a
 * named allow-list while a legacy page is brought up to standard.
 */
export interface A11yFixtures {
  checkA11y: (options?: A11yCheckOptions) => Promise<A11yResult>;
}

const DEFAULT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Merged into the shared `test` in `src/fixtures/index.ts` — specs import that,
 * not this.
 *
 * Every scan attaches `axe-violations.json` to the test result, so a CI failure
 * is diagnosable from the report alone without reproducing it locally.
 *
 * @example
 * const { violationIds } = await checkA11y({ include: '[data-testid="accessible-region"]' });
 * expect(violationIds).toEqual([]);
 */
export const a11yTest = base.extend<A11yFixtures>({
  checkA11y: async ({ page }, use, testInfo) => {
    await use(async (options: A11yCheckOptions = {}): Promise<A11yResult> => {
      // An empty `tags` array would make axe run NO rules and return no
      // violations — a silent pass that looks identical to a clean page.
      // Treat it as "unset" so the scan can never become vacuous.
      const tags =
        options.tags !== undefined && options.tags.length > 0 ? options.tags : DEFAULT_TAGS;

      let builder = new AxeBuilder({ page }).withTags(tags);

      if (options.include !== undefined) {
        builder = builder.include(options.include);
      }
      for (const selector of options.exclude ?? []) {
        builder = builder.exclude(selector);
      }
      if (options.disableRules !== undefined) {
        builder = builder.disableRules(options.disableRules);
      }

      const results = await builder.analyze();

      // Attach the full report so a CI failure is diagnosable from the report
      // alone, without re-running locally.
      await testInfo.attach('axe-violations.json', {
        body: JSON.stringify(results.violations, null, 2),
        contentType: 'application/json',
      });

      return {
        violationIds: results.violations.map((violation) => violation.id).sort(),
        violations: results.violations,
      };
    });
  },
});
