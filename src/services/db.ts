import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Point { x: number; y: number; }
export interface HighlightLine { color: string; points: Point[]; width: number; }

export interface ProgressState {
  currentPage: number;
  totalPages: number;
  percentage: number;
  scrollPosition: number;
}

export interface DocItem {
  id: string;
  userId: string; // 'guest' or google uid
  name: string;
  type: 'pdf' | 'txt' | 'html' | 'url' | 'doc';
  content: Blob | string | null;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  isFavorite: boolean;
  progress: ProgressState;
  highlights?: Record<number, HighlightLine[]>;
  textContent?: string;
}

interface LibraryDB extends DBSchema {
  documents: {
    key: string;
    value: DocItem;
    indexes: {
      'by-date': number;
      'by-lastOpenedAt': number;
      'by-userId': string;
    };
  };
}

class DBService {
  private dbPromise: Promise<IDBPDatabase<LibraryDB>> | null = null;

  private async getDB(): Promise<IDBPDatabase<LibraryDB>> {
    if (!this.dbPromise) {
      try {
        this.dbPromise = openDB<LibraryDB>('LibraryAppDB_v3', 1, {
          upgrade(db) {
            const docStore = db.createObjectStore('documents', { keyPath: 'id' });
            docStore.createIndex('by-date', 'createdAt');
            docStore.createIndex('by-lastOpenedAt', 'lastOpenedAt');
            docStore.createIndex('by-userId', 'userId');
          },
        });
      } catch (error) {
        console.error("Failed to initialize IndexedDB:", error);
        throw new Error("Base de datos no disponible. Revisa los permisos del navegador.");
      }
    }
    return this.dbPromise;
  }

  async getAllDocuments(userId: string = 'guest'): Promise<DocItem[]> {
    try {
      const db = await this.getDB();
      const docs = await db.getAllFromIndex('documents', 'by-userId', userId);
      return docs.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
    } catch (e) {
      console.warn("Could not get documents, returning empty list", e);
      return [];
    }
  }

  async addDocument(doc: DocItem): Promise<void> {
    const db = await this.getDB();
    await db.put('documents', doc);
  }

  async deleteDocument(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('documents', id);
  }

  async updateProgress(id: string, progressUpdate: Partial<ProgressState>): Promise<DocItem | null> {
    const db = await this.getDB();
    const doc = await db.get('documents', id);
    if (doc) {
      doc.progress = { ...doc.progress, ...progressUpdate };
      doc.updatedAt = Date.now();
      doc.lastOpenedAt = Date.now();
      await db.put('documents', doc);
      return doc;
    }
    return null;
  }

  async toggleFavorite(id: string): Promise<DocItem | null> {
    const db = await this.getDB();
    const doc = await db.get('documents', id);
    if (doc) {
      doc.isFavorite = !doc.isFavorite;
      doc.updatedAt = Date.now();
      await db.put('documents', doc);
      return doc;
    }
    return null;
  }

  async saveHighlights(id: string, pageNum: number, highlights: HighlightLine[]): Promise<DocItem | null> {
    const db = await this.getDB();
    const doc = await db.get('documents', id);
    if (doc) {
      if (!doc.highlights) doc.highlights = {};
      doc.highlights[pageNum] = highlights;
      doc.updatedAt = Date.now();
      await db.put('documents', doc);
      return doc;
    }
    return null;
  }
}

export const dbService = new DBService();
