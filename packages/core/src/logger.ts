/**
 * Minimal structured logger interface.
 * Designed to be satisfied by pino without depending on it.
 * Each method accepts an optional context object as the first argument
 * followed by a message string (pino's native signature).
 */
export interface Logger {
  debug(msg: string): void;
  debug(obj: Record<string, unknown>, msg: string): void;
  info(msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;
  warn(msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * No-op logger that silently discards all messages.
 * Used as default when no logger is provided, avoiding null checks.
 */
export const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  child() {
    return noopLogger;
  },
};
