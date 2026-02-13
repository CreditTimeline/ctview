import { describe, it, expect, vi } from 'vitest';
import { apiFetch, type FetchOptions } from '../fetch-wrapper.js';
import { CtviewApiError } from '../errors.js';

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  });
}

const baseOptions: FetchOptions = {
  baseUrl: 'http://localhost:3000/api/v1/',
};

describe('apiFetch', () => {
  it('unwraps { data: T } envelope on success', async () => {
    const fetch = mockFetch({ data: { id: 1, name: 'test' } });
    const result = await apiFetch<{ id: number; name: string }>(
      { ...baseOptions, fetch },
      'subjects',
    );
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  it('throws CtviewApiError on non-2xx response', async () => {
    const fetch = mockFetch({ error: { code: 'NOT_FOUND', message: 'Subject not found' } }, 404);
    await expect(apiFetch({ ...baseOptions, fetch }, 'subjects/123')).rejects.toThrow(
      CtviewApiError,
    );

    try {
      await apiFetch({ ...baseOptions, fetch }, 'subjects/123');
    } catch (e) {
      const err = e as CtviewApiError;
      expect(err.status).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Subject not found');
    }
  });

  it('handles error response with details', async () => {
    const details = [{ path: '/name', message: 'required' }];
    const fetch = mockFetch(
      { error: { code: 'VALIDATION_FAILED', message: 'Invalid', details } },
      400,
    );
    try {
      await apiFetch({ ...baseOptions, fetch }, 'ingest');
    } catch (e) {
      const err = e as CtviewApiError;
      expect(err.details).toEqual(details);
    }
  });

  it('handles error response with unparseable body', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
    });
    try {
      await apiFetch({ ...baseOptions, fetch }, 'broken');
    } catch (e) {
      const err = e as CtviewApiError;
      expect(err.status).toBe(500);
      expect(err.code).toBe('UNKNOWN');
      expect(err.message).toBe('Internal Server Error');
    }
  });

  it('appends query params to URL', async () => {
    const fetch = mockFetch({ data: [] });
    await apiFetch({ ...baseOptions, fetch }, 'subjects', {
      params: { limit: 10, offset: 20 },
    });
    const calledUrl = fetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).toContain('offset=20');
  });

  it('omits undefined query params', async () => {
    const fetch = mockFetch({ data: [] });
    await apiFetch({ ...baseOptions, fetch }, 'subjects', {
      params: { limit: 10, offset: undefined },
    });
    const calledUrl = fetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).not.toContain('offset');
  });

  it('sets Authorization header when apiKey provided', async () => {
    const fetch = mockFetch({ data: {} });
    await apiFetch({ ...baseOptions, fetch, apiKey: 'secret-key' }, 'dashboard');
    const calledHeaders = fetch.mock.calls[0][1].headers as Record<string, string>;
    expect(calledHeaders['Authorization']).toBe('Bearer secret-key');
  });

  it('does not set Authorization header when no apiKey', async () => {
    const fetch = mockFetch({ data: {} });
    await apiFetch({ ...baseOptions, fetch }, 'dashboard');
    const calledHeaders = fetch.mock.calls[0][1].headers as Record<string, string>;
    expect(calledHeaders['Authorization']).toBeUndefined();
  });

  it('includes custom headers from options', async () => {
    const fetch = mockFetch({ data: {} });
    await apiFetch({ ...baseOptions, fetch, headers: { 'X-Custom': 'value' } }, 'dashboard');
    const calledHeaders = fetch.mock.calls[0][1].headers as Record<string, string>;
    expect(calledHeaders['X-Custom']).toBe('value');
  });

  it('merges per-request headers with option headers', async () => {
    const fetch = mockFetch({ data: {} });
    await apiFetch({ ...baseOptions, fetch, headers: { 'X-A': '1' } }, 'ingest', {
      headers: { 'X-B': '2' },
    });
    const calledHeaders = fetch.mock.calls[0][1].headers as Record<string, string>;
    expect(calledHeaders['X-A']).toBe('1');
    expect(calledHeaders['X-B']).toBe('2');
  });
});
