# Playwright Template Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn this repository into a client-neutral, ready-to-use Playwright template with page objects, composable fixtures, UI/API/a11y/visual examples, dual reporting (built-in + Allure), and CI pipelines for four platforms.

**Architecture:** A bundled dependency-free demo web app is served by Playwright's `webServer`, so every example test is deterministic and needs no external service. Page objects and components are thin locator+action wrappers over ARIA role locators; assertions live in specs. Fixtures are split by concern (POM, API, a11y, test data) and composed with `mergeTests`, so a consumer imports one `test` object and gets only what they use.

**Tech Stack:** Playwright 1.62, TypeScript 5.9 (strict), ESLint 10 flat config with type-aware `typescript-eslint` 8 and `eslint-plugin-playwright` 2, Prettier 3, zod 4, faker 10, date-fns 4, `allure-playwright` 3, `@axe-core/playwright` 4, tsx 4, Husky 9 + lint-staged 17 + commitlint 21.

## Global Constraints

- **Node:** `>=20`. Declared in `engines` and used by every CI pipeline.
- **TypeScript is pinned to `^5.9.3`, NOT 7.x.** `typescript-eslint@8.68.0` declares a peer of `typescript >=4.8.4 <6.1.0`; TypeScript 7 breaks type-aware linting.
- **Every dependency goes in `devDependencies`.** Nothing in a test project is a runtime dependency. `dependencies` must end up empty.
- **No client-specific content anywhere.** No `Alphabet`, `alphabet`, `al-ds-`, `.al-label`, `TDS`, `CONFIRM_DELIVERY_LOCATION`, or `Markets` (es/de/fr). Task 1 removes these; the final verification greps for them.
- **Locator priority:** role/label/text first, `getByTestId` second, CSS or XPath only where nothing else works and only with a comment explaining why.
- **No `waitForTimeout` and no `page.$`/`elementHandle` anywhere.** Both are lint errors after Task 2.
- **Web-first assertions only.** `await expect(locator).toX()`, never `expect(await locator.isVisible()).toBe(true)`.
- **`testIdAttribute` is `data-testid`** (Playwright's default). The demo app markup must use `data-testid`, not the old `test-id`.
- **Commit messages are Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`, `build:`). Task 14 enforces this with commitlint; use the format from Task 1 onward.
- **Every task ends green:** `npm run lint`, `npm run typecheck`, and `npx playwright test` must all pass before the task's commit, from Task 4 onward.

## File Structure

| Path                                                               | Responsibility                                                         |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `demo-app/server.ts`                                               | Dependency-free Node `http` server: static files + in-memory JSON API  |
| `demo-app/public/*.html`                                           | Login, inventory, form, and deliberately inaccessible pages            |
| `src/utils/env.ts`                                                 | Load and zod-validate environment; fail fast before any browser starts |
| `src/utils/generator.ts`                                           | Random/derived test data on faker + date-fns                           |
| `src/utils/wait.ts`                                                | The one polling helper that Playwright's auto-waiting does not cover   |
| `src/components/base.component.ts`                                 | Root-scoped component base class                                       |
| `src/components/table.component.ts`                                | Generic ARIA-role table component                                      |
| `src/components/nav.component.ts`                                  | Site navigation component                                              |
| `src/pages/base.page.ts`                                           | Navigation, readiness hook, shared page surface                        |
| `src/pages/*.page.ts`                                              | One page object per demo-app page                                      |
| `src/api/schemas.ts`                                               | zod schemas and the types derived from them                            |
| `src/api/api-client.ts`                                            | Typed HTTP client with schema-validated responses                      |
| `src/fixtures/*.fixture.ts`                                        | One fixture module per concern                                         |
| `src/fixtures/index.ts`                                            | Merged `test` export + `expect` re-export                              |
| `src/setup/auth.setup.ts`                                          | Produces `playwright/.auth/user.json` storage state                    |
| `tests/{ui,api,a11y,visual}/`                                      | Example specs, one directory per project                               |
| `playwright.config.ts`                                             | Projects, reporters, webServer, timeouts                               |
| `.github/`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile` | CI                                                                     |
| `docker/`, `.devcontainer/`                                        | Reproducible browser environment                                       |
| `docs/`                                                            | Getting started, conventions, page objects, CI, adaptation guide       |

---

### Task 1: Reset the tree — remove client IP and legacy source

Removes every trace of the previous engagement and clears the way for the new structure. Nothing is preserved by rename; the useful ideas are re-implemented from scratch in later tasks.

**Files:**

- Delete: `src/helpers/gitHelper.ts`, `src/helpers/parserHelper.ts`, `src/helpers/pageHelper.ts`, `src/helpers/utilities.ts`, `src/helpers/generator.ts`, `src/helpers/wait.ts`
- Delete: `src/page-objects/` (entire directory, including `shared/toolbox/table.ts` with the Alphabet copyright header)
- Delete: `src/fixtures/constants/`, `src/fixtures/data/`, `src/fixtures/interfaces/`
- Delete: `tests/example.spec.ts`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Delete the legacy source tree**

```bash
git rm -r --quiet src tests
```

- [ ] **Step 2: Verify no client-specific string survives in the working tree**

Run:

```bash
grep -rniE "alphabet|al-ds-|al-label|\bTDS\b|CONFIRM_DELIVERY_LOCATION" --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=docs . ; echo "exit=$?"
```

Expected: no matching lines, `exit=1` (grep found nothing).

- [ ] **Step 3: Create `.env.example`**

```bash
# Copy to .env and adjust. .env is git-ignored; never commit real credentials.

# Base URL of the system under test. Defaults to the bundled demo app.
BASE_URL=http://127.0.0.1:4173

# Base URL of the API under test. Defaults to the bundled demo app's /api.
API_URL=http://127.0.0.1:4173/api

# Port the bundled demo app listens on. Must match BASE_URL.
DEMO_PORT=4173

# Credentials used by src/setup/auth.setup.ts.
TEST_USERNAME=standard_user
TEST_PASSWORD=secret_sauce

# Base URL for issue links surfaced in the Allure report, e.g.
# https://your-tracker.example.com/browse/
TICKET_BASE_URL=https://example.invalid/browse/
```

- [ ] **Step 4: Add the new generated paths to `.gitignore`**

Append to `.gitignore`:

```gitignore
# Reporting output
allure-results/
allure-report/
blob-report/
playwright-report/
test-results/

# Auth state produced by src/setup/auth.setup.ts
playwright/.auth/
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore!: remove legacy client-specific source tree

Removes the Alphabet copyright header, .al-* design-system selectors, TDS
branch-name helpers and domain enums. The framework is rebuilt from scratch
in the following commits."
```

---

### Task 2: Toolchain — package.json, tsconfig, ESLint, Prettier

Establishes strict type-checking and linting before any code exists, so no untyped code is ever written. This is why the previous `parserHelper.parseToKebabCase` could be declared `Promise<void>` while returning a string.

**Files:**

- Modify: `package.json` (full rewrite)
- Create: `tsconfig.json`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.npmrc`

**Interfaces:**

- Produces: the npm scripts every later task and CI pipeline calls — `lint`, `lint:fix`, `format`, `format:check`, `typecheck`, `test`, `test:ci`, `test:smoke`, `test:ui`, `test:debug`, `test:headed`, `test:api`, `test:a11y`, `test:visual`, `test:update-snapshots`, `codegen`, `report`, `report:allure`, `demo`.

- [ ] **Step 1: Replace `package.json`**

```json
{
  "name": "playwright-boilerplate-pom-ts",
  "version": "2.0.0",
  "private": true,
  "description": "Opinionated Playwright + TypeScript template using the Page Object Model",
  "license": "MIT",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "test": "playwright test",
    "test:ci": "playwright test --project=chromium --project=api --project=a11y --project=visual",
    "test:smoke": "playwright test --grep @smoke",
    "test:regression": "playwright test --grep @regression",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:headed": "playwright test --headed",
    "test:api": "playwright test --project=api",
    "test:a11y": "playwright test --project=a11y",
    "test:visual": "playwright test --project=visual",
    "test:update-snapshots": "playwright test --project=visual --update-snapshots",
    "codegen": "playwright codegen",
    "report": "playwright show-report",
    "report:allure": "allure generate allure-results --clean --output allure-report && allure open allure-report",
    "demo": "tsx demo-app/server.ts",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.13.0",
    "@faker-js/faker": "^10.6.0",
    "@playwright/test": "^1.62.1",
    "@types/node": "^24.0.0",
    "allure-commandline": "^2.43.0",
    "allure-js-commons": "^3.11.0",
    "allure-playwright": "^3.11.0",
    "axe-core": "^4.13.0",
    "date-fns": "^4.4.0",
    "dotenv": "^17.4.2",
    "eslint": "^10.9.1",
    "eslint-config-prettier": "^10.0.0",
    "eslint-plugin-playwright": "^2.11.0",
    "prettier": "^3.9.6",
    "tsx": "^4.23.12",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.68.0",
    "zod": "^4.5.1"
  }
}
```

Notes for the implementer:

- There is no `dependencies` block. That is deliberate — see Global Constraints.
- `moment` is gone; `date-fns` replaces it.
- `typescript` is `^5.9.3`. Do not "upgrade" it to 7.x; `typescript-eslint` will refuse.

- [ ] **Step 2: Install and verify resolved versions**

```bash
npm install
npm ls typescript @playwright/test typescript-eslint --depth=0
```

Expected: `typescript@5.9.x`, `@playwright/test@1.62.x`, `typescript-eslint@8.68.x`, and no `ERR! peer dep` output.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "preserve",
    "moduleResolution": "bundler",
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@pages/*": ["src/pages/*"],
      "@components/*": ["src/components/*"],
      "@fixtures/*": ["src/fixtures/*"],
      "@api/*": ["src/api/*"],
      "@utils/*": ["src/utils/*"],
      "@data/*": ["src/data/*"]
    }
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "demo-app/**/*.ts", "playwright.config.ts"]
}
```

`noUncheckedIndexedAccess` is on. Every `array[i]` is `T | undefined`, so later tasks guard before use. This is intentional — it is what catches the row/column indexing bugs the old table helper had.

- [ ] **Step 4: Create `eslint.config.mjs`**

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'playwright-report/',
      'blob-report/',
      'allure-results/',
      'allure-report/',
      'test-results/',
      'demo-app/public/**/*.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The rule the Playwright best-practices guide calls out by name:
      // it catches a missing `await` on a Playwright call.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  {
    files: ['tests/**/*.spec.ts', 'src/setup/**/*.setup.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-element-handle': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/no-force-option': 'error',
      'playwright/no-conditional-in-test': 'error',
      'playwright/expect-expect': 'error',
      'playwright/require-top-level-describe': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      // Page objects and components must never sleep.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message: 'waitForTimeout is banned. Use a web-first assertion or a locator wait instead.',
        },
      ],
    },
  },
  prettier,
);
```

- [ ] **Step 5: Create `.prettierrc.json` and `.prettierignore`**

`.prettierrc.json`:

```json
{
  "singleQuote": true,
  "semi": true,
  "printWidth": 100,
  "trailingComma": "all",
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

`.prettierignore`:

```gitignore
node_modules/
playwright-report/
blob-report/
allure-results/
allure-report/
test-results/
package-lock.json
```

- [ ] **Step 6: Create `.npmrc`**

```ini
save-exact=false
engine-strict=true
```

- [ ] **Step 7: Verify the toolchain runs on an empty tree**

```bash
npm run typecheck
npm run lint
npm run format:check
```

Expected: `typecheck` and `lint` exit 0 (nothing to check yet). If `format:check` reports files, run `npm run format` and re-run.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "build: add strict TypeScript, ESLint flat config and Prettier

TypeScript is pinned to ^5.9.3 because typescript-eslint@8 declares a peer of
typescript >=4.8.4 <6.1.0. Enables no-floating-promises and the Playwright
plugin rules that ban waitForTimeout and element handles."
```

---

### Task 3: Demo app

A deterministic target so no example test depends on a third-party site. Dependency-free: Node's built-in `http` and `fs` only, run through `tsx`.

**Files:**

- Create: `demo-app/server.ts`, `demo-app/data.ts`
- Create: `demo-app/public/index.html`, `login.html`, `inventory.html`, `form.html`, `a11y.html`, `app.css`, `login.js`, `inventory.js`, `form.js`

**Interfaces:**

- Produces:
  - `GET /` → redirect to `/login.html`
  - `POST /api/login` `{username, password}` → `201 {token: string, username: string}`; `401 {error: string}` on bad credentials
  - `GET /api/items` → `200 Item[]` (requires `Authorization: Bearer <token>`)
  - `POST /api/items` `{name, price, quantity}` → `201 Item`; `400 {error, field}` on invalid input
  - `GET /api/items/:id` → `200 Item`; `404 {error}`
  - `PUT /api/items/:id` → `200 Item`
  - `DELETE /api/items/:id` → `204` (empty body); `404 {error}`
  - `Item` = `{ id: string; name: string; price: number; quantity: number; createdAt: string }`
  - `startServer(port: number): Promise<import('node:http').Server>` exported from `demo-app/server.ts`

- [ ] **Step 1: Create `demo-app/data.ts`**

```typescript
export interface Item {
  id: string;
  name: string;
  price: number;
  quantity: number;
  createdAt: string;
}

export interface ItemInput {
  name: string;
  price: number;
  quantity: number;
}

const SEED: ItemInput[] = [
  { name: 'Ergonomic Keyboard', price: 89.99, quantity: 12 },
  { name: 'Mechanical Mouse', price: 45.5, quantity: 30 },
  { name: 'USB-C Hub', price: 62.0, quantity: 7 },
  { name: '27-inch Monitor', price: 329.0, quantity: 4 },
  { name: 'Laptop Stand', price: 39.95, quantity: 21 },
];

export const VALID_CREDENTIALS = {
  username: 'standard_user',
  password: 'secret_sauce',
};

/** In-memory store. Resets on every server start, so tests are repeatable. */
export class ItemStore {
  private items = new Map<string, Item>();
  private counter = 0;

  constructor() {
    for (const seed of SEED) {
      this.create(seed);
    }
  }

  list(): Item[] {
    return [...this.items.values()];
  }

  get(id: string): Item | undefined {
    return this.items.get(id);
  }

  create(input: ItemInput): Item {
    this.counter += 1;
    const item: Item = {
      id: `item-${String(this.counter)}`,
      name: input.name,
      price: input.price,
      quantity: input.quantity,
      createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    };
    this.items.set(item.id, item);
    return item;
  }

  update(id: string, input: ItemInput): Item | undefined {
    const existing = this.items.get(id);
    if (existing === undefined) {
      return undefined;
    }
    const updated: Item = { ...existing, ...input };
    this.items.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }
}

/** Returns the first validation error for an item payload, or null if valid. */
export function validateItemInput(body: unknown): { error: string; field: string } | null {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be a JSON object', field: 'body' };
  }
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.name !== 'string' || candidate.name.trim() === '') {
    return { error: 'name is required', field: 'name' };
  }
  if (typeof candidate.price !== 'number' || candidate.price < 0) {
    return { error: 'price must be a number >= 0', field: 'price' };
  }
  if (
    typeof candidate.quantity !== 'number' ||
    !Number.isInteger(candidate.quantity) ||
    candidate.quantity < 0
  ) {
    return { error: 'quantity must be an integer >= 0', field: 'quantity' };
  }
  return null;
}
```

- [ ] **Step 2: Create `demo-app/server.ts`**

```typescript
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

import { ItemStore, VALID_CREDENTIALS, validateItemInput, type ItemInput } from './data';

// Resolved from the working directory, not import.meta.url: package.json has no
// "type": "module", so tsx emits CommonJS and import.meta would be a syntax
// error. Both `npm run demo` and Playwright's webServer run from the repo root.
const PUBLIC_DIR = join(process.cwd(), 'demo-app', 'public');
const TOKEN = 'demo-token-9f2c';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(payload);
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) {
    return null;
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    return null;
  }
}

function isAuthorized(request: IncomingMessage): boolean {
  return request.headers.authorization === `Bearer ${TOKEN}`;
}

async function serveStatic(pathname: string, response: ServerResponse): Promise<void> {
  const relative = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(PUBLIC_DIR, relative);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(response, 403, { error: 'Forbidden' });
    return;
  }
  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(file);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}

async function handleApi(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  store: ItemStore,
): Promise<void> {
  const method = request.method ?? 'GET';

  if (pathname === '/api/login' && method === 'POST') {
    const body = (await readBody(request)) as { username?: string; password?: string } | null;
    if (
      body?.username === VALID_CREDENTIALS.username &&
      body.password === VALID_CREDENTIALS.password
    ) {
      sendJson(response, 201, { token: TOKEN, username: body.username });
    } else {
      sendJson(response, 401, { error: 'Invalid username or password' });
    }
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: 'Missing or invalid bearer token' });
    return;
  }

  if (pathname === '/api/items' && method === 'GET') {
    sendJson(response, 200, store.list());
    return;
  }

  if (pathname === '/api/items' && method === 'POST') {
    const body = await readBody(request);
    const invalid = validateItemInput(body);
    if (invalid !== null) {
      sendJson(response, 400, invalid);
      return;
    }
    sendJson(response, 201, store.create(body as ItemInput));
    return;
  }

  const idMatch = /^\/api\/items\/([\w-]+)$/.exec(pathname);
  const id = idMatch?.[1];
  if (id !== undefined) {
    if (method === 'GET') {
      const item = store.get(id);
      sendJson(response, item === undefined ? 404 : 200, item ?? { error: 'Item not found' });
      return;
    }
    if (method === 'PUT') {
      const body = await readBody(request);
      const invalid = validateItemInput(body);
      if (invalid !== null) {
        sendJson(response, 400, invalid);
        return;
      }
      const updated = store.update(id, body as ItemInput);
      sendJson(response, updated === undefined ? 404 : 200, updated ?? { error: 'Item not found' });
      return;
    }
    if (method === 'DELETE') {
      if (store.delete(id)) {
        response.writeHead(204);
        response.end();
      } else {
        sendJson(response, 404, { error: 'Item not found' });
      }
      return;
    }
  }

  sendJson(response, 404, { error: `No route for ${method} ${pathname}` });
}

export function startServer(port: number): Promise<Server> {
  const store = new ItemStore();

  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;

    const handle = async (): Promise<void> => {
      if (pathname === '/') {
        response.writeHead(302, { location: '/login.html' });
        response.end();
        return;
      }
      if (pathname.startsWith('/api/')) {
        await handleApi(request, response, pathname, store);
        return;
      }
      await serveStatic(pathname, response);
    };

    void handle().catch(() => {
      sendJson(response, 500, { error: 'Internal demo-app error' });
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

const port = Number(process.env.DEMO_PORT ?? 4173);
void startServer(port).then(() => {
  process.stdout.write(`demo-app listening on http://127.0.0.1:${String(port)}\n`);
});
```

- [ ] **Step 3: Create `demo-app/public/app.css`**

```css
:root {
  color-scheme: light;
  --fg: #16181d;
  --bg: #ffffff;
  --muted: #5c6370;
  --border: #d8dce3;
  --accent: #2f5bd8;
  --danger: #b3261e;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font:
    16px/1.5 system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
  color: var(--fg);
  background: var(--bg);
}
main {
  max-width: 60rem;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
h1 {
  font-size: 1.5rem;
  margin: 0 0 1.5rem;
}
nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border);
}
nav a {
  color: var(--accent);
  text-decoration: none;
}
nav .spacer {
  flex: 1;
}
table {
  border-collapse: collapse;
  width: 100%;
}
th,
td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
}
th {
  font-weight: 600;
  background: #f5f6f8;
}
label {
  display: block;
  margin: 1rem 0 0.25rem;
  font-weight: 500;
}
input,
button {
  font: inherit;
}
input {
  width: 100%;
  max-width: 24rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--border);
  border-radius: 4px;
}
button {
  margin-top: 1.25rem;
  padding: 0.5rem 1rem;
  border: 0;
  border-radius: 4px;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
}
.error {
  color: var(--danger);
  margin-top: 0.75rem;
}
.success {
  color: #1a7f37;
  margin-top: 0.75rem;
}
.field-error {
  color: var(--danger);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
.timestamp {
  color: var(--muted);
  font-size: 0.875rem;
}
```

- [ ] **Step 4: Create `demo-app/public/login.html` and `login.js`**

`login.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sign in — Demo Shop</title>
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body>
    <main>
      <h1>Sign in</h1>
      <form id="login-form" data-testid="login-form" novalidate>
        <label for="username">Username</label>
        <input id="username" name="username" data-testid="username" autocomplete="username" />
        <label for="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          data-testid="password"
          autocomplete="current-password"
        />
        <button type="submit" data-testid="login-submit">Sign in</button>
      </form>
      <p class="error" data-testid="login-error" role="alert" hidden></p>
    </main>
    <script src="/login.js"></script>
  </body>
</html>
```

`login.js`:

```javascript
const form = document.querySelector('#login-form');
const error = document.querySelector('[data-testid="login-error"]');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.hidden = true;
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: document.querySelector('#username').value,
      password: document.querySelector('#password').value,
    }),
  });
  if (response.ok) {
    const body = await response.json();
    localStorage.setItem('auth-token', body.token);
    localStorage.setItem('auth-user', body.username);
    window.location.assign('/inventory.html');
    return;
  }
  const body = await response.json();
  error.textContent = body.error;
  error.hidden = false;
});
```

- [ ] **Step 5: Create `demo-app/public/inventory.html` and `inventory.js`**

`inventory.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Inventory — Demo Shop</title>
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body>
    <nav aria-label="Main">
      <a href="/inventory.html">Inventory</a>
      <a href="/form.html">New item</a>
      <span class="spacer"></span>
      <span data-testid="current-user"></span>
      <button type="button" data-testid="logout" style="margin: 0">Sign out</button>
    </nav>
    <main>
      <h1>Inventory</h1>
      <label for="search">Search items</label>
      <input id="search" data-testid="search" type="search" />
      <table data-testid="inventory-table">
        <caption class="timestamp">
          Products currently in stock
        </caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Price</th>
            <th scope="col">Quantity</th>
          </tr>
        </thead>
        <tbody data-testid="inventory-body"></tbody>
      </table>
      <p data-testid="empty-state" hidden>No items match your search.</p>
    </main>
    <script src="/inventory.js"></script>
  </body>
</html>
```

`inventory.js`:

```javascript
const token = localStorage.getItem('auth-token');
if (!token) {
  window.location.replace('/login.html');
}

const body = document.querySelector('[data-testid="inventory-body"]');
const emptyState = document.querySelector('[data-testid="empty-state"]');
const search = document.querySelector('#search');
let items = [];

function render() {
  const term = search.value.trim().toLowerCase();
  const visible = items.filter((item) => item.name.toLowerCase().includes(term));
  body.replaceChildren(
    ...visible.map((item) => {
      const row = document.createElement('tr');
      row.dataset.itemId = item.id;
      for (const value of [item.name, item.price.toFixed(2), String(item.quantity)]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    }),
  );
  emptyState.hidden = visible.length > 0;
}

document.querySelector('[data-testid="current-user"]').textContent =
  localStorage.getItem('auth-user') ?? '';

document.querySelector('[data-testid="logout"]').addEventListener('click', () => {
  localStorage.clear();
  window.location.assign('/login.html');
});

search.addEventListener('input', render);

fetch('/api/items', { headers: { authorization: `Bearer ${token}` } })
  .then((response) => response.json())
  .then((data) => {
    items = data;
    render();
  });
```

- [ ] **Step 6: Create `demo-app/public/form.html` and `form.js`**

`form.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New item — Demo Shop</title>
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body>
    <nav aria-label="Main">
      <a href="/inventory.html">Inventory</a>
      <a href="/form.html">New item</a>
      <span class="spacer"></span>
      <span data-testid="current-user"></span>
      <button type="button" data-testid="logout" style="margin: 0">Sign out</button>
    </nav>
    <main>
      <h1>New item</h1>
      <form id="item-form" data-testid="item-form" novalidate>
        <label for="name">Name</label>
        <input id="name" name="name" data-testid="name" />
        <p class="field-error" data-testid="name-error" hidden></p>
        <label for="price">Price</label>
        <input id="price" name="price" data-testid="price" inputmode="decimal" />
        <p class="field-error" data-testid="price-error" hidden></p>
        <label for="quantity">Quantity</label>
        <input id="quantity" name="quantity" data-testid="quantity" inputmode="numeric" />
        <p class="field-error" data-testid="quantity-error" hidden></p>
        <button type="submit" data-testid="item-submit">Create item</button>
      </form>
      <p class="success" data-testid="item-success" role="status" hidden></p>
    </main>
    <script src="/form.js"></script>
  </body>
</html>
```

`form.js`:

```javascript
const token = localStorage.getItem('auth-token');
if (!token) {
  window.location.replace('/login.html');
}
document.querySelector('[data-testid="current-user"]').textContent =
  localStorage.getItem('auth-user') ?? '';
document.querySelector('[data-testid="logout"]').addEventListener('click', () => {
  localStorage.clear();
  window.location.assign('/login.html');
});

const success = document.querySelector('[data-testid="item-success"]');

function showFieldError(field, message) {
  const node = document.querySelector(`[data-testid="${field}-error"]`);
  node.textContent = message;
  node.hidden = message === '';
}

document.querySelector('#item-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  success.hidden = true;
  for (const field of ['name', 'price', 'quantity']) {
    showFieldError(field, '');
  }

  const name = document.querySelector('#name').value.trim();
  const price = Number(document.querySelector('#price').value);
  const quantity = Number(document.querySelector('#quantity').value);

  let invalid = false;
  if (name === '') {
    showFieldError('name', 'Name is required');
    invalid = true;
  }
  if (!Number.isFinite(price) || price < 0) {
    showFieldError('price', 'Price must be a number of 0 or more');
    invalid = true;
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    showFieldError('quantity', 'Quantity must be a whole number of 0 or more');
    invalid = true;
  }
  if (invalid) {
    return;
  }

  const response = await fetch('/api/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, price, quantity }),
  });
  const created = await response.json();
  success.textContent = `Created ${created.name}`;
  success.hidden = false;
  document.querySelector('#item-form').reset();
});
```

- [ ] **Step 7: Create `demo-app/public/a11y.html`**

This page is deliberately inaccessible. The violations are intentional and documented so the axe example has something real to find.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Accessibility playground — Demo Shop</title>
    <link rel="stylesheet" href="/app.css" />
    <style>
      /* Intentional violation: 1.9:1 contrast, fails WCAG AA. */
      .low-contrast {
        color: #b6bcc4;
        background: #ffffff;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Accessibility playground</h1>

      <!-- Intentional violation: image-alt -->
      <img src="/logo.svg" width="48" height="48" />

      <!-- Intentional violation: label -->
      <input type="text" placeholder="Your email" />

      <!-- Intentional violation: color-contrast -->
      <p class="low-contrast">This paragraph does not meet the contrast minimum.</p>

      <!-- Intentional violation: link-name -->
      <a href="/inventory.html"></a>

      <!-- This region is accessible; the scoped-scan example excludes the rest. -->
      <section data-testid="accessible-region" aria-labelledby="ok-heading">
        <h2 id="ok-heading">This section is accessible</h2>
        <p>Everything inside this region passes the same axe rules.</p>
        <button type="button">A properly named button</button>
      </section>
    </main>
  </body>
</html>
```

- [ ] **Step 8: Create `demo-app/public/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Demo Shop</title>
    <meta http-equiv="refresh" content="0; url=/login.html" />
  </head>
  <body>
    <p><a href="/login.html">Continue to sign in</a></p>
  </body>
</html>
```

- [ ] **Step 9: Start the server and verify it by hand**

```bash
npm run demo &
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4173/login.html
curl -s -X POST http://127.0.0.1:4173/api/login -H 'content-type: application/json' -d '{"username":"standard_user","password":"secret_sauce"}'
curl -s http://127.0.0.1:4173/api/items -H 'authorization: Bearer demo-token-9f2c' | head -c 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4173/api/items
kill %1
```

Expected, in order: `200`; `{"token":"demo-token-9f2c","username":"standard_user"}`; a JSON array starting `[{"id":"item-1","name":"Ergonomic Keyboard"`; `401`.

- [ ] **Step 10: Verify lint and types**

```bash
npm run typecheck && npm run lint && npm run format
```

Expected: both exit 0.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(demo-app): add bundled demo application

A dependency-free Node http server with login, inventory, form and a
deliberately inaccessible page, plus an in-memory CRUD JSON API. Gives every
example test a deterministic target with no third-party dependency."
```

---

### Task 4: Environment loading and Playwright configuration

**Files:**

- Create: `src/utils/env.ts`, `playwright.config.ts`
- Create: `src/utils/paths.ts`

**Interfaces:**

- Consumes: `demo-app/server.ts` (started via `webServer`).
- Produces:
  - `env: { baseURL: string; apiURL: string; demoPort: number; username: string; password: string; ticketBaseUrl: string }` from `src/utils/env.ts`
  - `STORAGE_STATE: string` (absolute path to `playwright/.auth/user.json`) from `src/utils/paths.ts`

- [ ] **Step 1: Create `src/utils/env.ts`**

```typescript
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  BASE_URL: z.url().default('http://127.0.0.1:4173'),
  API_URL: z.url().default('http://127.0.0.1:4173/api'),
  DEMO_PORT: z.coerce.number().int().positive().default(4173),
  TEST_USERNAME: z.string().min(1).default('standard_user'),
  TEST_PASSWORD: z.string().min(1).default('secret_sauce'),
  TICKET_BASE_URL: z.url().default('https://example.invalid/browse/'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(
    `Invalid environment configuration. Copy .env.example to .env and fix:\n${issues}`,
  );
}

export const env = {
  baseURL: parsed.data.BASE_URL,
  // Playwright's `APIRequestContext` resolves relative request paths against
  // `baseURL` with `new URL(path, base)`. A base WITHOUT a trailing slash drops
  // its last path segment instead of treating it as a directory, so an
  // un-normalised `http://host/api` would turn `items` into `http://host/items`
  // and 404. Normalise once, here at the source, so every consumer is safe and
  // request paths stay relative (`'items'`, never `'/items'`).
  apiURL: parsed.data.API_URL.endsWith('/') ? parsed.data.API_URL : `${parsed.data.API_URL}/`,
  demoPort: parsed.data.DEMO_PORT,
  username: parsed.data.TEST_USERNAME,
  password: parsed.data.TEST_PASSWORD,
  ticketBaseUrl: parsed.data.TICKET_BASE_URL,
} as const;
```

- [ ] **Step 2: Create `src/utils/paths.ts`**

```typescript
import { join } from 'node:path';

// Same reason as demo-app/server.ts: this file is compiled to CommonJS, so
// import.meta is unavailable. Playwright runs from the config's directory.
export const STORAGE_STATE = join(process.cwd(), 'playwright', '.auth', 'user.json');
```

- [ ] **Step 3: Create `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

import { env } from './src/utils/env';
import { STORAGE_STATE } from './src/utils/paths';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  reporter: isCI
    ? [['github'], ['blob'], ['allure-playwright', { resultsDir: 'allure-results', detail: false }]]
    : [
        ['list'],
        ['html', { open: 'never' }],
        ['allure-playwright', { resultsDir: 'allure-results', detail: false }],
      ],
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{projectName}/{platform}/{testFilePath}/{arg}{ext}',
  use: {
    baseURL: env.baseURL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: 'npm run demo',
    url: env.baseURL,
    reuseExistingServer: !isCI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'setup',
      testDir: './src/setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testDir: './tests/ui',
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      testDir: './tests/ui',
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      testDir: './tests/ui',
      use: { ...devices['Pixel 7'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: env.apiURL },
    },
    {
      name: 'a11y',
      testDir: './tests/a11y',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Chromium only, so baselines stay stable. Regenerate inside Docker to
      // match the CI platform: see docs/ci.md.
      name: 'visual',
      testDir: './tests/visual',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],
});
```

Note the `workers` change: the old config pinned CI to 1 worker. Sharding (Task 11) provides the isolation that pinning was compensating for, so the default is used.

- [ ] **Step 4: Verify the config loads and lists projects**

```bash
npx playwright test --list
```

Expected: exits 0 and prints `Total: 0 tests in 0 files` (no specs exist yet), with no configuration error.

- [ ] **Step 5: Verify env validation fails loudly**

```bash
BASE_URL=not-a-url npx playwright test --list
```

Expected: fails with `Invalid environment configuration. Copy .env.example to .env and fix:` followed by `BASE_URL: Invalid URL`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(config): add validated env loading and Playwright config

Adds baseURL, testIdAttribute, webServer, explicit timeouts, snapshot path
template and eight projects (setup, four browsers, api, a11y, visual)."
```

---

### Task 5: Base page, base component, table and nav components

The generic replacement for the deleted client table toolbox. Role locators only, no sleeps.

**Files:**

- Create: `src/components/base.component.ts`, `src/components/table.component.ts`, `src/components/nav.component.ts`
- Create: `src/pages/base.page.ts`
- Create: `src/utils/wait.ts`

**Interfaces:**

- Produces:
  - `abstract class BaseComponent { constructor(page: Page, root: Locator); readonly root: Locator }`
  - `class TableComponent extends BaseComponent`:
    - `rows(): Locator`
    - `rowCount(): Promise<number>`
    - `headerNames(): Promise<string[]>`
    - `columnIndex(name: string): Promise<number>`
    - `rowContaining(text: string): Locator`
    - `cell(rowIndex: number, columnName: string): Promise<Locator>`
    - `cellText(rowIndex: number, columnName: string): Promise<string>`
    - `columnValues(columnName: string): Promise<string[]>`
  - `class NavComponent extends BaseComponent`:
    - `readonly currentUser: Locator`
    - `readonly logoutButton: Locator`
    - `goTo(name: 'Inventory' | 'New item'): Promise<void>`
    - `logout(): Promise<void>`
  - `abstract class BasePage`:
    - `protected abstract readonly path: string`
    - `readonly page: Page`
    - `get loadingIndicator(): Locator | null` — null unless the subclass sets `protected loadingIndicatorTestId`
    - `goto(): Promise<void>`
    - `waitUntilLoaded(): Promise<void>`
  - `pollUntil(predicate: () => Promise<boolean>, options): Promise<void>` from `src/utils/wait.ts`

- [ ] **Step 1: Create `src/utils/wait.ts`**

```typescript
import { expect } from '@playwright/test';

export interface PollOptions {
  /** What is being waited for, used in the failure message. */
  description: string;
  timeoutMs?: number;
  intervalMs?: number;
}

/**
 * Polls an async predicate until it returns true.
 *
 * Prefer a web-first assertion (`await expect(locator).toBeVisible()`) whenever
 * one exists — Playwright retries those automatically. Use this only for
 * conditions that are not expressible as a locator assertion, such as waiting
 * on external state.
 */
export async function pollUntil(
  predicate: () => Promise<boolean>,
  options: PollOptions,
): Promise<void> {
  const { description, timeoutMs = 30_000, intervalMs = 250 } = options;
  await expect
    .poll(predicate, { timeout: timeoutMs, intervals: [intervalMs], message: description })
    .toBe(true);
}
```

- [ ] **Step 2: Create `src/components/base.component.ts`**

```typescript
import type { Locator, Page } from '@playwright/test';

/**
 * A component is a reusable piece of UI scoped to a root locator. Scoping means
 * the same component class works anywhere the markup appears, and its locators
 * can never accidentally match an element elsewhere on the page.
 */
export abstract class BaseComponent {
  protected readonly page: Page;
  readonly root: Locator;

  constructor(page: Page, root: Locator) {
    this.page = page;
    this.root = root;
  }

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }
}
```

- [ ] **Step 3: Create `src/components/table.component.ts`**

```typescript
import type { Locator, Page } from '@playwright/test';

import { BaseComponent } from './base.component';

/**
 * Generic data-table component built on ARIA role locators, so it works with
 * any semantic table regardless of styling or class names.
 */
export class TableComponent extends BaseComponent {
  private readonly table: Locator;

  constructor(page: Page, root: Locator) {
    super(page, root);
    this.table = root.getByRole('table');
  }

  rows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  async rowCount(): Promise<number> {
    return this.rows().count();
  }

  async headerNames(): Promise<string[]> {
    const headers = await this.table.getByRole('columnheader').allInnerTexts();
    return headers.map((header) => header.trim());
  }

  async columnIndex(name: string): Promise<number> {
    const headers = await this.headerNames();
    const index = headers.indexOf(name);
    if (index === -1) {
      throw new Error(
        `Column "${name}" not found. Available columns: ${headers.join(', ') || '(none)'}`,
      );
    }
    return index;
  }

  /** The first row whose text contains `text`. Chained + filtered, not indexed. */
  rowContaining(text: string): Locator {
    return this.rows().filter({ hasText: text }).first();
  }

  async cell(rowIndex: number, columnName: string): Promise<Locator> {
    const index = await this.columnIndex(columnName);
    return this.rows().nth(rowIndex).getByRole('cell').nth(index);
  }

  async cellText(rowIndex: number, columnName: string): Promise<string> {
    const cell = await this.cell(rowIndex, columnName);
    return (await cell.innerText()).trim();
  }

  async columnValues(columnName: string): Promise<string[]> {
    const index = await this.columnIndex(columnName);
    const rowCount = await this.rowCount();
    const values: string[] = [];
    for (let row = 0; row < rowCount; row += 1) {
      const text = await this.rows().nth(row).getByRole('cell').nth(index).innerText();
      values.push(text.trim());
    }
    return values;
  }
}
```

- [ ] **Step 4: Create `src/components/nav.component.ts`**

```typescript
import type { Locator, Page } from '@playwright/test';

import { BaseComponent } from './base.component';

export type NavDestination = 'Inventory' | 'New item';

export class NavComponent extends BaseComponent {
  readonly currentUser: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page, page.getByRole('navigation', { name: 'Main' }));
    this.currentUser = this.root.getByTestId('current-user');
    this.logoutButton = this.root.getByTestId('logout');
  }

  async goTo(name: NavDestination): Promise<void> {
    await this.root.getByRole('link', { name, exact: true }).click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
```

- [ ] **Step 5: Create `src/pages/base.page.ts`**

```typescript
import type { Locator, Page } from '@playwright/test';

/**
 * Shared surface for every page object: navigation relative to `baseURL` and a
 * readiness hook.
 *
 * Adapting to a real project: most applications show a global spinner while
 * loading. Set `loadingIndicatorTestId` in the subclass (or override
 * `waitUntilLoaded`) so every page waits for it to disappear.
 */
export abstract class BasePage {
  protected abstract readonly path: string;

  /** Override in a subclass when the application has a global loading spinner. */
  protected readonly loadingIndicatorTestId: string | null = null;

  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get loadingIndicator(): Locator | null {
    return this.loadingIndicatorTestId === null
      ? null
      : this.page.getByTestId(this.loadingIndicatorTestId);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitUntilLoaded();
  }

  async waitUntilLoaded(): Promise<void> {
    const indicator = this.loadingIndicator;
    if (indicator !== null) {
      await indicator.waitFor({ state: 'hidden' });
    }
  }
}
```

- [ ] **Step 6: Verify lint and types**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0. If `no-floating-promises` fires, a call is missing `await` — fix it rather than disabling the rule.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(components): add base page, base component, table and nav

TableComponent is built on ARIA role locators and contains no waitForTimeout,
replacing the CSS-chain-and-sleep approach of the removed toolbox."
```

---

### Task 6: Page objects, auth setup, POM fixture and UI examples

**Files:**

- Create: `src/pages/login.page.ts`, `src/pages/inventory.page.ts`, `src/pages/form.page.ts`, `src/pages/a11y.page.ts`
- Create: `src/fixtures/pom.fixture.ts`
- Create: `src/setup/auth.setup.ts`
- Create: `src/utils/generator.ts`, `src/utils/mock.ts`, `src/data/users.ts`, `src/data/catalogue.ts`
- Create: `tests/ui/login.spec.ts`, `tests/ui/inventory.spec.ts`, `tests/ui/form.spec.ts`, `tests/ui/network-mocking.spec.ts`

**Interfaces:**

- Consumes: `BasePage`, `TableComponent`, `NavComponent` (Task 5); `env`, `STORAGE_STATE` (Task 4).
- Produces:
  - `LoginPage`: `usernameInput`, `passwordInput`, `submitButton`, `errorMessage: Locator`; `login(username: string, password: string): Promise<void>`
  - `InventoryPage`: `heading`, `searchInput`, `emptyState: Locator`; `table: TableComponent`; `nav: NavComponent`; `search(term: string): Promise<void>`
  - `FormPage`: `nameInput`, `priceInput`, `quantityInput`, `submitButton`, `successMessage: Locator`; `nav: NavComponent`; `fieldError(field: 'name' | 'price' | 'quantity'): Locator`; `createItem(input: { name: string; price: string; quantity: string }): Promise<void>`
  - `A11yPage`: `heading`, `accessibleRegion: Locator`
  - `pomTest` from `src/fixtures/pom.fixture.ts` with fixtures `loginPage`, `inventoryPage`, `formPage`, `a11yPage`
  - `src/utils/generator.ts`: `randomItemName(): string`, `randomPrice(): number`, `randomQuantity(): number`, `randomEmail(): string`, `randomIban(): string`, `todayAs(pattern: string): string`, `daysFromNow(days: number, pattern: string): string`
  - `src/data/users.ts`: `STANDARD_USER: { username: string; password: string }`, `INVALID_USER: { username: string; password: string }`
  - `src/data/catalogue.ts`: `CATALOGUE: Item[]` — a frozen five-item list matching the demo app's seed
  - `src/utils/mock.ts`: `mockItems(page: Page, items: Item[]): Promise<void>`

- [ ] **Step 1: Create `src/utils/generator.ts`**

```typescript
import { faker } from '@faker-js/faker';
import { addDays, format } from 'date-fns';

export function randomItemName(): string {
  return `${faker.commerce.productAdjective()} ${faker.commerce.product()} ${faker.string.alphanumeric(5).toUpperCase()}`;
}

export function randomPrice(): number {
  return Number(faker.commerce.price({ min: 1, max: 500, dec: 2 }));
}

export function randomQuantity(): number {
  return faker.number.int({ min: 1, max: 99 });
}

export function randomEmail(): string {
  return faker.internet.email({ provider: 'example.invalid' }).toLowerCase();
}

export function randomIban(): string {
  return faker.finance.iban();
}

/** date-fns format pattern, e.g. 'yyyy-MM-dd'. */
export function todayAs(pattern: string): string {
  return format(new Date(), pattern);
}

export function daysFromNow(days: number, pattern: string): string {
  return format(addDays(new Date(), days), pattern);
}
```

- [ ] **Step 2: Create `src/data/users.ts`**

```typescript
import { env } from '../utils/env';

export interface Credentials {
  username: string;
  password: string;
}

export const STANDARD_USER: Credentials = {
  username: env.username,
  password: env.password,
};

export const INVALID_USER: Credentials = {
  username: 'wrong_user',
  password: 'wrong_password',
};
```

- [ ] **Step 2b: Create `src/data/catalogue.ts` and `src/utils/mock.ts`**

The demo API's store is shared by every worker, and the form and API examples
add rows to it. Any spec that asserts on an exact row count must therefore pin
its own data — otherwise it passes alone and fails in parallel. Mocking at the
network boundary is also what the Playwright guide recommends for controlling
test data.

`src/data/catalogue.ts`:

```typescript
import type { Item } from '../api/schemas';

/** Mirrors the demo app's seed. Used to pin inventory data in specs. */
export const CATALOGUE: readonly Item[] = Object.freeze([
  {
    id: 'item-1',
    name: 'Ergonomic Keyboard',
    price: 89.99,
    quantity: 12,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item-2',
    name: 'Mechanical Mouse',
    price: 45.5,
    quantity: 30,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item-3',
    name: 'USB-C Hub',
    price: 62.0,
    quantity: 7,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item-4',
    name: '27-inch Monitor',
    price: 329.0,
    quantity: 4,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item-5',
    name: 'Laptop Stand',
    price: 39.95,
    quantity: 21,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]);
```

`src/utils/mock.ts`:

```typescript
import type { Page } from '@playwright/test';

import type { Item } from '../api/schemas';

/**
 * Pins the item list the inventory page receives.
 *
 * Use this in any spec that asserts on an exact row count or on specific cell
 * values. Without it the assertion depends on what other tests happen to have
 * created in the shared demo store.
 */
export async function mockItems(page: Page, items: readonly Item[]): Promise<void> {
  await page.route('**/api/items', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(items),
    });
  });
}
```

Note: `src/utils/mock.ts` imports `Item` from `src/api/schemas.ts`, which Task 7
creates. Create a minimal `src/api/schemas.ts` now containing only the
`itemSchema` and `Item` type from Task 7 Step 1; Task 7 adds the rest.

- [ ] **Step 3: Create the four page objects**

`src/pages/login.page.ts`:

```typescript
import type { Locator, Page } from '@playwright/test';

import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  protected readonly path = '/login.html';

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByLabel('Username');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

`src/pages/inventory.page.ts`:

```typescript
import type { Locator, Page } from '@playwright/test';

import { NavComponent } from '../components/nav.component';
import { TableComponent } from '../components/table.component';
import { BasePage } from './base.page';

export class InventoryPage extends BasePage {
  protected readonly path = '/inventory.html';

  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly emptyState: Locator;
  readonly table: TableComponent;
  readonly nav: NavComponent;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Inventory', level: 1 });
    this.searchInput = page.getByLabel('Search items');
    this.emptyState = page.getByTestId('empty-state');
    this.table = new TableComponent(page, page.getByRole('main'));
    this.nav = new NavComponent(page);
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }
}
```

`src/pages/form.page.ts`:

```typescript
import type { Locator, Page } from '@playwright/test';

import { NavComponent } from '../components/nav.component';
import { BasePage } from './base.page';

export type ItemFormField = 'name' | 'price' | 'quantity';

export interface ItemFormInput {
  name: string;
  price: string;
  quantity: string;
}

export class FormPage extends BasePage {
  protected readonly path = '/form.html';

  readonly nameInput: Locator;
  readonly priceInput: Locator;
  readonly quantityInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly nav: NavComponent;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.getByLabel('Name');
    this.priceInput = page.getByLabel('Price');
    this.quantityInput = page.getByLabel('Quantity');
    this.submitButton = page.getByRole('button', { name: 'Create item' });
    this.successMessage = page.getByRole('status');
    this.nav = new NavComponent(page);
  }

  fieldError(field: ItemFormField): Locator {
    return this.page.getByTestId(`${field}-error`);
  }

  async createItem(input: ItemFormInput): Promise<void> {
    await this.nameInput.fill(input.name);
    await this.priceInput.fill(input.price);
    await this.quantityInput.fill(input.quantity);
    await this.submitButton.click();
  }
}
```

`src/pages/a11y.page.ts`:

```typescript
import type { Locator, Page } from '@playwright/test';

import { BasePage } from './base.page';

export class A11yPage extends BasePage {
  protected readonly path = '/a11y.html';

  readonly heading: Locator;
  readonly accessibleRegion: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Accessibility playground', level: 1 });
    this.accessibleRegion = page.getByTestId('accessible-region');
  }
}
```

- [ ] **Step 4: Create `src/fixtures/pom.fixture.ts`**

```typescript
import { test as base } from '@playwright/test';

import { A11yPage } from '../pages/a11y.page';
import { FormPage } from '../pages/form.page';
import { InventoryPage } from '../pages/inventory.page';
import { LoginPage } from '../pages/login.page';

export interface PomFixtures {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  formPage: FormPage;
  a11yPage: A11yPage;
}

export const pomTest = base.extend<PomFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  formPage: async ({ page }, use) => {
    await use(new FormPage(page));
  },
  a11yPage: async ({ page }, use) => {
    await use(new A11yPage(page));
  },
});
```

- [ ] **Step 5: Create `src/setup/auth.setup.ts`**

```typescript
import { expect, test as setup } from '@playwright/test';

import { STANDARD_USER } from '../data/users';
import { LoginPage } from '../pages/login.page';
import { STORAGE_STATE } from '../utils/paths';

setup('authenticate', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(STANDARD_USER.username, STANDARD_USER.password);

  await expect(page.getByRole('heading', { name: 'Inventory', level: 1 })).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
```

- [ ] **Step 6: Create `src/fixtures/index.ts` (initial version — extended in Tasks 7 and 8)**

```typescript
import { expect } from '@playwright/test';

import { pomTest } from './pom.fixture';

export const test = pomTest;
export { expect };
```

- [ ] **Step 7: Write `tests/ui/login.spec.ts`**

```typescript
import { INVALID_USER, STANDARD_USER } from '../../src/data/users';
import { expect, test } from '../../src/fixtures';

test.describe('Login', () => {
  // The login flow must start signed out, so discard the shared storage state.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('signs in with valid credentials', { tag: ['@smoke'] }, async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login(STANDARD_USER.username, STANDARD_USER.password);

    await expect(page.getByRole('heading', { name: 'Inventory', level: 1 })).toBeVisible();
    await expect(page.getByTestId('current-user')).toHaveText(STANDARD_USER.username);
  });

  test(
    'shows an error for invalid credentials',
    { tag: ['@regression'] },
    async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login(INVALID_USER.username, INVALID_USER.password);

      await expect(loginPage.errorMessage).toBeVisible();
      await expect(loginPage.errorMessage).toHaveText('Invalid username or password');
    },
  );
});
```

- [ ] **Step 8: Write `tests/ui/inventory.spec.ts`**

```typescript
import { CATALOGUE } from '../../src/data/catalogue';
import { mockItems } from '../../src/utils/mock';
import { expect, test } from '../../src/fixtures';

test.describe('Inventory', () => {
  test.beforeEach(async ({ inventoryPage, page }) => {
    // Pin the data so row counts are deterministic no matter what the form and
    // API specs are doing in parallel against the shared demo store.
    await mockItems(page, CATALOGUE);
    await inventoryPage.goto();
  });

  test('lists the catalogue', { tag: ['@smoke'] }, async ({ inventoryPage }) => {
    await expect(inventoryPage.heading).toBeVisible();
    await expect(inventoryPage.table.rows()).toHaveCount(CATALOGUE.length);
    await expect(inventoryPage.table.rowContaining('Ergonomic Keyboard')).toBeVisible();
  });

  test('exposes the expected columns', { tag: ['@regression'] }, async ({ inventoryPage }) => {
    expect(await inventoryPage.table.headerNames()).toEqual(['Name', 'Price', 'Quantity']);
    expect(await inventoryPage.table.cellText(0, 'Price')).toBe('89.99');
  });

  test('filters rows by search term', { tag: ['@regression'] }, async ({ inventoryPage }) => {
    await inventoryPage.search('Mechanical');

    await expect(inventoryPage.table.rows()).toHaveCount(1);
    expect(await inventoryPage.table.columnValues('Name')).toEqual(['Mechanical Mouse']);
  });

  test('shows an empty state when nothing matches', async ({ inventoryPage }) => {
    await inventoryPage.search('nothing-matches-this');

    await expect(inventoryPage.table.rows()).toHaveCount(0);
    await expect(inventoryPage.emptyState).toBeVisible();
  });

  test('signs the user out', { tag: ['@regression'] }, async ({ inventoryPage, page }) => {
    await inventoryPage.nav.logout();

    await expect(page).toHaveURL(/login\.html$/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});
```

The search term is `Mechanical`, not `Mouse`: `faker.commerce.product()` can
generate the word "Mouse", so a form or API test running in parallel could add a
second matching row if the data were not mocked.

- [ ] **Step 9: Write `tests/ui/form.spec.ts` (demonstrates soft assertions)**

```typescript
import { randomItemName, randomPrice, randomQuantity } from '../../src/utils/generator';
import { expect, test } from '../../src/fixtures';

test.describe('Item form', () => {
  test.beforeEach(async ({ formPage }) => {
    await formPage.goto();
  });

  test('creates an item', { tag: ['@smoke'] }, async ({ formPage }) => {
    const name = randomItemName();

    await formPage.createItem({
      name,
      price: randomPrice().toFixed(2),
      quantity: String(randomQuantity()),
    });

    await expect(formPage.successMessage).toBeVisible();
    await expect(formPage.successMessage).toHaveText(`Created ${name}`);
  });

  test('reports every invalid field at once', { tag: ['@regression'] }, async ({ formPage }) => {
    await formPage.createItem({ name: '', price: '-5', quantity: '2.5' });

    // Soft assertions collect all three failures instead of stopping at the
    // first one, so a single run tells you every field that is wrong.
    await expect.soft(formPage.fieldError('name')).toHaveText('Name is required');
    await expect
      .soft(formPage.fieldError('price'))
      .toHaveText('Price must be a number of 0 or more');
    await expect
      .soft(formPage.fieldError('quantity'))
      .toHaveText('Quantity must be a whole number of 0 or more');
    await expect(formPage.successMessage).toBeHidden();
  });
});
```

- [ ] **Step 10: Write `tests/ui/network-mocking.spec.ts`**

```typescript
import { expect, test } from '../../src/fixtures';

test.describe('Network mocking', () => {
  test(
    'renders whatever the API returns',
    { tag: ['@regression'] },
    async ({ inventoryPage, page }) => {
      // Mocking pins the data the UI receives, so the assertion cannot be
      // broken by a change in the backing store.
      await page.route('**/api/items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'item-mock', name: 'Mocked Widget', price: 9.99, quantity: 3, createdAt: '' },
          ]),
        });
      });

      await inventoryPage.goto();

      await expect(inventoryPage.table.rows()).toHaveCount(1);
      expect(await inventoryPage.table.cellText(0, 'Name')).toBe('Mocked Widget');
    },
  );

  test('surfaces an empty list when the API returns nothing', async ({ inventoryPage, page }) => {
    await page.route('**/api/items', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await inventoryPage.goto();

    await expect(inventoryPage.emptyState).toBeVisible();
  });
});
```

- [ ] **Step 11: Run the UI suite**

```bash
npx playwright test --project=chromium
```

Expected: `12 passed` (11 UI tests plus the `setup` project's `authenticate`). If `authenticate` fails, confirm the demo app starts: `npm run demo` then open `http://127.0.0.1:4173/login.html`.

- [ ] **Step 12: Verify lint and types**

```bash
npm run typecheck && npm run lint && npm run format
```

Expected: exit 0.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(ui): add page objects, auth setup, POM fixture and UI examples

Covers storageState-based auth, table interaction, form validation with soft
assertions, network mocking and @smoke/@regression tagging. Every spec uses a
custom fixture."
```

---

### Task 7: API client, schemas, API fixture, test-data fixture and API examples

**Files:**

- Create: `src/api/schemas.ts`, `src/api/api-client.ts`
- Create: `src/fixtures/api.fixture.ts`, `src/fixtures/testdata.fixture.ts`
- Modify: `src/fixtures/index.ts`
- Create: `tests/api/items.spec.ts`, `tests/api/validation.spec.ts`, `tests/ui/api-seeded.spec.ts`

**Interfaces:**

- Consumes: `env` (Task 4), the demo API contract (Task 3), `pomTest` (Task 6).
- Produces:
  - `src/api/schemas.ts`: `itemSchema`, `itemListSchema`, `loginResponseSchema`, `errorSchema`; types `Item`, `ItemInput`, `LoginResponse`
  - `class ApiClient`:
    - `constructor(request: APIRequestContext, token: string)`
    - `static login(request: APIRequestContext, username: string, password: string): Promise<string>`
    - `listItems(): Promise<Item[]>`
    - `getItem(id: string): Promise<Item>`
    - `createItem(input: ItemInput): Promise<Item>`
    - `updateItem(id: string, input: ItemInput): Promise<Item>`
    - `deleteItem(id: string): Promise<void>`
    - `createItemRaw(body: unknown): Promise<APIResponse>` (for negative tests)
  - `apiTest` from `src/fixtures/api.fixture.ts` with worker fixture `authToken: string` and test fixture `api: ApiClient`
  - `testDataTest` from `src/fixtures/testdata.fixture.ts` with test fixture `seededItem: Item` (created before the test, deleted after)

- [ ] **Step 1: Create `src/api/schemas.ts`**

```typescript
import { z } from 'zod';

export const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});

export const itemListSchema = z.array(itemSchema);

export const loginResponseSchema = z.object({
  token: z.string().min(1),
  username: z.string().min(1),
});

export const errorSchema = z.object({
  error: z.string().min(1),
  field: z.string().optional(),
});

export type Item = z.infer<typeof itemSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export interface ItemInput {
  name: string;
  price: number;
  quantity: number;
}
```

- [ ] **Step 2: Create `src/api/api-client.ts`**

```typescript
import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { ZodType } from 'zod';

import {
  itemListSchema,
  itemSchema,
  loginResponseSchema,
  type Item,
  type ItemInput,
} from './schemas';

/**
 * Typed client over Playwright's APIRequestContext.
 *
 * Every response is validated against a zod schema, so a contract change fails
 * the test with the exact field path rather than surfacing later as an
 * unrelated `undefined`.
 */
export class ApiClient {
  private readonly request: APIRequestContext;
  private readonly token: string;

  constructor(request: APIRequestContext, token: string) {
    this.request = request;
    this.token = token;
  }

  static async login(
    request: APIRequestContext,
    username: string,
    password: string,
  ): Promise<string> {
    const response = await request.post('login', { data: { username, password } });
    const body = await ApiClient.unwrap(response, loginResponseSchema, 'POST /login', 201);
    return body.token;
  }

  private get headers(): Record<string, string> {
    return { authorization: `Bearer ${this.token}` };
  }

  private static async unwrap<T>(
    response: APIResponse,
    schema: ZodType<T>,
    context: string,
    expectedStatus: number,
  ): Promise<T> {
    const raw = await response.text();
    if (response.status() !== expectedStatus) {
      throw new Error(
        `${context} expected HTTP ${String(expectedStatus)} but got ${String(response.status())}.\n` +
          `URL: ${response.url()}\nBody: ${raw}`,
      );
    }
    const parsed = schema.safeParse(JSON.parse(raw) as unknown);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      throw new Error(
        `${context} returned a body that does not match its schema:\n${issues}\nBody: ${raw}`,
      );
    }
    return parsed.data;
  }

  async listItems(): Promise<Item[]> {
    const response = await this.request.get('items', { headers: this.headers });
    return ApiClient.unwrap(response, itemListSchema, 'GET /items', 200);
  }

  async getItem(id: string): Promise<Item> {
    const response = await this.request.get(`items/${id}`, { headers: this.headers });
    return ApiClient.unwrap(response, itemSchema, `GET /items/${id}`, 200);
  }

  async createItem(input: ItemInput): Promise<Item> {
    const response = await this.request.post('items', { headers: this.headers, data: input });
    return ApiClient.unwrap(response, itemSchema, 'POST /items', 201);
  }

  async updateItem(id: string, input: ItemInput): Promise<Item> {
    const response = await this.request.put(`items/${id}`, { headers: this.headers, data: input });
    return ApiClient.unwrap(response, itemSchema, `PUT /items/${id}`, 200);
  }

  async deleteItem(id: string): Promise<void> {
    const response = await this.request.delete(`items/${id}`, { headers: this.headers });
    if (response.status() !== 204) {
      throw new Error(
        `DELETE /items/${id} expected HTTP 204 but got ${String(response.status())}: ${await response.text()}`,
      );
    }
  }

  /** Escape hatch for negative tests that assert on non-2xx responses. */
  async createItemRaw(body: unknown): Promise<APIResponse> {
    return this.request.post('items', { headers: this.headers, data: body });
  }
}
```

- [ ] **Step 3: Create `src/fixtures/api.fixture.ts`**

```typescript
import { test as base, request as playwrightRequest } from '@playwright/test';

import { ApiClient } from '../api/api-client';
import { STANDARD_USER } from '../data/users';
import { env } from '../utils/env';

export interface ApiWorkerFixtures {
  authToken: string;
}

export interface ApiTestFixtures {
  api: ApiClient;
}

export const apiTest = base.extend<ApiTestFixtures, ApiWorkerFixtures>({
  // Worker-scoped: log in once per worker instead of once per test.
  authToken: [
    async ({}, use) => {
      const context = await playwrightRequest.newContext({ baseURL: env.apiURL });
      const token = await ApiClient.login(context, STANDARD_USER.username, STANDARD_USER.password);
      await use(token);
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  api: async ({ authToken }, use) => {
    const context = await playwrightRequest.newContext({ baseURL: env.apiURL });
    await use(new ApiClient(context, authToken));
    await context.dispose();
  },
});
```

- [ ] **Step 4: Create `src/fixtures/testdata.fixture.ts`**

```typescript
import type { Item } from '../api/schemas';
import { randomItemName, randomPrice, randomQuantity } from '../utils/generator';
import { apiTest } from './api.fixture';

export interface TestDataFixtures {
  /** An item created over the API before the test and removed afterwards. */
  seededItem: Item;
}

export const testDataTest = apiTest.extend<TestDataFixtures>({
  seededItem: async ({ api }, use) => {
    const item = await api.createItem({
      name: randomItemName(),
      price: randomPrice(),
      quantity: randomQuantity(),
    });

    await use(item);

    // Teardown runs even when the test fails, so no run leaves data behind.
    try {
      await api.deleteItem(item.id);
    } catch (error) {
      // `ApiClient.deleteItem` throws an Error whose message embeds the response
      // status when it isn't 204. Only tolerate a 404: that means the test
      // itself already deleted the item, so there is nothing left to clean up.
      // Anything else (auth failure, network error, 5xx) is a genuine teardown
      // failure and must surface, not be swallowed.
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('404')) {
        throw error;
      }
    }
  },
});
```

- [ ] **Step 5: Update `src/fixtures/index.ts` to merge POM and test-data fixtures**

```typescript
import { expect, mergeTests } from '@playwright/test';

import { pomTest } from './pom.fixture';
import { testDataTest } from './testdata.fixture';

/**
 * The single `test` object every spec imports.
 *
 * `testDataTest` extends `apiTest`, so merging it also brings in the `api` and
 * `authToken` fixtures. Fixtures are lazy: a spec that never names `api` never
 * pays for the login.
 */
export const test = mergeTests(pomTest, testDataTest);
export { expect };
```

- [ ] **Step 6: Write `tests/api/items.spec.ts`**

```typescript
import { randomItemName, randomPrice, randomQuantity } from '../../src/utils/generator';
import { expect, test } from '../../src/fixtures';

test.describe('Items API', () => {
  test('lists the seeded catalogue', { tag: ['@smoke', '@api'] }, async ({ api }) => {
    const items = await api.listItems();

    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.map((item) => item.name)).toContain('Ergonomic Keyboard');
  });

  test('creates, reads, updates and deletes an item', { tag: ['@api'] }, async ({ api }) => {
    const created = await api.createItem({
      name: randomItemName(),
      price: randomPrice(),
      quantity: randomQuantity(),
    });
    expect(created.id).not.toBe('');

    const fetched = await api.getItem(created.id);
    expect(fetched).toEqual(created);

    const updated = await api.updateItem(created.id, {
      name: created.name,
      price: 1.23,
      quantity: 7,
    });
    expect(updated.price).toBe(1.23);
    expect(updated.quantity).toBe(7);

    await api.deleteItem(created.id);

    const remaining = await api.listItems();
    expect(remaining.map((item) => item.id)).not.toContain(created.id);
  });

  test('cleans up its own fixture data', { tag: ['@api'] }, async ({ api, seededItem }) => {
    const found = await api.getItem(seededItem.id);

    expect(found.name).toBe(seededItem.name);
  });
});
```

- [ ] **Step 7: Write `tests/api/validation.spec.ts`**

```typescript
import { errorSchema } from '../../src/api/schemas';
import { expect, test } from '../../src/fixtures';

test.describe('Items API validation', () => {
  const invalidPayloads = [
    { label: 'missing name', body: { price: 1, quantity: 1 }, field: 'name' },
    { label: 'negative price', body: { name: 'X', price: -1, quantity: 1 }, field: 'price' },
    {
      label: 'fractional quantity',
      body: { name: 'X', price: 1, quantity: 1.5 },
      field: 'quantity',
    },
  ];

  for (const { label, body, field } of invalidPayloads) {
    test(`rejects a payload with a ${label}`, { tag: ['@api'] }, async ({ api }) => {
      const response = await api.createItemRaw(body);

      expect(response.status()).toBe(400);
      const parsed = errorSchema.parse(await response.json());
      expect(parsed.field).toBe(field);
    });
  }
});
```

- [ ] **Step 8: Write `tests/ui/api-seeded.spec.ts`**

```typescript
import { expect, test } from '../../src/fixtures';

test.describe('API-seeded UI state', () => {
  test(
    'shows an item created over the API',
    { tag: ['@regression'] },
    async ({ inventoryPage, seededItem }) => {
      // Setting up through the API keeps the test focused on the one UI
      // behaviour it verifies, instead of re-testing the create form.
      await inventoryPage.goto();
      await inventoryPage.search(seededItem.name);

      await expect(inventoryPage.table.rows()).toHaveCount(1);
      expect(await inventoryPage.table.cellText(0, 'Name')).toBe(seededItem.name);
      expect(await inventoryPage.table.cellText(0, 'Quantity')).toBe(String(seededItem.quantity));
    },
  );
});
```

- [ ] **Step 9: Run the API and UI suites**

```bash
npx playwright test --project=api --project=chromium
```

Expected: all tests pass. The `api` project runs without a browser; the `chromium` project now has 12 UI tests plus `setup`.

- [ ] **Step 10: Verify a schema violation is reported usefully**

Temporarily change `itemSchema`'s `price` to `z.string()`, then:

```bash
npx playwright test --project=api --grep "lists the seeded catalogue"
```

Expected: fails with `GET /items returned a body that does not match its schema:` and a line naming `0.price`. Revert the change and confirm the test passes again.

- [ ] **Step 11: Verify lint and types, then commit**

```bash
npm run typecheck && npm run lint && npm run format
git add -A
git commit -m "feat(api): add schema-validated API client, fixtures and API examples

Worker-scoped login, a per-test seeded-item fixture with teardown, zod response
validation, negative-path tests and a UI test seeded over the API."
```

---

### Task 8: Accessibility fixture and examples

**Files:**

- Create: `src/fixtures/a11y.fixture.ts`
- Modify: `src/fixtures/index.ts`
- Create: `tests/a11y/accessibility.spec.ts`

**Interfaces:**

- Consumes: `A11yPage`, `InventoryPage` (Task 6).
- Produces:
  - `a11yTest` from `src/fixtures/a11y.fixture.ts` with test fixture `checkA11y: (options?: A11yCheckOptions) => Promise<A11yResult>`
  - `interface A11yCheckOptions { include?: string; exclude?: string[]; disableRules?: string[]; tags?: string[] }`
  - `interface A11yResult { violationIds: string[]; violations: import('axe-core').Result[] }`

- [ ] **Step 1: Create `src/fixtures/a11y.fixture.ts`**

```typescript
import AxeBuilder from '@axe-core/playwright';
import { test as base } from '@playwright/test';
import type { Result } from 'axe-core';

export interface A11yCheckOptions {
  /** CSS selector to scan. Defaults to the whole page. */
  include?: string;
  /** CSS selectors to exclude, e.g. a third-party widget you do not control. */
  exclude?: string[];
  /** Axe rule ids to switch off. Always leave a comment saying why. */
  disableRules?: string[];
  /** Axe tags. Defaults to WCAG 2.1 A and AA. */
  tags?: string[];
}

export interface A11yResult {
  violationIds: string[];
  violations: Result[];
}

export interface A11yFixtures {
  checkA11y: (options?: A11yCheckOptions) => Promise<A11yResult>;
}

const DEFAULT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export const a11yTest = base.extend<A11yFixtures>({
  checkA11y: async ({ page }, use, testInfo) => {
    await use(async (options: A11yCheckOptions = {}) => {
      let builder = new AxeBuilder({ page }).withTags(options.tags ?? DEFAULT_TAGS);

      if (options.include !== undefined) {
        builder = builder.include(options.include);
      }
      for (const selector of options.exclude ?? []) {
        builder = builder.exclude(selector);
      }
      if (options.disableRules !== undefined) {
        builder = builder.disableRules(options.disableRules);
      }

      const results = await builder.analyze();

      // Attach the full report so a CI failure is diagnosable from the report
      // alone, without re-running locally.
      await testInfo.attach('axe-violations.json', {
        body: JSON.stringify(results.violations, null, 2),
        contentType: 'application/json',
      });

      return {
        violationIds: results.violations.map((violation) => violation.id).sort(),
        violations: results.violations,
      };
    });
  },
});
```

- [ ] **Step 2: Update `src/fixtures/index.ts` to include the a11y fixture**

```typescript
import { expect, mergeTests } from '@playwright/test';

import { a11yTest } from './a11y.fixture';
import { pomTest } from './pom.fixture';
import { testDataTest } from './testdata.fixture';

/**
 * The single `test` object every spec imports.
 *
 * `testDataTest` extends `apiTest`, so merging it also brings in the `api` and
 * `authToken` fixtures. Fixtures are lazy: a spec that never names `api` never
 * pays for the login.
 */
export const test = mergeTests(pomTest, testDataTest, a11yTest);
export { expect };
```

- [ ] **Step 3: Write `tests/a11y/accessibility.spec.ts`**

```typescript
import { expect, test } from '../../src/fixtures';

test.describe('Accessibility', () => {
  test(
    'the inventory page has no WCAG A/AA violations',
    { tag: ['@a11y', '@smoke'] },
    async ({ inventoryPage, checkA11y }) => {
      await inventoryPage.goto();

      const { violationIds } = await checkA11y();

      expect(violationIds).toEqual([]);
    },
  );

  test(
    'the playground page reports its known violations',
    { tag: ['@a11y'] },
    async ({ a11yPage, checkA11y }) => {
      // demo-app/public/a11y.html contains deliberate violations. Asserting the
      // exact set proves the scan actually runs — a scan that silently returns
      // nothing would otherwise look like a pass.
      await a11yPage.goto();

      const { violationIds } = await checkA11y();

      expect(violationIds).toEqual(['color-contrast', 'image-alt', 'label', 'link-name']);
    },
  );

  test(
    'a scoped scan passes on the accessible region',
    { tag: ['@a11y'] },
    async ({ a11yPage, checkA11y }) => {
      await a11yPage.goto();

      const { violationIds } = await checkA11y({
        include: '[data-testid="accessible-region"]',
      });

      expect(violationIds).toEqual([]);
    },
  );

  test(
    'documented exclusions narrow the scan',
    { tag: ['@a11y'] },
    async ({ a11yPage, checkA11y }) => {
      await a11yPage.goto();

      const { violationIds } = await checkA11y({
        // Real-world pattern: exclude markup you do not control, and disable a
        // rule only with a written reason. Here the low-contrast paragraph is
        // treated as a known, accepted design decision.
        disableRules: ['color-contrast'],
      });

      expect(violationIds).not.toContain('color-contrast');
      expect(violationIds).toContain('image-alt');
    },
  );
});
```

- [ ] **Step 4: Run the a11y suite**

```bash
npx playwright test --project=a11y
```

Expected: `4 passed`. If the second test fails with a different violation list, update the expected array to match what axe reports for the current axe-core version, and note the change in the commit message — do not weaken the assertion to `toHaveLength(0)`.

- [ ] **Step 5: Verify lint and types, then commit**

```bash
npm run typecheck && npm run lint && npm run format
git add -A
git commit -m "feat(a11y): add axe fixture and accessibility examples

checkA11y supports scoping, exclusions and rule disabling, and attaches the
full violation report to the test result."
```

---

### Task 9: Visual regression examples

**Files:**

- Create: `tests/visual/inventory.visual.spec.ts`, `tests/visual/component.visual.spec.ts`
- Create: `tests/visual/__screenshots__/` (generated)

**Interfaces:**

- Consumes: `InventoryPage` (Task 6), `snapshotPathTemplate` and the `visual` project (Task 4).

- [ ] **Step 1: Write `tests/visual/inventory.visual.spec.ts`**

```typescript
import { CATALOGUE } from '../../src/data/catalogue';
import { mockItems } from '../../src/utils/mock';
import { expect, test } from '../../src/fixtures';

test.describe('Inventory visuals', () => {
  test.beforeEach(async ({ page }) => {
    // A screenshot baseline is only stable if the rendered data is fixed.
    await mockItems(page, CATALOGUE);
  });

  test('full page matches the baseline', { tag: ['@visual'] }, async ({ inventoryPage, page }) => {
    await inventoryPage.goto();
    await expect(inventoryPage.table.rows()).toHaveCount(CATALOGUE.length);

    await expect(page).toHaveScreenshot('inventory-full-page.png', {
      fullPage: true,
      // The user name comes from storage state and would differ per run in a
      // real application; masking keeps the baseline stable.
      mask: [page.getByTestId('current-user')],
      animations: 'disabled',
    });
  });

  test(
    'empty state matches the baseline',
    { tag: ['@visual'] },
    async ({ inventoryPage, page }) => {
      await inventoryPage.goto();
      await inventoryPage.search('nothing-matches-this');
      await expect(inventoryPage.emptyState).toBeVisible();

      await expect(page).toHaveScreenshot('inventory-empty-state.png', {
        mask: [page.getByTestId('current-user')],
        animations: 'disabled',
      });
    },
  );
});
```

- [ ] **Step 2: Write `tests/visual/component.visual.spec.ts`**

```typescript
import { CATALOGUE } from '../../src/data/catalogue';
import { mockItems } from '../../src/utils/mock';
import { expect, test } from '../../src/fixtures';

test.describe('Component visuals', () => {
  test(
    'the inventory table matches its baseline',
    { tag: ['@visual'] },
    async ({ inventoryPage, page }) => {
      await mockItems(page, CATALOGUE);
      await inventoryPage.goto();
      await expect(inventoryPage.table.rows()).toHaveCount(CATALOGUE.length);

      // Component-scoped snapshots are far less brittle than full-page ones:
      // unrelated layout changes elsewhere cannot break them.
      await expect(inventoryPage.table.root.getByRole('table')).toHaveScreenshot(
        'inventory-table.png',
        { animations: 'disabled' },
      );
    },
  );
});
```

- [ ] **Step 3: Generate the baselines**

```bash
npm run test:update-snapshots
```

Expected: three new PNG files under `tests/visual/__screenshots__/visual/<platform>/`.

- [ ] **Step 4: Verify the suite passes against its own baselines**

```bash
npx playwright test --project=visual
```

Expected: `3 passed`.

- [ ] **Step 5: Verify a real difference is caught**

Temporarily change `demo-app/public/app.css` `th` background from `#f5f6f8` to `#ff0000`, then run `npx playwright test --project=visual`.

Expected: failures naming the changed screenshots, with a diff image in `test-results/`. Revert the CSS change and confirm the suite passes again.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test(visual): add full-page and component screenshot examples

Baselines are keyed by project and platform via snapshotPathTemplate. Regenerate
inside the Docker image to match CI; see docs/ci.md."
```

Note for the implementer: the committed baselines are generated on **your** platform. `docs/ci.md` (Task 15) tells users to regenerate inside Docker before enabling the visual project in CI. If your platform is not Linux, the `visual` job in Task 11 must be run once with `--update-snapshots` and the Linux baselines committed, or the job will fail on its first run.

---

### Task 10: Allure reporting

The built-in reporter already works. This task adds the stakeholder-facing report: severity, grouping, ticket links, attachments, and `test.step` trees.

**Files:**

- Create: `src/utils/reporting.ts`, `allure-categories.json`
- Modify: `playwright.config.ts` (reporter options only)
- Modify: `src/pages/login.page.ts`, `src/pages/form.page.ts`, `src/components/table.component.ts` (wrap multi-action methods in `test.step`)
- Modify: `src/api/api-client.ts` (attach request/response bodies)
- Modify: `tests/ui/login.spec.ts`, `tests/api/items.spec.ts` (add Allure metadata)

**Interfaces:**

- Consumes: `env.ticketBaseUrl` (Task 4).
- Produces: `src/utils/reporting.ts` exporting
  - `annotate(options: { severity?: Severity; epic?: string; feature?: string; story?: string; issue?: string; owner?: string }): Promise<void>`
  - `type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial'`

- [ ] **Step 1: Create `src/utils/reporting.ts`**

```typescript
import * as allure from 'allure-js-commons';

import { env } from './env';

export type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

export interface Annotation {
  severity?: Severity;
  /** Top-level grouping, e.g. a product area. */
  epic?: string;
  /** Second-level grouping, e.g. a user-facing capability. */
  feature?: string;
  /** Third-level grouping, e.g. a single user story. */
  story?: string;
  /** Ticket key, e.g. 'SHOP-1234'. Linked via TICKET_BASE_URL. */
  issue?: string;
  owner?: string;
}

/**
 * Adds Allure metadata to the current test. Every field is optional; call it as
 * the first statement in a test body.
 *
 * These annotations are what make the Allure report worth its extra
 * dependency: they group results by product area and link a failure straight to
 * its ticket. They are inert in the built-in HTML report.
 */
export async function annotate(options: Annotation): Promise<void> {
  if (options.severity !== undefined) {
    await allure.severity(options.severity);
  }
  if (options.epic !== undefined) {
    await allure.epic(options.epic);
  }
  if (options.feature !== undefined) {
    await allure.feature(options.feature);
  }
  if (options.story !== undefined) {
    await allure.story(options.story);
  }
  if (options.owner !== undefined) {
    await allure.owner(options.owner);
  }
  if (options.issue !== undefined) {
    await allure.issue(options.issue, `${env.ticketBaseUrl}${options.issue}`);
  }
}
```

- [ ] **Step 2: Create `allure-categories.json`**

Categories turn a wall of red into "3 product defects, 12 broken-environment errors". Without this, every failure looks identical in the trend graph.

```json
[
  {
    "name": "Product defects",
    "matchedStatuses": ["failed"]
  },
  {
    "name": "Broken environment",
    "matchedStatuses": ["broken"],
    "messageRegex": ".*(ECONNREFUSED|ENOTFOUND|net::ERR_CONNECTION|Timeout .* exceeded while waiting for the server).*"
  },
  {
    "name": "API contract drift",
    "matchedStatuses": ["failed", "broken"],
    "messageRegex": ".*does not match its schema.*"
  },
  {
    "name": "Accessibility violations",
    "matchedStatuses": ["failed"],
    "messageRegex": ".*(color-contrast|image-alt|link-name|label).*"
  },
  {
    "name": "Visual differences",
    "matchedStatuses": ["failed"],
    "messageRegex": ".*Screenshot comparison failed.*"
  },
  {
    "name": "Flaky",
    "matchedStatuses": ["passed"],
    "flaky": true
  }
]
```

- [ ] **Step 3: Extend the Allure reporter options in `playwright.config.ts`**

Replace **both** `['allure-playwright', { resultsDir: 'allure-results', detail: false }]` entries (the CI one and the local one) with:

```typescript
      [
        'allure-playwright',
        {
          resultsDir: 'allure-results',
          detail: false,
          categories: './allure-categories.json',
          environmentInfo: {
            base_url: env.baseURL,
            api_url: env.apiURL,
            node: process.version,
            ci: String(isCI),
          },
        },
      ],
```

- [ ] **Step 4: Wrap multi-action page-object methods in `test.step`**

Steps produce a readable tree in both reports and make a failure point at the action rather than the raw locator.

In `src/pages/login.page.ts`, add the import and replace `login`:

```typescript
import { test, type Locator, type Page } from '@playwright/test';
```

```typescript
  async login(username: string, password: string): Promise<void> {
    await test.step(`Sign in as "${username}"`, async () => {
      await this.usernameInput.fill(username);
      await this.passwordInput.fill(password);
      await this.submitButton.click();
    });
  }
```

In `src/pages/form.page.ts`, add `test` to the import and replace `createItem`:

```typescript
import { test, type Locator, type Page } from '@playwright/test';
```

```typescript
  async createItem(input: ItemFormInput): Promise<void> {
    await test.step(`Create item "${input.name}"`, async () => {
      await this.nameInput.fill(input.name);
      await this.priceInput.fill(input.price);
      await this.quantityInput.fill(input.quantity);
      await this.submitButton.click();
    });
  }
```

In `src/components/table.component.ts`, add `test` to the import and wrap `columnValues`:

```typescript
import { test, type Locator, type Page } from '@playwright/test';
```

```typescript
  async columnValues(columnName: string): Promise<string[]> {
    return test.step(`Read column "${columnName}"`, async () => {
      const index = await this.columnIndex(columnName);
      const rowCount = await this.rowCount();
      const values: string[] = [];
      for (let row = 0; row < rowCount; row += 1) {
        const text = await this.rows().nth(row).getByRole('cell').nth(index).innerText();
        values.push(text.trim());
      }
      return values;
    });
  }
```

- [ ] **Step 5: Attach API request and response bodies in `src/api/api-client.ts`**

Replace the `unwrap` method with this version. The attachment is what makes an API failure diagnosable from the report alone.

```typescript
  private static async unwrap<T>(
    response: APIResponse,
    schema: ZodType<T>,
    context: string,
    expectedStatus: number,
  ): Promise<T> {
    const raw = await response.text();

    // ApiClient.login is called from the worker-scoped `authToken` fixture,
    // where test.info() throws because no test is running. Attach only when
    // there is a test to attach to.
    try {
      await test.info().attach(`${context} response`, {
        body: raw === '' ? '(empty body)' : raw,
        contentType: 'application/json',
      });
    } catch {
      // Outside a test scope; the error is still thrown below with the body.
    }

    if (response.status() !== expectedStatus) {
      throw new Error(
        `${context} expected HTTP ${String(expectedStatus)} but got ${String(response.status())}.\n` +
          `URL: ${response.url()}\nBody: ${raw}`,
      );
    }
    const parsed = schema.safeParse(JSON.parse(raw) as unknown);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      throw new Error(`${context} returned a body that does not match its schema:\n${issues}\nBody: ${raw}`);
    }
    return parsed.data;
  }
```

Add `test` to the imports at the top of the file:

```typescript
import { test, type APIRequestContext, type APIResponse } from '@playwright/test';
```

- [ ] **Step 6: Add Allure metadata to two example specs**

In `tests/ui/login.spec.ts`, add the import and annotate both tests:

```typescript
import { annotate } from '../../src/utils/reporting';
```

```typescript
test('signs in with valid credentials', { tag: ['@smoke'] }, async ({ loginPage, page }) => {
  await annotate({
    severity: 'blocker',
    epic: 'Authentication',
    feature: 'Sign in',
    story: 'A registered user can sign in',
    issue: 'SHOP-101',
  });

  await loginPage.goto();
  await loginPage.login(STANDARD_USER.username, STANDARD_USER.password);

  await expect(page.getByRole('heading', { name: 'Inventory', level: 1 })).toBeVisible();
  await expect(page.getByTestId('current-user')).toHaveText(STANDARD_USER.username);
});

test('shows an error for invalid credentials', { tag: ['@regression'] }, async ({ loginPage }) => {
  await annotate({
    severity: 'critical',
    epic: 'Authentication',
    feature: 'Sign in',
    story: 'Invalid credentials are rejected',
    issue: 'SHOP-102',
  });

  await loginPage.goto();
  await loginPage.login(INVALID_USER.username, INVALID_USER.password);

  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toHaveText('Invalid username or password');
});
```

In `tests/api/items.spec.ts`, add the same import and annotate the first test:

```typescript
import { annotate } from '../../src/utils/reporting';
```

```typescript
test('lists the seeded catalogue', { tag: ['@smoke', '@api'] }, async ({ api }) => {
  await annotate({
    severity: 'critical',
    epic: 'Catalogue',
    feature: 'Items API',
    story: 'Listing items',
    issue: 'SHOP-201',
  });

  const items = await api.listItems();

  expect(items.length).toBeGreaterThanOrEqual(5);
  expect(items.map((item) => item.name)).toContain('Ergonomic Keyboard');
});
```

- [ ] **Step 7: Run everything and generate the Allure report**

```bash
rm -rf allure-results allure-report
npm run test:ci
npx allure generate allure-results --clean --output allure-report
```

Expected: `allure-report/index.html` exists. `allure-commandline` needs a JVM — if it fails with `Unable to locate a Java Runtime`, install a JDK 17+ and retry.

- [ ] **Step 8: Verify the metadata landed**

```bash
grep -l '"name":"severity"' allure-results/*-result.json | head -1
grep -o 'SHOP-101' allure-results/*-result.json | head -1
```

Expected: a matching results file, and `SHOP-101` present.

- [ ] **Step 9: Verify lint and types, then commit**

```bash
npm run typecheck && npm run lint && npm run format
git add -A
git commit -m "feat(reporting): add Allure metadata, categories and step trees

Adds severity/epic/feature/story labels, ticket links driven by TICKET_BASE_URL,
API request-response attachments, failure categories and test.step wrapping in
the page objects."
```

---

### Task 11: GitHub Actions and Dependabot

**Files:**

- Modify: `.github/workflows/playwright.yml` (full rewrite)
- Create: `.github/workflows/nightly.yml`, `.github/dependabot.yml`

**Interfaces:**

- Consumes: the `lint`, `typecheck`, `test:ci` npm scripts (Task 2); the `blob` and `allure-playwright` reporters (Tasks 4 and 10).

- [ ] **Step 1: Replace `.github/workflows/playwright.yml`**

```yaml
name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Least privilege by default; the publish job adds only what it needs.
permissions:
  contents: read

# A new push to the same branch cancels the previous run.
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  SHARD_TOTAL: 4

jobs:
  static-analysis:
    name: Lint and typecheck
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run format:check

  test:
    name: Test (shard ${{ matrix.shard }}/4)
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Resolve Playwright version
        id: pw
        run: echo "version=$(node -p "require('@playwright/test/package.json').version")" >> "$GITHUB_OUTPUT"

      - name: Cache browsers
        id: browser-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.pw.outputs.version }}

      # PR runs install only Chromium. The nightly workflow installs all
      # browsers. This is the "optimize browser downloads on CI" guidance.
      - name: Install Chromium
        if: steps.browser-cache.outputs.cache-hit != 'true'
        run: npx playwright install chromium --with-deps

      - name: Install system deps for cached browsers
        if: steps.browser-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium

      - name: Run tests
        run: npm run test:ci -- --shard=${{ matrix.shard }}/${{ env.SHARD_TOTAL }}

      - name: Upload blob report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report/
          retention-days: 7

      - name: Upload Allure results
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: allure-results-${{ matrix.shard }}
          path: allure-results/
          retention-days: 7

  report:
    name: Merge and publish reports
    if: ${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm

      # Allure's CLI is a JVM program. Java is provisioned only in this job, so
      # a JDK problem can never block the shards or the built-in report.
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - run: npm ci

      - name: Download blob reports
        uses: actions/download-artifact@v5
        with:
          pattern: blob-report-*
          path: all-blob-reports
          merge-multiple: true

      - name: Download Allure results
        uses: actions/download-artifact@v5
        with:
          pattern: allure-results-*
          path: allure-results
          merge-multiple: true

      - name: Merge into a single HTML report
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      # Restoring history/ is what gives Allure its trend and retry graphs.
      - name: Restore Allure history
        continue-on-error: true
        run: |
          git fetch origin gh-pages --depth=1 || exit 0
          git --work-tree=./gh-pages-tmp checkout origin/gh-pages -- . 2>/dev/null || exit 0
          if [ -d ./gh-pages-tmp/allure/history ]; then
            cp -r ./gh-pages-tmp/allure/history allure-results/history
          fi

      - name: Generate Allure report
        run: npx allure generate allure-results --clean --output allure-report

      - name: Assemble the published site
        run: |
          mkdir -p site/allure
          cp -r playwright-report/* site/
          cp -r allure-report/* site/allure/

      - name: Publish to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./site
          keep_files: false

      - name: Upload the merged report as an artifact
        uses: actions/upload-artifact@v4
        with:
          name: merged-reports
          path: site/
          retention-days: 30
```

- [ ] **Step 2: Create `.github/workflows/nightly.yml`**

```yaml
name: Nightly full suite

on:
  schedule:
    # 02:30 UTC every weekday.
    - cron: '30 2 * * 1-5'
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: nightly
  cancel-in-progress: false

jobs:
  test:
    name: Nightly (shard ${{ matrix.shard }}/4)
    runs-on: ubuntu-latest
    timeout-minutes: 60
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm
      - run: npm ci

      # Unlike the PR workflow, the nightly run covers every browser.
      - run: npx playwright install --with-deps

      - name: Run the full suite
        run: npx playwright test --shard=${{ matrix.shard }}/4

      - name: Upload blob report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: nightly-blob-report-${{ matrix.shard }}
          path: blob-report/
          retention-days: 7

  report:
    if: ${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - uses: actions/download-artifact@v5
        with:
          pattern: nightly-blob-report-*
          path: all-blob-reports
          merge-multiple: true
      - run: npx playwright merge-reports --reporter html ./all-blob-reports
      - uses: actions/upload-artifact@v4
        with:
          name: nightly-report
          path: playwright-report/
          retention-days: 30
```

- [ ] **Step 3: Create `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 5
    commit-message:
      prefix: build
      include: scope
    groups:
      # Playwright's runner and its browser images move together; a grouped PR
      # keeps them in step. This is the "keep Playwright updated" guidance.
      playwright:
        patterns:
          - '@playwright/*'
          - 'playwright*'
          - '@axe-core/*'
          - 'axe-core'
      allure:
        patterns:
          - 'allure-*'
      tooling:
        patterns:
          - 'eslint*'
          - 'typescript*'
          - 'prettier'
          - '@types/*'

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
    commit-message:
      prefix: ci
```

- [ ] **Step 4: Validate the workflow YAML locally**

```bash
node -e "const yaml=require('node:fs').readFileSync('.github/workflows/playwright.yml','utf8'); if(!yaml.includes('merge-reports')) throw new Error('missing merge step'); console.log('ok')"
npx --yes yaml-lint .github/workflows/playwright.yml .github/workflows/nightly.yml .github/dependabot.yml
```

Expected: `ok`, then yaml-lint reports each file valid.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ci(github): add sharded workflow, nightly run and Dependabot

Four shards with browser caching, Chromium-only installs on PRs, a merged HTML
report plus an Allure report with restored history, least-privilege permissions
and cancel-in-progress concurrency."
```

- [ ] **Step 6: Push and verify the run is green**

```bash
git push -u origin HEAD
gh run watch --exit-status
```

Expected: all jobs succeed. If the `visual` tests fail on their first CI run, the committed baselines were generated on a non-Linux platform — see the note at the end of Task 9 and regenerate them inside the Docker image from Task 13.

---

### Task 12: GitLab CI, Azure Pipelines and Jenkins

Same shape as the GitHub workflow, so the template works wherever the assignment lands.

**Files:**

- Create: `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile`

- [ ] **Step 1: Create `.gitlab-ci.yml`**

```yaml
# The official Playwright image already contains the browsers and their system
# dependencies, so no install step is needed.
image: mcr.microsoft.com/playwright:v1.62.1-noble

stages:
  - static
  - test
  - report

variables:
  npm_config_cache: '$CI_PROJECT_DIR/.npm'
  SHARD_TOTAL: '4'

cache:
  key:
    files:
      - package-lock.json
  paths:
    - .npm/

.install: &install
  before_script:
    - npm ci --cache .npm --prefer-offline

static-analysis:
  stage: static
  <<: *install
  script:
    - npm run lint
    - npm run typecheck
    - npm run format:check

test:
  stage: test
  <<: *install
  parallel:
    matrix:
      - SHARD_INDEX: ['1', '2', '3', '4']
  script:
    - npm run test:ci -- --shard=$SHARD_INDEX/$SHARD_TOTAL
  artifacts:
    when: always
    expire_in: 1 week
    paths:
      - blob-report/
      - allure-results/

report:
  stage: report
  image: mcr.microsoft.com/playwright:v1.62.1-noble
  when: always
  needs:
    - job: test
      artifacts: true
  <<: *install
  script:
    # Allure's CLI needs a JVM; install it only in this job.
    - apt-get update && apt-get install -y --no-install-recommends default-jre-headless
    - npx playwright merge-reports --reporter html ./blob-report
    - npx allure generate allure-results --clean --output allure-report
    - mkdir -p public/allure
    - cp -r playwright-report/* public/
    - cp -r allure-report/* public/allure/
  artifacts:
    when: always
    expire_in: 30 days
    paths:
      - public/

pages:
  stage: report
  needs: ['report']
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  script:
    - echo "Publishing the merged report to GitLab Pages"
  artifacts:
    paths:
      - public/
```

- [ ] **Step 2: Create `azure-pipelines.yml`**

```yaml
trigger:
  branches:
    include: [main]

pr:
  branches:
    include: [main]

variables:
  SHARD_TOTAL: 4

stages:
  - stage: StaticAnalysis
    jobs:
      - job: LintAndTypecheck
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
          - script: npm ci
            displayName: Install dependencies
          - script: npm run lint
            displayName: Lint
          - script: npm run typecheck
            displayName: Typecheck
          - script: npm run format:check
            displayName: Check formatting

  - stage: Test
    dependsOn: StaticAnalysis
    jobs:
      - job: Playwright
        pool:
          vmImage: ubuntu-latest
        timeoutInMinutes: 30
        strategy:
          matrix:
            shard1: { SHARD_INDEX: 1 }
            shard2: { SHARD_INDEX: 2 }
            shard3: { SHARD_INDEX: 3 }
            shard4: { SHARD_INDEX: 4 }
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
          - script: npm ci
            displayName: Install dependencies
          - script: npx playwright install chromium --with-deps
            displayName: Install Chromium
          - script: npm run test:ci -- --shard=$(SHARD_INDEX)/$(SHARD_TOTAL)
            displayName: Run tests
            env:
              CI: 'true'
          - task: PublishPipelineArtifact@1
            condition: succeededOrFailed()
            inputs:
              targetPath: blob-report
              artifact: blob-report-$(SHARD_INDEX)
          - task: PublishPipelineArtifact@1
            condition: succeededOrFailed()
            inputs:
              targetPath: allure-results
              artifact: allure-results-$(SHARD_INDEX)

  - stage: Report
    dependsOn: Test
    condition: succeededOrFailed()
    jobs:
      - job: MergeReports
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
          - task: JavaToolInstaller@0
            inputs:
              versionSpec: '17'
              jdkArchitectureOption: x64
              jdkSourceOption: PreInstalled
          - script: npm ci
            displayName: Install dependencies
          - task: DownloadPipelineArtifact@2
            inputs:
              patterns: 'blob-report-*/**'
              path: $(Pipeline.Workspace)/all-blob-reports
          - task: DownloadPipelineArtifact@2
            inputs:
              patterns: 'allure-results-*/**'
              path: $(Pipeline.Workspace)/allure-results
          - script: npx playwright merge-reports --reporter html $(Pipeline.Workspace)/all-blob-reports
            displayName: Merge blob reports
          - script: npx allure generate $(Pipeline.Workspace)/allure-results --clean --output allure-report
            displayName: Generate Allure report
          - task: PublishPipelineArtifact@1
            inputs:
              targetPath: playwright-report
              artifact: playwright-report
          - task: PublishPipelineArtifact@1
            inputs:
              targetPath: allure-report
              artifact: allure-report
```

- [ ] **Step 3: Create `Jenkinsfile`**

```groovy
// Requires the Jenkins "Allure" and "HTML Publisher" plugins, and an Allure
// commandline tool configured under Manage Jenkins > Tools named 'allure'.
pipeline {
  agent {
    docker {
      image 'mcr.microsoft.com/playwright:v1.62.1-noble'
      args '--ipc=host'
    }
  }

  options {
    timeout(time: 45, unit: 'MINUTES')
    disableConcurrentBuilds(abortPrevious: true)
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  environment {
    CI = 'true'
    SHARD_TOTAL = '4'
  }

  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Static analysis') {
      steps {
        sh 'npm run lint'
        sh 'npm run typecheck'
        sh 'npm run format:check'
      }
    }

    stage('Test') {
      steps {
        script {
          def shards = [:]
          for (int i = 1; i <= 4; i++) {
            def shard = i
            shards["shard-${shard}"] = {
              sh "npm run test:ci -- --shard=${shard}/${SHARD_TOTAL}"
            }
          }
          parallel shards
        }
      }
    }
  }

  post {
    always {
      sh 'npx playwright merge-reports --reporter html ./blob-report || true'
      publishHTML(target: [
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'playwright-report',
        reportFiles: 'index.html',
        reportName: 'Playwright Report'
      ])
      // The Allure plugin generates the report and keeps history across builds,
      // so no JVM setup is needed inside the container.
      allure includeProperties: false, jdk: '', results: [[path: 'allure-results']]
      archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
    }
  }
}
```

Note: Jenkins runs all four shards inside one agent, so they share `blob-report/` and `allure-results/` — Playwright appends rather than overwrites, which is why the merge step still works.

- [ ] **Step 4: Validate the YAML and Groovy syntax**

```bash
npx --yes yaml-lint .gitlab-ci.yml azure-pipelines.yml
node -e "const f=require('node:fs').readFileSync('Jenkinsfile','utf8'); const o=(f.match(/{/g)||[]).length, c=(f.match(/}/g)||[]).length; if(o!==c) throw new Error('unbalanced braces: '+o+' vs '+c); console.log('ok')"
```

Expected: both YAML files valid, then `ok`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ci: add GitLab, Azure Pipelines and Jenkins pipelines

All three shard four ways, publish a merged Playwright HTML report and an Allure
report, and mirror the GitHub workflow's structure."
```

---

### Task 13: Docker and devcontainer

Reproducible browser versions, and the only reliable way to regenerate Linux visual baselines from a non-Linux machine.

**Files:**

- Create: `docker/Dockerfile`, `docker/docker-compose.yml`, `.dockerignore`
- Create: `.devcontainer/devcontainer.json`

- [ ] **Step 1: Create `docker/Dockerfile`**

```dockerfile
# Pinned to the same version as @playwright/test in package.json. Bump both
# together — a mismatch produces "browser not found" at runtime.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

# Allure's CLI needs a JVM. Everything else ships with the base image.
RUN apt-get update \
  && apt-get install -y --no-install-recommends default-jre-headless \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /work

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npm", "test"]
```

- [ ] **Step 2: Create `docker/docker-compose.yml`**

```yaml
services:
  tests:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    # Chromium needs a large /dev/shm or it crashes on some hosts.
    ipc: host
    environment:
      CI: 'true'
    volumes:
      # Mount the repo so reports and updated baselines land on the host.
      - ..:/work
      - /work/node_modules
    command: npm test
```

- [ ] **Step 3: Create `.dockerignore`**

```gitignore
node_modules
playwright-report
blob-report
allure-results
allure-report
test-results
.git
.github
docs
```

- [ ] **Step 4: Create `.devcontainer/devcontainer.json`**

```json
{
  "name": "Playwright Template",
  "image": "mcr.microsoft.com/playwright:v1.62.1-noble",
  "runArgs": ["--ipc=host"],
  "postCreateCommand": "npm ci",
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-playwright.playwright",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "playwright.reuseBrowser": true
      }
    }
  },
  "forwardPorts": [4173]
}
```

- [ ] **Step 5: Build the image and run the suite inside it**

```bash
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml run --rm tests
```

Expected: the full suite runs. Visual tests fail here if the committed baselines came from a non-Linux host — that is expected and is fixed in the next step.

- [ ] **Step 6: Regenerate Linux visual baselines**

```bash
docker compose -f docker/docker-compose.yml run --rm tests npm run test:update-snapshots
git status --short tests/visual/__screenshots__
```

Expected: new or changed PNGs under a `linux` platform directory. Re-run step 5 and confirm the visual tests now pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "build(docker): add Dockerfile, compose file and devcontainer

Pins the browser image to the Playwright version in package.json and provides
the Linux environment used to generate CI-matching visual baselines."
```

---

### Task 14: Git hooks — Husky, lint-staged, commitlint

**Files:**

- Modify: `package.json` (add three devDependencies, a `prepare` script and a `lint-staged` block)
- Create: `.husky/pre-commit`, `.husky/commit-msg`, `commitlint.config.mjs`

- [ ] **Step 1: Install the hook tooling**

```bash
npm install -D husky@^9.1.7 lint-staged@^17.4.1 @commitlint/cli@^21.2.2 @commitlint/config-conventional@^21.2.2
```

- [ ] **Step 2: Add the `prepare` script and `lint-staged` config to `package.json`**

Add `"prepare": "husky"` to `scripts`, and this top-level block:

```json
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml,css,html,js}": [
      "prettier --write"
    ]
  }
```

- [ ] **Step 3: Initialise Husky and create the hooks**

```bash
npx husky init
```

`.husky/pre-commit`:

```sh
npx lint-staged
npm run typecheck
```

`.husky/commit-msg`:

```sh
npx --no -- commitlint --edit "$1"
```

Make both executable:

```bash
chmod +x .husky/pre-commit .husky/commit-msg
git update-index --chmod=+x .husky/pre-commit .husky/commit-msg
```

- [ ] **Step 4: Create `commitlint.config.mjs`**

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'api',
        'a11y',
        'ci',
        'components',
        'config',
        'demo-app',
        'deps',
        'docker',
        'docs',
        'fixtures',
        'reporting',
        'ui',
        'visual',
      ],
    ],
    'header-max-length': [2, 'always', 100],
  },
};
```

- [ ] **Step 5: Verify the hooks reject bad input**

```bash
echo "broken commit message" | npx commitlint ; echo "exit=$?"
echo "feat(ui): a valid message" | npx commitlint ; echo "exit=$?"
```

Expected: `exit=1` for the first (with `subject may not be empty` / `type may not be empty`), `exit=0` for the second.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "build: add Husky, lint-staged and commitlint

pre-commit runs lint-staged and typecheck; commit-msg enforces Conventional
Commits with a scope allowlist matching this repository's directories."
```

Expected: the hooks run during this very commit and pass.

---

### Task 15: README and documentation

**Files:**

- Modify: `README.md` (full rewrite)
- Create: `docs/getting-started.md`, `docs/conventions.md`, `docs/writing-page-objects.md`, `docs/ci.md`, `docs/adapting-to-a-new-project.md`

- [ ] **Step 1: Rewrite `README.md`**

````markdown
# Playwright Boilerplate — POM + TypeScript

An opinionated, ready-to-use Playwright template: page objects, composable
fixtures, UI/API/accessibility/visual examples, dual reporting and CI pipelines
for four platforms. Clone it, point it at your application, and start writing
tests.

## Quick start

```bash
npm ci
npx playwright install --with-deps
cp .env.example .env
npm test
```
````

Everything runs against the bundled demo app in `demo-app/`, so the suite is
green on a fresh clone with no configuration.

## What is in the box

| Area          | What you get                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Structure     | Page objects, root-scoped components, fixtures split by concern and merged with `mergeTests`                               |
| UI examples   | `storageState` auth, table interaction, form validation with soft assertions, network mocking, `@smoke`/`@regression` tags |
| API examples  | Typed client, zod-validated responses, CRUD, negative paths, a UI test seeded over the API                                 |
| Accessibility | `@axe-core/playwright` fixture with scoping, exclusions and attached violation reports                                     |
| Visual        | Full-page and component snapshots, masking, per-project/platform baselines                                                 |
| Reporting     | Built-in HTML merged across shards, plus Allure with history, severities and ticket links                                  |
| CI            | GitHub Actions (+ nightly + Dependabot), GitLab CI, Azure Pipelines, Jenkins                                               |
| Tooling       | TypeScript strict, ESLint with type-aware and Playwright rules, Prettier, Husky, Docker, devcontainer                      |

## Commands

| Command                                         | What it does                                          |
| ----------------------------------------------- | ----------------------------------------------------- |
| `npm test`                                      | Run every project                                     |
| `npm run test:ci`                               | Chromium + api + a11y + visual (what CI runs on a PR) |
| `npm run test:smoke`                            | Only `@smoke` tests                                   |
| `npm run test:ui`                               | Playwright UI mode with time-travel debugging         |
| `npm run test:debug`                            | Step through with the Playwright inspector            |
| `npm run test:visual` / `test:update-snapshots` | Run / regenerate visual baselines                     |
| `npm run codegen`                               | Record a test and generate locators                   |
| `npm run report`                                | Open the built-in HTML report                         |
| `npm run report:allure`                         | Generate and open the Allure report (needs a JVM)     |
| `npm run demo`                                  | Start the bundled demo app on its own                 |
| `npm run lint` / `typecheck` / `format`         | Static analysis                                       |

## Documentation

- [Getting started](docs/getting-started.md)
- [Conventions](docs/conventions.md)
- [Writing page objects](docs/writing-page-objects.md)
- [CI and reporting](docs/ci.md)
- [Adapting to a new project](docs/adapting-to-a-new-project.md)

## Requirements

Node 20 or newer. A JDK 17+ is needed only to generate the Allure report
locally; CI provisions it automatically.

````

- [ ] **Step 2: Create `docs/getting-started.md`**

```markdown
# Getting started

## Install

```bash
npm ci
npx playwright install --with-deps
cp .env.example .env
````

## Run the suite

```bash
npm test
```

Playwright starts the bundled demo app automatically via `webServer`, so nothing
else needs to be running.

## Watch it happen

```bash
npm run test:ui
```

UI mode gives you a watch mode, a DOM snapshot per action and time-travel
debugging. It is the fastest way to understand what a failing test did.

## Debug a single test

```bash
npx playwright test tests/ui/login.spec.ts:12 --debug
```

## Understand a CI failure

Download the `merged-reports` artifact, open `index.html`, and click into the
trace for the failed test. `trace: 'on-first-retry'` means every CI failure has
one. You do not need to reproduce the failure locally to inspect it.

## Environment

`src/utils/env.ts` validates the environment with zod at load time, before any
browser starts. A missing or malformed variable fails immediately with the
offending field name rather than surfacing as a confusing timeout.

| Variable                          | Default                           | Purpose                       |
| --------------------------------- | --------------------------------- | ----------------------------- |
| `BASE_URL`                        | `http://127.0.0.1:4173`           | Application under test        |
| `API_URL`                         | `http://127.0.0.1:4173/api`       | API under test                |
| `DEMO_PORT`                       | `4173`                            | Port for the bundled demo app |
| `TEST_USERNAME` / `TEST_PASSWORD` | demo credentials                  | Used by `auth.setup.ts`       |
| `TICKET_BASE_URL`                 | `https://example.invalid/browse/` | Prefix for Allure issue links |

````

- [ ] **Step 3: Create `docs/conventions.md`**

```markdown
# Conventions

## Files and names

- Kebab-case filenames with a role suffix: `.page.ts`, `.component.ts`,
  `.fixture.ts`, `.setup.ts`, `.spec.ts`.
- PascalCase classes: `LoginPage`, `TableComponent`.
- One class per file. A file that needs a second class usually needs a second
  file.

## Locator priority

1. Role, label or text: `getByRole('button', { name: 'Save' })`, `getByLabel`,
   `getByText`. These match how a user finds the element and survive restyling.
2. `getByTestId` when no accessible name exists. The attribute is `data-testid`.
3. CSS or XPath only where nothing else works — and always with a comment saying
   why.

Chain and filter rather than indexing:

```typescript
page.getByRole('row').filter({ hasText: 'Ergonomic Keyboard' }).getByRole('cell').first();
````

## Assertions

Only web-first assertions, which retry until the timeout:

```typescript
await expect(locator).toBeVisible(); // yes
expect(await locator.isVisible()).toBe(true); // no — lint error
```

Assertions live in specs, not in page objects. A page object that asserts cannot
be reused by a test that expects the opposite.

Use `expect.soft` when several independent checks should all be reported from
one run — see `tests/ui/form.spec.ts`.

## Waiting

Never `waitForTimeout`. It is a lint error in both `src/` and `tests/`. Playwright
already waits for actionability before every action and retries every web-first
assertion. For the rare condition that no locator assertion can express, use
`pollUntil` from `src/utils/wait.ts`.

## Isolation

Every test must pass when run alone, in any order, in parallel. No module-level
mutable state. Data a test needs is created by that test — use the `seededItem`
fixture, which also cleans up in teardown.

## Tags

`@smoke` for the critical path, `@regression` for everything else, plus `@api`,
`@a11y` and `@visual`. Run a subset with `npm run test:smoke` or
`npx playwright test --grep @api`.

## Third-party dependencies

Tests must not depend on sites you do not control. Mock at the network boundary
with `page.route` — see `tests/ui/network-mocking.spec.ts`.

````

- [ ] **Step 4: Create `docs/writing-page-objects.md`**

```markdown
# Writing page objects

## The shape

A page object exposes **locators as properties** and **intentions as methods**.
It never asserts.

```typescript
export class LoginPage extends BasePage {
  protected readonly path = '/login.html';

  readonly usernameInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByLabel('Username');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
  }

  async login(username: string, password: string): Promise<void> {
    await test.step(`Sign in as "${username}"`, async () => {
      await this.usernameInput.fill(username);
      await this.passwordInput.fill(password);
      await this.submitButton.click();
    });
  }
}
````

Locators are created in the constructor and are lazy — nothing touches the page
until an action or assertion runs, so constructing a page object is free.

## BasePage

`BasePage` gives every page `goto()` (relative to `baseURL`) and
`waitUntilLoaded()`. If your application shows a global spinner, set
`loadingIndicatorTestId` in the subclass and every navigation waits for it.

## Components vs pages

A **component** is UI that appears in more than one place. It takes a root
locator and scopes everything to it, so the same class works wherever the markup
appears:

```typescript
this.table = new TableComponent(page, page.getByRole('main'));
```

Use `TableComponent` as the model: it is built entirely on role locators
(`table`, `columnheader`, `row`, `cell`), so it works with any semantic table.

## Wrap multi-action methods in `test.step`

A step gives the report a readable tree and points a failure at the action
instead of a bare locator. Wrap anything that performs more than one action;
leave single-action methods alone.

## Adding a new page

1. Create `src/pages/<name>.page.ts` extending `BasePage`.
2. Add it to `PomFixtures` and `pomTest` in `src/fixtures/pom.fixture.ts`.
3. It is now available as a fixture in every spec: `async ({ myPage }) => {}`.

Fixtures are lazy — adding one costs nothing to tests that do not name it.

````

- [ ] **Step 5: Create `docs/ci.md`**

```markdown
# CI and reporting

## Pipelines

Four pipelines ship with the template. Delete the ones you do not need.

| Platform | File |
|---|---|
| GitHub Actions | `.github/workflows/playwright.yml`, `.github/workflows/nightly.yml` |
| GitLab CI | `.gitlab-ci.yml` |
| Azure Pipelines | `azure-pipelines.yml` |
| Jenkins | `Jenkinsfile` |

All four share the same shape: a static-analysis job (`lint`, `typecheck`,
`format:check`), a four-way sharded test matrix, then a report job that merges
the shards.

PR runs install Chromium only. The nightly GitHub workflow installs every
browser and runs the full cross-browser suite.

## Reports

Each shard writes a `blob` report and an `allure-results/` directory. The report
job merges them:

```bash
npx playwright merge-reports --reporter html ./all-blob-reports
npx allure generate allure-results --clean --output allure-report
````

The built-in HTML report is the default and needs no toolchain. Allure adds
severity, epic/feature/story grouping, ticket links and trend graphs across runs
— the GitHub workflow restores the previous run's `history/` directory before
generating, which is what makes the trends accumulate.

`allure-commandline` is a JVM program. Java is installed **only in the report
job**, so a JDK problem can never block the tests or the built-in report.

## Removing Allure

Three edits:

1. Delete the `allure-playwright` reporter entries from `playwright.config.ts`.
2. Remove `allure-playwright`, `allure-js-commons` and `allure-commandline` from
   `package.json`, and delete `src/utils/reporting.ts` and
   `allure-categories.json`.
3. Delete the Allure steps and the Java setup from your pipeline.

## Visual baselines

Baselines are keyed by project and platform via `snapshotPathTemplate`, so a
macOS baseline and a Linux baseline can coexist. CI runs on Linux, so generate
the Linux baselines inside the pinned image:

```bash
docker compose -f docker/docker-compose.yml run --rm tests npm run test:update-snapshots
```

Commit the result. Regenerate whenever you bump the Playwright version — the
browser changes with it.

## Sharding

`SHARD_TOTAL` is 4 everywhere. Raise it if the suite grows; each shard is an
independent runner, and the merge step handles any count.

````

- [ ] **Step 6: Create `docs/adapting-to-a-new-project.md`**

```markdown
# Adapting to a new project

Roughly twenty minutes from clone to your first real test.

## 1. Point at your application

Edit `.env`:

```bash
BASE_URL=https://staging.your-app.example.com
API_URL=https://staging.your-app.example.com/api
TEST_USERNAME=...
TEST_PASSWORD=...
TICKET_BASE_URL=https://your-tracker.example.com/browse/
````

Credentials belong in your CI secret store, never in a committed file.

## 2. Remove the demo app

```bash
rm -rf demo-app
```

Then in `playwright.config.ts`, delete the whole `webServer` block — Playwright
no longer needs to start anything. Remove the `demo` script from `package.json`
and `demo-app` from `tsconfig.json`'s `include`.

## 3. Replace the examples

Delete the contents of `tests/ui`, `tests/api`, `tests/a11y` and `tests/visual`,
and the page objects in `src/pages`. Keep:

- `src/pages/base.page.ts`
- `src/components/base.component.ts` and `table.component.ts`
- `src/utils/` in full
- `src/api/api-client.ts` (adjust the endpoints and schemas)
- every file in `src/fixtures/`

Work through `src/fixtures/pom.fixture.ts` and remove the fixtures whose page
objects you deleted; the compiler will point at anything you miss.

## 4. Adjust the test id attribute

If your application uses something other than `data-testid`, change
`testIdAttribute` in `playwright.config.ts`. Prefer role and label locators
regardless — see [conventions](conventions.md).

## 5. Rework authentication

`src/setup/auth.setup.ts` signs in through the UI and saves `storageState`.
Common variations:

- **Token-only auth:** call your login endpoint with `request` and write the
  token into `storageState`'s `origins[].localStorage`.
- **SSO:** sign in once manually with `npx playwright codegen --save-storage`,
  and commit nothing — store the state as a CI secret.
- **Multiple roles:** add one setup file per role, each writing its own storage
  state file, and give each browser project the matching `storageState`.

## 6. Add a global loading indicator

Most real applications have one. Set `loadingIndicatorTestId` in your page
objects (or override `waitUntilLoaded` in `BasePage`) so every navigation waits
for it to disappear.

## 7. Pick your CI

Keep one pipeline file and delete the rest. See [CI and reporting](ci.md).

## 8. Generate visual baselines

```bash
docker compose -f docker/docker-compose.yml run --rm tests npm run test:update-snapshots
```

Commit the PNGs. Without this the visual job fails on its first CI run.

## 9. Update the commit scope allowlist

`commitlint.config.mjs` lists the scopes this template uses. Replace them with
your project's areas, or delete the `scope-enum` rule.

````

- [ ] **Step 7: Verify every documented command actually works**

```bash
npm run lint && npm run typecheck && npm run format:check
npm test
````

Expected: all green. Then confirm the README's command table matches
`package.json`:

```bash
node -e "const s=Object.keys(require('./package.json').scripts); const md=require('node:fs').readFileSync('README.md','utf8'); const missing=s.filter(n=>!md.includes('npm run '+n)&&n!=='test'&&n!=='prepare'); if(missing.length) throw new Error('undocumented scripts: '+missing.join(', ')); console.log('all scripts documented')"
```

Expected: `all scripts documented`.

- [ ] **Step 8: Final verification — no client content survives anywhere**

```bash
grep -rniE "alphabet|al-ds-|al-label|\bTDS\b|CONFIRM_DELIVERY_LOCATION|moment" \
  --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=docs \
  --exclude-dir=playwright-report --exclude-dir=allure-report . ; echo "exit=$?"

node -e "const p=require('./package.json'); if(p.dependencies&&Object.keys(p.dependencies).length) throw new Error('runtime dependencies must be empty'); console.log('devDependencies only')"
```

Expected: no grep matches (`exit=1`), then `devDependencies only`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "docs: add README, getting started, conventions and CI guides

Documents the locator priority, the no-waitForTimeout rule, how to remove
Allure, how to regenerate Linux visual baselines and how to adapt the template
to a new project."
```

---

## Done

At this point the repository is a working template: `npm ci && npm test` is green
on a fresh clone, four CI pipelines are configured, both reports generate, and
`docs/adapting-to-a-new-project.md` explains the path from this template to a
real assignment.

Consider tagging the result:

```bash
git tag -a v2.0.0 -m "Template rebuild: examples, dual reporting, four CI platforms"
```
