# Conventions

## Files and names

- Kebab-case filenames with a role suffix: `.page.ts`, `.component.ts`,
  `.fixture.ts`, `.setup.ts`, `.spec.ts`.
- PascalCase classes: `LoginPage`, `TableComponent`.
- One class per file. A file that needs a second class usually needs a second
  file.

## Locator priority

1. Role, label or text: `getByRole('button', { name: 'Sign in' })`,
   `getByLabel('Username')`, `getByText`. These match how a user finds the
   element and survive restyling.
2. `getByTestId` when no accessible name exists. The attribute is `data-testid`
   (`testIdAttribute` in `playwright.config.ts`).
3. CSS or XPath only where nothing else works — and always with a comment saying
   why. There are none in `src/` today.

Chain and filter rather than indexing. `src/components/table.component.ts` is
the worked example:

```typescript
rowContaining(text: string): Locator {
  return this.rows().filter({ hasText: text }).first();
}
```

## Assertions

Only web-first assertions, which retry until the timeout:

```typescript
await expect(locator).toBeVisible(); // yes
expect(await locator.isVisible()).toBe(true); // no — playwright/prefer-web-first-assertions
```

Assertions live in specs, not in page objects. A page object that asserts cannot
be reused by a test that expects the opposite.

Use `expect.soft` when several independent checks should all be reported from
one run — see `tests/ui/form.spec.ts`, which reports all three invalid fields
instead of stopping at the first.

### Make sure the assertion can fail

An assertion that passes against a broken page is worse than no assertion. Both
`tests/a11y/accessibility.spec.ts` and `tests/visual/inventory.visual.spec.ts`
gate on the rows having rendered before the real assertion —
`not.toHaveCount(0)` in the first, `toHaveCount(CATALOGUE.length)` in the second
— rather than on `expect(inventoryPage.emptyState).toBeHidden()`. The reason is
that `inventory.html` carries a **static `hidden` attribute** on its empty
state, so `toBeHidden()` is already satisfied at parse time: it would pass in
milliseconds against a page whose item fetch never returned and which rendered
zero rows.

When you add a precondition check, prove it fails when the precondition is
unmet — stall the request with `page.route` and confirm the test goes red.

## Waiting

Never `waitForTimeout`. It is a lint error in two places:

- `no-restricted-syntax` over `src/**/*.ts` (`eslint.config.mjs`), so page
  objects and components can never sleep.
- `playwright/no-wait-for-timeout` over `tests/**/*.spec.ts` and
  `src/setup/**/*.setup.ts`.

Playwright already waits for actionability before every action and retries every
web-first assertion, so a sleep is nearly always covering for the wrong locator.

`src/utils/wait.ts` exports `pollUntil` as an escape hatch for conditions no
locator assertion can express — external state, a queue draining. Nothing in the
shipped examples uses it, deliberately. Reach for it last, not first.

## Isolation

Every test must pass when run alone, in any order, in parallel (`fullyParallel`
is on). No module-level mutable state.

The demo app has a **shared, mutable item store**, so a spec that asserts an
exact row count or exact cell values must pin the data it sees. Two ways:

- `mockItems(page, CATALOGUE)` from `src/utils/mock.ts` — intercepts
  `**/api/items*` (the trailing `*` matches a query string but not a sub-path)
  and serves a fixed list. Used by `tests/ui/inventory.spec.ts` and both visual
  specs.
- A raw `page.route` when you want a one-off payload — see
  `tests/ui/network-mocking.spec.ts`.

Data a test genuinely needs to create goes through the `seededItem` fixture
(`src/fixtures/testdata.fixture.ts`), which creates over the API and deletes in
teardown, tolerating only a 404 (the test deleted it itself) and rethrowing
everything else.

## Fixtures

Fixtures are split by concern and composed with `mergeTests` in
`src/fixtures/index.ts`:

| Fixture file          | Provides                                                   |
| --------------------- | ---------------------------------------------------------- |
| `pom.fixture.ts`      | `loginPage`, `inventoryPage`, `formPage`, `a11yPage`       |
| `api.fixture.ts`      | `api` (test-scoped), `authToken` (worker-scoped)           |
| `testdata.fixture.ts` | `seededItem` — extends `apiTest`, so it brings `api` along |
| `a11y.fixture.ts`     | `checkA11y`                                                |

Every spec imports `{ expect, test }` from `../../src/fixtures`. Fixtures are
lazy: a spec that never names `api` never pays for the login.

## Tags

`@smoke` for the critical path, `@regression` for everything else, plus `@api`,
`@a11y` and `@visual`. Declared with the options object, not in the title:

```typescript
test('signs in with valid credentials', { tag: ['@smoke'] }, async ({ loginPage }) => {});
```

Run a subset with `npm run test:smoke`, `npm run test:regression`, or
`npx playwright test --grep @api`.

## Third-party dependencies

Tests must not depend on sites you do not control. Mock at the network boundary
with `page.route` — see `tests/ui/network-mocking.spec.ts`.

## Never let a secret reach a report

`testInfo.attach` feeds **every** reporter at once: the built-in HTML report,
the `blob` report CI uploads as an artifact, and Allure. `src/api/api-client.ts`
runs response bodies through `sanitiseBody` (`src/utils/reporting.ts`), which
redacts secret-looking keys and caps the body at 8192 characters. If you add a
new attachment, run it through `sanitiseBody` too.

Note the limit: `sanitiseBody` covers the API attachment path only. Traces are
not redacted — see [CI and reporting](ci.md).

## Commit messages

Conventional Commits, enforced by commitlint through a husky `commit-msg` hook.
The scope allowlist lives in `commitlint.config.mjs`. `npm test` and
`npm run typecheck` are **not** run by the hooks; `.husky/pre-commit` runs
lint-staged plus `tsc --noEmit`.
