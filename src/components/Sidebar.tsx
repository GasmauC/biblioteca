import React from 'react';
import { Book, Clock, Star, Folder, Tag, Settings } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { filterBy, setFilterBy, isMobileSidebarOpen } = useLibraryStore();

  return (
    <aside className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon"></div>
          <h2>Biblioteca</h2>
        </div>
      </div>
      
      <div className="sidebar-scroll">
        <nav className="sidebar-nav">
          <div className="nav-group">
            <h3 className="nav-title">Menú</h3>
            <button className={`nav-item ${filterBy === 'all' ? 'active' : ''}`} onClick={() => setFilterBy('all')}>
              <Book size={18} />
              <span>Todos los documentos</span>
            </button>
            <button className="nav-item">
              <Clock size={18} />
              <span>Recientes</span>
            </button>
            <button className={`nav-item ${filterBy === 'favorites' ? 'active' : ''}`} onClick={() => setFilterBy('favorites')}>
              <Star size={18} />
              <span>Favoritos</span>
            </button>
          </div>
          
          <div className="nav-group">
            <h3 className="nav-title">Colecciones</h3>
            <button className="nav-item">
              <Folder size={18} />
              <span>Proyectos</span>
            </button>
            <button className="nav-item">
              <Tag size={18} />
              <span>Etiquetas</span>
            </button>
          </div>
        </nav>
      </div>

      <div className="sidebar-footer">
        <button className="nav-item">
          <Settings size={18} />
          <span>Configuración</span>
        </button>
      </div>
    </aside>
  );
};
