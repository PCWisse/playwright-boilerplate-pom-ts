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
- A new user can adapt the template to a real project by following
  `docs/adapting-to-a-new-project.md`.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Reset depth | Keep the `src/` + `tests/` shape, rewrite the contents | Layout is sound; the helper bodies carry client IP and untyped code |
| Git history | Left intact (no squash) | Template stays private; revisit before any public release |
| CI platforms | GitHub Actions, GitLab CI, Azure Pipelines, Jenkins | Assignments do not always land on GitHub |
| Reporting | Built-in `html` + `blob` merge, published to GitHub Pages | Zero extra dependencies; Allure was deliberately removed earlier |
| Example breadth | UI + POM + fixtures, API, a11y (axe), visual regression | All four are routinely asked for on assignments |
| Demo target | Bundled static mini app behind Playwright `webServer` | Deterministic; never breaks when a third-party site changes |
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

## Repository layout

```
.devcontainer/devcontainer.json
.github/workflows/playwright.yml      PR/push: sharded, merged report, Pages publish
.github/workflows/nightly.yml         scheduled cross-browser full run
.gitlab-ci.yml
azure-pipelines.yml
Jenkinsfile
docker/Dockerfile, docker/docker-compose.yml
demo-app/                             static app + tiny JSON API stub
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
    types.ts
  utils/
    generator.ts                      faker + date-fns
    env.ts                            typed, validated environment loading
    wait.ts
    logger.ts
  setup/
    auth.setup.ts                     produces storageState
    global.setup.ts, global.teardown.ts
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
counts. `NavComponent` demonstrates a second, simpler component.

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
- Reporters as a list: `list` + `html` locally; `github` + `blob` under CI.
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

## Reporting

Each CI shard produces a `blob` report. A merge job runs `npx playwright
merge-reports --reporter html` over the downloaded blobs and produces one HTML
report covering the whole run, including traces and videos. GitHub Actions
publishes it to GitHub Pages and posts a run summary through the `github`
reporter; GitLab publishes to GitLab Pages; Azure Pipelines and Jenkins publish
it as a pipeline artifact.

## CI/CD

All four pipelines share the same shape: install with `npm ci`, cache browsers,
install browsers with `--with-deps`, run a sharded matrix, upload blob reports,
merge, publish.

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

## Verification

The template's own correctness is verified by running it: `npm run lint`,
`npm run typecheck`, and `npx playwright test` against the bundled demo app must
all pass locally and in CI. Because the demo app is committed and served by
`webServer`, this is deterministic and requires no external service.

## Build order

1. Scrub client IP; toolchain (TypeScript strict + tsconfig, ESLint flat config
   with eslint-plugin-playwright, Prettier, dependency refresh to Playwright
   1.62 / faker 10 / TypeScript 7, moment → date-fns, everything to
   `devDependencies`).
2. Demo app and `playwright.config.ts`.
3. Fixtures, base page/component, page objects, UI examples.
4. API, accessibility, and visual examples.
5. Reporting and the four CI pipelines.
6. Docker, devcontainer, Husky + lint-staged + commitlint, README and `docs/`.

## Out of scope

- Allure or any hosted reporting service.
- Component testing (`@playwright/experimental-ct-*`).
- Performance or load testing.
- BDD/Cucumber layers.
