import { describe, it, expect } from 'vitest';
import { noopLogger } from '../logger.js';

describe('noopLogger', () => {
  it('accepts all log method signatures without error', () => {
    noopLogger.debug('msg');
    noopLogger.debug({ key: 'val' }, 'msg');
    noopLogger.info('msg');
    noopLogger.info({ key: 'val' }, 'msg');
    noopLogger.warn('msg');
    noopLogger.warn({ key: 'val' }, 'msg');
    noopLogger.error('msg');
    noopLogger.error({ err: new Error('test') }, 'msg');
  });

  it('returns itself from child()', () => {
    const child = noopLogger.child({ requestId: '123' });
    expect(child).toBe(noopLogger);
    child.info('child msg');
  });
});
