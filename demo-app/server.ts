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

async function handleApi(request: IncomingMessage, response: ServerResponse, pathname: string, store: ItemStore): Promise<void> {
  const method = request.method ?? 'GET';

  if (pathname === '/api/login' && method === 'POST') {
    const body = (await readBody(request)) as { username?: string; password?: string } | null;
    if (body?.username === VALID_CREDENTIALS.username && body.password === VALID_CREDENTIALS.password) {
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
