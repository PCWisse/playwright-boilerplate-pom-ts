# CI pipelines

| Platform                 | File                                      | Notes                                       |
| ------------------------ | ----------------------------------------- | ------------------------------------------- |
| GitHub Actions           | **`../.github/workflows/playwright.yml`** | Not in this folder (see below)              |
| GitHub Actions (nightly) | **`../.github/workflows/nightly.yml`**    | Scheduled full-browser run                  |
| GitLab CI                | `.gitlab-ci.yml`                          | Needs one project setting (see below)       |
| Azure Pipelines          | `azure-pipelines.yml`                     | Path is chosen when you create the pipeline |
| Jenkins                  | `Jenkinsfile`                             | Path is the job's "Script Path"             |

## Why GitHub Actions is not here

GitHub only reads workflows from `.github/workflows/`. That path is fixed and cannot be configured, so those two files have to stay where they are. Every other platform lets you name the file's path,
which is why the rest live here and keep the repository root readable.

## GitLab needs one setting

GitLab looks for `.gitlab-ci.yml` at the repository root. Point it here once:

> Settings → CI/CD → General pipelines → **CI/CD configuration file**
>
> ```
> ci/.gitlab-ci.yml
> ```

Until you do, GitLab reports that the project has no `.gitlab-ci.yml` and simply runs nothing. It does not raise an error, so an unconfigured project looks the same as one with CI switched off.

## Pick one and delete the rest

This template ships four platforms so you can start on whichever you use. You almost certainly want one. Deleting the others is step 8 of
[../docs/adapting-to-a-new-project.md](../docs/adapting-to-a-new-project.md).

All four share the same shape (static analysis, four test shards, a merge job, then publishing) and all run tests inside the same pinned Playwright image. [../docs/ci.md](../docs/ci.md) explains why
that matters, what each one does differently, and what to change when you bump `@playwright/test`.
