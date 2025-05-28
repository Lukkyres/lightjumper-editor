import { useState, useCallback, memo } from 'react';
import { ProjectVersion, ProjectWithHistory, saveProjectHistoryToLocalStorage } from '../../utils/versionHistoryUtils';
import VariationManagement from './VariationManagement';
import './VersionHistory.css';

interface VersionHistoryProps {
  projectHistory: ProjectWithHistory;
  onVersionSelect: (versionId: string) => void;
  onClose: () => void;
}

// Optimize version item rendering
const VersionItem = memo(({ 
  version, 
  isSelected, 
  isCurrent,
  onSelect,
  onDelete 
}: { 
  version: ProjectVersion; 
  isSelected: boolean; 
  isCurrent: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  // Format date for display
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleClick = useCallback(() => {
    onSelect(version.id);
  }, [version.id, onSelect]);
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrent) {
      if (window.confirm('Möchten Sie diese Version wirklich löschen?')) {
        onDelete(version.id);
      }
    }
  }, [version.id, isCurrent, onDelete]);

  return (
    <div 
      className={`version-item ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="version-description">{version.description}</div>
      <div className="version-date">{formatDate(version.timestamp)}</div>
      {isCurrent && 
        <div className="current-version-badge">Aktuelle Version</div>
      }
      {!isCurrent && 
        <button 
          className="delete-version-button"
          onClick={handleDelete}
          title="Version löschen"
        >
          ×
        </button>
      }
    </div>
  );
});

const VersionHistory: React.FC<VersionHistoryProps> = ({ 
  projectHistory, 
  onVersionSelect, 
  onClose 
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    projectHistory.currentVersion.id
  );
  const [localProjectHistory, setLocalProjectHistory] = useState<ProjectWithHistory>(projectHistory);
  const [showVariations, setShowVariations] = useState<boolean>(false);

  const handleVersionSelect = useCallback((versionId: string) => {
    setSelectedVersionId(versionId);
    setShowVariations(versionId === projectHistory.currentVersion.id);
  }, [projectHistory.currentVersion.id]);

  const handleConfirmSelection = useCallback(() => {
    if (selectedVersionId) {
      onVersionSelect(selectedVersionId);
    }
    onClose();
  }, [selectedVersionId, onVersionSelect, onClose]);
  
  const handleDeleteVersion = useCallback((versionId: string) => {
    // Cannot delete current version
    if (versionId === localProjectHistory.currentVersion.id) return;
    
    // Create updated history without the deleted version
    const updatedVersions = localProjectHistory.versions.filter(v => v.id !== versionId);
    
    // At least one version must remain
    if (updatedVersions.length === 0) return;
    
    const updatedHistory = {
      ...localProjectHistory,
      versions: updatedVersions
    };
    
    // Update local state
    setLocalProjectHistory(updatedHistory);
    
    // If the currently selected version was deleted, select the current version
    if (selectedVersionId === versionId) {
      setSelectedVersionId(updatedHistory.currentVersion.id);
      setShowVariations(false);
    }
    
    // Save to localStorage
    saveProjectHistoryToLocalStorage(updatedHistory);
  }, [localProjectHistory, selectedVersionId]);

  // Memoize sorted versions
  const sortedVersions = localProjectHistory.versions
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="version-history-overlay">
      <div className="version-history-container">
        <div className="version-history-header">
          <h2>{showVariations ? 'Versionen & Variationen' : 'Versionshistorie'}</h2>
          <button 
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="version-history-content">
          {showVariations ? (
            <div className="version-variations-container">
              <div className="version-section">
                <h3>Versionen</h3>
                <div className="version-list">
                  {sortedVersions.map((version: ProjectVersion) => (
                    <VersionItem 
                      key={version.id}
                      version={version}
                      isSelected={selectedVersionId === version.id}
                      isCurrent={version.id === localProjectHistory.currentVersion.id}
                      onSelect={handleVersionSelect}
                      onDelete={handleDeleteVersion}
                    />
                  ))}
                </div>
              </div>
              
              <div className="variations-section">
                <VariationManagement versionId={selectedVersionId || ''} />
              </div>
            </div>
          ) : (
            <div className="version-list">
              {sortedVersions.map((version: ProjectVersion) => (
                <VersionItem 
                  key={version.id}
                  version={version}
                  isSelected={selectedVersionId === version.id}
                  isCurrent={version.id === localProjectHistory.currentVersion.id}
                  onSelect={handleVersionSelect}
                  onDelete={handleDeleteVersion}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="version-history-footer">
          {selectedVersionId === projectHistory.currentVersion.id && !showVariations && (
            <button 
              className="variation-button"
              onClick={() => setShowVariations(true)}
            >
              Variationen anzeigen
            </button>
          )}
          <button 
            className="cancel-button"
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button 
            className="confirm-button"
            onClick={handleConfirmSelection}
            disabled={!selectedVersionId || selectedVersionId === localProjectHistory.currentVersion.id}
          >
            Version laden
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(VersionHistory); 