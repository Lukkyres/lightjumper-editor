import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import useEditorStore from '../../store/editorStore';
import { PredefinedColor } from '../../types';
import './ColorPalette.css';

type ColorPaletteProps = {
  onClose: () => void;
};

const ColorPalette = ({ onClose }: ColorPaletteProps) => {
  const { 
    predefinedColors, 
    customColors, 
    currentColor, 
    setCurrentColor, 
    updatePredefinedColor, 
    updateCustomColor 
  } = useEditorStore();
  
  const [activeColorType, setActiveColorType] = useState<'predefined' | 'custom'>('predefined');
  const [activePredefinedKey, setActivePredefinedKey] = useState<PredefinedColor | null>(null);
  const [activeCustomIndex, setActiveCustomIndex] = useState<number | null>(null);
  
  // Handle color picker change
  const handleColorChange = (color: string) => {
    if (activeColorType === 'predefined' && activePredefinedKey) {
      updatePredefinedColor(activePredefinedKey, color);
    } else if (activeColorType === 'custom' && activeCustomIndex !== null) {
      updateCustomColor(activeCustomIndex, color);
    }
  };
  
  // Handle predefined color selection
  const handlePredefinedClick = (key: PredefinedColor, color: string) => {
    setActiveColorType('predefined');
    setActivePredefinedKey(key);
    setActiveCustomIndex(null);
    setCurrentColor(color);
  };
  
  // Handle custom color selection
  const handleCustomClick = (index: number, color: string) => {
    setActiveColorType('custom');
    setActivePredefinedKey(null);
    setActiveCustomIndex(index);
    setCurrentColor(color);
  };

  return (
    <div className="color-palette">
      <div className="color-palette-header">
        <h3>Color Palette</h3>
        <button className="color-palette-close" onClick={onClose}>×</button>
      </div>
      
      <div className="color-section">
        <h4>Game Colors</h4>
        <div className="color-grid">
          <div 
            className={`color-item ${currentColor === predefinedColors.red ? 'active' : ''}`}
            style={{ backgroundColor: predefinedColors.red }}
            onClick={() => handlePredefinedClick('red', predefinedColors.red)}
          >
            <span className="color-label">Miss</span>
          </div>
          <div 
            className={`color-item ${currentColor === predefinedColors.blue ? 'active' : ''}`}
            style={{ backgroundColor: predefinedColors.blue }}
            onClick={() => handlePredefinedClick('blue', predefinedColors.blue)}
          >
            <span className="color-label">Hit</span>
          </div>
          <div 
            className={`color-item ${currentColor === predefinedColors.green ? 'active' : ''}`}
            style={{ backgroundColor: predefinedColors.green }}
            onClick={() => handlePredefinedClick('green', predefinedColors.green)}
          >
            <span className="color-label">Safe</span>
          </div>
          <div 
            className={`color-item ${currentColor === predefinedColors.doubleHit ? 'active' : ''}`}
            style={{ backgroundColor: predefinedColors.doubleHit }}
            onClick={() => handlePredefinedClick('doubleHit', predefinedColors.doubleHit)}
          >
            <span className="color-label">Double Hit</span>
          </div>
        </div>
      </div>
      
      <div className="color-section">
        <h4>Custom Colors</h4>
        <div className="color-grid">
          {customColors.map((color, index) => (
            <div 
              key={index}
              className={`color-item ${currentColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => handleCustomClick(index, color)}
            ></div>
          ))}
        </div>
      </div>
      
      {/* Color Picker for editing colors */}
      {(activePredefinedKey !== null || activeCustomIndex !== null) && (
        <div className="color-picker-section">
          <h4>Edit {activeColorType === 'predefined' ? 'Game' : 'Custom'} Color</h4>
          <HexColorPicker
            color={activeColorType === 'predefined' && activePredefinedKey
              ? predefinedColors[activePredefinedKey]
              : activeCustomIndex !== null
                ? customColors[activeCustomIndex]
                : '#000000'
            }
            onChange={handleColorChange}
          />
          <div className="color-hex-value">
            {activeColorType === 'predefined' && activePredefinedKey
              ? predefinedColors[activePredefinedKey].toUpperCase()
              : activeCustomIndex !== null
                ? customColors[activeCustomIndex].toUpperCase()
                : ''
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPalette;
