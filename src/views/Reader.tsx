import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, Bookmark, Moon, Sun, Highlighter, Undo2, Droplets, ChevronLeft, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useLibraryStore } from '../store/useLibraryStore';
import { PdfViewer } from '../components/PdfViewer';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import './Reader.css';

export const Reader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use stable selector to avoid re-renders when other docs change
  const doc = useLibraryStore(useShallow(state => state.documents.find(d => d.id === id)));
  const [textContent, setTextContent] = useState<string>('');
  const [zoom, setZoom] = useState<number>(100);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // Highlighter state
  const [isHighlighting, setIsHighlighting] = useState<boolean>(false);
  const [isLiquidMode, setIsLiquidMode] = useState<boolean>(false);
  const [highlightColor, setHighlightColor] = useState<string>('rgba(253, 224, 71, 0.5)'); // yellow
  
  const [currentPage, setCurrentPage] = useState<number>(doc?.progress?.currentPage || 1);
  const [totalPages, setTotalPages] = useState<number>(doc?.progress?.totalPages || 1);

  const scrollRef = useRef<number>(doc?.progress?.scrollPosition || 0);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const colors = [
    { name: 'Amarillo', value: 'rgba(253, 224, 71, 0.5)' },
    { name: 'Naranja', value: 'rgba(251, 146, 60, 0.5)' },
    { name: 'Verde', value: 'rgba(74, 222, 128, 0.5)' },
    { name: 'Celeste', value: 'rgba(56, 189, 248, 0.5)' }
  ];

  const handleUndoHighlight = () => {
    if (!doc || !doc.highlights || !doc.highlights[currentPage]) return;
    const currentHighlights = doc.highlights[currentPage];
    if (currentHighlights.length > 0) {
      const newHighlights = currentHighlights.slice(0, -1);
      useLibraryStore.getState().updateDocumentHighlights(doc.id, currentPage, newHighlights);
    }
  };

  useEffect(() => {
    if (doc?.content && (doc.type === 'txt' || doc.type === 'html')) {
      if (doc.content instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setTextContent(e.target?.result as string);
        };
        reader.readAsText(doc.content as Blob);
      } else if (typeof doc.content === 'string') {
        fetch(doc.content)
          .then(res => res.text())
          .then(text => setTextContent(text))
          .catch(err => console.error("Error cargando contenido de texto desde URL:", err));
      }
    }
  }, [doc?.id, doc?.type]);

  useEffect(() => {
    if (textContent && textContainerRef.current) {
      setTimeout(() => {
        if (textContainerRef.current && doc?.progress?.scrollPosition) {
          textContainerRef.current.scrollTop = doc.progress.scrollPosition;
        }
      }, 50);
    }
  }, [textContent]); // Only run when text content is loaded

  const handleTextScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const position = target.scrollTop;
    const maxScroll = target.scrollHeight - target.clientHeight;
    const progress = maxScroll > 0 ? Math.round((position / maxScroll) * 100) : 100;
    
    scrollRef.current = position;

    // Use higher debounce for performance on mobile
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      if (doc) {
        useLibraryStore.getState().updateDocumentProgress(doc.id, { 
          percentage: progress, 
          scrollPosition: position 
        });
      }
    }, 2000); // 2 seconds debounce for scroll sync
  };

  useEffect(() => {
    const currentDocId = doc?.id;
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      if (currentDocId && textContainerRef.current) {
        const position = scrollRef.current;
        const target = textContainerRef.current;
        const maxScroll = target.scrollHeight - target.clientHeight;
        const progress = maxScroll > 0 ? Math.round((position / maxScroll) * 100) : 100;
        useLibraryStore.getState().updateDocumentProgress(currentDocId, { percentage: progress, scrollPosition: position });
      }
    };
  }, [doc?.id]);

  useEffect(() => {
    const docId = doc?.id;
    const handleBeforeUnload = () => {
      if (docId && textContainerRef.current) {
        const position = scrollRef.current;
        const target = textContainerRef.current;
        const maxScroll = target.scrollHeight - target.clientHeight;
        const progress = maxScroll > 0 ? Math.round((position / maxScroll) * 100) : 100;
        useLibraryStore.getState().updateDocumentProgress(docId, { percentage: progress, scrollPosition: position });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  const handlePageChange = (newPage: number) => {
    if (!doc) return;
    setCurrentPage(newPage);
    const percentage = Math.round((newPage / totalPages) * 100);
    useLibraryStore.getState().updateDocumentProgress(doc.id, {
      percentage,
      currentPage: newPage,
      totalPages: totalPages
    });
  };

  if (!doc) {
    return (
      <motion.div 
        className="reader-container flex-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <p>Documento no encontrado.</p>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/')}>Volver</button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={`reader-container ${isDarkMode ? 'reader-dark-mode' : ''}`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Top Reading Progress Bar */}
      <div className="reader-progress-bar-container">
        <div className="reader-progress-bar-fill" style={{ width: `${doc.progress?.percentage || 0}%` }}></div>
      </div>

      <header className="reader-toolbar glass-panel desktop-only">
        <div className="toolbar-left">
          <button className="toolbar-btn" onClick={() => navigate('/')} title="Volver a la biblioteca">
            <ArrowLeft size={20} />
          </button>
          <div className="reader-title">
            <h2>{doc.name}</h2>
            <span className="reader-meta">{doc.progress?.percentage > 0 ? `${doc.progress.percentage}% leído` : 'Comenzar a leer'}</span>
          </div>
        </div>
        
        <div className="toolbar-center">
          {isHighlighting && (
            <div className="highlighter-colors">
              {colors.map(c => (
                <button
                  key={c.name}
                  className={`color-btn ${highlightColor === c.value ? 'active' : ''}`}
                  style={{ backgroundColor: c.value.replace('0.5', '1') }}
                  onClick={() => setHighlightColor(c.value)}
                  title={c.name}
                />
              ))}
              {doc.highlights && doc.highlights[currentPage] && doc.highlights[currentPage].length > 0 && (
                <button className="toolbar-btn undo-btn" onClick={handleUndoHighlight} title="Deshacer último resaltado">
                  <Undo2 size={16} />
                </button>
              )}
            </div>
          )}
          <div className="zoom-controls">
            <button className="toolbar-btn" onClick={handleZoomOut} disabled={zoom <= 50} title="Alejar"><ZoomOut size={16} /></button>
            <span className="zoom-level">{zoom}%</span>
            <button className="toolbar-btn" onClick={handleZoomIn} disabled={zoom >= 200} title="Acercar"><ZoomIn size={16} /></button>
          </div>
          {doc.type === 'pdf' && (
            <div className="pagination-controls flex-center" style={{ gap: '4px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '20px', padding: '2px 8px' }}>
              <button className="toolbar-btn" style={{ padding: '4px' }} onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
                <ChevronLeft size={16} />
              </button>
              <span className="page-indicator" style={{ fontSize: '12px', color: '#a1a1aa' }}>
                <strong style={{ color: 'white' }}>{currentPage}</strong> / {totalPages}
              </span>
              <button className="toolbar-btn" style={{ padding: '4px' }} onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-right">
          {doc.type === 'pdf' && (
            <button 
              className={`toolbar-btn ${isLiquidMode ? 'active' : ''}`} 
              onClick={() => setIsLiquidMode(!isLiquidMode)}
              title="Modo Lectura (Liquid Mode)"
            >
              <Droplets size={20} />
            </button>
          )}
          <button 
            className={`toolbar-btn ${isHighlighting ? 'active' : ''}`} 
            onClick={() => setIsHighlighting(!isHighlighting)}
            title="Resaltador"
          >
            <Highlighter size={20} />
          </button>
          <button 
            className="toolbar-btn" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Modo claro" : "Modo oscuro"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            className={`toolbar-btn ${doc.isFavorite ? 'active' : ''}`}
            onClick={() => useLibraryStore.getState().toggleFavorite(doc.id)}
            title="Marcar como favorito"
          >
            <Bookmark size={20} fill={doc.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button className="toolbar-btn" title="Pantalla completa"><Maximize size={20} /></button>
        </div>
      </header>

      {/* Mobile Top Bar */}
      <header className="mobile-top-bar glass-panel mobile-only">
        <button className="toolbar-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={24} />
        </button>
        <div className="mobile-title">
          <h2 className="truncate-text">{doc.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mobile-meta">{doc.progress?.percentage || 0}%</span>
          </div>
        </div>
        <button 
          className={`toolbar-btn ${doc.isFavorite ? 'active' : ''}`}
          onClick={() => useLibraryStore.getState().toggleFavorite(doc.id)}
        >
          <Bookmark size={24} fill={doc.isFavorite ? 'currentColor' : 'none'} />
        </button>
      </header>

      <main className="reader-content">
        {doc.type === 'pdf' && doc.content ? (
          <PdfViewer 
            file={doc.content as Blob} 
            docId={doc.id} 
            scale={zoom / 100} 
            page={currentPage}
            isLiquidMode={isLiquidMode}
            isHighlighting={isHighlighting}
            highlightColor={highlightColor}
            highlights={doc.highlights}
            onLoadSuccess={(total) => setTotalPages(total)}
          />
        ) : (doc.type === 'txt' || doc.type === 'html') && doc.content ? (
          <div className="text-viewer-container" ref={textContainerRef} onScroll={handleTextScroll}>
            <div className="text-content">
              {doc.type === 'html' ? (
                <div dangerouslySetInnerHTML={{ __html: textContent }} />
              ) : (
                <pre>{textContent}</pre>
              )}
            </div>
          </div>
        ) : (
          <div className="document-page-placeholder">
            <p>Formato no soportado o archivo vacío.</p>
          </div>
        )}
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="mobile-bottom-bar glass-panel mobile-only">
        {doc.type === 'pdf' && (
          <div className="mobile-pagination">
            <button className="toolbar-btn" onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
              <ChevronLeft size={28} />
            </button>
            <span className="mobile-page-indicator">{currentPage} / {totalPages}</span>
            <button className="toolbar-btn" onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
              <ChevronRight size={28} />
            </button>
          </div>
        )}
        <div className="mobile-actions">
          {doc.type === 'pdf' && (
            <button className={`toolbar-btn ${isLiquidMode ? 'active' : ''}`} onClick={() => setIsLiquidMode(!isLiquidMode)}>
              <Droplets size={24} />
            </button>
          )}
          {doc.type === 'pdf' && (
            <button className={`toolbar-btn ${isHighlighting ? 'active' : ''}`} onClick={() => setIsHighlighting(!isHighlighting)}>
              <Highlighter size={24} />
            </button>
          )}
          <button className="toolbar-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </nav>
    </motion.div>
  );
};
