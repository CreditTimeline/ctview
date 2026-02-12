import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateOpenApiSpec } from '@ctview/core';

let cachedSpec: Record<string, unknown> | null = null;

export const GET: RequestHandler = () => {
  if (!cachedSpec) {
    cachedSpec = generateOpenApiSpec();
  }
  return json(cachedSpec);
};
