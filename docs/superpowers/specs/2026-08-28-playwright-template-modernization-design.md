# Playwright Boilerplate Modernization — Design

Date: 2026-08-28
Status: Approved

## Purpose

Turn `playwright-boilerplate-pom-ts` into a reusable, client-neutral Playwright
template that can seed every new test-automation assignment. It must be usable
on day one of an assignment: clone, point `BASE_URL` at the system under test,
delete the demo app, start writing page objects.

## Success criteria

- `npm ci && npx playwright test` passes on a clean checkout with no external
  network dependency and no configuration.
- No client-specific code, selectors, or copyright notices remain in the working
  tree.
- `npm run typecheck` and `npm run lint` pass with TypeScript `strict` enabled.
- Ready-to-copy examples exist for UI (POM + fixtures), API, accessibility, and
  visual regression.
- CI pipelines for GitHub Actions, GitLab CI, Azure Pipelines, and Jenkins all
  shard, merge, and publish a single HTML report.
- Both a merged built-in HTML report and an Allure report are produced by every
  CI run.
- The template follows every applicable recommendation in Playwright's official
  best-practices guide (see "Best-practices alignment"), enforced by lint rules
  where a rule exists.
- A new user can adapt the template to a real project by following
  `docs/adapting-to-a-new-project.md`.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Reset depth | Keep the `src/` + `tests/` shape, rewrite the contents | Layout is sound; the helper bodies carry client IP and untyped code |
| Git history | Left intact (no squash) | Template stays private; revisit before any public release |
| CI platforms | GitHub Actions, GitLab CI, Azure Pipelines, Jenkins | Assignments do not always land on GitHub |
| Reporting | Built-in `html` + `blob` merge published to GitHub Pages, **plus Allure** | Built-in report is the zero-dependency default; Allure adds history, trends, severity and ticket links that stakeholders ask for |
| Example breadth | UI + POM + fixtures, API, a11y (axe), visual regression | All four are routinely asked for on assignments |
| Demo target | Bundled mini app behind Playwright `webServer` | Deterministic; never breaks when a third-party site changes |
| Tooling | TS strict + ESLint + Prettier, date-fns (drop moment), Docker + devcontainer, Husky + lint-staged + commitlint | Full team-grade baseline |

## Client-IP scrub (blocking, phase 1)

The repo currently carries material from a previous engagement. All of it is
removed before anything else is built:

- `src/page-objects/shared/toolbox/table.ts` — `Copyright (C) 2024, Alphabet
  International GmbH` header, and the Alphabet design-system selectors
  `.al-label` and `al-ds-icon-checked`.
- `src/helpers/parserHelper.ts` — the "used to make branch names easier to
  handle for TDS" comment and `removeSpecialCharacters`, which existed only for
  that purpose.
- `src/fixtures/constants/common.enums.ts` — `Markets` (es/de/fr) and the
  `Buttons` enum including `CONFIRM_DELIVERY_LOCATION`.
- `src/helpers/gitHelper.ts` — deleted outright; it shelled out to git solely to
  feed TDS branch naming.
- `src/helpers/pageHelper.ts` — the hardcoded `[test-id="main-loader"]` selector
  becomes a configurable hook on the base page object.

Git history retains this material (commit `8da384c`). That is acceptable while
the repository is private. If it is ever published, history must be squashed to
a fresh initial commit first — recorded here so the decision is not forgotten.

## Demo app

`demo-app/` is a single dependency-free Node `http` server (`server.ts`, run
through `tsx`) that serves four static pages — login, inventory table, form, and
a deliberately inaccessible page — plus an in-memory JSON API under `/api` with
full CRUD. State resets on restart, so the API examples are repeatable. The
whole directory is deletable in one step when the template is adapted to a real
project; `docs/adapting-to-a-new-project.md` covers exactly what to change after
deleting it.

## Repository layout

```
.devcontainer/devcontainer.json
.github/workflows/playwright.yml      PR/push: sharded, merged report, Pages publish
.github/workflows/nightly.yml         scheduled cross-browser full run
.github/dependabot.yml                weekly grouped dependency updates
.gitlab-ci.yml
azure-pipelines.yml
Jenkinsfile
docker/Dockerfile, docker/docker-compose.yml
demo-app/                             pages/ (HTML+CSS+JS) and server.ts (Node http)
src/
  fixtures/
    index.ts                          merged `test` export (mergeTests)
    pom.fixture.ts
    api.fixture.ts
    a11y.fixture.ts
    testdata.fixture.ts
  pages/
    base.page.ts
    login.page.ts
    inventory.page.ts
    form.page.ts
  components/
    base.component.ts
    table.component.ts
    nav.component.ts
  api/
    api-client.ts
    schemas.ts                        zod response schemas
  data/
    users.ts
    catalogue.ts
  utils/
    generator.ts                      faker + date-fns
    env.ts                            typed, validated environment loading
    paths.ts                          storage-state location
    mock.ts                           page.route helper for pinning data
    wait.ts
  setup/
    auth.setup.ts                     produces storageState
tests/
  ui/  api/  a11y/  visual/
docs/
  getting-started.md
  writing-page-objects.md
  ci.md
  conventions.md
  adapting-to-a-new-project.md
playwright.config.ts, tsconfig.json, eslint.config.mjs, .prettierrc, .env.example
```

## Naming conventions

- Files: kebab-case with a role suffix — `.page.ts`, `.component.ts`,
  `.fixture.ts`, `.setup.ts`, `.spec.ts`.
- Classes: PascalCase (`LoginPage`, `TableComponent`).
- This replaces today's inconsistent `landingApp.index.ts` exporting
  `landingAppIndex`.

## Architecture

### Page objects

`BasePage` owns the shared surface: the `Page` handle, a `goto(path)` built on
`baseURL`, and an overridable loading-indicator hook (replacing the hardcoded
`main-loader` selector). Concrete pages expose `Locator` properties and
intention-revealing methods; they never contain assertions beyond readiness
waits — assertions live in specs.

### Components

`BaseComponent` takes a `Page` and a parent `Locator` and scopes all internal
locators to that parent, so a component can be reused anywhere on a page.
`TableComponent` is the de-branded rewrite of the existing table toolbox: column
lookup by header name, row lookup by cell value, cell access by index, row
counts. It is built on ARIA role locators (`getByRole('table' | 'columnheader' |
'row' | 'cell')`) rather than the `table`/`thead th`/`tbody tr` CSS chains the
old toolbox used, and it contains no `waitForTimeout` — the old
`waitForTableToBeVisible` slept 1.5s unconditionally. `NavComponent`
demonstrates a second, simpler component.

### Fixtures

Fixtures are split by concern and composed with `mergeTests`, so each can be
understood and used independently:

- `pom.fixture.ts` — instantiates page objects.
- `api.fixture.ts` — provides a configured `ApiClient` over Playwright's
  `request` context.
- `a11y.fixture.ts` — provides a `checkA11y()` helper wrapping
  `@axe-core/playwright`.
- `testdata.fixture.ts` — per-test generated data with automatic cleanup in the
  fixture teardown.

`src/fixtures/index.ts` exports the merged `test` and re-exports `expect`. Every
example spec uses at least one custom fixture, unlike the current
`example.spec.ts`, which imports the custom `test` and then only uses `page`.

### Test data

`generator.ts` is rewritten on faker + date-fns (moment is dropped; it is in
maintenance mode and is currently a production dependency). It keeps the useful
generic helpers — random strings, IBAN, dates relative to today — and drops the
domain-specific ones (VIN, registration plate).

### Environment

`utils/env.ts` loads `.env` through dotenv and validates it with zod, failing
fast with a readable message when a required variable is missing. `.env.example`
documents every variable. No secret is ever committed.

## Playwright configuration

- `baseURL` from validated env, defaulting to the local demo app.
- `testIdAttribute: 'data-testid'`.
- `webServer` starting the demo app, with `reuseExistingServer: !process.env.CI`.
- `expect.timeout` and a global `timeout` set explicitly.
- `trace: 'on-first-retry'`, `video`/`screenshot` `retain-on-failure`.
- `snapshotPathTemplate` keeping visual baselines per project and platform.
- Reporters as a list: `list` + `html` + `allure-playwright` locally; `github` +
  `blob` + `allure-playwright` under CI.
- Projects: `setup` (auth → `storageState`), `chromium`, `firefox`, `webkit`,
  `mobile-chrome`, `api` (no browser), `a11y`, and `visual` (chromium only, so
  baselines stay stable).
- `workers` no longer pinned to 1 on CI, since sharding now provides the
  isolation that pinning was compensating for.

## Example tests

- **UI** — login via `storageState`, a table interaction through
  `TableComponent`, a form submission, network mocking with `page.route`, soft
  assertions, and tagged tests (`@smoke`, `@regression`).
- **API** — CRUD against the demo app's JSON stub through `ApiClient`, zod schema
  validation of responses, and a UI test whose state is seeded over the API.
- **Accessibility** — an axe scan of a deliberately flawed demo page, showing
  both a full-page scan and a scoped scan with documented exclusions.
- **Visual** — `toHaveScreenshot` with masking of volatile regions, plus a
  component-scoped snapshot.

## Best-practices alignment

The template is a worked demonstration of Playwright's official best-practices
guide. Each recommendation maps to something concrete, and every rule that can
be enforced by a linter is enforced rather than documented.

| Recommendation | How the template satisfies it |
|---|---|
| Test user-visible behaviour | Page objects expose intention-revealing methods; assertions target rendered text, roles and ARIA state, never CSS classes or internals |
| Use locators, prefer user-facing attributes | Role/label/text locators first, `getByTestId` second, CSS/XPath only where nothing else works and with a comment saying why; `docs/writing-page-objects.md` states the priority order |
| Use chaining and filtering | `BaseComponent` scopes every locator to a parent; `TableComponent` finds rows with `.filter({ hasText })` rather than index arithmetic |
| Use web-first assertions | Only `await expect(locator)` matchers; `eslint-plugin-playwright`'s `prefer-web-first-assertions` and `no-element-handle` make the alternative a lint error |
| Make tests isolated | No shared module-level state; the test-data fixture generates and cleans up per test; auth is a `setup` project producing `storageState`, not a shared logged-in session |
| Avoid third-party dependencies | The bundled demo app is the only target; `page.route` mocking is demonstrated for the case where a real dependency must be stubbed |
| Test across all browsers | Chromium, Firefox, WebKit and mobile-chrome projects |
| Keep Playwright updated | Dependabot config (`.github/dependabot.yml`) grouping Playwright and browser-related updates weekly |
| Lint your tests | ESLint flat config with type-aware `typescript-eslint`, `@typescript-eslint/no-floating-promises` (catches missing `await`), and `eslint-plugin-playwright`'s recommended set; `tsc --noEmit` runs as a CI job |
| Run tests on CI on every commit/PR | All four pipelines trigger on push and pull request |
| Optimize browser downloads on CI | PR runs install `chromium` only (`npx playwright install chromium --with-deps`); the nightly workflow installs all browsers |
| Use parallelism and sharding | `fullyParallel: true`, a sharded CI matrix, and `--shard=i/n` in every pipeline |
| Configure debugging | `test:ui`, `test:debug`, `test:headed`, `codegen`, and `report` npm scripts; `trace: 'on-first-retry'` so CI failures always have a trace |
| Use soft assertions | Demonstrated in the form example, where several field-level checks are collected before the test ends |
| Consistent OS for visual tests | The `visual` project is chromium-only, `snapshotPathTemplate` keys baselines by project and platform, and the Docker image lets baselines be generated on the same Linux image CI uses |

## Reporting

Two reporters run side by side. The built-in one is the always-works default
that needs no toolchain; Allure is the stakeholder-facing one.

### Built-in HTML

Each CI shard writes a `blob` report. A merge job runs
`npx playwright merge-reports --reporter html` over the downloaded blobs and
produces one HTML report covering the whole run, including traces and videos.
GitHub Actions publishes it to GitHub Pages and posts a run summary through the
`github` reporter; GitLab publishes to GitLab Pages; Azure Pipelines and Jenkins
publish it as a pipeline artifact.

### Allure

`allure-playwright` is added to the reporter list, writing `allure-results/`
alongside the blob output. The merge job concatenates every shard's
`allure-results/` and runs `allure generate`, restoring the previous run's
`history/` directory from the published site first so trend and retry graphs
accumulate across runs. `allure-commandline` requires a JVM, so each pipeline
provisions Java in the merge job only (`actions/setup-java` on GitHub, the
matching step elsewhere); Jenkins uses the Allure plugin instead. The built-in
report is therefore never blocked if the Allure step fails.

The template demonstrates the Allure metadata that justifies the extra
dependency:

- `allure.severity()`, `allure.epic()` / `feature()` / `story()` for grouping.
- `allure.link()` / `issue()` / `tms()` so a spec points at its ticket, with the
  URL patterns configured from env so each assignment sets its own tracker.
- `allure.attachment()` for API request/response bodies.
- `test.step()` throughout the page objects, which produces a readable step tree
  in both the Allure and the built-in report.

`docs/ci.md` documents how to drop Allure entirely — remove one reporter entry,
one dependency, and one CI job — for assignments that do not want it.

## CI/CD

All four pipelines share the same shape: install with `npm ci`, cache browsers,
install only the browsers that run (`chromium` on PRs, all of them nightly),
run a sharded matrix, upload blob and `allure-results` artifacts, merge both
reports in a single follow-up job, publish. A separate `lint` job runs
`npm run lint` and `npm run typecheck` so type and lint failures are reported
independently of test failures.

GitHub Actions additionally sets an explicit least-privilege `permissions:`
block, `concurrency` with `cancel-in-progress`, and a separate scheduled nightly
workflow that runs the full cross-browser suite rather than the smoke subset.

## Error handling

- Missing or malformed environment configuration fails at load time in
  `utils/env.ts`, before any browser starts.
- `ApiClient` raises with the status, URL, and response body on unexpected
  responses, so API failures are diagnosable from the report alone.
- Schema validation failures report the zod issue path.
- Retries are limited to CI and paired with `trace: 'on-first-retry'`, so the
  first failure is always captured.

## Test isolation against a shared demo store

The demo app holds one in-memory store shared by every Playwright worker, and
the form and API examples add rows to it. Any spec asserting on an exact row
count therefore pins its own data with `mockItems()` (`page.route` over
`/api/items`) rather than reading whatever the store happens to contain. Specs
that exercise the real API assert relationally — "contains", "no longer
contains" — or search for a name unique to their own fixture data. This is the
same "control your test data" guidance the best-practices guide gives, applied
to the template's own examples.

## Verification

The template's own correctness is verified by running it: `npm run lint`,
`npm run typecheck`, and `npx playwright test` against the bundled demo app must
all pass locally and in CI. Because the demo app is committed and served by
`webServer`, this is deterministic and requires no external service.

## Build order

1. Scrub client IP; toolchain (TypeScript strict + tsconfig, ESLint flat config
   with eslint-plugin-playwright, Prettier, dependency refresh to Playwright
   1.62 / faker 10 / TypeScript 5.9, moment → date-fns, everything to
   `devDependencies`).
2. Demo app and `playwright.config.ts`.
3. Fixtures, base page/component, page objects, UI examples.
4. API, accessibility, and visual examples.
5. Reporting (built-in merge + Allure) and the four CI pipelines.
6. Docker, devcontainer, Dependabot, Husky + lint-staged + commitlint, README
   and `docs/`.

## Out of scope

- Any hosted reporting service (Currents, Testomat.io, Testmo).
- Component testing (`@playwright/experimental-ct-*`).
- Performance or load testing.
- BDD/Cucumber layers.
