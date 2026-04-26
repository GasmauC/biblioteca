import React from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, WifiOff } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import './SyncStatus.css';

export const SyncStatus: React.FC = () => {
  const { syncStatus, user } = useLibraryStore();

  if (!user) return null; // Don't show sync status if not logged in

  return (
    <div className={`sync-status ${syncStatus}`}>
      {syncStatus === 'idle' && (
        <>
          <Cloud size={16} />
          <span>Nube lista</span>
        </>
      )}
      {syncStatus === 'syncing' && (
        <>
          <RefreshCw size={16} className="spin" />
          <span>Sincronizando...</span>
        </>
      )}
      {syncStatus === 'synced' && (
        <>
          <CheckCircle2 size={16} />
          <span>Guardado</span>
        </>
      )}
      {syncStatus === 'error' && (
        <>
          <CloudOff size={16} />
          <span>Error de Sync</span>
        </>
      )}
      {syncStatus === 'offline' && (
        <>
          <WifiOff size={16} />
          <span>Sin conexión</span>
        </>
      )}
    </div>
  );
};
