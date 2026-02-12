import type { RequestHandler } from './$types';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let cachedHtml: string | null = null;

function buildHtml(): string {
  const standalonePath = require.resolve(
    '@scalar/api-reference/dist/browser/standalone.js',
  );
  const standaloneJs = readFileSync(standalonePath, 'utf-8');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ctview API Docs</title>
  <style>body { margin: 0; }</style>
</head>
<body>
  <script id="api-reference" data-url="/api/v1/openapi.json"></script>
  <script>${standaloneJs}</script>
</body>
</html>`;
}

export const GET: RequestHandler = () => {
  if (!cachedHtml) {
    cachedHtml = buildHtml();
  }
  return new Response(cachedHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
