import { create } from 'zustand';
import { dbService, type DocItem, type HighlightLine, type ProgressState } from '../services/db';
import { authService, type User } from '../services/auth';
import { syncEngine } from '../services/sync';

interface LibraryState {
  documents: DocItem[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterBy: 'all' | 'favorites';
  setFilterBy: (filter: 'all' | 'favorites') => void;
  sortBy: 'recent' | 'name';
  setSortBy: (sort: 'recent' | 'name') => void;
  loadDocuments: () => Promise<void>;
  addDocument: (doc: DocItem) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  updateDocumentProgress: (id: string, progressUpdate: Partial<ProgressState>) => Promise<void>;
  updateDocumentHighlights: (id: string, pageNum: number, highlights: HighlightLine[]) => Promise<void>;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (isOpen: boolean) => void;
  
  // Auth & Sync
  user: User | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  setSyncStatus: (status: 'idle' | 'syncing' | 'synced' | 'error' | 'offline') => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  documents: [],
  isLoading: false,
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  filterBy: 'all',
  setFilterBy: (filterBy) => set({ filterBy }),
  sortBy: 'recent',
  setSortBy: (sortBy) => set({ sortBy }),
  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
  
  user: authService.getCurrentUser(),
  syncStatus: 'idle',
  setSyncStatus: (status) => set({ syncStatus: status }),

  initAuth: () => {
    authService.onAuthStateChanged((user) => {
      set({ user });
      if (user) {
        // When user logs in, load local docs first, then pull from cloud
        useLibraryStore.getState().loadDocuments().then(() => {
          syncEngine.fullSyncPull(user.uid);
        });
      } else {
        // Guest mode
        useLibraryStore.getState().loadDocuments();
      }
    });
  },

  loginWithGoogle: async () => {
    await authService.loginWithGoogle();
  },

  logout: async () => {
    await authService.logout();
    set({ documents: [] });
  },

  loadDocuments: async () => {
    set({ isLoading: true });
    try {
      const user = authService.getCurrentUser();
      const userId = user ? user.uid : 'guest';
      const docs = await dbService.getAllDocuments(userId);
      set({ documents: docs });
    } catch (error) {
      console.error("Failed to load documents", error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  addDocument: async (doc) => {
    const user = authService.getCurrentUser();
    const docWithUser = { ...doc, userId: user ? user.uid : 'guest' };
    await dbService.addDocument(docWithUser);
    
    set((state) => {
      const exists = state.documents.some(d => d.id === docWithUser.id);
      if (exists) {
        return { documents: state.documents.map(d => d.id === docWithUser.id ? docWithUser : d) };
      }
      return { documents: [docWithUser, ...state.documents] };
    });
    
    syncEngine.pushToCloud(docWithUser);
  },

  toggleFavorite: async (id) => {
    const updatedDoc = await dbService.toggleFavorite(id);
    if (updatedDoc) {
      set((state) => ({
        documents: state.documents.map(d => 
          d.id === id ? updatedDoc : d
        )
      }));
      syncEngine.pushToCloud(updatedDoc);
    }
  },

  updateDocumentProgress: async (id, progressUpdate) => {
    const updatedDoc = await dbService.updateProgress(id, progressUpdate);
    if (updatedDoc) {
      set((state) => ({
        documents: state.documents.map(d => 
          d.id === id ? updatedDoc : d
        )
      }));
      syncEngine.pushToCloud(updatedDoc);
    }
  },

  updateDocumentHighlights: async (id, pageNum, highlights) => {
    const updatedDoc = await dbService.saveHighlights(id, pageNum, highlights);
    if (updatedDoc) {
      set((state) => ({
        documents: state.documents.map(d => 
          d.id === id ? updatedDoc : d
        )
      }));
      syncEngine.pushToCloud(updatedDoc);
    }
  }
}));
