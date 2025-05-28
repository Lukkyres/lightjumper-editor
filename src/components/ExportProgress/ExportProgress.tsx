import React, { useEffect, useState } from 'react';
import './ExportProgress.css';

interface ExportProgressProps {
  visible: boolean;
  progress: number;
  status: string;
  format: 'mp4' | 'gif';
  onCancel: () => void;
}

const ExportProgress: React.FC<ExportProgressProps> = ({
  visible,
  progress,
  status,
  format,
  onCancel
}) => {
  const [dots, setDots] = useState('');

  // Animation für die Ladepunkte
  useEffect(() => {
    if (!visible) return;
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 300);
    
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const formatLabel = format === 'mp4' ? 'MP4' : 'GIF';

  return (
    <div className="export-progress-overlay">
      <div className="export-progress-container">
        <h3>Exportiere {formatLabel}-Video</h3>
        
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
        
        <div className="progress-percentage">{Math.round(progress)}%</div>
        
        <div className="progress-status">
          {status}{dots}
        </div>
        
        <button className="cancel-button" onClick={onCancel}>
          Export abbrechen
        </button>
      </div>
    </div>
  );
};

export default ExportProgress;
