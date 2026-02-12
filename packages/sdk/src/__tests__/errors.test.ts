import { describe, it, expect } from 'vitest';
import { CtviewApiError } from '../errors.js';

describe('CtviewApiError', () => {
  it('extends Error', () => {
    const err = new CtviewApiError(400, 'VALIDATION_FAILED', 'Bad request');
    expect(err).toBeInstanceOf(Error);
  });

  it('has correct name', () => {
    const err = new CtviewApiError(404, 'NOT_FOUND', 'Not found');
    expect(err.name).toBe('CtviewApiError');
  });

  it('stores status, code, and message', () => {
    const err = new CtviewApiError(422, 'VALIDATION_FAILED', 'Invalid input');
    expect(err.status).toBe(422);
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.message).toBe('Invalid input');
  });

  it('stores details when provided', () => {
    const details = [{ path: '/name', message: 'required' }];
    const err = new CtviewApiError(400, 'VALIDATION_FAILED', 'Bad', details);
    expect(err.details).toEqual(details);
  });

  it('has undefined details when not provided', () => {
    const err = new CtviewApiError(500, 'INTERNAL_ERROR', 'Oops');
    expect(err.details).toBeUndefined();
  });
});
