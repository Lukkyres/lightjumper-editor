import * as React from 'react';
import './RectangleStatesList.css';

interface RectangleState {
  x: number;
  y: number;
  width: number;
  height: number;
  delay: number;
}

interface RectangleStatesListProps {
  states: RectangleState[];
  onStatesReordered: (newStates: RectangleState[]) => void;
  onEditState: (index: number) => void;
  onDeleteState: (index: number) => void;
  onDuplicateState: (index: number) => void;
  onDelayChange: (index: number, delay: number) => void;
  selectedStateIndex: number | null;
}

// Helper function to generate a color based on index
const getStateColor = (index: number): string => {
  const colors = [
    '#FF5733', // Bright red
    '#33FF57', // Bright green
    '#3357FF', // Bright blue
    '#FF33A8', // Pink
    '#33FFF6', // Cyan
    '#F6FF33', // Yellow
    '#A833FF', // Purple
    '#FF8333', // Orange
  ];
  
  return colors[index % colors.length];
};

const RectangleStatesList: React.FC<RectangleStatesListProps> = ({
  states,
  onStatesReordered,
  onEditState,
  onDeleteState,
  onDuplicateState,
  onDelayChange,
  selectedStateIndex
}) => {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    // Required for Firefox
    e.dataTransfer.setData('text/plain', index.toString());
    // Make the drag image transparent
    const dragImage = document.createElement('div');
    dragImage.style.opacity = '0';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // Add styling to the dragged item
    e.currentTarget.classList.add('dragging');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Add styling to indicate drop target
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      // Create a new array with the reordered states
      const newStates = [...states];
      const [movedItem] = newStates.splice(draggedIndex, 1);
      newStates.splice(dropIndex, 0, movedItem);
      
      // Update the states with the new order
      onStatesReordered(newStates);
    }
    
    setDraggedIndex(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedIndex(null);
    
    // Remove any remaining drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  };

  return (
    <div className="rectangle-states-list">
      <div className="states-list-header">
        <span className="state-number">State</span>
        <span className="state-position">Position</span>
        <span className="state-size">Size</span>
        <span className="state-delay">Delay (ms)</span>
        <span className="state-actions">Actions</span>
      </div>
      
      <div className="states-container">
        {states.map((state, index) => (
          <div 
            key={index}
            className={`state-item ${selectedStateIndex === index ? 'selected' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            style={{ borderLeftColor: getStateColor(index) }}
          >
            <div className="state-number">
              <div className="state-color" style={{ backgroundColor: getStateColor(index) }}></div>
              <span>{index + 1}</span>
            </div>
            
            <div className="state-position">
              x: {state.x}, y: {state.y}
            </div>
            
            <div className="state-size">
              {state.width} × {state.height}
            </div>
            
            <div className="state-delay">
              <input
                type="number"
                min="0"
                value={state.delay}
                onChange={(e) => onDelayChange(index, parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div className="state-actions">
              <button 
                type="button" 
                className="edit-button"
                onClick={() => onEditState(index)}
                title="Edit state visually"
              >
                ✏️
              </button>
              
              <button 
                type="button" 
                className="duplicate-button"
                onClick={() => onDuplicateState(index)}
                title="Duplicate state"
              >
                📋
              </button>
              
              <button 
                type="button" 
                className="delete-button"
                onClick={() => onDeleteState(index)}
                title="Delete state"
                disabled={states.length <= 2}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RectangleStatesList;
