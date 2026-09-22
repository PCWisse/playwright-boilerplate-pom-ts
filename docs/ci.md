# CI and reporting

## Pipelines

Four pipelines ship with the template. Keep the one you use and delete the rest.

| Platform        | File                                                                |
| --------------- | ------------------------------------------------------------------- |
| GitHub Actions  | `.github/workflows/playwright.yml`, `.github/workflows/nightly.yml` |
| GitLab CI       | `ci/.gitlab-ci.yml`                                                 |
| Azure Pipelines | `ci/azure-pipelines.yml`                                            |
| Jenkins         | `ci/Jenkinsfile`                                                    |

The three non-GitHub files live under `ci/` to keep the repository root
readable. Azure Pipelines and Jenkins take the file path when you create the
pipeline or job, so that costs nothing. **GitLab is the exception**: it looks
for `.gitlab-ci.yml` at the root, so set Settings → CI/CD → General pipelines →
_CI/CD configuration file_ to `ci/.gitlab-ci.yml` once. Until you do, GitLab
reports that the project has no `.gitlab-ci.yml` and runs nothing.

All four share the same shape: a static-analysis job (`npm run lint`,
`npm run typecheck`, `npm run format:check`), a four-way sharded test matrix
running `npm run test:ci`, then a report job that merges the shards.

PR runs execute `npm run test:ci`: chromium, api, a11y and visual. The nightly
GitHub workflow runs the full suite (`npx playwright test`), which adds firefox,
webkit and mobile-chrome.

### Sharding

The shard count is four everywhere, but it is expressed differently per
platform. Change **both** halves together or the denominator drifts from the
matrix:

| Platform | Index                         | Denominator                                 |
| -------- | ----------------------------- | ------------------------------------------- |
| GitHub   | `matrix.shard: [1, 2, 3, 4]`  | `${{ strategy.job-total }}`                 |
| GitLab   | `SHARD_INDEX` parallel matrix | `SHARD_TOTAL` (`ci/.gitlab-ci.yml:48`)      |
| Azure    | `SHARD_INDEX` per matrix leg  | `SHARD_TOTAL` (`ci/azure-pipelines.yml:15`) |
| Jenkins  | `SHARD_INDEX` axis            | `SHARD_TOTAL` (`ci/Jenkinsfile:39`)         |

GitHub derives the denominator from the matrix, so it cannot drift. The other
three cannot, so their variable and their matrix must be edited as a pair.

## Everything runs inside the pinned Playwright image

Every test job runs **inside** `mcr.microsoft.com/playwright:v1.62.1-noble`:
`container:` in both GitHub workflows, the top-level `image:` in GitLab, a
job-level container in Azure, and `docker { image ... }` in Jenkins.

This is not a convenience. It is what makes the visual tests reproducible, and
it is the single most important thing to understand about this pipeline.

### Why the image, not just the OS

`snapshotPathTemplate` in `playwright.config.ts` includes `{platform}`, so
baselines are per-platform. Two sets are committed:

```
tests/visual/__screenshots__/visual/win32/
tests/visual/__screenshots__/visual/linux/
```

The Linux set was generated **inside that image**. Running the same tests on a
bare `ubuntu-24.04` runner, the same Ubuntu version, fails every visual test
with no code change, because screenshots depend on the **font set**, not the OS
version. Inside the image `fc-match system-ui` resolves to WenQuanYi Zen Hei
and DejaVu is absent; the GitHub-hosted runner image has a different set. The
demo app's CSS names only generic families (`system-ui`, `sans-serif`), so
whichever face fontconfig picks is what gets rendered into the PNG.

This was measured, not assumed: installing `fonts-dejavu-core` into the image
and re-running comparison mode made `inventory-table` fail outright, and only
`maxDiffPixelRatio: 0.01` absorbed the other two.

The same reasoning is why `docker/Dockerfile` installs the JRE with
`--no-install-recommends`: the JRE recommends font packages, and pulling them in
would shift rendering and invalidate the baselines.

### Regenerating the Linux baselines

```bash
docker compose -f docker/docker-compose.yml run --rm tests \
  npx playwright test --project=visual --update-snapshots=all
```

Then commit the PNGs under `tests/visual/__screenshots__/visual/linux/`.

Use `--update-snapshots=all`, not the bare `npm run test:update-snapshots`.
Bare `--update-snapshots` in Playwright 1.62 uses the `changed` preset, which
**never rewrites a snapshot that already matches within
`maxDiffPixelRatio: 0.01`**. That is precisely the case after a version bump
where rendering drifted slightly but not past the threshold. You would see a green run
and conclude nothing needed regenerating, while the drift accumulates until it
crosses the threshold on some unrelated PR.

Note that `docker compose run` bind-mounts the repository, so the refreshed PNGs
land on your host ready to commit.

## Bumping @playwright/test

The image tag is written as literal text in YAML and Dockerfiles. **No
Dependabot ecosystem can bump it**: `.github/dependabot.yml` covers the `npm`
and `github-actions` ecosystems, and a container tag inside a `container:` block
is neither. Bumping the package without bumping the tag gives you
"browser not found" at runtime; bumping it without regenerating baselines gives
you three failing visual tests.

Checklist. Nine occurrences across seven files:

- [ ] `package.json`: `@playwright/test`
- [ ] `.github/workflows/playwright.yml` (line 50)
- [ ] `.github/workflows/nightly.yml` (line 24)
- [ ] `ci/.gitlab-ci.yml` (line 28)
- [ ] `ci/azure-pipelines.yml` (line 59)
- [ ] `ci/Jenkinsfile`: **three** occurrences (lines 46, 67 and 107)
- [ ] `docker/Dockerfile` (line 5)
- [ ] `.devcontainer/devcontainer.json` (line 3)
- [ ] Regenerate the Linux visual baselines (above) and commit them
- [ ] Regenerate your own platform's baselines too, if you run visual locally

`ci/Jenkinsfile` is the one people miss. Verify with:

```bash
grep -rn "mcr.microsoft.com/playwright:v" --exclude-dir=node_modules --exclude-dir=.git .
```

## Reports

Each shard writes a `blob` report and an `allure-results/` directory. The report
job merges them:

```bash
npx playwright merge-reports --reporter html ./all-blob-reports
npx allure generate allure-results --clean --output allure-report
```

The built-in HTML report is the default and needs no toolchain. Allure adds
severity, epic/feature/story grouping, ticket links and trend graphs across
runs. On GitHub, the report job checks out `gh-pages` and copies
`allure/history` back into `allure-results/` before generating. That restore
step is the whole mechanism behind the trend graphs. Jenkins gets history for
free because the Allure plugin runs `allure generate` itself and keeps history
across builds. GitLab and Azure have neither, so their trend graphs stay empty
until you add a history restore of your own.

### Flattening matters more than it looks

Downloaded shard artifacts must land in **one flat directory**. Azure's
`DownloadPipelineArtifact@2` nests one directory per artifact, which is why
`ci/azure-pipelines.yml` has an explicit flatten step.

Skipping it fails in two different ways, and only one of them is loud:
`merge-reports` on a nested layout exits 1, but `allure generate` on a nested
layout exits **0** and prints "Report successfully generated" while producing an
empty, zero-test report. Do not treat a green Allure step as proof it found
anything.

### Allure needs a JVM

`allure-commandline` is a JVM program and the Playwright image **ships no Java**.
That is why every platform provisions Java separately, in the report job only,
and each does it differently:

| Platform | How the report job gets a JVM                                             |
| -------- | ------------------------------------------------------------------------- |
| GitHub   | `actions/setup-java@v4`, Temurin 17, on a plain `ubuntu-latest` runner    |
| GitLab   | `apt-get install default-jre-headless` inside the image, in that job only |
| Azure    | `JavaToolInstaller@0`; the merge job runs **outside** the container       |
| Jenkins  | `Publish reports` uses `agent any`, not the Playwright image              |

Consequences:

- `.devcontainer/devcontainer.json` uses the bare image with no JVM, so
  **`npm run report:allure` does not work in the devcontainer.** `npm run report`
  (the built-in HTML report) works fine there.
- `docker/Dockerfile` does install `default-jre-headless`, so the compose service
  can generate Allure.
- The nightly workflow has no Java step and never generates an Allure report: it
  produces blob reports and the merged HTML report only.

Java lives only in the report job by design: a JDK problem can never block the
tests or the built-in report.

## Publishing a report is a data-exposure decision

Read this before enabling GitHub Pages or GitLab Pages.

A Playwright HTML report embeds **traces, videos and screenshots** from failed
runs. A trace carries request and response bodies and the `storageState` used to
authenticate, none of it redacted.

`sanitiseBody` (`src/utils/reporting.ts`) redacts secret-looking keys, but it
covers **only the API attachment path** in `src/api/api-client.ts`. It does not
touch traces. There is no trace redaction in this template and Playwright offers
none.

On a public repository, GitHub Pages and GitLab Pages are world-readable. So if
your tests authenticate against anything real:

- publish from a private repository, **or**
- drop the trace and video artifacts before publishing (`trace: 'off'` in CI, or
  delete `data/` from `playwright-report/` in the assemble step), **or**
- do not publish at all: the `merged-reports` artifact is already uploaded and
  is access-controlled by the repository's permissions.

The publish step in `.github/workflows/playwright.yml` carries this warning
inline and is gated on `github.ref == 'refs/heads/main'`.

### GitHub Pages is a manual prerequisite

Two things are not automatic on a fresh repository:

1. **Pages must be enabled by hand.** Settings → Pages → Source: "Deploy from a
   branch", branch `gh-pages`. Nothing in the workflow can turn it on.
2. **The `gh-pages` branch does not exist on the first run.** That is why the
   "Check out the published site" step is `continue-on-error: true`. It is
   expected to fail once. The Allure history restore is conditioned on that
   step's outcome, so the first run simply has no history and the second onwards
   do.

## `format:check` is a host-or-CI gate, not a container gate

`.dockerignore` excludes `.github` and `docs`, so those tracked files are
**absent from the built image**. `npm run format:check` inside the container
therefore passes vacuously on them: the workflow YAML and the markdown prettier
would otherwise check are simply not there.

This is a deliberate trade (re-including them would bust the `COPY . .` layer on
every documentation edit) and it is documented in `.dockerignore` itself.
Treat the container as a place to run **tests**, and run `format:check` on the
host or in CI, where the whole tree is present.

`npm run lint` is unaffected, for a duller reason: ESLint never looked at those
files anywhere. `eslint.config.mjs` matches `.ts`, `.js`, `.cjs` and `.mjs`, and
there are no such files under `.github` or `docs`, either on the host or in the
image.
Their lint coverage is zero either way, so nothing is lost in the container that
you had outside it.

`.devcontainer` and `docker compose run` use bind mounts, and `.dockerignore`
governs the build context only, so the full tree **is** visible there. The
vacuous-pass problem applies to `docker build` / `docker compose build` images.

## Removing Allure

Three edits:

1. Delete the `allure-playwright` reporter entries and the `allureOptions`
   object from `playwright.config.ts`, plus the `allureCategories` import.
2. Remove `allure-playwright`, `allure-js-commons` and `allure-commandline` from
   `package.json`, delete `allure-categories.json`, and drop the `report:allure`
   script.
3. Delete the Allure steps and the Java setup from your pipeline.

**Do not delete `src/utils/reporting.ts` wholesale.** It holds two unrelated
things: `annotate`, which is Allure-only and can go (with its call sites in
`tests/ui/login.spec.ts` and `tests/api/items.spec.ts`), and `sanitiseBody`,
which is imported by `src/api/api-client.ts` and protects the built-in HTML and
`blob` reporters. Keep `sanitiseBody`.
