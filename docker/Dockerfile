# Pinned to the same version as @playwright/test in package.json. Bump both
# together: a mismatch produces "browser not found" at runtime. This is the
# exact image CI runs in, which is what makes the Linux visual baselines under
# tests/visual/__screenshots__/visual/linux/ reproducible here.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

# Allure's CLI needs a JVM. Everything else (browsers and their system
# dependencies) already ships with the base image, so never re-run
# `playwright install` here.
#
# `--no-install-recommends` is load-bearing, not a size optimisation: the JRE
# recommends font packages (fontconfig, DejaVu). Pulling those in changes how
# `fc-match` resolves the generic families the demo app's CSS asks for
# (`system-ui`, `sans-serif`), which shifts text rendering and invalidates the
# committed baselines against the CI image. Keep the flag.
RUN apt-get update \
  && apt-get install -y --no-install-recommends default-jre-headless \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /work

# Copy the manifests first so `npm ci` is cached independently of source edits.
#
# `npm ci` triggers the `prepare` script, which runs `husky`. `.dockerignore`
# excludes `.git`, so husky has no repository to install hooks into. This build
# depends on husky >= 9.1 printing `.git can't be found` and exiting 0. Version
# 9.0.x exited 1 and would break the build here. package.json therefore pins
# `husky: ^9.1.7`; do not relax it. If husky ever regresses, the fix is
# `RUN HUSKY=0 npm ci` on this line only, never an `ENV HUSKY=0`, which would
# persist into the running container where `docker compose run` DOES bind-mount
# `.git`, silently leaving a developer with no hooks after `npm ci`.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npm", "test"]
