import React from 'react';
import { ViewportPreset } from '../../store/editorStore';
import './ViewportPresetTile.css'; 

interface ViewportPresetTileProps {
  preset: ViewportPreset;
  onApply: (id: string) => void;
  onDelete: (id: string) => void;
}

const ViewportPresetTile: React.FC<ViewportPresetTileProps> = ({ preset, onApply, onDelete }) => {
  return (
    <div className="viewport-preset-tile">
      {/* Container for preview area, takes flex sizing */}
      <div className="preset-preview-area">
        {preset.previewDataUrl ? (
          <img 
            src={preset.previewDataUrl} 
            alt={`Vorschau für ${preset.name}`} 
            className="preset-preview-image" 
          />
        ) : (
          // Fallback text remains centered due to parent styling
          <span className="preview-text">Keine Vorschau</span>
        )}
      </div>
      <div className="preset-info">
        <span className="preset-name">{preset.name}</span>
        <div className="preset-actions">
          <button onClick={() => onApply(preset.id)} title="Lädt diese Konfiguration">Anwenden</button>
          <button onClick={() => onDelete(preset.id)} title="Löscht dieses Preset" className="delete-button tile-delete-button">X</button>
        </div>
      </div>
    </div>
  );
};

export default ViewportPresetTile;
