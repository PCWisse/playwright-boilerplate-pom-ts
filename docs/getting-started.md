# Getting started

## Before you clone: Windows long paths

Visual baselines live under a deeply nested path
(`tests/visual/__screenshots__/{projectName}/{platform}/{testFilePath}/{arg}.png`).
From a deep parent directory this breaches the Windows `MAX_PATH` limit of 260
characters and the clone **fails**, part-way, with:

```
error: unable to create file tests/visual/__screenshots__/visual/win32/inventory.visual.spec.ts/inventory-empty-state.png: Filename too long
```

This is a hard failure, not a warning. Fix it once, globally, before cloning:

```bash
git config --global core.longpaths true
```

Cloning into a shallower directory (`C:\src\...` rather than a nested
OneDrive path) also works.

## Node version

`package.json` declares `engines.node` as `^20.19.0 || ^22.13.0 || >=24`. The
floor is set by ESLint 10, not by Playwright. `.npmrc` sets
`engine-strict=true`, so `npm ci` **hard-fails** with `EBADENGINE` outside that
range instead of installing something that cannot run. Check with `node -v`
before filing a bug.

## Install

```bash
npm ci
npx playwright install --with-deps
cp .env.example .env
```

`.env` is optional: every variable has a default that points at the bundled demo
app. Copy it anyway so you have somewhere to put your own values later.

## Run the suite

```bash
npm test
```

Playwright starts the bundled demo app automatically via the `webServer` block
in `playwright.config.ts`, so nothing else needs to be running.

### If the run dies in browser startup

On a memory-constrained machine (Docker Desktop with a small VM, or WSL capped
by a `memory=` line in `~/.wslconfig`) the full suite can fail before any test
code runs, with an error like:

```
Cannot find parent object browser@... to create debugger@...
```

That is browser-context creation failing under memory pressure, not a test
defect. Playwright defaults to roughly half your CPU count in workers and each
worker is a browser, so the lever is the worker count:

```bash
npx playwright test --workers=2
```

The Docker compose service already caps itself at `--workers=2` for this reason
(`docker/docker-compose.yml`).

## Watch it happen

```bash
npm run test:ui
```

UI mode gives you a watch mode, a DOM snapshot per action and time-travel
debugging. It is the fastest way to understand what a failing test did.

## Debug a single test

```bash
npx playwright test tests/ui/login.spec.ts --debug
npx playwright test -g "signs in with valid credentials" --debug
```

## Understand a CI failure

Download the `merged-reports` artifact, open `index.html`, and click into the
trace for the failed test.

`trace` is `'on-first-retry'` and `retries` is `2` on CI, `0` locally. So every
CI failure has a trace and a **local** failure does not. Locally, re-run with
`--trace on` or use UI mode instead of hunting for a trace that was never
recorded.

## Environment

`src/utils/env.ts` validates the environment with zod at load time, before any
browser starts. A missing or malformed variable fails immediately with the
offending field name rather than surfacing as a confusing timeout.

| Variable                          | Default                           | Purpose                           |
| --------------------------------- | --------------------------------- | --------------------------------- |
| `BASE_URL`                        | `http://127.0.0.1:4173`           | Application under test            |
| `API_URL`                         | `http://127.0.0.1:4173/api`       | API under test                    |
| `DEMO_PORT`                       | `4173`                            | Port for the bundled demo app     |
| `TEST_USERNAME` / `TEST_PASSWORD` | demo credentials                  | Used by `src/setup/auth.setup.ts` |
| `TICKET_BASE_URL`                 | `https://example.invalid/browse/` | Prefix for Allure issue links     |

Never put a real credential in `.env.example`. `.env` is git-ignored; real
values belong in your CI secret store.

### One trap worth knowing

`env.apiURL` is normalised to always end in `/`. Playwright's
`APIRequestContext` resolves a relative request path with `new URL(path, base)`,
and a base **without** a trailing slash drops its last segment, so
`new URL('items', 'http://host/api')` would become `http://host/items` and 404.
Because the normalisation happens once in `src/utils/env.ts`, request paths in
`src/api/api-client.ts` are relative and slash-free (`'items'`, not `'/items'`).
Keep it that way.
