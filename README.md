# Playwright Boilerplate: POM + TypeScript

An opinionated, ready-to-use Playwright template: page objects, composable fixtures, UI/API/accessibility/visual examples, dual reporting and CI pipelines for four platforms. Clone it, point it at
your application, and start writing tests.

## Quick start

```bash
git config --global core.longpaths true   # Windows only, before cloning
npm ci
npx playwright install --with-deps
cp .env.example .env
npm test
```

Everything runs against the bundled demo app in `demo-app/`, so the suite is green on a fresh clone with no configuration. If any of those four commands fails,
[getting started](docs/getting-started.md) covers the known first-run failures.

## What is in the box

| Area          | What you get                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Structure     | Page objects, root-scoped components, fixtures split by concern and merged with `mergeTests`                               |
| UI examples   | `storageState` auth, table interaction, form validation with soft assertions, network mocking, `@smoke`/`@regression` tags |
| API examples  | Typed client, zod-validated responses, CRUD, negative paths, a UI test seeded over the API                                 |
| Accessibility | `@axe-core/playwright` fixture with scoping, exclusions and attached violation reports                                     |
| Visual        | Full-page and component snapshots, masking, per-project/platform baselines                                                 |
| Reporting     | Built-in HTML merged across shards, plus Allure with history, severities and ticket links                                  |
| CI            | GitHub Actions (+ nightly + Dependabot), plus GitLab CI, Azure Pipelines and Jenkins under `ci/`                           |
| Tooling       | TypeScript strict, ESLint with type-aware and Playwright rules, Prettier, Husky, Docker, devcontainer                      |

## Layout

```
src/                 page objects, components, fixtures, API client, helpers
tests/               specs: ui/, api/, a11y/, visual/
demo-app/            the bundled app the examples run against (delete this first)
docs/                the guides linked below
ci/                  GitLab, Azure and Jenkins pipelines
.github/workflows/   GitHub Actions (must live here; GitHub does not look elsewhere)
docker/              Dockerfile and compose file
```

GitLab needs one setting to find its file outside the root. See [docs/ci.md](docs/ci.md). Azure and Jenkins take the path when you create the pipeline, so they need nothing extra.

## Commands

| Command                         | What it does                                          |
| ------------------------------- | ----------------------------------------------------- |
| `npm test`                      | Run every project                                     |
| `npm run test:ci`               | Chromium + api + a11y + visual (what CI runs on a PR) |
| `npm run test:smoke`            | Only `@smoke` tests                                   |
| `npm run test:regression`       | Only `@regression` tests                              |
| `npm run test:ui`               | Playwright UI mode with time-travel debugging         |
| `npm run test:debug`            | Step through with the Playwright inspector            |
| `npm run test:headed`           | Run with a visible browser window                     |
| `npm run test:api`              | Only the `api` project                                |
| `npm run test:a11y`             | Only the `a11y` project                               |
| `npm run test:visual`           | Only the `visual` project                             |
| `npm run test:update-snapshots` | Refresh changed visual baselines                      |
| `npm run codegen`               | Record a test and generate locators                   |
| `npm run report`                | Open the built-in HTML report                         |
| `npm run report:allure`         | Generate and open the Allure report (needs a JVM)     |
| `npm run demo`                  | Start the bundled demo app on its own                 |
| `npm run lint`                  | ESLint over the repository                            |
| `npm run lint:fix`              | ESLint with autofix                                   |
| `npm run typecheck`             | `tsc --noEmit`                                        |
| `npm run format`                | Prettier, writing in place                            |
| `npm run format:check`          | Prettier in check mode (the CI gate)                  |

## Documentation

- [How it works](docs/how-it-works.md): start here if you are new to Playwright
- [Getting started](docs/getting-started.md)
- [Conventions](docs/conventions.md)
- [Writing page objects](docs/writing-page-objects.md)
- [CI and reporting](docs/ci.md)
- [Adapting to a new project](docs/adapting-to-a-new-project.md)

## Requirements

Node `^20.19.0 || ^22.13.0 || >=24`. `.npmrc` sets `engine-strict=true`, so `npm ci` refuses to run outside that range rather than failing later in a confusing way.

A JDK 17+ is needed only to generate the Allure report locally; the CI report jobs provision one themselves.
