// Jenkins declarative pipeline. Mirrors .github/workflows/playwright.yml:
// static analysis, four test shards, blob reports merged into one HTML report,
// plus an Allure report.
//
// Plugin baseline: Docker Pipeline (the `docker` agent), Pipeline: Declarative
// 1.5+ (the `matrix` directive), Pipeline: Job 2.42+ (for
// `disableConcurrentBuilds(abortPrevious: true)`), HTML Publisher
// (`publishHTML`) and Allure (`allure`). The Allure step also needs an Allure
// commandline installation configured under Manage Jenkins > Tools; leaving
// `jdk: ''` and `commandline` unset picks the default of each. Without that
// tool the Allure step fails, so it is wrapped to mark the build UNSTABLE
// rather than FAILURE — see the Publish reports stage.
//
// The browser work runs INSIDE the same image the committed Linux screenshot
// baselines were generated in. Screenshots depend on the font set, not just the
// distro version, and demo-app's CSS names generic families only, so whichever
// face fontconfig resolves is what gets rendered. Comparing a render made on a
// bare Jenkins agent against these baselines produces diffs no code change can
// explain. Keep this tag in step with @playwright/test in package.json and with
// the tag in .github/workflows/playwright.yml, .gitlab-ci.yml and
// azure-pipelines.yml. See docs/ci.md.

pipeline {
  // `agent none` on purpose: the browser stages need the Playwright image, the
  // Allure step needs a JVM the image does not ship, so each stage picks its
  // own. Consequence: there is no pipeline-level `post` block, because those
  // steps would have no node to run on.
  agent none

  options {
    timeout(time: 45, unit: 'MINUTES')
    disableConcurrentBuilds(abortPrevious: true)
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  environment {
    CI = 'true'
    // Must match the number of values on the SHARD_INDEX axis below.
    SHARD_TOTAL = '4'
  }

  stages {
    stage('Static analysis') {
      agent {
        docker {
          image 'mcr.microsoft.com/playwright:v1.62.1-noble'
          args '--ipc=host'
        }
      }
      steps {
        sh 'npm ci'
        sh 'npm run lint'
        sh 'npm run typecheck'
        sh 'npm run format:check'
      }
    }

    stage('Test') {
      matrix {
        // One container per shard, each with its own workspace and its own
        // network namespace. That isolation is required, not cosmetic: every
        // shard starts the demo app on the same port and writes the same
        // playwright/.auth storage state, so shards sharing one workspace would
        // collide on both.
        agent {
          docker {
            image 'mcr.microsoft.com/playwright:v1.62.1-noble'
            // Chromium's default /dev/shm is too small in a container.
            args '--ipc=host'
          }
        }
        axes {
          axis {
            name 'SHARD_INDEX'
            values '1', '2', '3', '4'
          }
        }
        stages {
          stage('Run shard') {
            steps {
              // `npm ci` is inside the catchError too, not just the test run.
              // A cell that dies installing dependencies — a registry blip, a
              // proxy — would otherwise fail the whole Test stage, and
              // declarative would then skip both reporting stages and throw
              // away the three shards that finished perfectly well.
              catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                sh 'npm ci'
                sh 'npm run test:ci -- --shard=$SHARD_INDEX/$SHARD_TOTAL'
              }
            }
            post {
              always {
                stash name: "blob-report-${env.SHARD_INDEX}", includes: 'blob-report/**', allowEmpty: true
                stash name: "allure-results-${env.SHARD_INDEX}", includes: 'allure-results/**', allowEmpty: true
                archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
              }
            }
          }
        }
      }
    }

    stage('Merge reports') {
      // Node and the Playwright CLI, but no JVM: merging only.
      agent {
        docker {
          image 'mcr.microsoft.com/playwright:v1.62.1-noble'
          args '--ipc=host'
        }
      }
      steps {
        script {
          // A cell that died before reaching its `post` block leaves no stash,
          // and unstash throws on a missing name. Tolerate that: a report for
          // three shards beats no report at all.
          for (int i = 1; i <= 4; i++) {
            try {
              unstash "blob-report-${i}"
              unstash "allure-results-${i}"
            } catch (Exception e) {
              echo "No stashed results for shard ${i}: ${e.message}"
            }
          }
        }
        sh 'npm ci'
        // Playwright names each shard's blob uniquely, so unstashing all four
        // into one blob-report/ directory yields a complete merge.
        sh 'npx playwright merge-reports --reporter html ./blob-report'
      }
      post {
        always {
          stash name: 'merged-reports', includes: 'playwright-report/**,allure-results/**', allowEmpty: true
        }
      }
    }

    stage('Publish reports') {
      // Deliberately not the Playwright image: the Allure commandline is a JVM
      // program and that image ships no JDK, whereas every Jenkins agent runs
      // one by definition.
      agent any
      steps {
        unstash 'merged-reports'
        // WARNING: a Playwright report embeds the traces, videos and
        // screenshots of failed runs. Traces carry request/response bodies and
        // the storageState used to authenticate, neither of which is redacted.
        // Anyone who can read this job can read them. Restrict the job, or drop
        // the trace/video artifacts before publishing, if your tests touch
        // anything real. See docs/ci.md.
        publishHTML(target: [
          allowMissing: true,
          alwaysLinkToLastBuild: true,
          keepAll: true,
          reportDir: 'playwright-report',
          reportFiles: 'index.html',
          reportName: 'Playwright Report'
        ])
        // The Allure plugin runs `allure generate` itself and keeps history
        // across builds, which is what produces the trend and retry graphs.
        //
        // `jdk: ''` resolves the DEFAULT Allure commandline installation. On a
        // fresh controller the plugin can be installed with no tool configured
        // under Manage Jenkins -> Tools, and this step then errors — turning a
        // build red after every shard passed and a perfectly good Playwright
        // report was already published. Degrade to UNSTABLE instead, so the
        // missing tool is visible without discrediting the test results.
        catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE',
                   message: 'Allure reporting failed. Configure an Allure commandline tool under Manage Jenkins -> Tools.') {
          allure includeProperties: false, jdk: '', results: [[path: 'allure-results']]
        }
      }
    }
  }
}
