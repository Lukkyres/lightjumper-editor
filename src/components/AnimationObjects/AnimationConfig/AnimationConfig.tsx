import { useState, useEffect, useRef } from 'react';
import useEditorStore from '../../../store/editorStore';
import { X } from '@phosphor-icons/react';
import './AnimationConfig.css';
import { AnimationType, FadeOption } from '../../../types'; // Import AnimationType and FadeOption

interface AnimationConfigProps {
  onClose: () => void;
  currentAnimation?: any;
}

const AnimationConfig = ({ onClose, currentAnimation }: AnimationConfigProps) => {
  const {
    frames,
    addAnimationObject,
    updateAnimationObject,
    updateCountdownSafeZoneFromMainFrame,
    createTempAnimationLayer,
    removeLayer,
    tempAnimationLayerId,
    removeAnimationObject
  } = useEditorStore();

  const [color, setColor] = useState(currentAnimation?.color || '#F5D60A');
  const [type, setType] = useState<AnimationType>(currentAnimation?.type || 'LINE');
  const [direction, setDirection] = useState<'LEFT' | 'RIGHT' | 'UP' | 'DOWN'>(currentAnimation?.direction || (currentAnimation?.orientation === 'VERTICAL' ? 'DOWN' : 'RIGHT'));
  const [orientation, setOrientation] = useState<'HORIZONTAL' | 'VERTICAL'>(currentAnimation?.orientation || 'HORIZONTAL');
  const [rotationSpeed, setRotationSpeed] = useState(currentAnimation?.rotationSpeed || 1);
  const [snakeLength, setSnakeLength] = useState(currentAnimation?.snakeLength || 5);
  const [snakeSpeed, setSnakeSpeed] = useState(currentAnimation?.snakeSpeed || 1);
  const [rectangleHasFill, setRectangleHasFill] = useState(currentAnimation?.rectangleHasFill || false);
  const [rectangleSpeed, setRectangleSpeed] = useState(currentAnimation?.rectangleSpeed || 1);
  const [renderOnSection, setRenderOnSection] = useState<'startup' | 'main' | 'both'>(currentAnimation?.renderOnSection || 'both');
 
  // Countdown Sparkle Effect States
  const [countdownEnableSparkleEffect, setCountdownEnableSparkleEffect] = useState(currentAnimation?.countdownEnableSparkleEffect || false);
  const [countdownSparkleColor, setCountdownSparkleColor] = useState(currentAnimation?.countdownSparkleColor || '#FFFFFF');
  const [countdownMaxSparklesPerFrame, setCountdownMaxSparklesPerFrame] = useState(currentAnimation?.countdownMaxSparklesPerFrame || 1);
  const [countdownSparkleLifetime, setCountdownSparkleLifetime] = useState(currentAnimation?.countdownSparkleLifetime || 3);

  // Countdown Loading Bar States with new defaults
  const [countdownEnableLoadingBar, setCountdownEnableLoadingBar] = useState(currentAnimation?.countdownEnableLoadingBar !== undefined ? currentAnimation.countdownEnableLoadingBar : true);
  const [countdownLoadingBarColor1, setCountdownLoadingBarColor1] = useState(currentAnimation?.countdownLoadingBarColors?.[0] || '#ff4d00');
  const [countdownLoadingBarColor2, setCountdownLoadingBarColor2] = useState(currentAnimation?.countdownLoadingBarColors?.[1] || '#ff9500');
  const [countdownLoadingBarColor3, setCountdownLoadingBarColor3] = useState(currentAnimation?.countdownLoadingBarColors?.[2] || '#fff700');
  const [countdownLoadingBarSpeedFactor, setCountdownLoadingBarSpeedFactor] = useState(currentAnimation?.countdownLoadingBarSpeedFactor || 2.0);
  
  // Safe Zone Animation States
  const [currentConfigSafeZonePixels, setCurrentConfigSafeZonePixels] = useState<Array<{ x: number; y: number }>>(currentAnimation?.countdownSafeZonePixels || []);
  const [countdownSafeZoneSpeed, setCountdownSafeZoneSpeed] = useState(currentAnimation?.countdownSafeZoneSpeed || 0.3);
  const [countdownSafeZonePauseDuration, setCountdownSafeZonePauseDuration] = useState(currentAnimation?.countdownSafeZonePauseDuration || 500);
  
  // Flag zum Deaktivieren des useEffect-Cleanup bei Erfolgreichem Erstellen
  const skipCleanup = useRef(false);

  // Funktion, um den Namen der Animation-Ebene basierend auf dem Typ zu bestimmen
  const getAnimationLayerName = () => {
    switch (type) {
      case 'LINE':
        return `Animation: ${orientation} Line`;
      case 'X':
        return `Animation: X Shape`;
      case 'SNAKE':
        return `Animation: Snake`;
      case 'RECTANGLE':
        return `Animation: Rectangle`;
      case 'COUNTDOWN':
        return `Animation: Countdown`;
      default:
        return `Animation: ${type}`;
    }
  };

  // Erstelle temporäre Ebene beim Öffnen des Panels (beim Mount ODER falls keine existiert)
  useEffect(() => {
    if (!tempAnimationLayerId) {

      createTempAnimationLayer(type, orientation); // Pass type and orientation
    }
    // Cleanup-Effekt zum Entfernen der temporären Ebene
    return () => {
      if (tempAnimationLayerId && !skipCleanup.current) {
        removeLayer(tempAnimationLayerId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aktualisiere den Namen der temporären Ebene, wenn sich der Typ ändert
  useEffect(() => {
    if (tempAnimationLayerId) {
      const layerName = getAnimationLayerName();
      
      // Ebene aktualisieren (Namesaktualisierung)
      useEditorStore.getState().updateLayer(tempAnimationLayerId, { name: layerName });
    }
  }, [type, orientation, tempAnimationLayerId]);

  // Effect to initialize form when currentAnimation changes (for editing)
  useEffect(() => {
    if (currentAnimation) {
      setColor(currentAnimation.color || '#F5D60A');
      setType(currentAnimation.type || 'LINE');
      setDirection(currentAnimation.direction || (currentAnimation.orientation === 'VERTICAL' ? 'DOWN' : 'RIGHT'));
      setOrientation(currentAnimation.orientation || 'HORIZONTAL');
      setRotationSpeed(currentAnimation.rotationSpeed || 1);
      setSnakeLength(currentAnimation.snakeLength || 5);
      setSnakeSpeed(currentAnimation.snakeSpeed || 1);
      setRectangleHasFill(currentAnimation.rectangleHasFill || false);
      setRectangleSpeed(currentAnimation.rectangleSpeed || 1);
      setRenderOnSection(currentAnimation.renderOnSection || 'both');
      // Countdown specific properties
      if (currentAnimation.type === 'COUNTDOWN') {
        setCountdownEnableSparkleEffect(currentAnimation.countdownEnableSparkleEffect || false);
        setCountdownSparkleColor(currentAnimation.countdownSparkleColor || '#FFFFFF');
        setCountdownMaxSparklesPerFrame(currentAnimation.countdownMaxSparklesPerFrame || 1);
        setCountdownSparkleLifetime(currentAnimation.countdownSparkleLifetime || 3);
        // Loading bar properties
        setCountdownEnableLoadingBar(currentAnimation.countdownEnableLoadingBar || true);
        setCountdownLoadingBarColor1(currentAnimation.countdownLoadingBarColors?.[0] || '#ff4d00');
        setCountdownLoadingBarColor2(currentAnimation.countdownLoadingBarColors?.[1] || '#ff9500');
        setCountdownLoadingBarColor3(currentAnimation.countdownLoadingBarColors?.[2] || '#fff700');
        setCountdownLoadingBarSpeedFactor(currentAnimation.countdownLoadingBarSpeedFactor || 2.0);
      }
      // Note: PATH specific properties would need to be handled here too if editing PATH is supported by this form.
    }
  }, [currentAnimation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const frameIds = frames.map(frame => frame.id); // Default to all frames for new animations
    
    skipCleanup.current = true;
    
    const animationData: any = { // Using 'any' for flexibility, ensure properties match AnimationObject
      type,
      color,
      frames: currentAnimation?.frames || frameIds, // Preserve existing frames if editing, else all frames
      renderOnSection,
    };

    switch (type) {
      case 'LINE':
        animationData.direction = direction;
        animationData.orientation = orientation;
        break;
      case 'X':
        animationData.rotationSpeed = rotationSpeed;
        // Add other X-specific properties if they exist in currentAnimation
        if (currentAnimation?.position) animationData.position = currentAnimation.position;
        if (currentAnimation?.stretchToEdges !== undefined) animationData.stretchToEdges = currentAnimation.stretchToEdges;
        if (currentAnimation?.thickness !== undefined) animationData.thickness = currentAnimation.thickness;
        break;
      case 'SNAKE':
        animationData.snakeLength = snakeLength;
        animationData.snakeSpeed = snakeSpeed;
        animationData.snakeCurrentDirection = direction; // Or preserve currentAnimation.snakeCurrentDirection if editing
        if (currentAnimation?.snakeRandomSeed !== undefined) animationData.snakeRandomSeed = currentAnimation.snakeRandomSeed;
        if (currentAnimation?.avoidCollisions !== undefined) animationData.avoidCollisions = currentAnimation.avoidCollisions;
        if (currentAnimation?.strictCollisions !== undefined) animationData.strictCollisions = currentAnimation.strictCollisions;
        break;
      case 'RECTANGLE':
        animationData.rectangleSpeed = rectangleSpeed;
        animationData.rectangleHasFill = rectangleHasFill;
        // Preserve existing rectangleStates if editing
        if (currentAnimation?.rectangleStates) animationData.rectangleStates = currentAnimation.rectangleStates;
        if (currentAnimation?.rectangleEasingFunction) animationData.rectangleEasingFunction = currentAnimation.rectangleEasingFunction;
        if (currentAnimation?.rectangleCycleMode) animationData.rectangleCycleMode = currentAnimation.rectangleCycleMode;
        break;
      // case 'PATH': // Assuming PATH config is handled elsewhere or needs more fields
      //   if (currentAnimation?.pathPoints) animationData.pathPoints = currentAnimation.pathPoints;
      //   if (currentAnimation?.pathSpeed) animationData.pathSpeed = currentAnimation.pathSpeed;
      //   // ... other path properties
      //   break;
      case 'COUNTDOWN':
        // Set new defaults for countdown objects
        animationData.color = currentAnimation?.color || '#f5d60a'; // Neue Standardfarbe
        animationData.countdownSize = currentAnimation?.countdownSize || 20;
        animationData.countdownSpeed = currentAnimation?.countdownSpeed || 1500; // Neue Standardgeschwindigkeit
        animationData.countdownFadeOption = currentAnimation?.countdownFadeOption || 'digitalDripCycle';
        animationData.countdownHoldDuration = currentAnimation?.countdownHoldDuration || 2000; // Neue Standard-Hold-Duration
        animationData.countdownEnableStaticVerticalGradient = currentAnimation?.countdownEnableStaticVerticalGradient !== undefined ? currentAnimation.countdownEnableStaticVerticalGradient : true;
        animationData.countdownStaticGradientColorTop = currentAnimation?.countdownStaticGradientColorTop || '#ffd500';
        animationData.countdownStaticGradientColorBottom = currentAnimation?.countdownStaticGradientColorBottom || '#ffa200';
        animationData.countdownSafeZoneSpeed = countdownSafeZoneSpeed;
        animationData.countdownSafeZonePauseDuration = countdownSafeZonePauseDuration;
        animationData.countdownEnableSparkleEffect = countdownEnableSparkleEffect;
        if (countdownEnableSparkleEffect) {
          animationData.countdownSparkleColor = countdownSparkleColor;
          animationData.countdownMaxSparklesPerFrame = countdownMaxSparklesPerFrame;
          animationData.countdownSparkleLifetime = countdownSparkleLifetime;
        }
        animationData.countdownEnableLoadingBar = countdownEnableLoadingBar;
        if (countdownEnableLoadingBar) {
          animationData.countdownLoadingBarColors = [countdownLoadingBarColor1, countdownLoadingBarColor2, countdownLoadingBarColor3];
          animationData.countdownLoadingBarSpeedFactor = countdownLoadingBarSpeedFactor;
        }
        // Preserve bounds if they exist
        if (currentAnimation?.countdownBounds) animationData.countdownBounds = currentAnimation.countdownBounds;
        
        // SafeZone-Eigenschaften mit neuen Standardwerten
        animationData.countdownEnableSafeZone = currentAnimation?.countdownEnableSafeZone !== undefined ? currentAnimation.countdownEnableSafeZone : true;
        if (currentAnimation?.countdownSafeZonePixels) {
          animationData.countdownSafeZonePixels = currentAnimation.countdownSafeZonePixels;
        }
        animationData.countdownSafeZoneIntroAnimation = currentAnimation?.countdownSafeZoneIntroAnimation || 'centerOut';
        animationData.countdownSafeZonePulse = currentAnimation?.countdownSafeZonePulse !== undefined ? currentAnimation.countdownSafeZonePulse : true;
        // Black Background Eigenschaften mit neuen Standardwerten
        animationData.countdownEnableBlackBackground = currentAnimation?.countdownEnableBlackBackground !== undefined ? currentAnimation.countdownEnableBlackBackground : true;
        animationData.countdownBlackBackgroundColor = currentAnimation?.countdownBlackBackgroundColor || '#000000';
        animationData.countdownDisintegrationDuration = currentAnimation?.countdownDisintegrationDuration || 1500;
        animationData.countdownDisintegrationParticleSize = currentAnimation?.countdownDisintegrationParticleSize || 1;
        animationData.countdownDisintegrationParticleCount = currentAnimation?.countdownDisintegrationParticleCount || 30;
        animationData.countdownTransitionEffect = currentAnimation?.countdownTransitionEffect || 'matrix';
        animationData.countdownMatrixColor = currentAnimation?.countdownMatrixColor || '#FFA500';
        break;
    }
 
    if (currentAnimation?.id) {
      updateAnimationObject(currentAnimation.id, animationData);
    } else {
      addAnimationObject(animationData);
    }
    
    onClose();
  };

  const handleCancel = () => {
    // Bei Abbruch wird die temporäre Ebene durch den useEffect-Cleanup automatisch entfernt
    onClose();
  };

  // Update direction options based on orientation
  const getDirectionOptions = () => {
    if (orientation === 'HORIZONTAL') {
      return [
        { value: 'LEFT', label: 'Left' },
        { value: 'RIGHT', label: 'Right' }
      ];
    } else {
      return [
        { value: 'UP', label: 'Up' },
        { value: 'DOWN', label: 'Down' }
      ];
    }
  };

  // Reset direction when orientation changes
  const handleOrientationChange = (newOrientation: 'HORIZONTAL' | 'VERTICAL') => {
    setOrientation(newOrientation);
    if (newOrientation === 'HORIZONTAL') {
      setDirection('RIGHT');
    } else {
      setDirection('DOWN');
    }
  };

  return (
    <div className="animation-config">
      <div className="config-header">
        <h2>Animation Object Configuration</h2>
        <button className="close-button" onClick={handleCancel}>
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Type</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="type"
                checked={type === 'LINE'}
                onChange={() => setType('LINE')}
              />
              Line
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="type"
                checked={type === 'X'}
                onChange={() => setType('X')}
              />
              X Shape
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="type"
                checked={type === 'SNAKE'}
                onChange={() => setType('SNAKE')}
              />
              Snake
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="type"
                checked={type === 'RECTANGLE'}
                onChange={() => setType('RECTANGLE')}
              />
              Rectangle
            </label>
          </div>
        </div>
        
        <div className="form-group">
          <label>Color</label>
          <div className="color-input">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
        </div>
        
        {/* LINE-spezifische Konfiguration */}
        {type === 'LINE' && (
          <>
            <div className="form-group">
              <label>Orientation</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="orientation"
                    checked={orientation === 'HORIZONTAL'}
                    onChange={() => handleOrientationChange('HORIZONTAL')}
                  />
                  Horizontal
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="orientation"
                    checked={orientation === 'VERTICAL'}
                    onChange={() => handleOrientationChange('VERTICAL')}
                  />
                  Vertical
                </label>
              </div>
            </div>
            
            <div className="form-group">
              <label>Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'LEFT' | 'RIGHT' | 'UP' | 'DOWN')}
              >
                {getDirectionOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        
        {/* X-spezifische Konfiguration */}
        {type === 'X' && (
          <div className="form-group">
            <label>Rotation Speed: {rotationSpeed}</label>
            <input
              type="range"
              min="1"
              max="10"
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(Number(e.target.value))}
            />
          </div>
        )}
        
        {/* SNAKE-spezifische Konfiguration */}
        {type === 'SNAKE' && (
          <>
            <div className="form-group">
              <label>Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'LEFT' | 'RIGHT' | 'UP' | 'DOWN')}
              >
                <option value="LEFT">Left</option>
                <option value="RIGHT">Right</option>
                <option value="UP">Up</option>
                <option value="DOWN">Down</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Snake Length: {snakeLength}</label>
              <input
                type="range"
                min="3"
                max="20"
                value={snakeLength}
                onChange={(e) => setSnakeLength(Number(e.target.value))}
              />
            </div>
            
            <div className="form-group">
              <label>Speed: {snakeSpeed}</label>
              <input
                type="range"
                min="1"
                max="5"
                value={snakeSpeed}
                onChange={(e) => setSnakeSpeed(Number(e.target.value))}
              />
            </div>
          </>
        )}
        
        {/* RECTANGLE-spezifische Konfiguration */}
        {type === 'RECTANGLE' && (
          <>
            <div className="form-group">
              <label>Fill Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="fill"
                    checked={!rectangleHasFill}
                    onChange={() => setRectangleHasFill(false)}
                  />
                  Outline
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="fill"
                    checked={rectangleHasFill}
                    onChange={() => setRectangleHasFill(true)}
                  />
                  Filled
                </label>
              </div>
            </div>
            
            <div className="form-group">
              <label>Animation Speed: {rectangleSpeed.toFixed(1)}x</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={rectangleSpeed}
                onChange={(e) => setRectangleSpeed(Number(e.target.value))}
              />
              <div className="speed-info">
                <small>0.1 = sehr langsam, 1.0 = normal, 5.0 = sehr schnell</small>
              </div>
            </div>
          </>
        )}
 
        {/* COUNTDOWN-spezifische Konfiguration für Sparkle Effekt */}
        {type === 'COUNTDOWN' && (
          <>
            <div className="form-group-divider">Sparkle Effect</div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={countdownEnableSparkleEffect}
                  onChange={(e) => setCountdownEnableSparkleEffect(e.target.checked)}
                />
                Enable Sparkle Effect
              </label>
            </div>
            {countdownEnableSparkleEffect && (
              <>
                <div className="form-group">
                  <label>Sparkle Color</label>
                  <div className="color-input">
                    <input
                      type="color"
                      value={countdownSparkleColor}
                      onChange={(e) => setCountdownSparkleColor(e.target.value)}
                    />
                    <input
                      type="text"
                      value={countdownSparkleColor}
                      onChange={(e) => setCountdownSparkleColor(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Max Sparkles per Frame: {countdownMaxSparklesPerFrame}</label>
                  <input
                    type="range"
                    min="1"
                    max="10" // Adjust max based on typical canvas size, 10 is a lot for 16x16
                    value={countdownMaxSparklesPerFrame}
                    onChange={(e) => setCountdownMaxSparklesPerFrame(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Sparkle Lifetime (frames): {countdownSparkleLifetime}</label>
                  <input
                    type="range"
                    min="1"
                    max="10" // Short lifetime is usually better for sparkles
                    value={countdownSparkleLifetime}
                    onChange={(e) => setCountdownSparkleLifetime(Number(e.target.value))}
                  />
                </div>
              </>
            )}

            {/* Safe Zone Animation Configuration */}
            {type === 'COUNTDOWN' && (
              <>
                <div className="form-group-divider">Safe Zone Animation</div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => {
                        // Only proceed if we have a current animation
                        if (currentAnimation?.id) {
                          // Call the function to update safe zone with green pixels
                          updateCountdownSafeZoneFromMainFrame(currentAnimation.id);
                          // Update UI state if needed
                          if (currentAnimation.countdownSafeZonePixels) {
                            setCurrentConfigSafeZonePixels([...currentAnimation.countdownSafeZonePixels]);
                          }
                        }
                      }}
                    >
                      Safezone aus Main-Frame übernehmen
                    </button>
                  </div>
                  <div className="info-text" style={{ marginBottom: '10px' }}>
                    Die Safezone wird automatisch aus allen grünen Pixeln des ersten Main-Frames übernommen.
                  </div>
                </div>
                <div className="form-group">
                  <label>Safe Zone Animation Speed: {countdownSafeZoneSpeed.toFixed(1)}x</label>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={countdownSafeZoneSpeed}
                    onChange={(e) => setCountdownSafeZoneSpeed(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Pause After Safe Zone (ms): {countdownSafeZonePauseDuration}</label>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="100"
                    value={countdownSafeZonePauseDuration}
                    onChange={(e) => setCountdownSafeZonePauseDuration(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <button
                    type="button"
                    className="apply-button"
                    onClick={() => {
                      // Erstelle ein aktualisiertes Animationsobjekt und wende es an
                      if (currentAnimation?.id) {
                        const updatedAnimation = {
                          ...currentAnimation,
                          countdownSafeZoneSpeed,
                          countdownSafeZonePauseDuration
                        };
                        updateAnimationObject(currentAnimation.id, updatedAnimation);
                        // Zeige eine visuelle Bestätigung der Anwendung
                        const button = document.querySelector('.apply-button') as HTMLButtonElement;
                        if (button) {
                          const originalText = button.textContent;
                          button.textContent = 'Angewendet!';
                          setTimeout(() => {
                            if (button) button.textContent = originalText;
                          }, 1000);
                        }
                      }
                    }}
                  >
                    Änderungen anwenden
                  </button>
                </div>
              </>
            )}
            
            {/* Loading Bar Effect Configuration */}
            <div className="form-group-divider">Loading Bar Effect</div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={countdownEnableLoadingBar}
                  onChange={(e) => setCountdownEnableLoadingBar(e.target.checked)}
                />
                Enable Loading Bar
              </label>
            </div>
            {countdownEnableLoadingBar && (
              <>
                <div className="form-group">
                  <label>Bar Color (3)</label>
                  <div className="color-input">
                    <input
                      type="color"
                      value={countdownLoadingBarColor1}
                      onChange={(e) => setCountdownLoadingBarColor1(e.target.value)}
                    />
                    <input
                      type="text"
                      value={countdownLoadingBarColor1}
                      onChange={(e) => setCountdownLoadingBarColor1(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Bar Color (2)</label>
                  <div className="color-input">
                    <input
                      type="color"
                      value={countdownLoadingBarColor2}
                      onChange={(e) => setCountdownLoadingBarColor2(e.target.value)}
                    />
                    <input
                      type="text"
                      value={countdownLoadingBarColor2}
                      onChange={(e) => setCountdownLoadingBarColor2(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Bar Color (1)</label>
                  <div className="color-input">
                    <input
                      type="color"
                      value={countdownLoadingBarColor3}
                      onChange={(e) => setCountdownLoadingBarColor3(e.target.value)}
                    />
                    <input
                      type="text"
                      value={countdownLoadingBarColor3}
                      onChange={(e) => setCountdownLoadingBarColor3(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Loading Bar Speed Factor: {countdownLoadingBarSpeedFactor.toFixed(1)}</label>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={countdownLoadingBarSpeedFactor}
                    onChange={(e) => setCountdownLoadingBarSpeedFactor(Number(e.target.value))}
                  />
                </div>
              </>
            )}
          </>
        )}
        
{/* Render On Section Configuration */}
        <div className="form-group">
          <label>Render On Section</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="renderOnSection"
                value="startup"
                checked={renderOnSection === 'startup'}
                onChange={() => setRenderOnSection('startup')}
              />
              Startup Only
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="renderOnSection"
                value="main"
                checked={renderOnSection === 'main'}
                onChange={() => setRenderOnSection('main')}
              />
              Main Only
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="renderOnSection"
                value="both"
                checked={renderOnSection === 'both'}
                onChange={() => setRenderOnSection('both')}
              />
              Both
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={handleCancel} className="cancel-button">Cancel</button>
          <button type="submit" className="save-button">{currentAnimation ? 'Update' : 'Create'} Animation</button>
        </div>
        {currentAnimation && (
          <div className="form-actions">
            <button
              type="button"
              className="delete-button"
              style={{ background: 'var(--accent-red)', color: '#fff', marginTop: 12 }}
              onClick={() => {
                removeAnimationObject(currentAnimation.id);
                onClose();
              }}
            >
              Animation löschen
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default AnimationConfig;
