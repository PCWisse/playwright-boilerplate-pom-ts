import AxeBuilder from '@axe-core/playwright';
import { test as base } from '@playwright/test';
import type { Result } from 'axe-core';

export interface A11yCheckOptions {
  /** CSS selector to scan. Defaults to the whole page. */
  include?: string;
  /** CSS selectors to exclude, e.g. a third-party widget you do not control. */
  exclude?: string[];
  /** Axe rule ids to switch off. Always leave a comment saying why. */
  disableRules?: string[];
  /** Axe tags. Defaults to WCAG 2.1 A and AA. */
  tags?: string[];
}

export interface A11yResult {
  violationIds: string[];
  violations: Result[];
}

export interface A11yFixtures {
  checkA11y: (options?: A11yCheckOptions) => Promise<A11yResult>;
}

const DEFAULT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export const a11yTest = base.extend<A11yFixtures>({
  checkA11y: async ({ page }, use, testInfo) => {
    await use(async (options: A11yCheckOptions = {}): Promise<A11yResult> => {
      let builder = new AxeBuilder({ page }).withTags(options.tags ?? DEFAULT_TAGS);

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
