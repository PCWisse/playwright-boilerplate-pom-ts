# How it works

An orientation for someone who is not used to work with Playwright. Read this once,
top to bottom, and the rest of `docs/` will make sense.

The other guides answer "how do I do X". This one answers "what am I looking at
and why is it built this way".

---

## 1. What this repository is

A **template**. You copy it, point it at a real application, delete the demo,
and start writing tests on day one instead of spending a week on plumbing.

What is already solved for you:

- A test runner configured for parallel, isolated, retryable runs
- A Page Object Model layer with a base class and reusable components
- Composable fixtures: logged-in pages, an API client, an accessibility
  scanner, disposable test data
- Four kinds of testing, each with working examples: **UI**, **API**,
  **accessibility**, **visual regression**
- Four CI platforms, pre-wired: GitHub Actions, GitLab CI, Azure Pipelines,
  Jenkins
- Reporting: the built-in HTML report, plus Allure
- A bundled demo application, so every example runs offline with nothing to
  install and nothing to log into

There are **10 spec files**, which expand to **62 test runs** because the UI
specs execute against four browser configurations.

---

## 2. Playwright in five minutes

Skip this section if you already know Playwright.

### It is a test runner, not just a browser library

You write `.spec.ts` files. The runner finds them, runs them in parallel across
worker processes, retries failures in CI, and produces a report. Each test gets
a **fresh browser context**. Think of it as a clean, isolated browser profile,
so tests cannot leak cookies or storage into each other.

### Locators are lazy, and they auto-wait

```ts
const button = page.getByRole('button', { name: 'Sign in' });
await button.click();
```

`getByRole(...)` does not touch the page. It describes _how to find_ an element.
Only `.click()` actually looks, and when it does, it automatically waits for
the element to exist, be visible, be stable and be enabled.

**This is why you almost never need a sleep.** If you find yourself reaching for
one, something else is wrong.

### Web-first assertions retry

```ts
await expect(page.getByRole('heading')).toBeVisible();
```

`expect(locator)` retries for up to the configured timeout. Contrast with:

```ts
expect(await locator.isVisible()).toBe(true); // ✗ one-shot, races the app
```

The first form waits for the app to catch up. The second takes a single snapshot
and fails if you asked a millisecond too early. Always prefer the first.

### Fixtures are dependency injection for tests

A fixture is a named thing a test can ask for by destructuring it:

```ts
test('shows the catalogue', async ({ inventoryPage }) => { ... });
```

Playwright sees you asked for `inventoryPage`, builds it, hands it over, and
tears it down afterwards. **Fixtures are lazy**: a test that never names `api`
never pays the cost of logging in. This is the single most important Playwright
concept in this repository: the whole architecture is built on it.

### Projects are named run configurations

One suite can run many ways: different browsers, different directories,
different settings. Each is a **project**. `--project=api` runs one of them.

### Traces are the debugging superpower

On a retry, Playwright records a **trace**: a step-by-step timeline with DOM
snapshots, network activity and console logs. `npx playwright show-trace` opens
it. When CI fails and you cannot reproduce locally, open the trace first.

---

## 3. What is installed, and why

Everything is a **devDependency** in the package json.
This project ships no runtime code, so there is deliberately no `dependencies` block.

### The runner

| Package            | Why                                       |
| ------------------ | ----------------------------------------- |
| `@playwright/test` | The runner, browsers, assertions, tracing |

### Language and quality gates

| Package                                     | Why                                                           |
| ------------------------------------------- | ------------------------------------------------------------- |
| `typescript`                                | Strict mode, including`noUncheckedIndexedAccess`              |
| `typescript-eslint`, `eslint`, `@eslint/js` | Type-aware linting, catching bugs a syntax-only linter cannot |
| `eslint-plugin-playwright`                  | Playwright-specific rules, e.g. banning`waitForTimeout`       |
| `prettier`, `eslint-config-prettier`        | Formatting, with the overlap disabled in ESLint               |
| `tsx`                                       | Runs the demo app's TypeScript directly, no build step        |

### Testing support

| Package                            | Why                                                                   |
| ---------------------------------- | --------------------------------------------------------------------- |
| `zod`                              | Validates API responses at runtime, so a contract change fails loudly |
| `@faker-js/faker`                  | Random test data, so parallel workers never collide                   |
| `date-fns`                         | Date maths                                                            |
| `@axe-core/playwright`, `axe-core` | The accessibility engine                                              |
| `dotenv`                           | Loads`.env` for local runs                                            |

### Reporting

| Package                                  | Why                                                 |
| ---------------------------------------- | --------------------------------------------------- |
| `allure-playwright`, `allure-js-commons` | Richer reporting: severities, ticket links, history |
| `allure-commandline`                     | Renders the Allure HTML, **needs a JVM**            |

### Repository hygiene

| Package                                              | Why                                    |
| ---------------------------------------------------- | -------------------------------------- |
| `husky`                                              | Git hooks                              |
| `lint-staged`                                        | Lints and formats only what you staged |
| `@commitlint/cli`, `@commitlint/config-conventional` | Enforces Conventional Commits          |

---

## 4. The layers

Dependencies point **downward only**. A page object never imports a spec; a
component never imports a page.

```
tests/                specs: what should be true
  ↓
src/fixtures/         wiring: hands specs what they asked for
  ↓
src/pages/            page objects: one class per page
  ↓
src/components/       components: reusable UI scoped to a root locator
  ↓
src/api/  src/utils/  src/data/   clients, helpers, constants
```

### `src/pages/`: one class per page

A page object hides _how_ to interact so the spec can say _what_ it wants. All
extend `BasePage` (`src/pages/base.page.ts`), which supplies `goto()` and an
optional loading-indicator hook.

### `src/components/`: reusable UI, scoped to a root

Every component has a **root locator** and searches only inside it, so the same
`TableComponent` works on any page with a table and can never accidentally match
something elsewhere. See `src/components/table.component.ts`.

Most take that root from the caller. A component that can only ever appear in
one place may fix its own instead. `NavComponent` takes just `page` and roots
itself on the main navigation landmark.

### `src/fixtures/`: the interesting part

Fixtures are split by concern, then merged:

```ts
// src/fixtures/index.ts
export const test = mergeTests(pomTest, testDataTest, a11yTest);
```

| Fixture file          | Provides                                              |
| --------------------- | ----------------------------------------------------- |
| `pom.fixture.ts`      | `loginPage`, `inventoryPage`, `formPage`, `a11yPage`  |
| `api.fixture.ts`      | `authToken` (worker-scoped), `api` (an `ApiClient`)   |
| `testdata.fixture.ts` | `seededItem`, created before the test, deleted after  |
| `a11y.fixture.ts`     | `checkA11y()`, which runs axe and attaches the report |

`testDataTest` extends `apiTest`, so merging it also brings in `api` and
`authToken`. Every spec imports one `test` and gets all of it.

**Worker-scoped vs test-scoped** is worth understanding. `authToken` is
worker-scoped: the login runs **once per worker process** and is reused by every
test that worker runs. `api` is test-scoped: each test gets a fresh request
context that is disposed at the end. Shared where sharing is safe, isolated
where it is not.

### `src/api/`: a typed, validated client

`ApiClient` wraps Playwright's `APIRequestContext` and validates every response
with zod. If the API changes shape, the test fails with a schema error naming
the field, not with `undefined is not an object` three layers away.

---

## 5. What happens when you run a test

Concretely, for `npx playwright test --project=chromium`:

1. **Config loads.** `playwright.config.ts` reads `.env` through
   `src/utils/env.ts`, which validates it with zod, so a missing or malformed
   variable fails immediately with a readable message.
2. **The demo app starts.** The `webServer` block launches `npm run demo` on
   port 4173 and waits for it to respond. Playwright shuts it down afterwards.
3. **The `setup` project runs first.** `chromium` declares
   `dependencies: ['setup']`, so `src/setup/auth.setup.ts` signs in once and
   saves the session to `playwright/.auth/user.json`.
4. **Tests run in parallel.** Each project loads that saved session via
   `storageState`, so **no UI test ever signs in itself**. Tests start already
   logged in.
5. **Fixtures resolve per test**, lazily, in dependency order.
6. **Reporters write output**: the HTML report, and Allure results.

Steps 3 and 4 are the pattern worth stealing for any project: log in once, reuse the
session everywhere, and never spend a test on a login form you are not testing.

---

## 6. The example suites

Each teaches one thing. Read them in this order.

| Directory       | Teaches                                             | Start with                 |
| --------------- | --------------------------------------------------- | -------------------------- |
| `tests/ui/`     | Page objects, fixtures, network mocking             | `login.spec.ts`            |
| `tests/api/`    | Typed requests, schema validation, negative cases   | `items.spec.ts`            |
| `tests/a11y/`   | Running axe, scoping a scan, documenting exceptions | `accessibility.spec.ts`    |
| `tests/visual/` | Screenshot baselines, masking unstable regions      | `inventory.visual.spec.ts` |

Two are worth a closer look because they teach something non-obvious:

**`tests/ui/network-mocking.spec.ts`** intercepts the API so the UI renders
exactly the data you choose. This is how you test an empty state or an error
state without needing the backend to produce one.

In **`tests/a11y/accessibility.spec.ts`**, one test asserts the _exact_ set of
violations on a deliberately broken page. That looks strange until you see the
point: a scan that silently returns nothing looks identical to a clean page.
Asserting the known-bad set proves the scanner is actually running.

---

## 7. The demo application

`demo-app/` is a small, dependency-free Node server: a login page, an inventory
table, a form, and a deliberately inaccessible page used as accessibility
fixture data. It exists so every example is runnable offline with no
credentials, no VPN and no shared environment.

Credentials are `standard_user` / `secret_sauce`. They are fake, and they are in
`.env.example` on purpose. **Real credentials never belong in a committed file.**
They go in your CI provider's secret store.

When you adapt the template, `demo-app/` is the first thing to delete. See
[adapting-to-a-new-project.md](adapting-to-a-new-project.md).

---

## 8. Your first hour

1. Read [getting-started.md](getting-started.md) and get the suite green
   locally. **On Windows, set `core.longpaths` before cloning.** It is in that
   guide, and the clone fails outright without it.
2. Run `npm run test:ui` and watch the suite execute in Playwright's UI mode.
   Click a step; the DOM snapshot at that moment appears. This is the fastest
   way to build a mental model.
3. Open `tests/ui/login.spec.ts`, then follow it down: `src/pages/login.page.ts`
   → `src/pages/base.page.ts`. Three small files, and you have seen the whole
   pattern.
4. Write one test of your own against the demo app. Break it deliberately and
   read the failure output.
5. Then read [conventions.md](conventions.md), which explains the rules the rest
   of the code follows, and _why_, which matters more than the rules.

---

## 9. Where to go next

| Guide                                                        | For                                                 |
| ------------------------------------------------------------ | --------------------------------------------------- |
| [getting-started.md](getting-started.md)                     | Install, run, debug                                 |
| [conventions.md](conventions.md)                             | Locators, assertions, waiting, isolation            |
| [writing-page-objects.md](writing-page-objects.md)           | Adding a page or component                          |
| [ci.md](ci.md)                                               | Pipelines, reports, visual baselines, data exposure |
| [adapting-to-a-new-project.md](adapting-to-a-new-project.md) | Turning this into your project                      |

Official documentation: [https://playwright.dev/docs/intro](https://playwright.dev/docs/intro). The
[best practices guide](https://playwright.dev/docs/best-practices) is short and
this template follows it deliberately, so if something here looks unusual, that
page probably explains why.
