import { useState } from 'react';
import {
  Eye,
  EyeSlash,
  Plus,
  Trash,
  Lock,
  LockOpen,
  PencilSimple
} from '@phosphor-icons/react';
import useEditorStore from '../../store/editorStore';
import './Layers.css';

type RenameModalProps = {
  currentName: string;
  onRename: (name: string) => void;
  onClose: () => void;
};

const RenameModal = ({ currentName, onRename, onClose }: RenameModalProps) => {
  const [name, setName] = useState(currentName);
  
  const handleSubmit = () => {
    if (name.trim()) {
      onRename(name);
      onClose();
    }
  };
  
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog rename-dialog slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">Rename Layer</h2>
        </div>
        
        <div className="dialog-content">
          <div className="form-group">
            <label htmlFor="layer-name">Layer Name</label>
            <input
              id="layer-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        
        <div className="dialog-footer">
          <button onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={handleSubmit}>Rename</button>
        </div>
      </div>
    </div>
  );
};

const Layers = () => {
  const {
    layers,
    currentLayerIndex,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    renameLayer,
    setCurrentLayer,
    moveLayer,
    toggleLayerLock
  } = useEditorStore();

  // DEBUG: Logge die aktuelle Layer-Liste bei jedem Render


  const [renameModalState, setRenameModalState] = useState<{
    isOpen: boolean;
    layerId: string;
    currentName: string;
  }>({
    isOpen: false,
    layerId: '',
    currentName: ''
  });
  
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  
  // Handle layer selection
  const handleLayerClick = (index: number) => {
    setCurrentLayer(index);
  };
  
  // Handle layer visibility toggle
  const handleToggleVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLayerVisibility(id);
  };
  
  // Handle layer lock toggle
  const handleToggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLayerLock(id);
  };
  
  // Open rename modal
  const openRenameModal = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameModalState({
      isOpen: true,
      layerId: id,
      currentName: name
    });
  };
  
  // Handle layer rename
  const handleRename = (name: string) => {
    renameLayer(renameModalState.layerId, name);
  };
  
  // Handle layer removal
  const handleRemoveLayer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeLayer(id);
  };
  
  // Drag and Drop handlers
  const handleDragStart = (index: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem(index);
  };
  
  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem === null || draggedItem === index) return;
    
    // Bestimme, ob wir über der oberen oder unteren Hälfte des Elements sind
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    if (y < rect.height / 2) {
      // Obere Hälfte - Position VOR dieser Ebene
      setDragOverItem(index * 2);
    } else {
      // Untere Hälfte - Position NACH dieser Ebene
      setDragOverItem(index * 2 + 1);
    }
  };
  
  const handleDragLeave = () => {
    setDragOverItem(null);
  };
  
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };
  
  const handleDrop = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    
    if (draggedItem === null) return;
    
    // Bestimme, ob wir über der oberen oder unteren Hälfte des Elements sind
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    let targetDisplayIndex;
    if (y < rect.height / 2) {
      // Obere Hälfte - Position VOR dieser Ebene
      targetDisplayIndex = index;
    } else {
      // Untere Hälfte - Position NACH dieser Ebene
      targetDisplayIndex = index + 1;
    }
    
    // Wenn wir auf die gleiche Position oder direkt nach der gezogenen Ebene ziehen, nichts tun
    if (targetDisplayIndex === draggedItem || targetDisplayIndex === draggedItem + 1) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }
    
    // Konvertiere die Display-Indizes in die tatsächlichen Layer-Indizes
    const fromIndex = layers.length - 1 - draggedItem;
    const toIndex = targetDisplayIndex > draggedItem 
      ? layers.length - targetDisplayIndex
      : layers.length - targetDisplayIndex;
    
    moveLayer(fromIndex, toIndex);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Umgekehrte Reihenfolge der Ebenen zur Anzeige, damit Ebenen oben im Panel
  // auch oben im Canvas (Vordergrund) sind
  const displayLayers = [...layers].reverse();

  return (
    <div className="layers-panel">
      <div className="layers-header">
        <h2>Layers</h2>
        <button className="add-layer-button" onClick={addLayer}>
          <Plus size={16} weight="bold" />
        </button>
      </div>
      
      <div className="layers-list">
        {/* Spezielle Drop-Zone für die oberste Position */}
        <div 
          className="layer-item-container" 
          style={{ minHeight: '10px', position: 'relative' }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOverItem(0);
          }}
          onDragLeave={() => {
            setDragOverItem(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedItem === null || draggedItem === 0) return;
            
            // Bewege die Ebene an die oberste Position (Vordergrund)
            const fromIndex = layers.length - 1 - draggedItem;
            const toIndex = layers.length - 1; // Oberste Position im Store
            moveLayer(fromIndex, toIndex);
            
            setDraggedItem(null);
            setDragOverItem(null);
          }}
        >
          {draggedItem !== null && dragOverItem === 0 && (
            <div className="drop-indicator top-indicator"></div>
          )}
        </div>
        
        {displayLayers.map((layer, displayIndex) => {
          // Wende die Indexkonvertierung an, um den tatsächlichen Index zu erhalten
          const actualIndex = layers.length - 1 - displayIndex;
          const isDragging = draggedItem === displayIndex;
          
          return (
            <div key={layer.id} className="layer-item-container">
              {/* Drop-Indikator oberhalb der Ebene */}
              {draggedItem !== null && dragOverItem === displayIndex * 2 && displayIndex > 0 && (
                <div className="drop-indicator"></div>
              )}
              
              <div
                className={`layer-item ${actualIndex === currentLayerIndex ? 'active' : ''} 
                           ${isDragging ? 'dragged' : ''}`}
                draggable="true"
                onDragStart={(e) => handleDragStart(displayIndex, e)}
                onDragOver={(e) => handleDragOver(displayIndex, e)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(displayIndex, e)}
                onClick={() => handleLayerClick(actualIndex)}
              >
                <div className="layer-controls">
                  <button
                    className={`layer-button ${layer.visible ? 'active' : ''}`}
                    onClick={(e) => handleToggleVisibility(layer.id, e)}
                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                  >
                    {layer.visible ? <Eye size={16} /> : <EyeSlash size={16} />}
                  </button>
                  
                  <button
                    className={`layer-button ${layer.locked ? 'active' : ''}`}
                    onClick={(e) => handleToggleLock(layer.id, e)}
                    title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                  >
                    {layer.locked ? <Lock size={16} /> : <LockOpen size={16} />}
                  </button>
                </div>
                
                <div className="layer-name">
                  {layer.name}
                </div>
                
                <div className="layer-actions">
                  <button
                    className="layer-button"
                    onClick={(e) => openRenameModal(layer.id, layer.name, e)}
                    title="Rename Layer"
                  >
                    <PencilSimple size={16} />
                  </button>
                  
                  <button
                    className="layer-button"
                    onClick={(e) => handleRemoveLayer(layer.id, e)}
                    disabled={layers.length <= 1}
                    title="Delete Layer"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
              
              {/* Drop-Indikator unterhalb der Ebene */}
              {draggedItem !== null && dragOverItem === displayIndex * 2 + 1 && (
                <div className="drop-indicator"></div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Rename Modal */}
      {renameModalState.isOpen && (
        <RenameModal
          currentName={renameModalState.currentName}
          onRename={handleRename}
          onClose={() => setRenameModalState({ ...renameModalState, isOpen: false })}
        />
      )}
    </div>
  );
};

export default Layers;
