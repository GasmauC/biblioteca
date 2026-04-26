import { type DocItem } from './db';

/**
 * Engine that handles background synchronization.
 * Simplified version: No-Op (Local only).
 */
class SyncEngine {
  constructor() {
    // Local only, no listeners needed
  }

  async pushToCloud(_doc: DocItem) {
    // No-Op: Cloud sync removed to simplify project
  }

  async fullSyncPull(_userId: string) {
    // No-Op: Cloud sync removed to simplify project
  }
}

export const syncEngine = new SyncEngine();
