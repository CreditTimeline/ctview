import type { AppDatabase } from '@ctview/core';

declare global {
  namespace App {
    interface Locals {
      db: AppDatabase;
    }
  }
}

export {};
