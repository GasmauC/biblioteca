import React from 'react';
import { Sidebar } from './Sidebar';
import { useLibraryStore } from '../store/useLibraryStore';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobileSidebarOpen = useLibraryStore(state => state.isMobileSidebarOpen);
  const setMobileSidebarOpen = useLibraryStore(state => state.setMobileSidebarOpen);

  return (
    <div className="layout">
      {/* Mobile overlay */}
      <div 
        className={`sidebar-overlay ${isMobileSidebarOpen ? 'open' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />
      
      <Sidebar />
      <main className="layout-content">
        {children}
      </main>
    </div>
  );
};
