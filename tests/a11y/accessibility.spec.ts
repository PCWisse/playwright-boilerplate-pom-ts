import { STANDARD_USER } from '../../src/data/users';
import { expect, test } from '../../src/fixtures';

test.describe('Accessibility', () => {
  test('the inventory page has no WCAG A/AA violations', { tag: ['@a11y', '@smoke'] }, async ({ loginPage, inventoryPage, checkA11y }) => {
    // The `a11y` project deliberately runs standalone: no `storageState` and
    // no dependency on the `setup` project, so the browser starts logged out
    // and `/inventory.html` redirects straight back to the login page. Log in
    // inline instead — do not delete this in favour of `inventoryPage.goto()`,
    // or the scan silently measures the login page.
    await loginPage.goto();
    await loginPage.login(STANDARD_USER.username, STANDARD_USER.password);
    await expect(inventoryPage.heading).toBeVisible();
    // Gate the scan on the item fetch having rendered, so axe never sees a
    // half-built table. Assert on the rows themselves: `emptyState` carries a
    // static `hidden` attribute in the markup, so `toBeHidden()` is already
    // satisfied at parse time and would wait for nothing.
    await expect(inventoryPage.table.rows()).not.toHaveCount(0);

    const { violationIds } = await checkA11y();

    expect(violationIds).toEqual([]);
  });

  test('the playground page reports its known violations', { tag: ['@a11y'] }, async ({ a11yPage, checkA11y }) => {
    // demo-app/public/a11y.html contains deliberate violations. Asserting the
    // exact set proves the scan actually runs — a scan that silently returns
    // nothing would otherwise look like a pass.
    //
    // The page also carries an input with only a `placeholder`. axe-core
    // 4.13 treats a placeholder as an accessible name, so the `label` rule
    // PASSES on it and is deliberately absent from this list. Accessible-name
    // rules move between axe versions: when a version bump changes this set,
    // update the array to what axe reports rather than loosening the
    // assertion.
    await a11yPage.goto();
    await expect(a11yPage.heading).toBeVisible();

    const { violationIds } = await checkA11y();

    expect(violationIds).toEqual(['color-contrast', 'image-alt', 'link-name']);
  });

  test('a scoped scan passes on the accessible region', { tag: ['@a11y'] }, async ({ a11yPage, checkA11y }) => {
    await a11yPage.goto();
    await expect(a11yPage.accessibleRegion).toBeVisible();

    const { violationIds } = await checkA11y({
      include: '[data-testid="accessible-region"]',
    });

    expect(violationIds).toEqual([]);
  });

  test('documented exclusions narrow the scan', { tag: ['@a11y'] }, async ({ a11yPage, checkA11y }) => {
    await a11yPage.goto();
    await expect(a11yPage.heading).toBeVisible();

    const { violationIds } = await checkA11y({
      // Real-world pattern: exclude markup you do not control, and disable a
      // rule only with a written reason.
      //
      // `exclude` drops a subtree — use it for a third-party widget or an
      // embed you cannot change. `disableRules` switches a rule off
      // everywhere; here the low-contrast paragraph is treated as a known,
      // accepted design decision.
      exclude: ['img'],
      disableRules: ['color-contrast'],
    });

    // Exactly one violation survives, which proves BOTH narrowing paths
    // actually took effect rather than silently doing nothing.
    expect(violationIds).toEqual(['link-name']);
  });
});
