import { join } from 'node:path';

/**
 * Where the authenticated session is cached. Written once by
 * `src/setup/auth.setup.ts` and loaded through `storageState` by every project
 * declaring `dependencies: ['setup']`, so no UI spec ever signs in itself.
 *
 * The demo app keeps its token in localStorage rather than in a cookie, and
 * `storageState()` captures localStorage origins too, which is what makes this
 * shortcut work at all. The directory is gitignored: it holds a live session.
 *
 * Built from `process.cwd()` for the same reason as demo-app/server.ts: this
 * file is compiled to CommonJS, so import.meta is unavailable. Playwright runs
 * from the config's directory.
 */
export const STORAGE_STATE = join(process.cwd(), 'playwright', '.auth', 'user.json');
