import { useState, useCallback, memo } from 'react';
import useEditorStore from '../../store/editorStore';
import { Variation } from '../../types';
import './VersionHistory.css';

interface VariationManagementProps {
  versionId: string;
}

// Optimize variation item rendering
const VariationItem = memo(({ 
  variation, 
  isActive,
  onSelect,
  onRename,
  onDelete 
}: { 
  variation: Variation; 
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(variation.name);

  const handleClick = useCallback(() => {
    if (!isEditing) {
      onSelect(variation.id);
    }
  }, [variation.id, onSelect, isEditing]);
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Möchten Sie die Variation "${variation.name}" wirklich löschen?`)) {
      onDelete(variation.id);
    }
  }, [variation.id, variation.name, onDelete]);

  const handleNameClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTempName(e.target.value);
  }, []);

  const handleNameBlur = useCallback(() => {
    if (tempName.trim() !== '') {
      onRename(variation.id, tempName);
    } else {
      setTempName(variation.name);
    }
    setIsEditing(false);
  }, [variation.id, variation.name, tempName, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setTempName(variation.name);
      setIsEditing(false);
    }
  }, [variation.name, handleNameBlur]);

  return (
    <div 
      className={`version-item variation-item ${isActive ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="variation-description">
        {isEditing ? (
          <input
            type="text"
            value={tempName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="variation-name" onClick={handleNameClick}>
            {variation.name}
          </div>
        )}
      </div>
      
      <div className="variation-actions">
        <button 
          className="variation-switch-button"
          onClick={handleClick}
          title="Zu dieser Variation wechseln"
        >
          Wechseln
        </button>
        
        {!isActive && 
          <button 
            className="delete-version-button"
            onClick={handleDelete}
            title="Variation löschen"
          >
            ×
          </button>
        }
      </div>
      
      {isActive && 
        <div className="current-version-badge">Aktiv</div>
      }
    </div>
  );
});

const VariationManagement: React.FC<VariationManagementProps> = ({ versionId }) => {
  const variations = useEditorStore(state => state.variations);
  const currentVariationId = useEditorStore(state => state.currentVariationId);
  const createVariation = useEditorStore(state => state.createVariation);
  const switchToVariation = useEditorStore(state => state.switchToVariation);
  const updateVariationName = useEditorStore(state => state.updateVariationName);
  const deleteVariation = useEditorStore(state => state.deleteVariation);
  
  const [newVariationName, setNewVariationName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const handleCreateVariation = useCallback(() => {
    if (newVariationName.trim() !== '') {
      createVariation(newVariationName.trim());
      setNewVariationName('');
      setIsCreating(false);
    }
  }, [newVariationName, createVariation]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateVariation();
    } else if (e.key === 'Escape') {
      setNewVariationName('');
      setIsCreating(false);
    }
  }, [handleCreateVariation]);
  
  const handleSwitchToMainState = useCallback(() => {
    switchToVariation(null);
  }, [switchToVariation]);
  
  return (
    <div className="variation-management">
      <div className="variation-header">
        <h3>Variationen</h3>
        <button 
          className="variation-add-button"
          onClick={() => setIsCreating(true)}
        >
          + Neue Variation
        </button>
      </div>
      
      {isCreating && (
        <div className="new-variation-form">
          <input
            type="text"
            placeholder="Name der neuen Variation"
            value={newVariationName}
            onChange={(e) => setNewVariationName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div className="new-variation-actions">
            <button onClick={() => setIsCreating(false)}>Abbrechen</button>
            <button 
              onClick={handleCreateVariation}
              disabled={newVariationName.trim() === ''}
            >
              Erstellen
            </button>
          </div>
        </div>
      )}
      
      {variations.length > 0 ? (
        <div className="variation-list">
          <div 
            className={`version-item variation-item main-state ${!currentVariationId ? 'selected' : ''}`}
            onClick={handleSwitchToMainState}
          >
            <div className="variation-description">Hauptprojektzustand</div>
            <div className="variation-actions">
              <button 
                className="variation-switch-button"
                onClick={handleSwitchToMainState}
                title="Zum Hauptprojektzustand wechseln"
              >
                Wechseln
              </button>
            </div>
            
            {!currentVariationId && 
              <div className="current-version-badge">Aktiv</div>
            }
          </div>
          
          {variations.map((variation) => (
            <VariationItem 
              key={variation.id}
              variation={variation}
              isActive={currentVariationId === variation.id}
              onSelect={(id) => switchToVariation(id)}
              onRename={updateVariationName}
              onDelete={deleteVariation}
            />
          ))}
        </div>
      ) : (
        <div className="no-variations">
          <p>Keine Variationen vorhanden. Erstellen Sie eine neue Variation, um alternative Projektzustände zu speichern.</p>
        </div>
      )}
    </div>
  );
};

export default memo(VariationManagement); 