import type { AppDatabase, Logger } from '@ctview/core';

declare global {
  namespace App {
    interface Locals {
      db: AppDatabase;
      logger: Logger;
    }
  }
}

export {};
