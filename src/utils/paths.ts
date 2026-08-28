import { join } from 'node:path';

// Same reason as demo-app/server.ts: this file is compiled to CommonJS, so
// import.meta is unavailable. Playwright runs from the config's directory.
export const STORAGE_STATE = join(process.cwd(), 'playwright', '.auth', 'user.json');
