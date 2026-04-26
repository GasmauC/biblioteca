import { type DocItem, dbService } from './db';
import { useLibraryStore } from '../store/useLibraryStore';
import { FirestoreCloudProvider, type CloudProvider } from './firestoreCloud';

/**
 * Engine that handles background synchronization between local IndexedDB and Cloud.
 */
class SyncEngine {
  private cloud: CloudProvider;
  private isOnline: boolean = navigator.onLine;
  private offlineQueue: Set<string>;
  private syncInProgress: boolean = false;

  constructor() {
    this.cloud = new FirestoreCloudProvider();
    
    // Initialize queue from local storage
    const savedQueue = localStorage.getItem('sync_offline_queue');
    this.offlineQueue = new Set(savedQueue ? JSON.parse(savedQueue) : []);

    // Network listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Initial status
    if (!this.isOnline) {
      setTimeout(() => useLibraryStore.getState().setSyncStatus('offline'), 500);
    }
  }

  private handleOffline() {
    this.isOnline = false;
    useLibraryStore.getState().setSyncStatus('offline');
  }

  private async handleOnline() {
    this.isOnline = true;
    useLibraryStore.getState().setSyncStatus('syncing');
    await this.flushQueue();
  }

  private saveQueue() {
    localStorage.setItem('sync_offline_queue', JSON.stringify(Array.from(this.offlineQueue)));
  }

  private async flushQueue() {
    if (this.offlineQueue.size === 0 || !this.isOnline) return;

    const user = useLibraryStore.getState().user;
    if (!user) return;

    const allDocs = await dbService.getAllDocuments(user.uid);
    let hasError = false;
    
    for (const docId of Array.from(this.offlineQueue)) {
      const doc = allDocs.find(d => d.id === docId);
      if (doc) {
        try {
          await this.cloud.pushDocument(doc);
          this.offlineQueue.delete(docId);
          this.saveQueue();
        } catch (e) {
          console.error("Failed to push queued doc", docId, e);
          hasError = true;
        }
      } else {
        this.offlineQueue.delete(docId);
        this.saveQueue();
      }
    }

    useLibraryStore.getState().setSyncStatus(hasError ? 'error' : 'synced');
  }

  async pushToCloud(doc: DocItem) {
    if (!doc.userId || doc.userId === 'guest') return;
    
    if (!this.isOnline) {
      this.offlineQueue.add(doc.id);
      this.saveQueue();
      useLibraryStore.getState().setSyncStatus('offline');
      return;
    }
    
    useLibraryStore.getState().setSyncStatus('syncing');
    try {
      await this.cloud.pushDocument(doc);
      useLibraryStore.getState().setSyncStatus('synced');
    } catch (e) {
      console.error("Cloud push failed", e);
      useLibraryStore.getState().setSyncStatus('error');
    }
  }

  /**
   * Pulls documents from cloud and merges with local DB.
   */
  async fullSyncPull(userId: string) {
    if (!userId || userId === 'guest' || this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    useLibraryStore.getState().setSyncStatus('syncing');

    try {
      const cloudDocs = await this.cloud.pullUserDocuments(userId);
      const localDocs = await dbService.getAllDocuments(userId);
      const localDocsMap = new Map(localDocs.map(d => [d.id, d]));
      
      let hasChanges = false;

      for (const cloudDoc of cloudDocs) {
        const localDoc = localDocsMap.get(cloudDoc.id);
        
        if (!localDoc) {
          // New doc from another device -> Download for offline access
          if (typeof cloudDoc.content === 'string' && cloudDoc.content.startsWith('http')) {
            try {
              const res = await fetch(cloudDoc.content);
              cloudDoc.content = await res.blob();
            } catch (e) {
              console.warn("Could not download file for offline use", cloudDoc.id, e);
            }
          }
          await dbService.addDocument(cloudDoc);
          hasChanges = true;
        } else {
          // Resolve conflict: Last-Write-Wins
          if (cloudDoc.updatedAt > localDoc.updatedAt) {
            // If cloud is newer and content is a URL, download it
            if (typeof cloudDoc.content === 'string' && cloudDoc.content.startsWith('http')) {
              try {
                const res = await fetch(cloudDoc.content);
                cloudDoc.content = await res.blob();
              } catch (e) {
                console.warn("Could not download updated file", cloudDoc.id, e);
              }
            }
            await dbService.addDocument(cloudDoc);
            hasChanges = true;
          } else if (localDoc.updatedAt > cloudDoc.updatedAt) {
            // Local is newer, schedule a push
            this.pushToCloud(localDoc);
          }
        }
      }

      if (hasChanges) {
        await useLibraryStore.getState().loadDocuments();
      }
      
      useLibraryStore.getState().setSyncStatus('synced');
    } catch (e) {
      console.error("Full sync pull failed", e);
      useLibraryStore.getState().setSyncStatus('error');
    } finally {
      this.syncInProgress = false;
    }
  }
}

export const syncEngine = new SyncEngine();
