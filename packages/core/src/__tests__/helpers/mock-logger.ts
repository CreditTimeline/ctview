import type { Logger } from '../../logger.js';

export interface MockLogger extends Logger {
  calls: { level: string; args: unknown[] }[];
}

export function createMockLogger(): MockLogger {
  const calls: { level: string; args: unknown[] }[] = [];

  const handler =
    (level: string) =>
    (...args: unknown[]) => {
      calls.push({ level, args });
    };

  const logger: MockLogger = {
    calls,
    debug: handler('debug') as Logger['debug'],
    info: handler('info') as Logger['info'],
    warn: handler('warn') as Logger['warn'],
    error: handler('error') as Logger['error'],
    child() {
      return logger;
    },
  };

  return logger;
}
