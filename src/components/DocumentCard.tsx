import React from 'react';
import { FileText, MoreVertical, Star } from 'lucide-react';
import './DocumentCard.css';

interface DocumentCardProps {
  title: string;
  date: string;
  type?: 'pdf' | 'txt' | 'html' | 'doc';
  progress?: number;
  thumbnail?: string;
  isBookmarked?: boolean;
  onClick?: () => void;
  onBookmarkToggle?: (e: React.MouseEvent) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ 
  title, 
  date, 
  type = 'pdf',
  progress = 0,
  thumbnail,
  isBookmarked = false,
  onClick,
  onBookmarkToggle
}) => {
  return (
    <div className="document-card" onClick={onClick}>
      <div className="card-thumbnail">
        {thumbnail ? (
          <img src={thumbnail} alt={title} />
        ) : (
          <div className="thumbnail-placeholder">
            <FileText size={48} className="placeholder-icon" />
            <span className={`file-type-badge type-${type}`}>{type.toUpperCase()}</span>
          </div>
        )}
        <button 
          className={`card-bookmark-btn ${isBookmarked ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onBookmarkToggle) onBookmarkToggle(e);
          }}
          title={isBookmarked ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        >
          <Star size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>
      
      <div className="card-content">
        <div className="card-header">
          <h3 className="card-title" title={title}>{title}</h3>
          <button className="card-menu-btn" onClick={e => e.stopPropagation()}>
            <MoreVertical size={16} />
          </button>
        </div>
        
        <div className="card-footer">
          <span className="card-date">{date}</span>
          {progress > 0 && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
