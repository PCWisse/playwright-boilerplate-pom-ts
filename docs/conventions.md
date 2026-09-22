# Conventions

## Test user-visible behaviour

A test should assert what a user can observe: text on screen, a URL, an enabled button, a request the app made. It should not assert private state, a CSS class name, or the shape of a component's
internals. Those change when someone refactors, and a test that fails on a refactor which broke nothing trains people to ignore failures.

The practical test: if the rewrite changed no behaviour a user could notice, your test should still pass.

## No conditional logic in a test

No `if`, no `try/catch` around an assertion, no loop that might run zero times. A branch means the test asserts different things on different runs, and the run where it asserted nothing still reports
green.

```typescript
// no: silently passes when the banner never appears
if (await banner.isVisible()) {
  await expect(banner).toHaveText('Saved');
}

// yes: states what must happen
await expect(banner).toHaveText('Saved');
```

If two cases genuinely need different assertions, write two tests. This is the same failure mode as [Make sure the assertion can fail](#make-sure-the-assertion-can-fail), reached by a different route.

## Files and names

- Kebab-case filenames with a role suffix: `.page.ts`, `.component.ts`, `.fixture.ts`, `.setup.ts`, `.spec.ts`.
- PascalCase classes: `LoginPage`, `TableComponent`.
- One class per file. A file that needs a second class usually needs a second file.

## Locator priority

1. Role, label or text: `getByRole('button', { name: 'Sign in' })`, `getByLabel('Username')`, `getByText`. These match how a user finds the element and survive restyling.
2. `getByTestId` when no accessible name exists. The attribute is `data-testid` (`testIdAttribute` in `playwright.config.ts`).
3. CSS or XPath only where nothing else works, and always with a comment saying why. There are none in `src/` today.

Chain and filter rather than indexing. `src/components/table.component.ts` is the worked example:

```typescript
rowContaining(text: string): Locator {
  return this.rows().filter({ hasText: text }).first();
}
```

## Assertions

Only web-first assertions, which retry until the timeout:

```typescript
await expect(locator).toBeVisible(); // yes
expect(await locator.isVisible()).toBe(true); // no: playwright/prefer-web-first-assertions
```

Assertions live in specs, not in page objects. A page object that asserts cannot be reused by a test that expects the opposite.

Use `expect.soft` when several independent checks should all be reported from one run. See `tests/ui/form.spec.ts`, which reports all three invalid fields instead of stopping at the first.

### Make sure the assertion can fail

An assertion that passes against a broken page is worse than no assertion. Both `tests/a11y/accessibility.spec.ts` and `tests/visual/inventory.visual.spec.ts` gate on the rows having rendered before
the real assertion, using `not.toHaveCount(0)` in the first and `toHaveCount(CATALOGUE.length)` in the second, rather than on `expect(inventoryPage.emptyState).toBeHidden()`. The reason is that
`inventory.html` carries a **static `hidden` attribute** on its empty state, so `toBeHidden()` is already satisfied at parse time: it would pass in milliseconds against a page whose item fetch never
returned and which rendered zero rows.

When you add a precondition check, prove it fails when the precondition is unmet: stall the request with `page.route` and confirm the test goes red.

## A forgotten `await` is a lint error, not a silent pass

The most common Playwright bug is a missing `await`: the assertion returns a promise nobody waits for, so it never runs and the test passes. Two rules catch it, and both are errors:

```
'toBeVisible' must be awaited or returned                 playwright/missing-playwright-await
Promises must be awaited ... or explicitly marked with void   @typescript-eslint/no-floating-promises
```

`no-floating-promises` is enabled explicitly in `eslint.config.mjs` and needs type information, which is why the ESLint config is type-aware rather than syntax-only. You do not need to hand-audit for
missing awaits; `npm run lint` does it.

## Waiting

Never `waitForTimeout`. It is a lint error in two places:

- `no-restricted-syntax` over `src/**/*.ts` (`eslint.config.mjs`), so page objects and components can never sleep.
- `playwright/no-wait-for-timeout` over `tests/**/*.spec.ts` and `src/setup/**/*.setup.ts`.

Playwright already waits for actionability before every action and retries every web-first assertion, so a sleep is nearly always covering for the wrong locator.

`src/utils/wait.ts` exports `pollUntil` as an escape hatch for conditions no locator assertion can express: external state, a queue draining. Nothing in the shipped examples uses it, deliberately.
Reach for it last, not first.

### Locators, never element handles

`page.$`, `page.$$`, `elementHandle()` and `waitForSelector` are banned in `src/**/*.ts` by `no-restricted-syntax`, alongside `waitForTimeout`.

A handle is a snapshot of one node at one moment. A locator is a _description_ that Playwright re-resolves on every use, which is what makes auto-waiting and retrying work at all. When the page
re-renders, a handle points at a detached node and fails in ways that look like flakiness.

## Isolation

Every test must pass when run alone, in any order, in parallel (`fullyParallel` is on). No module-level mutable state.

The demo app has a **shared, mutable item store**, so a spec that asserts an exact row count or exact cell values must pin the data it sees. Two ways:

- `mockItems(page, CATALOGUE)` from `src/utils/mock.ts`: intercepts `**/api/items*` (the trailing `*` matches a query string but not a sub-path) and serves a fixed list. Used by
  `tests/ui/inventory.spec.ts` and both visual specs.
- A raw `page.route` when you want a one-off payload. See `tests/ui/network-mocking.spec.ts`.

Data a test genuinely needs to create goes through the `seededItem` fixture (`src/fixtures/testdata.fixture.ts`), which creates over the API and deletes in teardown, tolerating only a 404 (the test
deleted it itself) and rethrowing everything else.

## Timeouts

Five are configured, and a failure message names the one that fired. Change the narrowest one that fixes your problem, not the global.

| Setting                 | Value | Applies to                                       |
| ----------------------- | ----- | ------------------------------------------------ |
| `timeout`               | 60s   | One whole test, including fixtures               |
| `expect.timeout`        | 10s   | One web-first assertion's retry window           |
| `use.actionTimeout`     | 15s   | One action: click, fill, press                   |
| `use.navigationTimeout` | 30s   | `goto` and navigations                           |
| `webServer.timeout`     | 30s   | Waiting for the demo app to boot on a cold start |

`toHaveScreenshot` has its own `maxDiffPixelRatio: 0.01`. See [CI and reporting](ci.md).

Raising a timeout is almost never the fix for a flaky test. It is usually the wrong locator, a missing precondition gate, or a genuine performance regression worth knowing about. Retries are set to 2
on CI and 0 locally, so a test that only passes on retry is visibly flaky rather than quietly green.

`forbidOnly` is on in CI: a stray `test.only` fails the pipeline instead of silently reducing the suite to one test.

## Fixtures

Fixtures are split by concern and composed with `mergeTests` in `src/fixtures/index.ts`:

| Fixture file          | Provides                                                   |
| --------------------- | ---------------------------------------------------------- |
| `pom.fixture.ts`      | `loginPage`, `inventoryPage`, `formPage`, `a11yPage`       |
| `api.fixture.ts`      | `api` (test-scoped), `authToken` (worker-scoped)           |
| `testdata.fixture.ts` | `seededItem` (extends `apiTest`, so it brings `api` along) |
| `a11y.fixture.ts`     | `checkA11y`                                                |

Every spec imports `{ expect, test }` from `../../src/fixtures`. Fixtures are lazy: a spec that never names `api` never pays for the login.

## Tags

`@smoke` for the critical path, `@regression` for everything else, plus `@api`, `@a11y` and `@visual`. Declared with the options object, not in the title:

```typescript
test('signs in with valid credentials', { tag: ['@smoke'] }, async ({ loginPage }) => {});
```

Run a subset with `npm run test:smoke`, `npm run test:regression`, or `npx playwright test --grep @api`.

## Accessibility

`a11y` is the usual shorthand for _accessibility_: an `a`, the 11 letters between, a `y`.

`checkA11y()` runs [axe-core](https://github.com/dequelabs/axe-core) inside the page and checks the rendered DOM against **WCAG 2.1 Level A and AA** (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, set as
the default tags in `src/fixtures/a11y.fixture.ts`). It returns violation ids such as `color-contrast`, `image-alt` or `link-name`, and attaches the full report to the test result so a CI failure is
diagnosable without re-running it locally.

Scan a real, settled page. Log in first if the page needs it, and gate on the content having rendered, or you scan a redirect or a half-built DOM and get a meaningless pass. Both traps are live in
`tests/a11y/accessibility.spec.ts`.

### Narrow a scan honestly

`exclude` drops a subtree: use it for a third-party widget or embed you genuinely cannot change. `disableRules` switches a rule off everywhere: use it for an accepted design decision. Either way,
**write down why in the test**. An undocumented exclusion is indistinguishable from a bug someone hid.

Prove the narrowing worked. `tests/a11y/accessibility.spec.ts` asserts that excluding `img` and disabling `color-contrast` leaves exactly `['link-name']`, so a narrowing that silently matched nothing
fails the test.

### What this does not cover

Automated scanning finds roughly **30 to 40 percent** of real accessibility problems. It is a regression net, not a certificate, and it should never be reported as "the app is accessible".

axe can tell you an image has no `alt`. It cannot tell you the `alt` reads "image1". It does not catch an illogical tab order, a keyboard trap, a focus state you cannot see, a screen-reader
announcement that makes no sense, or an error message sitting next to a field it was never associated with. Those need a keyboard and a screen reader.

Rules also move between axe versions. axe-core 4.13 accepts `placeholder="Your email"` as an accessible name, so the `label` rule passes on an input that only has a placeholder, which is still poor
practice. When a version bump changes the expected set, update the assertion to what axe now reports rather than loosening it.

## Third-party dependencies

Tests must not depend on sites you do not control. Mock at the network boundary with `page.route`. See `tests/ui/network-mocking.spec.ts`.

### The one deliberate exception

`tests/external/saucedemo.spec.ts` drives [saucedemo.com](https://www.saucedemo.com/), Sauce Labs' public practice shop. It exists to demonstrate a full end-to-end purchase against a real site, which
the bundled demo app cannot show.

It is fenced off so the rule above still holds everywhere it matters:

- Its own `saucedemo` project, with its own `baseURL`.
- **Not** in `npm run test:ci`, so a pull request can never fail because someone else's site is down.
- Tagged `@external`, and the nightly workflow runs `--grep-invert @external`.
- Its own `test` object (`src/fixtures/saucedemo.fixture.ts`), not merged into `src/fixtures/index.ts`, so an internal spec cannot reach a third-party page object by accident.

Run either target, or both:

| Command                  | Target                              |
| ------------------------ | ----------------------------------- |
| `npm test`               | Your own build only. Works offline. |
| `npm run test:saucedemo` | The live site only.                 |
| `npm run test:all`       | Both.                               |

`test:smoke`, `test:regression` and `test:ui` also carry `--grep-invert @external`, so the everyday commands never reach the network. If you fork this template for a real project, deleting
`tests/external/`, `src/pages/saucedemo/` and the `saucedemo` project is a reasonable first move.

## Never let a secret reach a report

`testInfo.attach` feeds **every** reporter at once: the built-in HTML report, the `blob` report CI uploads as an artifact, and Allure. `src/api/api-client.ts` runs response bodies through
`sanitiseBody` (`src/utils/reporting.ts`), which redacts secret-looking keys and caps the body at 8192 characters. If you add a new attachment, run it through `sanitiseBody` too.

Note the limit: `sanitiseBody` covers the API attachment path only. Traces are not redacted. See [CI and reporting](ci.md).

## Commit messages

Conventional Commits, enforced by commitlint through a husky `commit-msg` hook. The scope allowlist lives in `commitlint.config.mjs`.

`.husky/pre-commit` runs lint-staged (ESLint `--fix` and Prettier over the staged files) and then `npm run typecheck` over the whole project. `npm test` is **not** run by the hooks: the suite is a CI
gate, not a commit gate.

One trade-off worth knowing: `tsc --noEmit` checks the working tree, not the staged snapshot. So you can stage a type error, fix it without staging the fix, and commit successfully, leaving a `HEAD`
that does not compile. The hook comment says as much.
