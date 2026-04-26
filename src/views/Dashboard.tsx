import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { DocumentCard } from '../components/DocumentCard';
import { Button } from '../components/Button';
import { useLibraryStore } from '../store/useLibraryStore';
import { useShallow } from 'zustand/react/shallow';
import { Plus, Search, FileText, Star, Clock, Menu } from 'lucide-react';
import './Dashboard.css';

export const Dashboard = () => {
  const { 
    documents, loadDocuments, addDocument, isLoading,
    searchQuery, setSearchQuery, filterBy, sortBy, setSortBy, toggleFavorite,
    setMobileSidebarOpen, user
  } = useLibraryStore(useShallow(state => ({
    documents: state.documents,
    loadDocuments: state.loadDocuments,
    addDocument: state.addDocument,
    isLoading: state.isLoading,
    searchQuery: state.searchQuery,
    setSearchQuery: state.setSearchQuery,
    filterBy: state.filterBy,
    sortBy: state.sortBy,
    setSortBy: state.setSortBy,
    toggleFavorite: state.toggleFavorite,
    setMobileSidebarOpen: state.setMobileSidebarOpen,
    user: state.user
  })));
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    let type: 'pdf' | 'txt' | 'html' | 'doc' = 'txt';
    if (ext === 'pdf') type = 'pdf';
    else if (ext === 'html' || ext === 'htm') type = 'html';
    else if (ext === 'doc' || ext === 'docx') type = 'doc';

    const newDoc = {
      id: crypto.randomUUID(),
      userId: user?.uid || 'guest',
      name: file.name,
      type,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
      content: file,
      isFavorite: false,
      progress: {
        currentPage: 1,
        totalPages: 1,
        percentage: 0,
        scrollPosition: 0
      },
      highlights: []
    };

    await addDocument(newDoc);
    if (fileInputRef.current) fileInputRef.current.value = '';
    import('react-hot-toast').then(({ toast }) => {
      toast.success(`Documento "${file.name}" añadido a la biblioteca`);
    });
  };

  const filteredDocuments = useMemo(() => {
    return documents
      .filter(doc => {
        if (filterBy === 'favorites' && !doc.isFavorite) return false;
        if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') return b.lastOpenedAt - a.lastOpenedAt;
        return a.name.localeCompare(b.name);
      });
  }, [documents, filterBy, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const total = documents.length;
    const favs = documents.filter(d => d.isFavorite).length;
    const reading = documents.filter(d => d.progress.percentage > 0 && d.progress.percentage < 100).length;
    return { total, favs, reading };
  }, [documents]);

  return (
    <Layout>
      <motion.div 
        className="dashboard-container"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <header className="dashboard-header">
          <div className="header-left">
            <button className="mobile-menu-btn" onClick={() => setMobileSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="search-bar">
              <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar documentos..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            </div>
          </div>
          <div className="header-actions">
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
              accept=".pdf,.txt,.html,.doc,.docx"
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="primary" size="sm" icon={<Plus size={16} />}>
              Añadir documento
            </Button>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="hero-section">
            <div className="hero-text">
              <h1>Buenos días, {user?.displayName?.split(' ')[0] || 'Lector'}</h1>
              <p>Tu biblioteca personal está lista. Tienes {stats.total} documentos en total.</p>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon bg-blue"><FileText size={20} /></div>
                <div className="stat-info">
                  <span className="stat-value">{stats.total}</span>
                  <span className="stat-label">Total</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-amber"><Star size={20} /></div>
                <div className="stat-info">
                  <span className="stat-value">{stats.favs}</span>
                  <span className="stat-label">Favoritos</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-green"><Clock size={20} /></div>
                <div className="stat-info">
                  <span className="stat-value">{stats.reading}</span>
                  <span className="stat-label">En progreso</span>
                </div>
              </div>
            </div>
          </section>

          <section className="library-section">
            <div className="section-header-row">
              <h2>{filterBy === 'favorites' ? 'Tus Favoritos' : 'Documentos Recientes'}</h2>
              <div className="sort-controls">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'recent' | 'name')} className="premium-select">
                  <option value="recent">Más recientes</option>
                  <option value="name">Por nombre</option>
                </select>
              </div>
            </div>
            
            {isLoading ? (
              <div className="cards-grid">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="skeleton-card"></div>
                ))}
              </div>
            ) : (
              <div className="cards-grid">
                {filteredDocuments.length === 0 ? (
                  <div className="empty-state">
                    <FileText size={48} className="empty-icon" />
                    <h3>No se encontraron documentos</h3>
                    <p>Intenta subir un archivo o cambiar los filtros de búsqueda.</p>
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="mt-4">
                      Subir archivo
                    </Button>
                  </div>
                ) : (
                  filteredDocuments.map(doc => (
                    <DocumentCard 
                      key={doc.id}
                      title={doc.name}
                      date={new Date(doc.lastOpenedAt).toLocaleDateString()}
                      type={doc.type as any}
                      progress={doc.progress.percentage}
                      isBookmarked={doc.isFavorite}
                      onClick={() => navigate(`/read/${doc.id}`)}
                      onBookmarkToggle={(e) => {
                        e.stopPropagation();
                        toggleFavorite(doc.id);
                      }}
                    />
                  ))
                )}
              </div>
            )}
          </section>
          
          <footer className="dashboard-footer" style={{ textAlign: 'center', marginTop: 'auto', paddingTop: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <p>Diseñado y desarrollado por <strong>Gastón Mauricio Cane</strong></p>
          </footer>
        </main>
      </motion.div>
    </Layout>
  );
};
