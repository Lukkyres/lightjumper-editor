import React, { useState, useEffect, useRef } from 'react';
import './AnimationTypePickerModal.css';
import { AnimationType } from '../../types'; // Added import

// GIFs
import kreuzGif from '../../assets/Kreuz.gif';
import linieGif from '../../assets/Linie.gif';
import snakeGif from '../../assets/Snake.gif';
import rectangleGif from '../../assets/Rectangle.gif';

// Standbilder
import kreuzStandbild from '../../assets/Kreuz_standbild.png';
import linieStandbild from '../../assets/Linie_standbild.png';
import snakeStandbild from '../../assets/Snake_standbild.png';
import rectangleStandbild from '../../assets/Rectangle_standbild.png';

interface AnimationTypePickerModalProps {
  onSelect: (type: AnimationType) => void; // Updated type
  onClose: () => void;
}

// Define a type for the animation type objects
interface AnimationTypeOption {
  type: AnimationType;
  label: string;
  description: string;
  iconType: 'gif' | 'image';
  gifSrc?: string;
  standbildSrc?: string;
  imgSrc?: string;
}

const animationTypes: AnimationTypeOption[] = [ // Explicitly type the array
  {
    type: 'LINE',
    label: 'Linie',
    description: 'Animierte Linie mit Richtung',
    iconType: 'gif',
    gifSrc: linieGif,
    standbildSrc: linieStandbild
  },
  {
    type: 'X',
    label: 'Kreuz',
    description: 'Rotierendes Kreuz mit Mittelpunkt',
    iconType: 'gif',
    gifSrc: kreuzGif,
    standbildSrc: kreuzStandbild
  },
  {
    type: 'SNAKE',
    label: 'Schlange',
    description: 'Schlangenförmige Bewegung',
    iconType: 'gif',
    gifSrc: snakeGif,
    standbildSrc: snakeStandbild
  },
  {
    type: 'RECTANGLE',
    label: 'Rechteck',
    description: 'Animiertes Rechteck mit Zuständen',
    iconType: 'gif',
    gifSrc: rectangleGif,
    standbildSrc: rectangleStandbild
  },
  {
    type: 'PATH',
    label: 'Pfad',
    description: 'Objekt bewegt sich entlang eines Pfades',
    iconType: 'image',
    imgSrc: "/path-animation-icon.png"
  },
  {
    type: 'COUNTDOWN', // Corrected to string literal
    label: 'Countdown',
    description: 'Zählt von 3 runter',
    iconType: 'image', // Placeholder icon type
    imgSrc: "/countdown-animation-icon.png" // Placeholder icon path
  },
];

const AnimationTypePickerModal: React.FC<AnimationTypePickerModalProps> = ({ onSelect, onClose }) => {
  const [hoveredType, setHoveredType] = useState<AnimationType | null>(null); // Updated type
  const [autoAnimate, setAutoAnimate] = useState<boolean>(true);
  const optionsRef = useRef<HTMLDivElement>(null);
  
  // Funktion zum Umschalten des Animation-Modus
  const toggleAnimationMode = () => {
    setAutoAnimate(!autoAnimate);
  };
  
  // Bestimme, ob eine Animation angezeigt werden soll
  const shouldShowAnimation = (type: AnimationType) => { // Updated type
    return autoAnimate || hoveredType === type;
  };
  
  // 3D-Hover-Effekt wie in iPadOS
  useEffect(() => {
    const optionsContainer = optionsRef.current;
    if (!optionsContainer) return;
    
    const buttons = optionsContainer.querySelectorAll('.animation-type-option');
    
    const handleMouseMove = (e: MouseEvent) => {
      buttons.forEach((button) => {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Prüfe, ob die Maus über dem Button ist
        const isHovering = 
          x >= 0 && 
          x <= rect.width && 
          y >= 0 && 
          y <= rect.height;
        
        if (isHovering) {
          // Berechne die Rotation basierend auf der Mausposition
          const rotateY = ((x / rect.width) - 0.5) * 15; // -7.5 bis 7.5 Grad
          const rotateX = ((y / rect.height) - 0.5) * -15; // 7.5 bis -7.5 Grad
          
          button.classList.add('hover-3d');
          (button as HTMLElement).style.transform = 
            `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) 
             translateY(-8px) scale(1.05)`;
        } else {
          button.classList.remove('hover-3d');
          (button as HTMLElement).style.transform = '';
        }
      });
    };
    
    const handleMouseLeave = () => {
      buttons.forEach((button) => {
        button.classList.remove('hover-3d');
        (button as HTMLElement).style.transform = '';
      });
    };
    
    optionsContainer.addEventListener('mousemove', handleMouseMove);
    optionsContainer.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      optionsContainer.removeEventListener('mousemove', handleMouseMove);
      optionsContainer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  
  return (
    <div className="animation-type-modal-backdrop" onClick={onClose}>
      <div className="animation-type-modal" onClick={e => e.stopPropagation()}>
        <div className="animation-type-modal-header">
          <h2>Wähle einen Animationstyp</h2>
        </div>
        <div className="animation-toggle-container">
          <span className="animation-toggle-label">Vorschau</span>
          <label className="animation-toggle-switch">
            <input 
              type="checkbox" 
              checked={autoAnimate} 
              onChange={toggleAnimationMode}
            />
            <span className="animation-toggle-slider"></span>
          </label>
        </div>
        <div className="animation-type-options" ref={optionsRef}>
          {animationTypes.map((type) => (
            <button
              key={type.type}
              className={`animation-type-option ${hoveredType === type.type ? 'hovered' : ''}`}
              data-type={type.type}
              onClick={() => onSelect(type.type as any)}
              onMouseEnter={() => setHoveredType(type.type)}
              onMouseLeave={() => setHoveredType(null)}
              type="button"
            >
              <span className="animation-type-icon">
                {type.iconType === 'gif' ? (
                  <div className="x-icon-container">
                    {shouldShowAnimation(type.type) ? (
                      <img 
                        src={type.gifSrc} 
                        alt={`${type.label} Animation`} 
                        className="x-icon-gif"
                      />
                    ) : (
                      <img
                        src={type.standbildSrc}
                        alt={`${type.label} Standbild`}
                        className="x-icon-gif"
                      />
                    )}
                  </div>
                ) : type.iconType === 'image' ? (
                  <img src={type.imgSrc} alt={type.label} className="x-icon-image" />
                ) : null}
              </span>
              <div className="animation-type-text-container">
                <span className="animation-type-label">{type.label}</span>
                <span className="animation-type-description">{type.description}</span>
              </div>
            </button>
          ))}
        </div>
        <button className="animation-type-cancel" onClick={onClose}>Abbrechen</button>
      </div>
    </div>
  );
};

export default AnimationTypePickerModal;
