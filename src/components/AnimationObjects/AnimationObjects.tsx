import { useState, useEffect, useRef } from 'react';
import useEditorStore from '../../store/editorStore';
import { CaretDown, CaretRight, Plus } from '@phosphor-icons/react';
import './AnimationObjects.css';
import { AnimationObject } from '../../types';
import AnimationTypePickerModal from './AnimationTypePickerModal';

interface AnimationObjectsProps {
  onConfigOpen: (animObj?: AnimationObject) => void;
  onDuplicateAnimation?: (animObj: AnimationObject) => void;
}

const AnimationObjectItem = ({ obj, onEdit, onDelete, onDuplicate }: { 
  obj: AnimationObject; 
  onEdit: (obj: AnimationObject) => void; 
  onDelete: (id: string) => void; 
  onDuplicate?: (obj: AnimationObject) => void;
}) => {
  // Ermittle den Layer-Namen für dieses Animation Object
  const { layers } = useEditorStore();
  const layerName = obj.layerId ? 
    layers.find(layer => layer.id === obj.layerId)?.name : 
    "No Layer";

  return (
    <div className="animation-object-item">
      <div className="animation-object-color" style={{ backgroundColor: obj.color }} />
      <div className="animation-object-info">
        <div className="animation-object-type">{obj.type}</div>
        <div className="animation-object-details">
          {obj.type === 'LINE' && (
            <>
              {obj.orientation} {obj.direction}
              {obj.speed && obj.speed > 1 && <span> • Speed: {obj.speed}x</span>}
              {obj.borderBehavior && <span> • {obj.borderBehavior === 'WRAP' ? 'Wrap' : 'Bounce'}</span>}
            </>
          )}
          {obj.type === 'X' && (
            <>
              Rotation: {obj.rotationSpeed}
              {obj.position && <span> • Custom Center</span>}
              {obj.stretchToEdges && <span> • Stretched</span>}
            </>
          )}
          {obj.type === 'SNAKE' && (
            <>
              Length: {obj.snakeLength || 5}
              <span> • Speed: {obj.snakeSpeed || 1}x</span>
              {obj.snakeCurrentDirection && <span> • Direction: {obj.snakeCurrentDirection}</span>}
            </>
          )}
          {obj.type === 'RECTANGLE' && (
            <>
              {obj.rectangleHasFill ? 'Filled' : 'Outline'}
              <span> • Speed: {obj.rectangleSpeed || 1}x</span>
              {obj.rectangleCycleMode && <span> • {obj.rectangleCycleMode.replace('_', ' ')}</span>}
            </>
          )}
          {obj.type === 'PATH' && (
            <>
              Path
            </>
          )}
        </div>
        <div className="animation-object-layer">
          Layer: {layerName}
        </div>
      </div>
      <div className="animation-object-actions">
        <button className="edit-button" onClick={() => onEdit(obj)} title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.4745 5.40807L18.5917 7.52524M17.8358 3.54289L11.6716 9.70711C11.2913 10.0874 11.0489 10.1776 10.6186 10.3638L8.6747 11.0891L9.40006 9.14518C9.5862 8.71494 9.67645 8.47257 10.0567 8.09289L16.2209 1.92868C16.7839 1.36562 17.6948 1.32374 18.3015 1.78115L18.3729 1.83338C18.9796 2.29078 19.0215 3.20174 18.4641 3.7647L17.8358 3.54289Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 13H5.5C4.09554 13 3.39331 13 2.88886 13.3029C2.67048 13.4423 2.44231 13.6705 2.30289 13.8889C2 14.3933 2 15.0955 2 16.5V18.5C2 19.9045 2 20.6067 2.30289 21.1111C2.44231 21.3295 2.67048 21.5577 2.88886 21.6971C3.39331 22 4.09554 22 5.5 22H18.5C19.9045 22 20.6067 22 21.1111 21.6971C21.3295 21.5577 21.5577 21.3295 21.6971 21.1111C22 20.6067 22 19.9045 22 18.5V16.5C22 15.0955 22 14.3933 21.6971 13.8889C21.5577 13.6705 21.3295 13.4423 21.1111 13.3029C20.6067 13 19.9045 13 18.5 13H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="delete-button" onClick={() => onDelete(obj.id)} title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 8L8 16M8 8L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>
        {onDuplicate && (
          <button className="duplicate-button" onClick={() => onDuplicate(obj)} title="Duplicate">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 3C6.47715 3 4 5.47715 4 8.5C4 11.5228 6.47715 14 9 14C11.5228 14 14 11.5228 14 8.5C14 5.47715 11.5228 3 9 3ZM9 12C6.47715 12 4 14.4772 4 17C4 19.5228 6.47715 22 9 22C11.5228 22 14 19.5228 14 17C14 14.4772 11.5228 12 9 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

const AnimationObjects = ({ onConfigOpen, onDuplicateAnimation }: AnimationObjectsProps) => {
  const {
    animationObjects,
    addAnimationObject,
    removeAnimationObject,
    createTempAnimationLayer,
    frames,
    layers,
  } = useEditorStore();

  const [isAnimationsPanelOpen, setIsAnimationsPanelOpen] = useState(true);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [pendingType, setPendingType] = useState<null | 'LINE' | 'X' | 'SNAKE' | 'RECTANGLE' | 'COUNTDOWN' | 'PATH'>(null);
  const prevAnimCount = useRef(animationObjects.length);

  useEffect(() => {
    // Wenn ein Typ aussteht und ein neues Objekt hinzugekommen ist
    if (pendingType && animationObjects.length > prevAnimCount.current) {
      // Finde das zuletzt hinzugefügte Objekt mit passendem Typ
      const created = [...animationObjects].reverse().find(obj => obj.type === pendingType);
      if (created) {
        onConfigOpen(created);
        setPendingType(null);
      }
    }
    prevAnimCount.current = animationObjects.length;
  }, [animationObjects, pendingType, onConfigOpen]);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTypePicker(true);
  };

  const handleTypeSelect = (type: 'LINE' | 'X' | 'SNAKE' | 'RECTANGLE' | 'COUNTDOWN' | 'PATH') => {
    // Erstelle temporären Layer und setze Typ für spätere Verwendung
    const orientation = type === 'LINE' ? 'HORIZONTAL' : undefined;
    createTempAnimationLayer(type, orientation);
    setPendingType(type);

    // Erstelle ein neues Animationsobjekt basierend auf dem ausgewählten Typ
    const frameIds = frames.map(f => f.id);
    let newObj: any = { type, color: '#FF0000', frames: frameIds };

    // Füge typspezifische Eigenschaften hinzu
    if (type === 'LINE') {
      newObj = { ...newObj, direction: 'RIGHT', orientation: 'HORIZONTAL', speed: 1, borderBehavior: 'WRAP' };
    } else if (type === 'X') {
      newObj = { ...newObj, rotationSpeed: 1, stretchToEdges: false, thickness: 1 };
    } else if (type === 'SNAKE') {
      newObj = { ...newObj, snakeLength: 5, snakeSpeed: 1 };
    } else if (type === 'RECTANGLE') {
      newObj = { ...newObj, rectangleSpeed: 5, rectangleEasingFunction: 'linear', rectangleStates: [], rectangleHasFill: false, rectangleCycleMode: 'PING_PONG' };
    } else if (type === 'COUNTDOWN') {
      // Neue Countdown-Standardwerte
      newObj = { 
        ...newObj, 
        color: '#f5d60a', // Neue Standardfarbe R:245, G:214, B:10
        countdownSize: 20,
        countdownSpeed: 1000, // Neue Standardgeschwindigkeit
        countdownFadeOption: 'digitalDripCycle', // Standard-Fade-Effekt
        countdownHoldDuration: 2000, // Neue Standard-Hold-Duration
        countdownEnableLoadingBar: true, // Loading Bar aktiviert
        countdownLoadingBarColors: ['#ff4d00', '#ff9500', '#fff700'], // Loading Bar Farben
        countdownLoadingBarSpeedFactor: 2.0, // Loading Bar Geschwindigkeit
        countdownEnableSparkleEffect: false,
        countdownSparkleColor: '#FFFFFF',
        countdownMaxSparklesPerFrame: 1,
        countdownSparkleLifetime: 3,
        countdownEnableStaticVerticalGradient: true,
        countdownStaticGradientColorTop: '#ffd500',
        countdownStaticGradientColorBottom: '#ffa200',
        countdownEnableSafeZone: true, // Safe Zone aktiviert
        countdownSafeZoneIntroAnimation: 'centerOut',
        countdownSafeZonePulse: true,
        countdownEnableBlackBackground: true, // Black Background aktiviert
        countdownTransitionEffect: 'matrix', // Matrix als Standard
        countdownMatrixColor: '#FFA500' // Orange als Standard
      };
    } else if (type === 'PATH') {
      newObj = { 
        ...newObj, 
        pathPoints: [{ x: 5, y: 5 }, { x: 20, y: 20 }], 
        pathSpeed: 5, 
        pathCycleMode: 'LOOP',
        pathBlockSize: 1,
        pathTrailLength: 0,
        pathTrailFade: true
      };
    }

    // Füge das neue Animationsobjekt hinzu
    addAnimationObject(newObj);
    setShowTypePicker(false);
  };

  const handleDuplicate = (obj: AnimationObject) => {
    const duplicatedObj = { ...obj };
    duplicatedObj.id = Math.random().toString(36).substr(2, 9);
    addAnimationObject(duplicatedObj);
  };

  return (
    <div className="animations-panel">
      <div 
        className="animations-header" 
        onClick={() => setIsAnimationsPanelOpen(!isAnimationsPanelOpen)}
      >
        {isAnimationsPanelOpen ? <CaretDown size={16} /> : <CaretRight size={16} />}
        <h3>Animation Objects</h3>
        <button
          className="add-animation-button"
          onClick={handleAddClick}
          title="Add Animation Object"
        >
          <Plus size={16} />
        </button>
      </div>
      {showTypePicker && (
        <AnimationTypePickerModal
          onSelect={handleTypeSelect}
          onClose={() => setShowTypePicker(false)}
        />
      )}
      {isAnimationsPanelOpen && (
        <div className="animations-list">
          {animationObjects.length === 0 ? (
            <div className="no-animations">
              No animation objects. Click + to add one.
            </div>
          ) : (
            animationObjects.map((animation) => (
              <AnimationObjectItem 
                key={animation.id} 
                obj={animation} 
                onEdit={onConfigOpen} 
                onDelete={removeAnimationObject} 
                onDuplicate={onDuplicateAnimation || handleDuplicate} 
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AnimationObjects;
