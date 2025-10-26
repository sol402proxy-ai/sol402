import { serve } from '@hono/node-server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { env } from './lib/env.js';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const publicDir = join(rootDir, 'public');

async function loadTextAsset(path: string): Promise<string | undefined> {
  try {
    return await readFile(join(publicDir, path), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

async function loadBinaryAsset(path: string): Promise<Uint8Array | undefined> {
  try {
    const data = await readFile(join(publicDir, path));
    return new Uint8Array(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

export { createApp } from './app.js';

const isEntryPoint =
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1]?.endsWith('tsx');

if (isEntryPoint) {
  const app = createApp({
    assetProvider: {
      getTextAsset: (path) => loadTextAsset(path),
      getBinaryAsset: (path) => loadBinaryAsset(path),
    },
  });

  const port = env.PORT;

  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      /* eslint-disable no-console */
      console.log(`Sol402 dev server listening on http://localhost:${info.port}`);
      /* eslint-enable no-console */
    }
  );
}
