# Adapting to a new project

Roughly twenty minutes from clone to your first real test.

## 1. Point at your application

Edit `.env` (copied from `.env.example`):

```bash
BASE_URL=https://staging.your-app.example.com
API_URL=https://staging.your-app.example.com/api
TEST_USERNAME=...
TEST_PASSWORD=...
TICKET_BASE_URL=https://your-tracker.example.com/browse/
```

Credentials belong in your CI secret store, never in a committed file. Keep
`.env.example` free of real values — it is tracked.

Update the defaults in `src/utils/env.ts` too, or leave them: a default that
points at a demo app you have deleted is just a confusing failure mode.

## 2. Remove the demo app

```bash
rm -rf demo-app
```

Then:

- delete the whole `webServer` block from `playwright.config.ts` — Playwright no
  longer needs to start anything;
- remove the `demo` script from `package.json`;
- remove `demo-app/**/*.ts` from `tsconfig.json`'s `include`;
- remove `demo-app/public/**/*.js` from the `ignores` list in
  `eslint.config.mjs`;
- drop `DEMO_PORT` from `src/utils/env.ts` and `.env.example`;
- remove `demo-app` from the scope allowlist (step 9).

`demo-app/` is referenced from `.dockerignore`'s comments as load-bearing for
the image; with the app gone, that note no longer applies.

## 3. Remove this template's own planning scaffolding

```bash
rm -rf docs/superpowers
```

`docs/superpowers/` holds the plan and design spec used to build this template.
It documents _this repository's_ construction, not your project, and a new
project should not inherit it. The five docs beside it
(`getting-started.md`, `conventions.md`, `writing-page-objects.md`, `ci.md`,
`adapting-to-a-new-project.md`) are the ones worth keeping and editing.

## 4. Replace the examples

Delete the contents of `tests/ui`, `tests/api`, `tests/a11y` and `tests/visual`,
the committed baselines under `tests/visual/__screenshots__/`, and the
demo-specific page objects in `src/pages` (`login.page.ts`, `inventory.page.ts`,
`form.page.ts`, `a11y.page.ts`). Keep:

- `src/pages/base.page.ts`
- `src/components/base.component.ts` and `src/components/table.component.ts`
- `src/utils/` in full
- `src/api/api-client.ts` (adjust the endpoints) and `src/api/schemas.ts`
  (replace the zod schemas)
- every file in `src/fixtures/`

**`src/components/nav.component.ts` is demo-specific** — it hardcodes the
`current-user` and `logout` test ids and an `'Inventory' | 'New item'`
destination union. Adapt it to your own navigation or delete it; do not assume
it is generic like `TableComponent` is.

`src/data/catalogue.ts` mirrors the demo seed and should go.
`src/data/users.ts` is worth keeping — it just reads credentials from `env`.

Work through `src/fixtures/pom.fixture.ts` and remove the fixtures whose page
objects you deleted; `npm run typecheck` will point at anything you miss.

## 5. Adjust the test id attribute

If your application uses something other than `data-testid`, change
`testIdAttribute` in `playwright.config.ts`. Prefer role and label locators
regardless — see [conventions](conventions.md).

## 6. Rework authentication

`src/setup/auth.setup.ts` signs in through the UI and saves `storageState` to
the path in `src/utils/paths.ts`. Common variations:

- **Token-only auth:** call your login endpoint with `request` and write the
  token into `storageState`'s `origins[].localStorage`.
- **SSO:** sign in once manually with `npx playwright codegen --save-storage`,
  and commit nothing — store the state as a CI secret.
- **Multiple roles:** add one setup file per role, each writing its own storage
  state file, and give each browser project the matching `storageState`.

Note that the `api` and `a11y` projects deliberately have no `storageState` and
no `dependencies: ['setup']`. If you give one of them a page that redirects
unauthenticated users, the test will silently scan the login page under the
wrong name — a permanent false pass. Either add the dependency or log in
explicitly inside the test, and assert on something that only the real page
shows.

## 7. Add a global loading indicator

Most real applications have one. Set `loadingIndicatorTestId` in your page
objects (or override `waitUntilLoaded` in `BasePage`) so every navigation waits
for it to disappear. See [writing page objects](writing-page-objects.md).

## 8. Pick your CI

Keep one pipeline file and delete the rest. See [CI and reporting](ci.md),
which also covers the image pinning you must not break.

## 9. Update the commit scope allowlist

`commitlint.config.mjs` lists the scopes this template uses — several of which
(`demo-app`, `plan`, `visual`) will not match your project. Replace them with
your own areas, or delete the `scope-enum` rule entirely to allow any scope.

## 10. Generate visual baselines

Once you have visual tests again:

```bash
# Your own platform, for local runs
npx playwright test --project=visual --update-snapshots=all

# Linux, for CI — must be generated inside the pinned image
docker compose -f docker/docker-compose.yml run --rm tests \
  npx playwright test --project=visual --update-snapshots=all
```

Commit the PNGs. `npm run test:ci` includes `--project=visual`, so without the
Linux baselines the very first CI run fails with "A snapshot doesn't exist".

Read the [visual baselines section of the CI guide](ci.md) before you do this —
using the bare `--update-snapshots` preset instead of `=all` silently refuses to
rewrite anything that still matches within `maxDiffPixelRatio`.

## 11. Rename the repository

`package.json` still says `playwright-boilerplate-pom-ts` with
`"version": "2.0.0"` and `"private": true`. Update `name`, `description` and
`version`, and rewrite `README.md` for your project — keeping the links to
these docs if you kept the docs.
