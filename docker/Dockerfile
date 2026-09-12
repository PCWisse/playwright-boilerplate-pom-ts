# Pinned to the same version as @playwright/test in package.json. Bump both
# together — a mismatch produces "browser not found" at runtime. This is the
# exact image CI runs in, which is what makes the Linux visual baselines under
# tests/visual/__screenshots__/visual/linux/ reproducible here.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

# Allure's CLI needs a JVM. Everything else — browsers and their system
# dependencies — already ships with the base image, so never re-run
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
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npm", "test"]
