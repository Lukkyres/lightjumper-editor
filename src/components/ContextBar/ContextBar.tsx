import React, { useState, useEffect, useRef } from 'react';
import useEditorStore from '../../store/editorStore';
import { HexColorPicker } from 'react-colorful';
import { CSSTransition } from 'react-transition-group';
import './ContextBar.css';

// Farbinformationen mit Beschreibungen
const colorInfo = {
  red: {
    label: 'Miss',
    description: 'Diesen Kacheln muss ausgewichen werden. Sonst verliert der Spieler ein Leben.'
  },
  blue: {
    label: 'Hit',
    description: 'Diese Kacheln müssen getroffen werden, um Punkte zu sammeln.'
  },
  green: {
    label: 'Safe',
    description: 'Sichere Kacheln, auf denen der Spieler stehen kann, ohne Punkte zu verlieren.'
  },
  doubleHit: {
    label: 'Double',
    description: 'Gibt doppelte Punkte, wenn der Spieler diese Kacheln trifft.'
  },
  custom: {
    label: 'Custom',
    description: 'Benutzerdefinierte Farbe für spezielle Effekte oder Markierungen.'
  }
};

// Standard-Gelb für Custom-Farbe
const DEFAULT_CUSTOM_COLOR = '#FFD700'; // Gelb

// Funktion zum Aufhellen einer Farbe
const lightenColor = (color: string, percent: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const lightenR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  const lightenG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  const lightenB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
  
  return `#${lightenR.toString(16).padStart(2, '0')}${lightenG.toString(16).padStart(2, '0')}${lightenB.toString(16).padStart(2, '0')}`;
};

const ContextBar: React.FC = () => {
  const { 
    currentTool, 
    brushSize, 
    setBrushSize, 
    autoNumbering, 
    setAutoNumbering, 
    currentPixelNumber, 
    setCurrentPixelNumber,
    currentColor,
    setCurrentColor,
    predefinedColors,
    updatePredefinedColor,
    isRectFilled,
    setIsRectFilled,
    isEllipseFilled,
    setIsEllipseFilled,
    numberingMode,
    setNumberingMode
  } = useEditorStore();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [activeColorKey, setActiveColorKey] = useState<string | null>(null);
  const [hexInput, setHexInput] = useState(currentColor);
  const [customColor, setCustomColor] = useState(DEFAULT_CUSTOM_COLOR);
  const [previousTool, setPreviousTool] = useState<string | null>(null);
  const [sliderColor, setSliderColor] = useState('#646cff');
  const [sliderLightColor, setSliderLightColor] = useState('#9089fc');
  const [barWidth, setBarWidth] = useState<number | null>(null);
  const [barHeight, setBarHeight] = useState<number | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const contextBarRef = useRef<HTMLDivElement>(null);

  // Funktion, um zu überprüfen, ob das aktuelle Tool Eigenschaften in der ContextBar hat
  const hasContextProperties = () => {
    return ['BRUSH', 'ERASER', 'FILL', 'LINE', 'RECTANGLE', 'ELLIPSE', 'NUMBER'].includes(currentTool);
  };

  // Farbauswahl-Handler
  const handleColorClick = (colorKey: string, color: string) => {
    // Wenn die Farbe bereits ausgewählt ist und erneut geklickt wird, öffne den Colorpicker
    if (currentColor === color && activeColorKey === colorKey) {
      setShowColorPicker(!showColorPicker);
    } else {
      // Ansonsten setze die Farbe und schließe den Colorpicker
      setCurrentColor(color);
      setHexInput(color);
      setActiveColorKey(colorKey);
      setShowColorPicker(false);
      
      // Aktualisiere die Slider-Farbe, aber nicht für ERASER
      if (currentTool !== 'ERASER') {
        setSliderColor(color);
        setSliderLightColor(lightenColor(color, 20));
      }
    }
  };

  const handleEditButtonClick = (colorKey: string, color: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Verhindert, dass der Klick auch den Farbwechsel auslöst
    setCurrentColor(color);
    setHexInput(color);
    setActiveColorKey(colorKey);
    setShowColorPicker(true);
    
    // Aktualisiere die Slider-Farbe, aber nicht für ERASER
    if (currentTool !== 'ERASER') {
      setSliderColor(color);
      setSliderLightColor(lightenColor(color, 20));
    }
  };

  const handleCustomColorClick = () => {
    if (activeColorKey === 'custom' && showColorPicker) {
      setShowColorPicker(false);
    } else {
      setActiveColorKey('custom');
      setCurrentColor(customColor);
      setHexInput(customColor);
      setShowColorPicker(true);
      
      // Aktualisiere die Slider-Farbe, aber nicht für ERASER
      if (currentTool !== 'ERASER') {
        setSliderColor(customColor);
        setSliderLightColor(lightenColor(customColor, 20));
      }
    }
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    setHexInput(color);
    
    // Aktualisiere die Slider-Farbe, aber nicht für ERASER
    if (currentTool !== 'ERASER') {
      setSliderColor(color);
      setSliderLightColor(lightenColor(color, 20));
    }
    
    // Wenn eine vordefinierte Farbe aktiv ist, aktualisiere sie
    if (activeColorKey && activeColorKey !== 'custom' && activeColorKey in predefinedColors) {
      updatePredefinedColor(activeColorKey as keyof typeof predefinedColors, color);
    } else if (activeColorKey === 'custom') {
      setCustomColor(color);
    }
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexInput(value);
    
    // Nur aktualisieren, wenn es ein gültiger Hex-Code ist
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
      handleColorChange(value);
    }
  };

  // Verbesserte Animation für Größenänderung bei Werkzeugwechsel
  useEffect(() => {
    // Nur animieren, wenn sowohl das vorherige als auch das aktuelle Tool eine ContextBar haben
    if (previousTool !== currentTool && contextBarRef.current) {
      const prevHasContext = previousTool && ['BRUSH', 'ERASER', 'FILL', 'LINE', 'RECTANGLE', 'ELLIPSE', 'NUMBER'].includes(previousTool);
      const currHasContext = ['BRUSH', 'ERASER', 'FILL', 'LINE', 'RECTANGLE', 'ELLIPSE', 'NUMBER'].includes(currentTool);
      
      // Nur Morphing-Animation anwenden, wenn beide Tools eine ContextBar haben
      if (prevHasContext && currHasContext) {
        // Speichere die aktuelle Größe vor dem Werkzeugwechsel
        if (contextBarRef.current) {
          setBarWidth(contextBarRef.current.offsetWidth);
          setBarHeight(contextBarRef.current.offsetHeight);
        }
        
        // Warte auf den nächsten Render-Zyklus
        setTimeout(() => {
          if (contextBarRef.current) {
            // Füge die Animationsklasse hinzu
            contextBarRef.current.classList.add('context-bar-size-change');
            
            // Entferne die Klasse nach der Animation
            const timer = setTimeout(() => {
              if (contextBarRef.current) {
                contextBarRef.current.classList.remove('context-bar-size-change');
                setBarWidth(null);
                setBarHeight(null);
              }
            }, 300); // Entspricht der Animationsdauer
            
            return () => clearTimeout(timer);
          }
        }, 10);
      } else {
        // Bei Wechsel zwischen Tools ohne/mit ContextBar keine Größenanimation
        setBarWidth(null);
        setBarHeight(null);
      }
    }
    
    setPreviousTool(currentTool);
  }, [currentTool, previousTool]);

  // Effekt für das Ein-/Ausblenden der ContextBar
  useEffect(() => {
    if (hasContextProperties()) {
      setShowBar(true);
    } else {
      setShowBar(false);
    }
  }, [currentTool]);

  // Aktualisiere Hex-Input, wenn sich die aktuelle Farbe ändert
  useEffect(() => {
    setHexInput(currentColor);
    
    // Aktualisiere die Slider-Farbe, aber nicht für ERASER
    if (currentTool !== 'ERASER') {
      setSliderColor(currentColor);
      setSliderLightColor(lightenColor(currentColor, 20));
    }
  }, [currentColor, currentTool]);

  // Setze Double-Hit-Farbe auf Violett, falls sie nicht gesetzt ist
  useEffect(() => {
    if (predefinedColors.doubleHit === '') {
      updatePredefinedColor('doubleHit', '#FF00FF'); // Violett
    }
  }, [predefinedColors.doubleHit, updatePredefinedColor]);

  // Setze Slider-Farbe auf Grau, wenn ERASER ausgewählt ist
  useEffect(() => {
    if (currentTool === 'ERASER') {
      setSliderColor('#444');
      setSliderLightColor('#666');
    } else if (activeColorKey) {
      // Für andere Tools, setze die Farbe basierend auf der ausgewählten Farbe
      const color = activeColorKey === 'custom' ? customColor : predefinedColors[activeColorKey as keyof typeof predefinedColors];
      setSliderColor(color);
      setSliderLightColor(lightenColor(color, 20));
    }
  }, [currentTool, activeColorKey, customColor, predefinedColors]);

  // Schließe den Colorpicker, wenn außerhalb geklickt wird
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Wenn keine Eigenschaften angezeigt werden sollen, zeige die Bar nicht an
  if (!showBar) {
    return null;
  }

  return (
    <CSSTransition
      in={showBar}
      timeout={300}
      classNames="context-bar"
      unmountOnExit
    >
      <div 
        className={`context-bar ${!hasContextProperties() ? 'hidden' : ''}`}
        ref={contextBarRef}
        style={{
          '--slider-color': sliderColor,
          '--slider-color-light': sliderLightColor,
          ...(barWidth && barHeight ? { width: `${barWidth}px`, height: `${barHeight}px` } : {})
        } as React.CSSProperties}
      >
        {/* Pinselgröße für BRUSH und ERASER */}
        {(currentTool === 'BRUSH' || currentTool === 'ERASER') && (
          <div className="context-item">
            <label>
              Size:
              <input
                type="range"
                min="1"
                max="16"
                value={brushSize}
                className={currentTool !== 'ERASER' && activeColorKey ? 'colored' : ''}
                onChange={e => setBrushSize(Number(e.target.value))}
              />
              <span className="context-value">{brushSize}</span>
            </label>
          </div>
        )}

        {/* Trennlinie */}
        {(currentTool === 'BRUSH' || currentTool === 'ERASER') && 
          (['BRUSH', 'FILL', 'LINE', 'RECTANGLE', 'ELLIPSE'].includes(currentTool)) && (
          <div className="context-divider"></div>
        )}

        {/* Farbauswahl für BRUSH und andere Mal-Tools */}
        {(['BRUSH', 'FILL', 'LINE', 'RECTANGLE', 'ELLIPSE'].includes(currentTool)) && (
          <div className="context-item color-selection-item">
            <div className="color-swatches-container">
              {/* Vordefinierte Farben */}
              <div className="color-swatch-wrapper">
                <div 
                  className={`color-swatch ${currentColor === predefinedColors.red ? 'active' : ''}`}
                  style={{ backgroundColor: predefinedColors.red }}
                  onClick={() => handleColorClick('red', predefinedColors.red)}
                >
                  <button 
                    className="edit-color-button"
                    onClick={(e) => handleEditButtonClick('red', predefinedColors.red, e)}
                    title="Farbe bearbeiten"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                </div>
                <div className="color-tooltip">{colorInfo.red.label}</div>
              </div>
              
              <div className="color-swatch-wrapper">
                <div 
                  className={`color-swatch ${currentColor === predefinedColors.blue ? 'active' : ''}`}
                  style={{ backgroundColor: predefinedColors.blue }}
                  onClick={() => handleColorClick('blue', predefinedColors.blue)}
                >
                  <button 
                    className="edit-color-button"
                    onClick={(e) => handleEditButtonClick('blue', predefinedColors.blue, e)}
                    title="Farbe bearbeiten"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                </div>
                <div className="color-tooltip">{colorInfo.blue.label}</div>
              </div>
              
              <div className="color-swatch-wrapper">
                <div 
                  className={`color-swatch ${currentColor === predefinedColors.green ? 'active' : ''}`}
                  style={{ backgroundColor: predefinedColors.green }}
                  onClick={() => handleColorClick('green', predefinedColors.green)}
                >
                  <button 
                    className="edit-color-button"
                    onClick={(e) => handleEditButtonClick('green', predefinedColors.green, e)}
                    title="Farbe bearbeiten"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                </div>
                <div className="color-tooltip">{colorInfo.green.label}</div>
              </div>
              
              <div className="color-swatch-wrapper">
                <div 
                  className={`color-swatch ${currentColor === predefinedColors.doubleHit ? 'active' : ''}`}
                  style={{ backgroundColor: predefinedColors.doubleHit || '#FF00FF' }}
                  onClick={() => handleColorClick('doubleHit', predefinedColors.doubleHit || '#FF00FF')}
                >
                  <button 
                    className="edit-color-button"
                    onClick={(e) => handleEditButtonClick('doubleHit', predefinedColors.doubleHit || '#FF00FF', e)}
                    title="Farbe bearbeiten"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                </div>
                <div className="color-tooltip">{colorInfo.doubleHit.label}</div>
              </div>
              
              {/* Benutzerdefinierte Farbe */}
              <div className="color-swatch-wrapper">
                <div 
                  className={`color-swatch custom ${activeColorKey === 'custom' ? 'active' : ''}`}
                  style={{ backgroundColor: customColor }}
                  onClick={handleCustomColorClick}
                >
                  <button 
                    className="edit-color-button"
                    onClick={(e) => handleEditButtonClick('custom', customColor, e)}
                    title="Farbe bearbeiten"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                </div>
                <div className="color-tooltip">{colorInfo.custom.label}</div>
              </div>
            </div>
            
            {/* Hex-Eingabe und Farbwähler */}
            {showColorPicker && (
              <div className="color-popup" ref={colorPickerRef}>
                {activeColorKey && (
                  <div className="color-popup-header">
                    <div className="color-popup-title">
                      {activeColorKey in colorInfo 
                        ? colorInfo[activeColorKey as keyof typeof colorInfo].label 
                        : 'Farbe wählen'}
                    </div>
                    <div className="color-popup-description">
                      {activeColorKey in colorInfo 
                        ? colorInfo[activeColorKey as keyof typeof colorInfo].description 
                        : 'Wähle eine Farbe für dein Projekt.'}
                    </div>
                  </div>
                )}
                
                <div className="hex-input-container">
                  <input
                    type="text"
                    value={hexInput}
                    onChange={handleHexInputChange}
                    className="hex-input"
                    placeholder="#RRGGBB"
                  />
                </div>
                
                <HexColorPicker color={currentColor} onChange={handleColorChange} />
              </div>
            )}
          </div>
        )}

        {/* Auto-Numbering Toggle für BRUSH */}
        {currentTool === 'BRUSH' && (
          <>
            <div className="context-divider"></div>
            <div className="context-item">
              <label>
                Auto Number:
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={autoNumbering}
                    onChange={e => setAutoNumbering(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
            </div>
          </>
        )}

        {/* Nummern-Eingabe für NUMBER-Tool */}
        {currentTool === 'NUMBER' && (
          <div className="context-item">
            <label>
              Number:
              <input
                type="number"
                min="1"
                max="255"
                value={currentPixelNumber}
                onChange={e => setCurrentPixelNumber(Math.min(255, Math.max(1, Number(e.target.value) || 1)))}
              />
            </label>
          </div>
        )}

        {/* Füllungsoptionen für Rechteck- und Ellipsen-Tool */}
        {(currentTool === 'RECTANGLE' || currentTool === 'ELLIPSE') && (
          <div className="context-item fill-option">
            <label>
              Fill:
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={currentTool === 'RECTANGLE' ? isRectFilled : isEllipseFilled}
                  onChange={e => currentTool === 'RECTANGLE' ? setIsRectFilled(e.target.checked) : setIsEllipseFilled(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </div>
            </label>
          </div>
        )}

        {/* Nummerierungsmodus-Umschalter für Linie, Rechteck, Ellipse */}
        {(currentTool === 'LINE' || currentTool === 'RECTANGLE' || currentTool === 'ELLIPSE') && (
          <div className="context-item">
            <label>
              Nummerierung:
              <select 
                value={numberingMode} 
                onChange={(e) => setNumberingMode(e.target.value as 'off' | 'same' | 'auto')}
                className="numbering-mode-select"
              >
                <option value="off">Aus</option>
                <option value="same">Gleiche Nummer</option>
                <option value="auto">Auto Aufsteigend</option>
              </select>
            </label>
          </div>
        )}
      </div>
    </CSSTransition>
  );
};

export default ContextBar;
