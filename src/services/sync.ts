import { type DocItem, dbService } from './db';
import { useLibraryStore } from '../store/useLibraryStore';

/**
 * Interface representing the Cloud Provider (Firebase, Supabase, etc.)
 */
interface CloudProvider {
  pushDocument(doc: DocItem): Promise<void>;
  pullUserDocuments(userId: string): Promise<DocItem[]>;
}

/**
 * Mock implementation of a Cloud Provider using localStorage to simulate remote DB.
 * In a real scenario, this would use Firebase Firestore/Storage.
 */
class MockCloudProvider implements CloudProvider {
  private getCloudData(): Record<string, DocItem[]> {
    const data = localStorage.getItem('mock_cloud_db');
    return data ? JSON.parse(data) : {};
  }

  private saveCloudData(data: Record<string, DocItem[]>) {
    localStorage.setItem('mock_cloud_db', JSON.stringify(data));
  }

  async pushDocument(doc: DocItem): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const cloudDb = this.getCloudData();
        const userDocs = cloudDb[doc.userId] || [];
        
        const existingIndex = userDocs.findIndex(d => d.id === doc.id);
        if (existingIndex >= 0) {
          // Check if incoming is newer
          if (doc.updatedAt > userDocs[existingIndex].updatedAt) {
             userDocs[existingIndex] = doc;
          }
        } else {
          userDocs.push(doc);
        }

        cloudDb[doc.userId] = userDocs;
        this.saveCloudData(cloudDb);
        resolve();
      }, 500); // Simulate network delay
    });
  }

  async pullUserDocuments(userId: string): Promise<DocItem[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const cloudDb = this.getCloudData();
        resolve(cloudDb[userId] || []);
      }, 800);
    });
  }
}

class SyncEngine {
  private cloud: CloudProvider;
  private isOnline: boolean = navigator.onLine;
  private offlineQueue: Set<string>;

  constructor() {
    this.cloud = new MockCloudProvider();
    
    // Initialize queue from local storage
    const savedQueue = localStorage.getItem('sync_offline_queue');
    this.offlineQueue = new Set(savedQueue ? JSON.parse(savedQueue) : []);

    // Set initial status if offline
    if (!this.isOnline) {
      setTimeout(() => useLibraryStore.getState().setSyncStatus('offline'), 100);
    }

    // Network listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
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
    if (this.offlineQueue.size === 0) {
      useLibraryStore.getState().setSyncStatus('idle');
      return;
    }

    const allDocs = await dbService.getAllDocuments(useLibraryStore.getState().user?.uid || 'guest');
    
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
        // Document deleted locally while offline?
        this.offlineQueue.delete(docId);
        this.saveQueue();
      }
    }

    useLibraryStore.getState().setSyncStatus(hasError ? 'error' : 'synced');
  }

  /**
   * Pushes a local document change to the cloud.
   */
  async pushToCloud(doc: DocItem) {
    if (doc.userId === 'guest') return; // Don't sync guest data
    
    if (!this.isOnline) {
      this.offlineQueue.add(doc.id);
      this.saveQueue();
      useLibraryStore.getState().setSyncStatus('offline');
      return;
    }
    
    // Notify store that sync started
    useLibraryStore.getState().setSyncStatus('syncing');
    
    try {
      await this.cloud.pushDocument(doc);
      useLibraryStore.getState().setSyncStatus('synced');
    } catch (e) {
      console.error("Sync failed to push", e);
      useLibraryStore.getState().setSyncStatus('error');
    }
  }

  /**
   * Pulls all documents from the cloud for the given user,
   * merges them locally (Last-Write-Wins), and updates the UI store.
   */
  async fullSyncPull(userId: string) {
    if (userId === 'guest') return;

    useLibraryStore.getState().setSyncStatus('syncing');
    try {
      const cloudDocs = await this.cloud.pullUserDocuments(userId);
      const localDocs = await dbService.getAllDocuments(userId);
      
      const localDocsMap = new Map(localDocs.map(d => [d.id, d]));
      let hasChanges = false;

      for (const cloudDoc of cloudDocs) {
        const localDoc = localDocsMap.get(cloudDoc.id);
        
        if (!localDoc) {
          // Document exists in cloud but not locally -> Download it
          await dbService.addDocument(cloudDoc);
          hasChanges = true;
        } else {
          // Document exists in both, check timestamps (Last-Write-Wins)
          if (cloudDoc.updatedAt > localDoc.updatedAt) {
            await dbService.addDocument(cloudDoc); // Overwrites local
            hasChanges = true;
          } else if (localDoc.updatedAt > cloudDoc.updatedAt) {
             // Local is newer, push to cloud
             this.pushToCloud(localDoc);
          }
        }
      }

      if (hasChanges) {
        // Refresh store to show new data
        await useLibraryStore.getState().loadDocuments();
      }

      useLibraryStore.getState().setSyncStatus('synced');
    } catch (e) {
      console.error("Sync failed to pull", e);
      useLibraryStore.getState().setSyncStatus('error');
    }
  }
}

export const syncEngine = new SyncEngine();
