import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import './styles/global.css';
import useEditorStore, { ViewportPreset } from './store/editorStore'; 
import MenuBar from './components/MenuBar';
import ContextBar from './components/ContextBar/ContextBar';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import Layers from './components/Layers/Layers';
import AnimationObjects from './components/AnimationObjects/AnimationObjects';
import Timeline from './components/Timeline'
import { exportFramesToZIP } from './utils/exportUtils'
import RectangleStatesList from './components/RectangleStatesList/RectangleStatesList';
import ViewportPresetTile from './components/ViewportPresetTile/ViewportPresetTile';
import PixelInconsistencyModal from './components/PixelInconsistencyModal/PixelInconsistencyModal';
import ProjectManager from './components/ProjectManager/ProjectManager';
import { getLastUsedDirectory, readProjectFile, DirectoryAccess, ProjectFile } from './utils/fileSystemAccess';
import { AnimationObject, AnimationType, Direction, Orientation, BorderBehavior, EasingFunction, RectangleCycleMode, RectangleState, FadeOption, Tool } from './types';

function App() {
  // State für den ProjectManager
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [projectDirectory, setProjectDirectory] = useState<DirectoryAccess | null>(null);
  
  // Überprüfung ob bereits ein Projektverzeichnis existiert
  useEffect(() => {
    const checkDirectoryAccess = async () => {
      try {
        const lastUsedDirectory = await getLastUsedDirectory();
        if (lastUsedDirectory) {
          // Ein Verzeichnis wurde bereits ausgewählt
          setProjectDirectory(lastUsedDirectory);
        } else {
          // Kein Verzeichnis vorhanden, ProjectManager öffnen
          setShowProjectManager(true);
        }
      } catch (error) {
        console.error('Fehler beim Zugriff auf das letzte Verzeichnis:', error);
        setShowProjectManager(true);
      }
    };
    
    checkDirectoryAccess();
  }, []);
  
  // Handler für das Laden von Projekten
  const handleProjectSelected = async (projectFile: ProjectFile) => {
    try {
      // Hier laden wir die Projektdaten direkt aus dem FileHandle
      const loadedProject = await readProjectFile(projectFile.handle);
      // Projektdaten in den Store laden
      if (loadedProject && loadedProject.projectData) {
        // Basisdaten ins Store laden
        if (loadedProject.projectData.canvasSize) {
          const { width, height } = loadedProject.projectData.canvasSize;
          setCanvasSize(width, height);
        }
        
        // Frames und Layers laden
        if (loadedProject.projectData.frames) {
          // Hier können wir den Editor-Store direkt mit den geladenen Daten aktualisieren
          const state = useEditorStore.getState();
          
          // Den state direkt mit der Store-API aktualisieren
          useEditorStore.setState({
            ...state,
            frames: loadedProject.projectData.frames,
            layers: loadedProject.projectData.layers || state.layers,
            projectName: loadedProject.projectData.name || 'Unbenanntes Projekt',
            animationObjects: loadedProject.projectData.animationObjects || state.animationObjects
          });
        }
        
        console.log('Projekt erfolgreich geladen:', loadedProject.projectData.name);
        setShowProjectManager(false);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Projekts:', error);
    }
  };
  
  // Handler für das Erstellen eines neuen Projekts - komplett überarbeitet für Robustheit
  const handleNewProject = () => {
    console.log('handleNewProject in App.tsx aufgerufen');
    
    try {
      // Aktiver Zustand abrufen
      const currentState = useEditorStore.getState();
      
      console.log('Erstelle neues Projekt - Reset des Editors...');
      
      // Wir erstellen einen komplett neuen initialState, basierend auf den aktuellen Einstellungen
      const freshFrameId = '1';
      const freshLayerId = 'layer-1';
      
      // Diese Methode ist viel sicherer als useEditorStore.getInitialState zu verwenden 
      // und dann Sachen zu überschreiben
      useEditorStore.setState({
        // Diese Werte sind immer so in einem neuen Projekt
        mode: 'EDIT',
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        selectedLayerId: freshLayerId,
        projectName: 'Neues Projekt',
        currentTool: 'PEN' as Tool,
        brushSize: 1,
        isRectFilled: false,
        isEllipseFilled: false,
        
        // Behalte die aktuellen Einstellungen der Canvas bei
        canvasSize: currentState.canvasSize, 
        pixelSize: currentState.pixelSize,
        
        // Frische Arrays und Objekte
        frames: [{
          id: freshFrameId,
          duration: 100,
          layerData: {
            [freshLayerId]: []
          }
        }],
        layers: [{
          id: freshLayerId,
          name: 'Ebene 1',
          visible: true,
          locked: false
        }],
        
        // Alle anderen Arrays explizit leeren
        animationObjects: [],
        selectedFrameIds: [],
        subRectangles: [],
        blockedPixels: {},
        selection: null,
        tempAnimationLayerId: null,
        
        // Diese müssen beibehalten werden
        viewportPresets: currentState.viewportPresets,
        customColors: currentState.customColors,
        predefinedColors: currentState.predefinedColors,
        // History auch zurücksetzen für das neue Projekt
        history: [],
        historyIndex: -1
      });
      
      // Log für Debug-Zwecke
      console.log('Neues Projekt erfolgreich erstellt');
      
      // Projektmanager schließen
      setShowProjectManager(false);
      
      // Kurze Bestätigung anzeigen
      setTimeout(() => {
        alert('Neues Projekt wurde erstellt');
      }, 100);
    } catch (error) {
      console.error('Fehler beim Erstellen eines neuen Projekts:', error);
      alert('Fehler beim Erstellen eines neuen Projekts');
      // Trotzdem versuchen, den Projektmanager zu schließen
      setShowProjectManager(false);
    }
  };
  
  const { 
    setCanvasSize, 
    frames, 
    addAnimationObject, 
    updateAnimationObject, 
    canvasSize, 
    setTempAnimationObject,
    updateTempAnimationObject,
    layers,
    createTempAnimationLayer,
    removeTempAnimationLayer,
    tempAnimationLayerId,
    updateLayer,
    setViewport, 
    resetViewport, 
    currentTool,
    setCurrentTool,
    blockedPixels,
    clearBlockedPixels,
    isDrawingSubRectangle, 
    toggleSubRectangleDrawing,
    subRectangles, 
    updateSubRectangleName, 
    deleteSubRectangle,
    setBlockedPixels, 
    viewportPresets,
    addViewportPreset,
    removeViewportPreset,
    importViewportPresets,
    applyViewportPreset,
    setProjectName,
    undo,
    redo
  } = useEditorStore();
  const [showAnimationConfig, setShowAnimationConfig] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationObject | null>(null);
  const [renderOnSection, setRenderOnSection] = useState<'startup' | 'main' | 'both'>('both');
  
  // Block-Pixel-Modus für den Viewport
  const [blockPixelModeActive, setBlockPixelModeActive] = useState(false);
  
  const [color, setColor] = useState('#f5d60a'); // R:245, G:214, B:10 für Countdown-Standard
  const [type, setType] = useState<AnimationType>('LINE');
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [orientation, setOrientation] = useState<Orientation>('HORIZONTAL');
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [lineSpeed, setLineSpeed] = useState(1);
  const [borderBehavior, setBorderBehavior] = useState<BorderBehavior>('WRAP');
  const [thickness, setThickness] = useState(1);
  const [stretchToEdges, setStretchToEdges] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | 'FOREGROUND' | 'BACKGROUND'>('FOREGROUND');
  
  // Snake specific states
  const [snakeLength, setSnakeLength] = useState(5);
  const [snakeSpeed, setSnakeSpeed] = useState(1);
  const [snakeCount, setSnakeCount] = useState(1);
  const [avoidCollisions, setAvoidCollisions] = useState(false);
  const [strictCollisions, setStrictCollisions] = useState(false);
  
  // Rectangle specific states
  const [rectangleSpeed, setRectangleSpeed] = useState(1);
  const [rectangleEasingFunction, setRectangleEasingFunction] = useState<EasingFunction>('LINEAR');
  const [rectangleStates, setRectangleStates] = useState<RectangleState[]>([]);
  const [rectangleHasFill, setRectangleHasFill] = useState(false);
  const [rectangleCycleMode, setRectangleCycleMode] = useState<RectangleCycleMode>('LOOP');
  const [isDrawingRectangle, setIsDrawingRectangle] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'STATE' | null>(null);
  const [drawingStateIndex, setDrawingStateIndex] = useState<number | null>(null);
  const [currentRectangle, setCurrentRectangle] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    delay: number;
  } | null>(null);
  
  // PATH animation specific state
  const [pathPoints, setPathPoints] = useState<Array<{x: number, y: number, pixelNumber?: number}>>([
    { x: 5, y: 5 },
    { x: 20, y: 20 }
  ]);
  const [pathSpeed, setPathSpeed] = useState<number>(5);
  const [pathCycleMode, setPathCycleMode] = useState<'LOOP' | 'PING_PONG' | 'ONCE'>('LOOP');
  const [pathBlockSize, setPathBlockSize] = useState<number>(1); // Standardwert: 1 (einzelner Pixel)
  const [pathTrailLength, setPathTrailLength] = useState<number>(0); // 0 = kein Trail
  const [pathTrailFade, setPathTrailFade] = useState<boolean>(true); // Standard: mit Farbverlauf
  const [pathSharedPixelNumber, setPathSharedPixelNumber] = useState<boolean>(true); // Standard: alle Trail-Pixel haben die gleiche Nummer
  const [isAddingPathPoint, setIsAddingPathPoint] = useState(false);

  // Countdown specific states with new defaults
  const [countdownSize, setCountdownSize] = useState(20); // Will be kept as a fallback or relative scaler
  const [countdownSpeed, setCountdownSpeed] = useState(1000); // Neue Standardgeschwindigkeit
  const [countdownFadeOption, setCountdownFadeOption] = useState<FadeOption>('digitalDripCycle'); // Standard-Fade-Effekt
  const [countdownBounds, setCountdownBounds] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined);
  const [isDrawingCountdownBounds, setIsDrawingCountdownBounds] = useState(false);
  const [countdownHoldDuration, setCountdownHoldDuration] = useState<number>(2000); // Neue Standard-Hold-Duration
  // Countdown Sparkle Effect States
  const [countdownEnableSparkleEffect, setCountdownEnableSparkleEffect] = useState(false);
  const [countdownSparkleColor, setCountdownSparkleColor] = useState('#FFFFFF');
  const [countdownMaxSparklesPerFrame, setCountdownMaxSparklesPerFrame] = useState(1);
  const [countdownSparkleLifetime, setCountdownSparkleLifetime] = useState(3);
  // Countdown Pulsating Gradient States
  const [countdownEnableGradientPulse, setCountdownEnableGradientPulse] = useState(false);
  const [countdownGradientColorStart, setCountdownGradientColorStart] = useState('#FF0000');
  const [countdownGradientColorEnd, setCountdownGradientColorEnd] = useState('#00FF00');
  const [countdownGradientPulseSpeed, setCountdownGradientPulseSpeed] = useState(2000); // ms for a full cycle
  // Countdown Static Vertical Gradient States
  const [countdownEnableStaticVerticalGradient, setCountdownEnableStaticVerticalGradient] = useState(true);
  const [countdownStaticGradientColorTop, setCountdownStaticGradientColorTop] = useState('#ffd500');
  const [countdownStaticGradientColorBottom, setCountdownStaticGradientColorBottom] = useState('#ffa200');
  // Countdown Loading Bar States with new defaults
  const [countdownEnableLoadingBar, setCountdownEnableLoadingBar] = useState(true);
  const [countdownLoadingBarColor1, setCountdownLoadingBarColor1] = useState('#ff4d00');
  const [countdownLoadingBarColor2, setCountdownLoadingBarColor2] = useState('#ff9500');
  const [countdownLoadingBarColor3, setCountdownLoadingBarColor3] = useState('#fff700');
  const [countdownLoadingBarSpeedFactor, setCountdownLoadingBarSpeedFactor] = useState(2.0);

  // Countdown Safe Zone Effect States
  const [countdownEnableSafeZone, setCountdownEnableSafeZone] = useState(true);
  const [countdownSafeZoneIntroAnimation, setCountdownSafeZoneIntroAnimation] = useState<'centerOut' | 'none'>('centerOut');
  const [countdownSafeZonePulse, setCountdownSafeZonePulse] = useState(true);
  const [countdownSafeZoneSpeed, setCountdownSafeZoneSpeed] = useState(1.0);
  const [countdownSafeZonePauseDuration, setCountdownSafeZonePauseDuration] = useState(500); // 500ms default pause
  
  // Countdown Black Background States
  const [countdownEnableBlackBackground, setCountdownEnableBlackBackground] = useState(true); // Standardmäßig aktiviert
  const [countdownBlackBackgroundColor, setCountdownBlackBackgroundColor] = useState('#000000');
  const [countdownDisintegrationDuration, setCountdownDisintegrationDuration] = useState(1000); // Default 1 second
  const [countdownDisintegrationParticleSize, setCountdownDisintegrationParticleSize] = useState(1);
  const [countdownDisintegrationParticleCount, setCountdownDisintegrationParticleCount] = useState(30); // Default density
  const [countdownTransitionEffect, setCountdownTransitionEffect] = useState<'thanos' | 'matrix' | 'spiral'>('matrix'); // Matrix als Standard
  const [countdownMatrixColor, setCountdownMatrixColor] = useState('#FFA500'); // Orange als Standard
  const [countdownOffset, setCountdownOffset] = useState<{x: number, y: number}>({x: 0, y: 0}); // Offset für Countdown-Position
  const [isCountdownPositionMode, setIsCountdownPositionMode] = useState(false); // Modus zum Verschieben des Countdowns

  // New states for defining safe zone pixels
  const [isDefiningSafeZonePixels, setIsDefiningSafeZonePixels] = useState(false);
  const [tempSafeZonePixels, setTempSafeZonePixels] = useState<Array<{ x: number; y: number }>>([]);
  const [currentConfigSafeZonePixels, setCurrentConfigSafeZonePixels] = useState<Array<{ x: number; y: number }>>([]);
  
  const [centerX, setCenterX] = useState<number | undefined>(undefined);
  const [centerY, setCenterY] = useState<number | undefined>(undefined);
  const [isControllingCenter, setIsControllingCenter] = useState(false);
  
  const configPanelRef = useRef<HTMLDivElement>(null);

  // Initialize with default canvas size
  useEffect(() => {
    setCanvasSize(16, 16);
  }, [setCanvasSize]);

  const handleToggleSafeZonePixel = (x: number, y: number) => {
    setTempSafeZonePixels(prevPixels => {
      const existingPixelIndex = prevPixels.findIndex(p => p.x === x && p.y === y);
      if (existingPixelIndex > -1) {
        // Pixel exists, remove it
        return prevPixels.filter((_, index) => index !== existingPixelIndex);
      } else {
        // Pixel doesn't exist, add it
        return [...prevPixels, { x, y }];
      }
    });
  };
  
  // Reset form when animation is loaded for editing or when a new one is being created
  useEffect(() => {
    if (currentAnimation) {
      // Editing existing animation
      setColor(currentAnimation.color);
      setType(currentAnimation.type);
      setSelectedLayerId(
        currentAnimation.renderPosition === 'FOREGROUND' 
          ? 'FOREGROUND' 
          : currentAnimation.renderPosition === 'BACKGROUND'
            ? 'BACKGROUND'
            : currentAnimation.layerId || ''
      );
      
      if (currentAnimation.type === 'LINE') {
        setDirection(currentAnimation.direction ?? 'RIGHT'); 
        setOrientation(currentAnimation.orientation ?? 'HORIZONTAL'); 
        setLineSpeed(currentAnimation.speed ?? 1); 
        setBorderBehavior(currentAnimation.borderBehavior ?? 'WRAP'); 
        setThickness(currentAnimation.thickness || 1);
        setStretchToEdges(currentAnimation.stretchToEdges || false);
      } else if (currentAnimation.type === 'X') {
        setCenterX(currentAnimation.position?.x);
        setCenterY(currentAnimation.position?.y);
        setRotationSpeed(currentAnimation.rotationSpeed ?? 1); 
        setStretchToEdges(currentAnimation.stretchToEdges ?? false); 
        setThickness(currentAnimation.thickness || 1);
      } else if (currentAnimation.type === 'SNAKE') {
        setSnakeLength(currentAnimation.snakeLength ?? 5); 
        setSnakeSpeed(currentAnimation.snakeSpeed ?? 1); 
        setSnakeCount(currentAnimation.snakeCount ?? 1); 
        setAvoidCollisions(currentAnimation.avoidCollisions ?? false); 
        setStrictCollisions(currentAnimation.strictCollisions ?? false); 
      } else if (currentAnimation.type === 'RECTANGLE') {
        setRectangleSpeed(currentAnimation.rectangleSpeed ?? 1); 
        setRectangleEasingFunction(currentAnimation.rectangleEasingFunction ?? 'LINEAR');
        setRectangleStates(currentAnimation.rectangleStates || []); 
        setRectangleHasFill(currentAnimation.rectangleHasFill ?? false); 
        setRectangleCycleMode(currentAnimation.rectangleCycleMode ?? 'LOOP');
      } else if (currentAnimation.type === 'PATH') {
        setPathPoints(currentAnimation.pathPoints || []); 
        setPathSpeed(currentAnimation.pathSpeed ?? 1); 
        setPathCycleMode(currentAnimation.pathCycleMode ?? 'LOOP');
        setPathBlockSize(currentAnimation.pathBlockSize ?? 1);
        setPathTrailLength(currentAnimation.pathTrailLength ?? 0);
        setPathTrailFade(currentAnimation.pathTrailFade ?? true);
        setPathSharedPixelNumber(currentAnimation.pathSharedPixelNumber ?? true);
        setRenderOnSection(currentAnimation.renderOnSection || 'both');
      } else if (currentAnimation.type === 'COUNTDOWN') {
        setCountdownSize(currentAnimation.countdownSize || 20);
        setCountdownSpeed(currentAnimation.countdownSpeed || 1000);
        setCountdownFadeOption(currentAnimation.countdownFadeOption || 'none');
        setCountdownBounds(currentAnimation.countdownBounds); // Load bounds
        if (currentAnimation.countdownFadeOption === 'digitalDripCycle') {
          setCountdownHoldDuration(currentAnimation.countdownHoldDuration ?? 500);
        } else {
          setCountdownHoldDuration(500); // Reset if not digitalDripCycle
        }
        // Initialize Sparkle Effect states for Countdown
        setCountdownEnableSparkleEffect(currentAnimation.countdownEnableSparkleEffect || false);
        setCountdownSparkleColor(currentAnimation.countdownSparkleColor || '#FFFFFF');
        setCountdownMaxSparklesPerFrame(currentAnimation.countdownMaxSparklesPerFrame || 1);
        setCountdownSparkleLifetime(currentAnimation.countdownSparkleLifetime || 3);
        // Initialize Pulsating Gradient states for Countdown
        setCountdownEnableGradientPulse(currentAnimation.countdownEnableGradientPulse || false);
        setCountdownGradientColorStart(currentAnimation.countdownGradientColorStart || currentAnimation.color || '#FF0000');
        setCountdownGradientColorEnd(currentAnimation.countdownGradientColorEnd || '#00FF00');
        setCountdownGradientPulseSpeed(currentAnimation.countdownGradientPulseSpeed || 2000);
        // Initialize Static Vertical Gradient states for Countdown
        setCountdownEnableStaticVerticalGradient(currentAnimation.countdownEnableStaticVerticalGradient || false);
        setCountdownStaticGradientColorTop(currentAnimation.countdownStaticGradientColorTop || '#ffd500');
        setCountdownStaticGradientColorBottom(currentAnimation.countdownStaticGradientColorBottom || '#ffa200');
        // Initialize Black Background states for Countdown
        setCountdownEnableBlackBackground(currentAnimation.countdownEnableBlackBackground || false);
        setCountdownBlackBackgroundColor(currentAnimation.countdownBlackBackgroundColor || '#000000');
        setCountdownDisintegrationDuration(currentAnimation.countdownDisintegrationDuration || 1000);
        setCountdownDisintegrationParticleSize(currentAnimation.countdownDisintegrationParticleSize || 1);
        setCountdownDisintegrationParticleCount(currentAnimation.countdownDisintegrationParticleCount || 30);
        setCountdownTransitionEffect(currentAnimation.countdownTransitionEffect || 'thanos');
        // Initialize Loading Bar states for Countdown
        setCountdownEnableLoadingBar(currentAnimation.countdownEnableLoadingBar || false);
        setCountdownLoadingBarColor1(currentAnimation.countdownLoadingBarColors?.[0] || '#ff4d00'); // Neue Standardfarben
        setCountdownLoadingBarColor2(currentAnimation.countdownLoadingBarColors?.[1] || '#ff9500');
        setCountdownLoadingBarColor3(currentAnimation.countdownLoadingBarColors?.[2] || '#fff700');
        setCountdownLoadingBarSpeedFactor(currentAnimation.countdownLoadingBarSpeedFactor || 1.0);
        // Initialize Safe Zone Effect states for Countdown
        setCountdownEnableSafeZone(currentAnimation.countdownEnableSafeZone || false);
        setCountdownSafeZoneIntroAnimation(currentAnimation.countdownSafeZoneIntroAnimation || 'centerOut');
        setCountdownSafeZonePulse(currentAnimation.countdownSafeZonePulse === undefined ? true : currentAnimation.countdownSafeZonePulse);
        setCountdownSafeZoneSpeed(currentAnimation.countdownSafeZoneSpeed || 1.0);
        setCountdownSafeZonePauseDuration(currentAnimation.countdownSafeZonePauseDuration !== undefined ? currentAnimation.countdownSafeZonePauseDuration : 500);
        setCurrentConfigSafeZonePixels(currentAnimation.countdownSafeZonePixels || []);
      }
    } else {
      // Reset form for new animation
      setColor('#FF0000');
      setType('LINE');
      setDirection('RIGHT');
      setOrientation('HORIZONTAL');
      setRotationSpeed(1);
      setCenterX(undefined);
      setCenterY(undefined);
      setStretchToEdges(false);
      setThickness(1);
      setLineSpeed(1);
      setBorderBehavior('WRAP');
      setSelectedLayerId('FOREGROUND');
      setSnakeLength(5);
      setSnakeSpeed(1);
      setSnakeCount(1);
      setAvoidCollisions(false);
      setStrictCollisions(false);
      setRectangleSpeed(1);
      setRectangleEasingFunction('LINEAR');
      setRectangleStates([]);
      setRectangleHasFill(false);
      setRectangleCycleMode('LOOP');
      setPathPoints([{ x: 5, y: 5 }, { x: 20, y: 20 }]);
      setPathSpeed(5);
      setPathCycleMode('LOOP');
      setPathBlockSize(1);
      setPathTrailLength(0);
      setPathTrailFade(true);
      setPathSharedPixelNumber(true);
      setRenderOnSection('both');
      // Reset Countdown fields with new defaults
      setCountdownSize(20);
      setCountdownSpeed(1000); // Neue Standardgeschwindigkeit
      setCountdownFadeOption('digitalDripCycle'); // Standard-Fade-Effekt
      setCountdownBounds(undefined); // Reset bounds
      setCountdownHoldDuration(2000); // Neue Standard-Hold-Duration
      // Reset Sparkle Effect states for Countdown
      setCountdownEnableSparkleEffect(false);
      setCountdownSparkleColor('#FFFFFF');
      setCountdownMaxSparklesPerFrame(1);
      setCountdownSparkleLifetime(3);
      // Reset Pulsating Gradient states for Countdown
      setCountdownEnableGradientPulse(false);
      setCountdownGradientColorStart('#f5d60a'); // Neue Standardfarbe
      setCountdownGradientColorEnd('#00FF00'); // Default to a contrasting color
      setCountdownGradientPulseSpeed(2000);
      // Reset Static Vertical Gradient states for Countdown
      setCountdownEnableStaticVerticalGradient(true); // Standardmäßig aktiviert
      setCountdownStaticGradientColorTop('#ffd500'); // Neue Standardfarben
      setCountdownStaticGradientColorBottom('#ffa200'); // Neue Standardfarben
      // Reset Loading Bar states for Countdown with new defaults
      setCountdownEnableLoadingBar(true); // Standardmäßig aktiviert
      setCountdownLoadingBarColor1('#ff4d00'); // Standardfarben
      setCountdownLoadingBarColor2('#ff9500');
      setCountdownLoadingBarColor3('#fff700');
      setCountdownLoadingBarSpeedFactor(2.0); // Standardgeschwindigkeit
      // Reset Safe Zone Effect states for Countdown
      setCountdownEnableSafeZone(true); // Standardmäßig aktiviert
      setCountdownSafeZoneIntroAnimation('centerOut');
      setCountdownSafeZonePulse(true);
      setCountdownSafeZoneSpeed(1.0);
      setCountdownSafeZonePauseDuration(500);
      setCurrentConfigSafeZonePixels([]);
      // Reset Black Background states for Countdown
      setCountdownEnableBlackBackground(true); // Standardmäßig aktiviert
      setCountdownBlackBackgroundColor('#000000');
      setCountdownDisintegrationDuration(1000);
      setCountdownDisintegrationParticleSize(1);
      setCountdownDisintegrationParticleCount(30);
      setCountdownTransitionEffect('matrix'); // Matrix als Standard
      setCountdownMatrixColor('#FFA500'); // Orange als Standard
    }
    
    // Always reset center control mode when loading/resetting
    setIsControllingCenter(false);
    setIsDefiningSafeZonePixels(false); // Reset this mode too
    setTempSafeZonePixels([]); // Reset temp pixels
  }, [currentAnimation]);
  
  // Create or update a temporary animation object for preview when configuration changes
  useEffect(() => {
    if (showAnimationConfig) {
      if (currentAnimation) {
        // Editing existing animation: Initialize temp object from currentAnimation
        // Ensure all relevant properties are copied. Add missing ones as needed.
        const tempEditObject: Omit<AnimationObject, 'id'> = {
          type: currentAnimation.type,
          color: currentAnimation.color,
          frames: currentAnimation.frames,
          layerId: currentAnimation.layerId,
          renderPosition: currentAnimation.renderPosition,
          // Add type-specific properties
          ...(currentAnimation.type === 'LINE' && {
            direction: currentAnimation.direction,
            orientation: currentAnimation.orientation,
            speed: currentAnimation.speed,
            borderBehavior: currentAnimation.borderBehavior,
          }),
          ...(currentAnimation.type === 'X' && {
            rotationSpeed: currentAnimation.rotationSpeed,
            stretchToEdges: currentAnimation.stretchToEdges,
            thickness: currentAnimation.thickness,
            position: currentAnimation.position, // Copy position if editing
          }),
          ...(currentAnimation.type === 'SNAKE' && {
            snakeLength: currentAnimation.snakeLength,
            snakeSpeed: currentAnimation.snakeSpeed,
            snakeCount: currentAnimation.snakeCount,
            avoidCollisions: currentAnimation.avoidCollisions,
            strictCollisions: currentAnimation.strictCollisions,
          }),
          ...(currentAnimation.type === 'RECTANGLE' && {
            rectangleSpeed: currentAnimation.rectangleSpeed,
            rectangleEasingFunction: currentAnimation.rectangleEasingFunction,
            rectangleStates: currentAnimation.rectangleStates,
            rectangleHasFill: currentAnimation.rectangleHasFill,
            rectangleCycleMode: currentAnimation.rectangleCycleMode,
          }),
          ...(currentAnimation.type === 'PATH' && {
            pathPoints: currentAnimation.pathPoints,
            pathSpeed: currentAnimation.pathSpeed,
            pathCycleMode: currentAnimation.pathCycleMode,
            pathBlockSize: currentAnimation.pathBlockSize,
            pathTrailLength: currentAnimation.pathTrailLength,
            pathTrailFade: currentAnimation.pathTrailFade,
            pathSharedPixelNumber: currentAnimation.pathSharedPixelNumber,
            renderOnSection: currentAnimation.renderOnSection,
          }),
          ...(currentAnimation.type === 'COUNTDOWN' && {
            countdownSize: currentAnimation.countdownSize,
            countdownSpeed: currentAnimation.countdownSpeed,
            countdownFadeOption: currentAnimation.countdownFadeOption,
            countdownBounds: currentAnimation.countdownBounds,
            countdownHoldDuration: currentAnimation.countdownHoldDuration, // Include hold duration
            // Add sparkle properties for editing
            countdownEnableSparkleEffect: currentAnimation.countdownEnableSparkleEffect,
            countdownSparkleColor: currentAnimation.countdownSparkleColor,
            countdownMaxSparklesPerFrame: currentAnimation.countdownMaxSparklesPerFrame,
            countdownSparkleLifetime: currentAnimation.countdownSparkleLifetime,
            // Add gradient pulse properties for editing
            countdownEnableGradientPulse: currentAnimation.countdownEnableGradientPulse,
            countdownGradientColorStart: currentAnimation.countdownGradientColorStart,
            countdownGradientColorEnd: currentAnimation.countdownGradientColorEnd,
            countdownGradientPulseSpeed: currentAnimation.countdownGradientPulseSpeed,
            // Add static vertical gradient properties for editing
            countdownEnableStaticVerticalGradient: currentAnimation.countdownEnableStaticVerticalGradient,
            countdownStaticGradientColorTop: currentAnimation.countdownStaticGradientColorTop,
            countdownStaticGradientColorBottom: currentAnimation.countdownStaticGradientColorBottom,
            // Add loading bar properties for editing
            countdownEnableLoadingBar: currentAnimation.countdownEnableLoadingBar,
            countdownLoadingBarColors: currentAnimation.countdownLoadingBarColors,
            countdownLoadingBarSpeedFactor: currentAnimation.countdownLoadingBarSpeedFactor,
            // Add safe zone properties for editing
            countdownEnableSafeZone: currentAnimation.countdownEnableSafeZone,
            countdownSafeZonePixels: isDefiningSafeZonePixels ? tempSafeZonePixels : currentConfigSafeZonePixels,
            countdownSafeZoneIntroAnimation: currentAnimation.countdownSafeZoneIntroAnimation,
            countdownSafeZonePulse: currentAnimation.countdownSafeZonePulse,
            countdownSafeZoneSpeed: currentAnimation.countdownSafeZoneSpeed,
            countdownSafeZonePauseDuration: currentAnimation.countdownSafeZonePauseDuration,
          }),
        };
        setTempAnimationObject(tempEditObject);
      } else {
        // Adding new animation: Initialize based on current form state (as before)
        const frameIds = frames.map(frame => frame.id);
        if (type === 'LINE') {
          setTempAnimationObject({
            type,
            color,
            frames: frameIds,
            direction,
            orientation,
            speed: lineSpeed,
            borderBehavior,
            layerId: tempAnimationLayerId || (selectedLayerId !== 'FOREGROUND' && selectedLayerId !== 'BACKGROUND' ? selectedLayerId : undefined),
            renderPosition: selectedLayerId === 'FOREGROUND'
              ? 'FOREGROUND'
              : selectedLayerId === 'BACKGROUND'
                ? 'BACKGROUND'
                : 'ON_LAYER',
            renderOnSection
          });
        } else if (type === 'X') {
          const tempObj: Omit<AnimationObject, 'id'> = {
            type,
            color,
            frames: frameIds,
            rotationSpeed,
            stretchToEdges,
            thickness,
            layerId: tempAnimationLayerId || (selectedLayerId !== 'FOREGROUND' && selectedLayerId !== 'BACKGROUND' ? selectedLayerId : undefined),
            renderPosition: selectedLayerId === 'FOREGROUND'
              ? 'FOREGROUND'
              : selectedLayerId === 'BACKGROUND'
                ? 'BACKGROUND'
                : 'ON_LAYER',
            renderOnSection
          };
          if (centerX !== undefined && centerY !== undefined) {
            tempObj.position = { x: centerX, y: centerY };
          }
          setTempAnimationObject(tempObj);
        } else if (type === 'SNAKE') {
          const tempObj: Omit<AnimationObject, 'id'> = {
            type,
            color,
            frames: frameIds,
            snakeLength,
            snakeSpeed,
            snakeCount,
            avoidCollisions,
            strictCollisions,
            layerId: tempAnimationLayerId || (selectedLayerId !== 'FOREGROUND' && selectedLayerId !== 'BACKGROUND' ? selectedLayerId : undefined),
            renderPosition: selectedLayerId === 'FOREGROUND'
              ? 'FOREGROUND'
              : selectedLayerId === 'BACKGROUND'
                ? 'BACKGROUND'
                : 'ON_LAYER',
            renderOnSection
          };
          setTempAnimationObject(tempObj);
        } else if (type === 'RECTANGLE') {
          const tempObj: Omit<AnimationObject, 'id'> = {
            type,
            color,
            frames: frameIds,
            rectangleSpeed,
            rectangleEasingFunction,
            rectangleStates,
            rectangleHasFill,
            rectangleCycleMode,
            layerId: tempAnimationLayerId || (selectedLayerId !== 'FOREGROUND' && selectedLayerId !== 'BACKGROUND' ? selectedLayerId : undefined),
            renderPosition: selectedLayerId === 'FOREGROUND'
              ? 'FOREGROUND'
              : selectedLayerId === 'BACKGROUND'
                ? 'BACKGROUND'
                : 'ON_LAYER',
            renderOnSection
          };
          setTempAnimationObject(tempObj);
        } else if (type === 'PATH') {
          const tempObj: Omit<AnimationObject, 'id'> = {
            type,
            color,
            frames: frameIds,
            pathPoints,
            pathSpeed,
            pathCycleMode,
            pathBlockSize,
            pathTrailLength,
            pathTrailFade,
            pathSharedPixelNumber,
            layerId: tempAnimationLayerId || (selectedLayerId !== 'FOREGROUND' && selectedLayerId !== 'BACKGROUND' ? selectedLayerId : undefined),
            renderPosition: selectedLayerId === 'FOREGROUND'
              ? 'FOREGROUND'
              : selectedLayerId === 'BACKGROUND'
                ? 'BACKGROUND'
                : 'ON_LAYER',
            renderOnSection
          };
          setTempAnimationObject(tempObj);
        } else if (type === 'COUNTDOWN') {
          const tempObj: Omit<AnimationObject, 'id'> = {
            type,
            color,
            frames: frameIds,
            countdownSize,
            countdownSpeed,
            countdownFadeOption,
            countdownBounds, // Add bounds to temp object
            countdownHoldDuration: countdownFadeOption === 'digitalDripCycle' ? countdownHoldDuration : undefined, // Add hold duration conditionally
            // Add sparkle properties for new
            countdownEnableSparkleEffect,
            countdownSparkleColor,
            countdownMaxSparklesPerFrame,
            countdownSparkleLifetime,
            // Add gradient pulse properties for new
            countdownEnableGradientPulse,
            countdownGradientColorStart,
            countdownGradientColorEnd,
            countdownGradientPulseSpeed,
            // Add static vertical gradient properties for new
            countdownEnableStaticVerticalGradient,
            countdownStaticGradientColorTop,
            countdownStaticGradientColorBottom,
            // Add loading bar properties for new
            countdownEnableLoadingBar,
            countdownLoadingBarColors: [countdownLoadingBarColor1, countdownLoadingBarColor2, countdownLoadingBarColor3],
            countdownLoadingBarSpeedFactor,
            // Add safe zone properties for new
            countdownEnableSafeZone,
            countdownSafeZoneIntroAnimation,
            countdownSafeZonePulse,
            // countdownSafeZonePixels is not editable here, will be taken from defaults or existing
            // Note: countdownLoadingBarArea is not included here as it's auto-calculated by the store
            layerId: tempAnimationLayerId || (selectedLayerId !== 'FOREGROUND' && selectedLayerId !== 'BACKGROUND' ? selectedLayerId : undefined),
            renderPosition: selectedLayerId === 'FOREGROUND'
              ? 'FOREGROUND'
              : selectedLayerId === 'BACKGROUND'
                ? 'BACKGROUND'
                : 'ON_LAYER',
            renderOnSection
          };
          setTempAnimationObject(tempObj);
        }
      }
    } else {
      // Panel is closed: Clear the temporary animation
      setTempAnimationObject(null);
      setIsDrawingCountdownBounds(false); // Ensure drawing mode is reset
    }
  }, [
    showAnimationConfig,
    currentAnimation,
    type,
    color,
    frames,
    direction,
    orientation,
    lineSpeed,
    borderBehavior,
    rotationSpeed,
    centerX,
    centerY,
    stretchToEdges,
    setTempAnimationObject,
    selectedLayerId,
    thickness,
    snakeLength,
    snakeSpeed,
    snakeCount,
    avoidCollisions,
    strictCollisions,
    rectangleSpeed,
    rectangleEasingFunction,
    rectangleStates,
    rectangleHasFill,
    rectangleCycleMode,
    pathPoints,
    pathSpeed,
    pathCycleMode,
    pathBlockSize,
    pathTrailLength,
    pathTrailFade,
    pathSharedPixelNumber,
    renderOnSection,
    countdownSize,
    countdownSpeed,
    countdownFadeOption,
    countdownBounds, // Add countdownBounds to dependency array
    countdownHoldDuration, // Add countdownHoldDuration to dependency array
    // Add sparkle dependencies
    countdownEnableSparkleEffect,
    countdownSparkleColor,
    countdownMaxSparklesPerFrame,
    countdownSparkleLifetime,
    // Add gradient pulse dependencies
    countdownEnableGradientPulse,
    countdownGradientColorStart,
    countdownGradientColorEnd,
    countdownGradientPulseSpeed,
    // Add static vertical gradient dependencies
    countdownEnableStaticVerticalGradient,
    countdownStaticGradientColorTop,
    countdownStaticGradientColorBottom,
    tempAnimationLayerId,
    isDefiningSafeZonePixels, // Added
    tempSafeZonePixels, // Added
    currentConfigSafeZonePixels // Added
  ]);

  // Handler for saving the animation (add or update)
  const handleSaveAnimation = () => {
    const frameIds = frames.map(frame => frame.id);
    const layerToUse = selectedLayerId !== 'FOREGROUND' && selectedLayerId !== 'BACKGROUND' ? selectedLayerId : undefined;
    const renderPos = selectedLayerId === 'FOREGROUND' ? 'FOREGROUND' : selectedLayerId === 'BACKGROUND' ? 'BACKGROUND' : 'ON_LAYER';

    let animObjectData: Omit<AnimationObject, 'id'>;

    switch (type) {
      case 'LINE':
        animObjectData = { type, color, frames: frameIds, direction, orientation, speed: lineSpeed, borderBehavior, layerId: layerToUse, renderPosition: renderPos, renderOnSection };
        break;
      case 'X':
        animObjectData = { type, color, frames: frameIds, rotationSpeed, stretchToEdges, thickness, position: (centerX !== undefined && centerY !== undefined) ? { x: centerX, y: centerY } : undefined, layerId: layerToUse, renderPosition: renderPos, renderOnSection };
        break;
      case 'SNAKE':
        animObjectData = { type, color, frames: frameIds, snakeLength, snakeSpeed, snakeCount, avoidCollisions, strictCollisions, layerId: layerToUse, renderPosition: renderPos, renderOnSection /* snakeCurrentDirection? */ };
        break;
      case 'RECTANGLE':
        animObjectData = { type, color, frames: frameIds, rectangleSpeed, rectangleEasingFunction, rectangleStates, rectangleHasFill, rectangleCycleMode, layerId: layerToUse, renderPosition: renderPos, renderOnSection };
        break;
      case 'PATH':
        animObjectData = { type, color, frames: frameIds, pathPoints, pathSpeed, pathCycleMode, pathBlockSize, pathTrailLength, pathTrailFade, pathSharedPixelNumber, layerId: layerToUse, renderPosition: renderPos, renderOnSection };
        break;
      case 'COUNTDOWN':
        // Bestimme, welche SafeZone-Pixel verwendet werden sollen
        // Wenn der Bearbeitungsmodus aktiv ist, verwende die temporären Pixel,
        // ansonsten verwende die bereits konfigurierten Pixel
        const safeZonePixelsToUse = isDefiningSafeZonePixels 
          ? tempSafeZonePixels 
          : currentConfigSafeZonePixels;

        animObjectData = {
          type,
          color,
          frames: frameIds,
          countdownSize,
          countdownSpeed,
          countdownFadeOption,
          countdownBounds,
          layerId: layerToUse,
          renderPosition: renderPos,
          renderOnSection,
          countdownHoldDuration: countdownFadeOption === 'digitalDripCycle' ? countdownHoldDuration : undefined,
          // Add sparkle properties to saved object
          countdownEnableSparkleEffect,
          countdownSparkleColor,
          countdownMaxSparklesPerFrame,
          countdownSparkleLifetime,
          // Add gradient pulse properties to saved object
          countdownEnableGradientPulse,
          countdownGradientColorStart,
          countdownGradientColorEnd,
          countdownGradientPulseSpeed,
          // Add static vertical gradient properties to saved object
          countdownEnableStaticVerticalGradient,
          countdownStaticGradientColorTop,
          countdownStaticGradientColorBottom,
          // Loading Bar properties
          countdownEnableLoadingBar,
          countdownLoadingBarColors: [countdownLoadingBarColor1, countdownLoadingBarColor2, countdownLoadingBarColor3],
          countdownLoadingBarSpeedFactor,
          // Safe Zone properties
          countdownEnableSafeZone,
          countdownSafeZonePixels: safeZonePixelsToUse,
          countdownSafeZoneIntroAnimation,
          countdownSafeZonePulse,
          countdownSafeZoneSpeed,
          countdownSafeZonePauseDuration,
          // Black Background properties
          countdownEnableBlackBackground,
          countdownBlackBackgroundColor,
          countdownDisintegrationDuration,
          countdownDisintegrationParticleSize,
          countdownDisintegrationParticleCount,
          countdownTransitionEffect,
        };
        break;
      default:
        console.error("Invalid animation type");
        return;
    }

    if (currentAnimation) {
      // Update existing animation
      updateAnimationObject(currentAnimation.id, animObjectData);
    } else {
      // Add new animation
      addAnimationObject(animObjectData);
    }
    closeAnimationConfig(); // Close panel after saving
  };

  // Close animation config and cleanup
  const closeAnimationConfig = () => {
    setShowAnimationConfig(false);
    setCurrentAnimation(null);
    setTempAnimationObject(null);
    setIsControllingCenter(false);
    setIsDrawingCountdownBounds(false); // Reset drawing mode on close
    
    // Clean up the temporary animation layer if cancelling
    if (!currentAnimation) {
      removeTempAnimationLayer();
    }
  };

  const handleOpenConfig = (animation?: AnimationObject) => {
    openAnimationConfig(animation);
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

  // Reset custom position
  const handleResetPosition = () => {
    setCenterX(undefined);
    setCenterY(undefined);
    setIsControllingCenter(false);
    
    // If editing an X animation, update it immediately to reset position
    if (currentAnimation && currentAnimation.type === 'X') {
      updateAnimationObject(currentAnimation.id, {
        position: undefined
      });
    } else if (!currentAnimation && type === 'X') {
      // If creating a new animation, update the temp preview
      updateTempAnimationObject({
        position: undefined
      });
    }
  };
  
  // Toggle center point control
  const toggleCenterControl = () => {
    if (!isControllingCenter) {
      // Wenn der Center-Control aktiviert wird, initialisiere den Mittelpunkt korrekt
      // Der Mittelpunkt soll relativ zum aktuellen Viewport sein und dessen Position berücksichtigen
      
      if (centerX === undefined || centerY === undefined) {
        // Berechne die Mitte des aktuellen Viewports als absolute Koordinaten
        const viewportCenterX = canvasSize.viewportX + Math.floor(canvasSize.width / 2);
        const viewportCenterY = canvasSize.viewportY + Math.floor(canvasSize.height / 2);
        
        console.log('Initialisiere X-Mittelpunkt auf Viewport-Mitte:', viewportCenterX, viewportCenterY);
        console.log('Viewport:', canvasSize.viewportX, canvasSize.viewportY, canvasSize.width, canvasSize.height);
        
        setCenterX(viewportCenterX);
        setCenterY(viewportCenterY);
        
        // Aktualisiere die Animation direkt, damit sie auf dem richtigen Punkt erscheint
        const newPosition = { x: viewportCenterX, y: viewportCenterY };
        
        if (currentAnimation && currentAnimation.type === 'X') {
          updateAnimationObject(currentAnimation.id, { position: newPosition });
        } else if (!currentAnimation && type === 'X') {
          updateTempAnimationObject({ position: newPosition });
        }
      }
    }
    
    setIsControllingCenter(!isControllingCenter);
    
    // Focus on the config panel to ensure it receives keyboard events
    if (configPanelRef.current) {
      configPanelRef.current.focus();
    }
  };

  const getCurrentCenterPoint = () => {
    if (!isControllingCenter) return undefined;
    
    // When controlling center, use the current form values
    const x = centerX !== undefined ? centerX : Math.floor(canvasSize.width / 2);
    const y = centerY !== undefined ? centerY : Math.floor(canvasSize.height / 2);
    
    return { x, y };
  };

  // Create a temp animation object for live preview
  const setupTempAnimationObject = (resetPosition = true) => {
    const frameIds = frames.map(frame => frame.id);
    
    // Clear any existing temp animation to avoid flicker
    setTempAnimationObject(null);
    
    // For rendering purposes, we need different defaults based on type
    if (type === 'LINE') {
      // Default values for LINE
      const tempObject: Omit<AnimationObject, 'id'> = {
        type,
        color,
        frames: frameIds,
        direction: direction || 'RIGHT',
        orientation: orientation || 'HORIZONTAL',
        speed: lineSpeed || 1,
        borderBehavior: borderBehavior || 'WRAP',
        layerId: tempAnimationLayerId || (selectedLayerId !== 'FOREGROUND' && selectedLayerId !== 'BACKGROUND' ? selectedLayerId : undefined),
        renderPosition: selectedLayerId === 'FOREGROUND' 
          ? 'FOREGROUND' 
          : selectedLayerId === 'BACKGROUND'
            ? 'BACKGROUND'
            : 'ON_LAYER'
      };
      
      setTempAnimationObject(tempObject);
    } else if (type === 'X') {
      // Default values for X
      const tempObject: Omit<AnimationObject, 'id'> = {
        type,
        color,
        frames: frameIds,
        rotationSpeed,
        stretchToEdges,
        thickness,
        layerId: tempAnimationLayerId || (selectedLayerId !== 'FOREGROUND' && selectedLayerId !== 'BACKGROUND' ? selectedLayerId : undefined),
        renderPosition: selectedLayerId === 'FOREGROUND' 
          ? 'FOREGROUND' 
          : selectedLayerId === 'BACKGROUND'
            ? 'BACKGROUND'
            : 'ON_LAYER',
      };
      
      // Only include position if it's set
      if (!resetPosition && centerX !== undefined && centerY !== undefined) {
        tempObject.position = { x: centerX, y: centerY };
      }
      
      setTempAnimationObject(tempObject);
    } else if (type === 'SNAKE') {
      // Default values for SNAKE
      const tempObject: Omit<AnimationObject, 'id'> = {
        type,
        color,
        frames: frameIds,
        snakeLength,
        snakeSpeed,
        snakeCount,
        avoidCollisions,
        strictCollisions,
        layerId: tempAnimationLayerId || (selectedLayerId !== 'FOREGROUND' && selectedLayerId !== 'BACKGROUND' ? selectedLayerId : undefined),
        renderPosition: selectedLayerId === 'FOREGROUND' 
          ? 'FOREGROUND' 
          : selectedLayerId === 'BACKGROUND'
            ? 'BACKGROUND'
            : 'ON_LAYER'
      };
      
      setTempAnimationObject(tempObject);
    } else if (type === 'RECTANGLE') {
      // Default values for RECTANGLE
      const tempObject: Omit<AnimationObject, 'id'> = {
        type,
        color,
        frames: frameIds,
        rectangleSpeed,
        rectangleEasingFunction,
        rectangleStates,
        rectangleHasFill,
        rectangleCycleMode,
        layerId: tempAnimationLayerId || (selectedLayerId !== 'FOREGROUND' && selectedLayerId !== 'BACKGROUND' ? selectedLayerId : undefined),
        renderPosition: selectedLayerId === 'FOREGROUND' 
          ? 'FOREGROUND' 
          : selectedLayerId === 'BACKGROUND'
            ? 'BACKGROUND'
            : 'ON_LAYER'
      };
      
      setTempAnimationObject(tempObject);
    } else if (type === 'PATH') {
      // Default values for PATH
      const tempObject: Omit<AnimationObject, 'id'> = {
        type,
        color,
        frames: frameIds,
        pathPoints,
        pathSpeed,
        pathCycleMode,
        pathBlockSize,
        pathTrailLength,
        pathTrailFade,
        pathSharedPixelNumber,
        layerId: tempAnimationLayerId || (selectedLayerId !== 'FOREGROUND' && selectedLayerId !== 'BACKGROUND' ? selectedLayerId : undefined),
        renderPosition: selectedLayerId === 'FOREGROUND' 
          ? 'FOREGROUND' 
          : selectedLayerId === 'BACKGROUND'
            ? 'BACKGROUND'
            : 'ON_LAYER'
      };
      
      setTempAnimationObject(tempObject);
    }
  };

  // Handle type change in the animation configuration
  const handleTypeChange = (newType: AnimationType) => {
    setType(newType);
    // Reset specific fields when type changes to avoid carrying over incompatible settings
    // (e.g., reset X position when switching away from X)
    if (newType !== 'X') {
        setIsControllingCenter(false);
        // Don't reset centerX/Y here, let the useEffect handle preview update
    }
    if (newType !== 'RECTANGLE') {
        setDrawingMode(null);
        setIsDrawingRectangle(false);
        setDrawingStateIndex(null);
    }
    if (newType !== 'PATH') {
        setPathPoints([{ x: 5, y: 5 }, { x: 20, y: 20 }]);
        setPathSpeed(5);
        setPathCycleMode('LOOP');
        setPathBlockSize(1);
        setPathTrailLength(0);
        setPathTrailFade(true);
        setPathSharedPixelNumber(true);
    }
    if (newType === 'COUNTDOWN') {
        // Set new countdown defaults when switching to COUNTDOWN type
        setColor('#f5d60a'); // Neue Standardfarbe
        setCountdownSize(20);
        setCountdownSpeed(1000);
        setCountdownFadeOption('digitalDripCycle');
        setCountdownBounds(undefined);
        setCountdownHoldDuration(2000);
        setCountdownEnableStaticVerticalGradient(true);
        setCountdownStaticGradientColorTop('#ffd500');
        setCountdownStaticGradientColorBottom('#ffa200');
        setCountdownEnableLoadingBar(true);
        setCountdownLoadingBarColor1('#ff4d00');
        setCountdownLoadingBarColor2('#ff9500');
        setCountdownLoadingBarColor3('#fff700');
        setCountdownLoadingBarSpeedFactor(2.0);
        setCountdownEnableSafeZone(true);
        setCountdownSafeZoneIntroAnimation('centerOut');
        setCountdownSafeZonePulse(true);
        setCountdownEnableBlackBackground(true);
        setCountdownTransitionEffect('matrix');
        setCountdownMatrixColor('#FFA500');
    }
    // The useEffect hook will handle updating the tempAnimationObject preview
  };

  const onDeleteRectangleState = (index: number) => {
    // Prüfe, ob nach dem Löschen noch mindestens 2 States übrig bleiben
    if (rectangleStates.length <= 2) {
      alert("Es müssen mindestens 2 States vorhanden sein.");
      return;
    }
    
    // State löschen
    setRectangleStates(prevStates => prevStates.filter((_, i) => i !== index));
    
    // Wenn wir gerade den State bearbeiten, der gelöscht wird, setzen wir den Zeichnungsmodus zurück
    if (drawingStateIndex !== null && drawingStateIndex === index) {
        setIsDrawingRectangle(false);
        setDrawingMode(null);
        setDrawingStateIndex(null);
    } 
    // Falls wir einen State mit höherem Index bearbeiten, müssen wir den Index anpassen
    else if (drawingStateIndex !== null && drawingStateIndex > index) {
      setDrawingStateIndex(drawingStateIndex - 1);
    }
  };

  // Speicher für vorherigen Viewport im Viewport-Modus
  const [previousViewport, setPreviousViewport] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  
  // State für Viewport-Modus
  const [isViewportMode, setIsViewportMode] = useState(false);
  
  // Flag für die initiale Anzeige im Viewport-Modus
  const [isInitialViewportView, setIsInitialViewportView] = useState(false);
  
  // Neuer State für gespeicherte Viewport-Einstellungen
  const [savedViewportSettings, setSavedViewportSettings] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

  // Effect, der auf Tool-Änderungen reagiert
  useEffect(() => {
    // Wenn das Tool auf VIEWPORT gesetzt wird
    if (currentTool === 'VIEWPORT') {
      // Zeige den aktuell verwendeten Viewport als Auswahlrechteck an, anstatt immer den gesamten Canvas
      // Wir speichern trotzdem den aktuellen Zustand für Abbruch/Zurück
      if (!previousViewport) {
        setPreviousViewport({
          x: canvasSize.viewportX,
          y: canvasSize.viewportY,
          width: canvasSize.width,
          height: canvasSize.height
        });
      }
      
      // Viewport-Modus aktivieren, aber keine Änderungen an den Dimensionen vornehmen
      // Der aktuelle Viewport bleibt erhalten und wird als Auswahlrechteck dargestellt
      setIsViewportMode(true);
      setIsInitialViewportView(false); // Wichtig: Initial View deaktivieren, da wir den aktuellen Viewport beibehalten wollen
    } else {
      // Nur den Modus wechseln, aber nicht den Viewport zurücksetzen
      setIsViewportMode(false);
      setIsInitialViewportView(false);
    }
  }, [currentTool, canvasSize.originalWidth, canvasSize.originalHeight]);
  
  // Neuer Effect: Wenn wir gespeicherte Viewport-Einstellungen haben und NICHT im Viewport-Modus sind,
  // wenden wir sie an
  useEffect(() => {
    if (savedViewportSettings && currentTool !== 'VIEWPORT') {
      console.log('Applying saved viewport settings from state:', savedViewportSettings);
      // Verzögertes Anwenden, um sicherzustellen, dass andere State-Änderungen abgeschlossen sind
      setTimeout(() => {
        setViewport(
          savedViewportSettings.x,
          savedViewportSettings.y,
          savedViewportSettings.width,
          savedViewportSettings.height
        );
      }, 100);
      // Einstellungen zurücksetzen, damit sie nicht erneut angewendet werden
      setSavedViewportSettings(null);
    }
  }, [savedViewportSettings, currentTool]);
  
  // Effect für die Wiederherstellung des vorherigen Viewports nach dem initialen Anzeigen
  useEffect(() => {
    if (isInitialViewportView && previousViewport) {
      // Ursprünglichen Viewport als Auswahl wiederherstellen
      setViewport(
        previousViewport.x,
        previousViewport.y,
        previousViewport.width,
        previousViewport.height
      );
      setIsInitialViewportView(false);
    }
  }, [isInitialViewportView, previousViewport]);
  
  // Variablen für benutzerdefinierte Größen
  const [customWidth, setCustomWidth] = useState("16");
  const [customHeight, setCustomHeight] = useState("16");

  // Funktion, um ein Preset für die Canvas-Größe anzuwenden
  const applyCanvasSizePreset = (width: number, height: number) => {
    // Berechne die zentrierte Position für den Viewport
    const centerX = Math.floor((canvasSize.originalWidth - width) / 2);
    const centerY = Math.floor((canvasSize.originalHeight - height) / 2);
    
    // Setze den Viewport mit der neuen Größe und Position
    setViewport(centerX, centerY, width, height);
  };
  
  // Funktion, um den Viewport zurückzusetzen (auf zentrierten 16x16 Ausschnitt)
  const handleResetViewport = () => {
    resetViewport();
  };
  
  // Toolbar mit Preset-Optionen für Viewport-Tool anzeigen
  const renderViewportToolOptions = () => {
    if (currentTool !== 'VIEWPORT') return null;
    
    return (
      <div className="viewport-presets-overlay">
        <div className="viewport-presets">
          <h4>Gesamte Konfiguration <small>(Viewport, SubRects, Blockpixel)</small>:</h4>
          <div className="preset-list full-preset-list">
            {viewportPresets.length === 0 ? (
              <p>Noch keine Presets gespeichert.</p>
            ) : (
              <div> 
                {viewportPresets.map((preset) => (
                  <ViewportPresetTile 
                    key={preset.id} 
                    preset={preset} 
                    onApply={applyViewportPreset} 
                    onDelete={removeViewportPreset} 
                  />
                ))}
              </div>
            )}
          </div>
          <hr /> 
          <h4>Viewport-Presets:</h4>
          <div className="custom-size-input">
            <div className="input-group">
              <label htmlFor="custom-width">Breite:</label>
              <input 
                id="custom-width"
                type="number" 
                min="1" 
                max={canvasSize.originalWidth}
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="custom-height">Höhe:</label>
              <input 
                id="custom-height"
                type="number" 
                min="1" 
                max={canvasSize.originalHeight}
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
              />
            </div>
            <button 
              onClick={() => applyCanvasSizePreset(parseInt(customWidth), parseInt(customHeight))}
              className="apply-custom-size"
            >
              Anwenden
            </button>
          </div>
          
          <div className="viewport-actions">
            <button onClick={handleResetViewport} className="reset-button">
              Reset (16x16)
            </button>
            <button 
              onClick={toggleViewportMode}
              className="apply-viewport-button"
            >
              Viewport anwenden
            </button>
            <p className="viewport-help">
              Ziehen Sie an den Ecken und Kanten, um den Viewport anzupassen.
              Ziehen Sie im Inneren, um ihn zu verschieben.
            </p>
            <div className="viewport-info">
              Aktuelle Größe: {canvasSize.width}x{canvasSize.height}
            </div>
            {/* Sub-Rectangle Controls */}
            <div className="sub-rectangle-controls">
              <h4>Sub-Rectangles</h4>
              <button
                onClick={toggleSubRectangleDrawing}
                className={isDrawingSubRectangle ? 'active' : ''}
              >
                {isDrawingSubRectangle ? 'Zeichnen beenden' : 'Unter-Rechteck zeichnen'}
              </button>
              <div className="sub-rectangle-list">
                {subRectangles.length > 0 ? (
                  <ul>
                    {subRectangles.map((rect) => (
                      <li key={rect.id}>
                        <input 
                          type="text"
                          value={rect.name}
                          onChange={(e) => updateSubRectangleName(rect.id, e.target.value)}
                          placeholder="Name..."
                        />
                        <span className="rect-coords">({rect.x},{rect.y} {rect.width}x{rect.height})</span>
                        <button onClick={() => deleteSubRectangle(rect.id)} className="delete-button">X</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Noch keine Sub-Rectangles definiert.</p>
                )}
              </div>
            </div>

            {/* Block-Pixel-Controls */}
            <div className="block-pixel-controls">
              <h4>Block Pixels</h4>
              <div className="block-pixel-actions">
                <button 
                  onClick={() => setBlockPixelModeActive(!blockPixelModeActive)}
                  className={blockPixelModeActive ? 'active' : ''}
                >
                  {blockPixelModeActive ? 'Exit Block Mode' : 'Enter Block Mode'}
                </button>
                <button onClick={() => clearBlockedPixels()}>Clear All Blocks</button>
              </div>
              <div className="block-pixel-info">Blocked: {blockedPixels instanceof Set ? blockedPixels.size : Array.isArray(blockedPixels) ? blockedPixels.length : 0}</div>
            </div>
          </div>
          <div className="original-canvas-settings">
            <h4>Original Canvas einrichten</h4>
            <div className="form-group">
              <label htmlFor="original-width">Breite:</label>
              <input 
                id="original-width"
                type="number" 
                min="16" 
                max="128"
                value={canvasSize.originalWidth}
                onChange={(e) => {
                  const newWidth = parseInt(e.target.value);
                  if (newWidth >= 16 && newWidth <= 128) {
                    setCanvasSize(canvasSize.width, canvasSize.height, newWidth, canvasSize.originalHeight);
                  }
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="original-height">Höhe:</label>
              <input 
                id="original-height"
                type="number" 
                min="16" 
                max="128"
                value={canvasSize.originalHeight}
                onChange={(e) => {
                  const newHeight = parseInt(e.target.value);
                  if (newHeight >= 16 && newHeight <= 128) {
                    setCanvasSize(canvasSize.width, canvasSize.height, canvasSize.originalWidth, newHeight);
                  }
                }}
              />
            </div>
          </div>
          {/* --- Full Viewport Preset Management (integriert) --- */}
          <hr /> 
          <h4>Gesamte Konfiguration <small>(Viewport, SubRects, Blockpixel)</small>:</h4>

          {/* Add New Preset */}
          <div className="preset-add">
            <input
              type="text"
              placeholder="Preset-Name speichern"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="input-field"
            />
            <button onClick={handleSavePreset} title="Speichert die aktuelle Viewport-Konfiguration">
              Speichern
            </button>
          </div>

          {/* List Saved Presets (TODO: Replace with tiles) */}
          <div className="preset-list full-preset-list">
            <h5>Gespeicherte Konfigurationen:</h5>
            {viewportPresets.length === 0 ? (
              <p>Noch keine Presets gespeichert.</p>
            ) : (
              <div> 
                {viewportPresets.map((preset) => (
                  <ViewportPresetTile 
                    key={preset.id} 
                    preset={preset} 
                    onApply={applyViewportPreset} 
                    onDelete={removeViewportPreset} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* Import/Export */}
          <div className="preset-io">
            <button onClick={handleExportPresets}>Exportieren</button>
            <button onClick={handleImportClick}>Importieren</button>
            {/* Hidden file input remains the same */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleFileChange}
              />
          </div>
          {/* --- End Full Viewport Preset Management --- */}
        </div>
      </div>
    );
  };

  // Function to toggle Viewport mode
  const toggleViewportMode = () => {
    // Beim Verlassen des Viewport-Modus automatisch den Block-Modus deaktivieren
    if (isViewportMode) {
      setBlockPixelModeActive(false);
    }
    setIsViewportMode(!isViewportMode);
    setCurrentTool(isViewportMode ? 'BRUSH' : 'VIEWPORT');
  };

  // Function to open the animation configuration panel
  const openAnimationConfig = (animation?: AnimationObject) => {
    console.log('Opening config for:', animation);
    if (animation) {
      // Editing existing animation
      setCurrentAnimation(animation);
      setType(animation.type);
      setColor(animation.color);
      // Set type-specific properties
      if (animation.type === 'LINE') {
        setDirection(animation.direction ?? 'RIGHT'); 
        setOrientation(animation.orientation ?? 'HORIZONTAL'); 
        setLineSpeed(animation.speed ?? 1); 
        setBorderBehavior(animation.borderBehavior ?? 'WRAP'); 
      } else if (animation.type === 'X') {
        setRotationSpeed(animation.rotationSpeed ?? 1); 
        setStretchToEdges(animation.stretchToEdges ?? false); 
        setThickness(animation.thickness ?? 1); 
        setCenterX(animation.position?.x);
        setCenterY(animation.position?.y);
        setIsControllingCenter(false); // Reset control state
      } else if (animation.type === 'SNAKE') {
        setSnakeLength(animation.snakeLength ?? 5); 
        setSnakeSpeed(animation.snakeSpeed ?? 1); 
        setSnakeCount(animation.snakeCount ?? 1); 
        setAvoidCollisions(animation.avoidCollisions ?? false); 
        setStrictCollisions(animation.strictCollisions ?? false); 
        // Assuming snakeCurrentDirection might be stored, otherwise use default
        // setDirection(animation.snakeCurrentDirection || 'RIGHT');
      } else if (animation.type === 'RECTANGLE') {
        setRectangleSpeed(animation.rectangleSpeed ?? 1); 
        setRectangleEasingFunction(animation.rectangleEasingFunction ?? 'LINEAR');
        setRectangleStates(animation.rectangleStates || []); 
        setRectangleHasFill(animation.rectangleHasFill ?? false); 
        setRectangleCycleMode(animation.rectangleCycleMode ?? 'LOOP');
        setDrawingMode(null); // Reset drawing mode
        setIsDrawingRectangle(false);
        setDrawingStateIndex(null);
      } else if (animation.type === 'PATH') {
        setPathPoints(animation.pathPoints || []); 
        setPathSpeed(animation.pathSpeed ?? 1); 
        setPathCycleMode(animation.pathCycleMode ?? 'LOOP');
        setPathBlockSize(animation.pathBlockSize ?? 1);
        setPathTrailLength(animation.pathTrailLength ?? 0);
        setPathTrailFade(animation.pathTrailFade ?? true);
        setPathSharedPixelNumber(animation.pathSharedPixelNumber ?? true);
        setRenderOnSection(animation.renderOnSection || 'both');
      } else if (animation.type === 'COUNTDOWN') {
        setCountdownSize(animation.countdownSize || 20);
        setCountdownSpeed(animation.countdownSpeed || 1000);
        setCountdownFadeOption(animation.countdownFadeOption || 'none');
        setCountdownBounds(animation.countdownBounds); // Also load bounds here
        if (animation.countdownFadeOption === 'digitalDripCycle') {
          setCountdownHoldDuration(animation.countdownHoldDuration ?? 500);
        } else {
          setCountdownHoldDuration(500);
        }
      }
    } else {
      // Adding new animation - reset fields to defaults
      setCurrentAnimation(null);
      setType('LINE'); // Default type
      setColor('#FF0000'); // Default color
      setDirection('RIGHT');
      setOrientation('HORIZONTAL');
      setLineSpeed(1);
      setBorderBehavior('WRAP');
      setRotationSpeed(1);
      setCenterX(undefined);
      setCenterY(undefined);
      setStretchToEdges(false);
      setThickness(1);
      setIsControllingCenter(false);
      setSnakeLength(5);
      setSnakeSpeed(1);
      setSnakeCount(1);
      setAvoidCollisions(false);
      setStrictCollisions(false);
      setRectangleSpeed(1);
      setRectangleEasingFunction('LINEAR');
      setRectangleStates([]);
      setRectangleHasFill(false);
      setRectangleCycleMode('LOOP');
      setDrawingMode(null);
      setIsDrawingRectangle(false);
      setDrawingStateIndex(null);
      setPathPoints([{ x: 5, y: 5 }, { x: 20, y: 20 }]);
      setPathSpeed(5);
      setPathCycleMode('LOOP');
      setPathBlockSize(1);
      setPathTrailLength(0);
      setPathTrailFade(true);
      setPathSharedPixelNumber(true);
      setRenderOnSection('both');
      // Countdown defaults with new settings
      setCountdownSize(20);
      setCountdownSpeed(1000); // Neue Standardgeschwindigkeit
      setCountdownFadeOption('digitalDripCycle'); // Standard-Fade-Effekt
      setCountdownBounds(undefined); // Reset bounds for new animation
      setCountdownHoldDuration(2000); // Neue Standard-Hold-Duration
      // Sparkle Effect defaults for new animations
      setCountdownEnableSparkleEffect(false);
      setCountdownSparkleColor('#FFFFFF');
      setCountdownMaxSparklesPerFrame(1);
      setCountdownSparkleLifetime(3);
      // Gradient Pulse defaults for new animations
      setCountdownEnableGradientPulse(false);
      setCountdownGradientColorStart('#f5d60a'); // Neue Standardfarbe
      setCountdownGradientColorEnd('#00FF00');
      setCountdownGradientPulseSpeed(2000);
      // Static Vertical Gradient defaults for new animations
      setCountdownEnableStaticVerticalGradient(true); // Standardmäßig aktiviert
      setCountdownStaticGradientColorTop('#ffd500'); // Neue Standardfarben
      setCountdownStaticGradientColorBottom('#ffa200'); // Neue Standardfarben
      // Loading Bar defaults for new animations
      setCountdownEnableLoadingBar(true);
      setCountdownLoadingBarColor1('#ff4d00');
      setCountdownLoadingBarColor2('#ff9500');
      setCountdownLoadingBarColor3('#fff700');
      setCountdownLoadingBarSpeedFactor(2.0);
      // Safe Zone defaults for new animations
      setCountdownEnableSafeZone(true); // Standardmäßig aktiviert
      setCountdownSafeZoneIntroAnimation('centerOut');
      setCountdownSafeZonePulse(true);
      setCountdownSafeZoneSpeed(1.0);
      setCountdownSafeZonePauseDuration(500);
      setCurrentConfigSafeZonePixels([]);
      // Black Background defaults for new animations
      setCountdownEnableBlackBackground(true); // Standardmäßig aktiviert
      setCountdownBlackBackgroundColor('#000000');
      setCountdownDisintegrationDuration(1000);
      setCountdownDisintegrationParticleSize(1);
      setCountdownDisintegrationParticleCount(30);
      setCountdownTransitionEffect('matrix'); // Matrix als Standard
      setCountdownMatrixColor('#FFA500'); // Orange als Standard
      setCountdownOffset({x: 0, y: 0});
      setIsCountdownPositionMode(false);
    }
    setShowAnimationConfig(true);
  };

  // Function to render the Animation Configuration Panel UI
  const renderAnimationConfigPanel = () => {
    if (!showAnimationConfig) return null;

    // Helper to get direction options based on orientation
    const getDirectionOptionsForLine = () => {
      if (orientation === 'HORIZONTAL') {
        return [{ value: 'LEFT', label: 'Left' }, { value: 'RIGHT', label: 'Right' }];
      } else { // VERTICAL
        return [{ value: 'UP', label: 'Up' }, { value: 'DOWN', label: 'Down' }];
      }
    };

    return (
      <div
        ref={configPanelRef}
        className="animation-config-panel config-panel scrollable-config-panel"
        onKeyDown={handleKeyDown}
        tabIndex={0} // Make div focusable
      >
        <h3>{currentAnimation ? 'Edit Animation' : 'Add Animation'}</h3>

        {/* Type Selection */}
        <div className="config-row">
          <label htmlFor="animationType">Type:</label>
          <select
            id="animationType"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as AnimationType)}
          >
            <option value="LINE">Line</option>
            <option value="X">X</option>
            <option value="SNAKE">Snake</option>
            <option value="RECTANGLE">Rectangle</option>
            <option value="PATH">Path</option>
            <option value="COUNTDOWN">Countdown</option>
          </select>
        </div>

        {/* Color Picker */}
        <div className="config-row">
          <label htmlFor="animationColor">Color:</label>
          <input
            type="color"
            id="animationColor"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>

        {/* Conditional Fields based on Type */}
        {type === 'LINE' && (
          <>
            <div className="config-row">
              <label htmlFor="lineOrientation">Orientation:</label>
              <select
                id="lineOrientation"
                value={orientation}
                onChange={(e) => {
                    const newOrientation = e.target.value as Orientation;
                    setOrientation(newOrientation);
                    // Reset direction based on new orientation
                    setDirection(newOrientation === 'HORIZONTAL' ? 'RIGHT' : 'UP');
                }}
              >
                <option value="HORIZONTAL">Horizontal</option>
                <option value="VERTICAL">Vertical</option>
              </select>
            </div>
            <div className="config-row">
              <label htmlFor="lineDirection">Direction:</label>
              <select
                id="lineDirection"
                value={direction}
                onChange={(e) => setDirection(e.target.value as Direction)}
              >
                {getDirectionOptionsForLine().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="config-row">
              <label htmlFor="lineSpeed">Speed:</label>
              <input
                type="number"
                id="lineSpeed"
                value={lineSpeed}
                onChange={(e) => setLineSpeed(parseInt(e.target.value, 10) || 1)}
                min="1"
                max="10"
                step="1"
              />
            </div>
            <div className="config-row">
              <label htmlFor="lineBorderBehavior">Border Behavior:</label>
              <select
                id="lineBorderBehavior"
                value={borderBehavior}
                onChange={(e) => setBorderBehavior(e.target.value as BorderBehavior)}
              >
                <option value="WRAP">Wrap</option>
                <option value="BOUNCE">Bounce</option>
              </select>
            </div>
          </>
        )}

        {type === 'X' && (
          <>
            <div className="config-row">
              <label htmlFor="xRotationSpeed">Rotation Speed:</label>
              <input
                type="number"
                id="xRotationSpeed"
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(parseInt(e.target.value, 10) || 1)}
                min="-10"
                max="10"
                step="1"
              />
            </div>
            <div className="config-row">
              <label htmlFor="xThickness">Thickness:</label>
              <input
                type="number"
                id="xThickness"
                value={thickness}
                onChange={(e) => setThickness(parseInt(e.target.value, 10) || 1)}
                min="1"
                max="20"
              />
            </div>
            <div className="config-row checkbox-row">
              <label htmlFor="xStretchToEdges">Stretch to Edges:</label>
              <input
                type="checkbox"
                id="xStretchToEdges"
                checked={stretchToEdges}
                onChange={(e) => setStretchToEdges(e.target.checked)}
              />
            </div>
            <div className="config-row center-control">
              <label>Center Position:</label>
              <span>{`X: ${centerX ?? 'N/A'}, Y: ${centerY ?? 'N/A'}`}</span>
              <button onClick={toggleCenterControl} className={`button-control-center ${isControllingCenter ? 'active' : ''}`}>
                {isControllingCenter ? 'Stop Controlling' : 'Set Center'}
              </button>
               {isControllingCenter && <span className="hint">(Use Arrow Keys)</span>}
            </div>
          </>
        )}
        {type === 'SNAKE' && (
          <>
            <div className="config-row">
              <label htmlFor="snakeLength">Length:</label>
              <input
                type="number"
                id="snakeLength"
                value={snakeLength}
                onChange={(e) => setSnakeLength(parseInt(e.target.value, 10) || 1)}
                min="1"
              />
            </div>
            <div className="config-row">
              <label htmlFor="snakeSpeed">Speed:</label>
              <input
                type="number"
                id="snakeSpeed"
                value={snakeSpeed}
                onChange={(e) => setSnakeSpeed(parseInt(e.target.value, 10) || 1)}
                min="1"
                max="10"
              />
            </div>
            <div className="config-row">
              <label htmlFor="snakeCount">Count:</label>
              <input
                type="number"
                id="snakeCount"
                value={snakeCount}
                onChange={(e) => setSnakeCount(parseInt(e.target.value, 10) || 1)}
                min="1"
                max="10"
              />
            </div>
            <div className="config-row checkbox-row">
              <label htmlFor="snakeAvoidCollisions">Avoid Collisions:</label>
              <input
                type="checkbox"
                id="snakeAvoidCollisions"
                checked={avoidCollisions}
                onChange={(e) => {
                  setAvoidCollisions(e.target.checked);
                  // Reset strict collisions if avoid collisions is turned off
                  if (!e.target.checked) {
                    setStrictCollisions(false);
                  }
                }}
              />
            </div>
            {/* Only show strict collisions if avoid collisions is enabled */}
            {avoidCollisions && (
              <div className="config-row checkbox-row indented">
                <label htmlFor="snakeStrictCollisions">Strict Collisions:</label>
                <input
                  type="checkbox"
                  id="snakeStrictCollisions"
                  checked={strictCollisions}
                  onChange={(e) => setStrictCollisions(e.target.checked)}
                />
              </div>
            )}
          </>
        )}
        {type === 'RECTANGLE' && (
          <>
            <div className="config-row">
              <label htmlFor="rectSpeed">Speed:</label>
              <input
                type="number"
                id="rectSpeed"
                value={rectangleSpeed}
                onChange={(e) => setRectangleSpeed(parseFloat(e.target.value) || 0.1)}
                min="0.1"
                max="5"
                step="0.1"
              />
              <small>0.1 = sehr langsam, 1.0 = normal, 5.0 = sehr schnell</small>
            </div>
            <div className="config-row">
              <label htmlFor="rectEasing">Easing Function:</label>
              <select
                id="rectEasing"
                value={rectangleEasingFunction}
                onChange={(e) => setRectangleEasingFunction(e.target.value as EasingFunction)}
              >
                <option value="LINEAR">Linear</option>
                <option value="EASE_IN">Ease In</option>
                <option value="EASE_OUT">Ease Out</option>
                <option value="EASE_IN_OUT">Ease In Out</option>
              </select>
            </div>
            <div className="config-row checkbox-row">
              <label htmlFor="rectHasFill">Has Fill:</label>
              <input
                type="checkbox"
                id="rectHasFill"
                checked={rectangleHasFill}
                onChange={(e) => setRectangleHasFill(e.target.checked)}
              />
            </div>
            <div className="config-row">
              <label htmlFor="rectCycleMode">Cycle Mode:</label>
              <select
                id="rectCycleMode"
                value={rectangleCycleMode}
                onChange={(e) => setRectangleCycleMode(e.target.value as RectangleCycleMode)}
              >
                <option value="LOOP">Loop</option>
                <option value="ONCE">Once</option>
                <option value="PING_PONG">Ping Pong</option>
                <option value="DIRECT_TO_START">Direct to Start</option>
                <option value="NO_CYCLE">No Cycle</option>
              </select>
            </div>

            {/* Rectangle States Management */}
            <div className="config-section rectangle-states-section">
              <h4>Rectangle States:</h4>
               <RectangleStatesList
                 states={rectangleStates}
                 onDeleteState={(index: number) => {
                    const updatedStates = rectangleStates.filter((_, i) => i !== index);
                    setRectangleStates(updatedStates);
                    // If deleting the state currently being edited, cancel drawing
                    if (drawingStateIndex === index) {
                        setIsDrawingRectangle(false);
                        setDrawingMode(null);
                        setDrawingStateIndex(null);
                    }
                 }}
                 onEditState={(index: number) => {
                   setDrawingMode('STATE'); // Use 'STATE' for editing
                   setIsDrawingRectangle(true); // Start drawing mode
                   setDrawingStateIndex(index); // Set index of state to edit
                 }}
                 onDuplicateState={(index: number) => {
                    const stateToDuplicate = rectangleStates[index];
                    if (stateToDuplicate) {
                      const duplicatedState = { ...stateToDuplicate }; // Simple shallow copy
                      const updatedStates = [
                        ...rectangleStates.slice(0, index + 1),
                        duplicatedState,
                        ...rectangleStates.slice(index + 1)
                      ];
                      setRectangleStates(updatedStates);
                    }
                 }}
                 onDelayChange={(index: number, delay: number) => {
                     const updatedStates = [...rectangleStates];
                     if(updatedStates[index]) {
                        updatedStates[index] = { ...updatedStates[index], delay: delay };
                        setRectangleStates(updatedStates);
                     }
                 }}
                 onStatesReordered={(newStates: RectangleState[]) => {
                    setRectangleStates(newStates); // Assume the component provides the full new array
                 }}
                 selectedStateIndex={drawingStateIndex} // Pass index being drawn/edited
              />
              <button
                onClick={() => {
                    setDrawingMode('STATE'); // Use 'STATE' for adding
                    setIsDrawingRectangle(true);
                    setDrawingStateIndex(null); // Ensure no index is set for adding
                }}
                disabled={isDrawingRectangle} // Disable if already drawing
                className="button-add-state"
              >
                 {/* Adjust button text logic */}
                 {isDrawingRectangle && drawingMode === 'STATE' && drawingStateIndex === null ? 'Drawing... (Click Canvas)' : 'Add New State'}
              </button>
              {isDrawingRectangle && (
                 <button
                    onClick={() => {
                        setIsDrawingRectangle(false);
                        setDrawingMode(null);
                        setDrawingStateIndex(null);
                    }}
                    className="button-cancel-draw"
                 >
                   Cancel Drawing
                 </button>
              )}
              {isDrawingRectangle && <span className="hint">(Click and drag on Canvas)</span>}
            </div>
          </>
        )}
        {type === 'PATH' && (
          <>
            <h3>Path Configuration</h3>
            <div className="config-row">
              <label>Path Points:</label>
              <div className="path-points-controls">
                <button 
                  onClick={() => setIsAddingPathPoint(!isAddingPathPoint)} 
                  className={isAddingPathPoint ? 'active' : ''}
                >
                  {isAddingPathPoint ? 'Finish Adding Points' : 'Add Points by Clicking'}
                </button>
                <button 
                  onClick={() => {
                    if (pathPoints.length > 0) {
                      const newPoints = [...pathPoints];
                      newPoints.pop();
                      setPathPoints(newPoints);
                    }
                  }}
                >
                  Remove Last Point
                </button>
                <button
                  onClick={() => {
                    const newPoints = [...pathPoints];
                    // Alle Punkte um einen Pixel nach rechts verschieben
                    newPoints.forEach(point => {
                      point.x += 1;
                    });
                    setPathPoints(newPoints);
                  }}
                >
                  Move All Right →
                </button>
                <button
                  onClick={() => {
                    const newPoints = [...pathPoints];
                    // Alle Punkte um einen Pixel nach links verschieben
                    newPoints.forEach(point => {
                      point.x -= 1;
                    });
                    setPathPoints(newPoints);
                  }}
                >
                  ← Move All Left
                </button>
                <button
                  onClick={() => {
                    const newPoints = [...pathPoints];
                    // Alle Punkte um einen Pixel nach oben verschieben
                    newPoints.forEach(point => {
                      point.y -= 1;
                    });
                    setPathPoints(newPoints);
                  }}
                >
                  ↑ Move All Up
                </button>
                <button
                  onClick={() => {
                    const newPoints = [...pathPoints];
                    // Alle Punkte um einen Pixel nach unten verschieben
                    newPoints.forEach(point => {
                      point.y += 1;
                    });
                    setPathPoints(newPoints);
                  }}
                >
                  Move All Down ↓
                </button>
              </div>
            </div>
            <div className="config-row">
              <label>Path Points:</label>
              <div className="path-points-list">
                {pathPoints.map((point, index) => (
                  <div key={index} className="path-point-item">
                    <div className="path-point-coordinates">
                      <label>X:</label>
                      <input 
                        type="number" 
                        value={point.x} 
                        onChange={(e) => {
                          const newPathPoints = [...pathPoints];
                          newPathPoints[index] = {
                            ...newPathPoints[index],
                            x: parseInt(e.target.value, 10) || 0
                          };
                          setPathPoints(newPathPoints);
                        }}
                        min="0"
                      />
                      <label>Y:</label>
                      <input 
                        type="number" 
                        value={point.y} 
                        onChange={(e) => {
                          const newPathPoints = [...pathPoints];
                          newPathPoints[index] = {
                            ...newPathPoints[index],
                            y: parseInt(e.target.value, 10) || 0
                          };
                          setPathPoints(newPathPoints);
                        }}
                        min="0"
                      />
                      <label>Pixelnr:</label>
                      <input 
                        type="number" 
                        value={point.pixelNumber || ''} 
                        onChange={(e) => {
                          const newPathPoints = [...pathPoints];
                          const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                          newPathPoints[index] = {
                            ...newPathPoints[index],
                            pixelNumber: value
                          };
                          setPathPoints(newPathPoints);
                        }}
                        min="0"
                      />
                    </div>
                    <button 
                      className="path-point-delete"
                      onClick={() => {
                        if (pathPoints.length > 2) {
                          const newPathPoints = [...pathPoints];
                          newPathPoints.splice(index, 1);
                          setPathPoints(newPathPoints);
                        } else {
                          alert("A path needs at least 2 points.");
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button 
                className="add-path-point"
                onClick={() => {
                  // Füge einen neuen Punkt hinzu
                  // Wenn möglich, setze Koordinaten basierend auf dem vorherigen Punkt
                  const lastPoint = pathPoints[pathPoints.length - 1];
                  const newPoint = {
                    x: lastPoint ? lastPoint.x + 5 : 10,
                    y: lastPoint ? lastPoint.y + 5 : 10
                  };
                  setPathPoints([...pathPoints, newPoint]);
                }}
              >
                Add Point
              </button>
              <button 
                className="add-path-point"
                onClick={() => {
                  setIsAddingPathPoint(true);
                }}
              >
                Add Point by Clicking
              </button>
            </div>
            <div className="config-row">
              <label htmlFor="pathSpeed">Speed:</label>
              <input
                type="number"
                id="pathSpeed"
                value={pathSpeed}
                onChange={(e) => setPathSpeed(parseInt(e.target.value, 10) || 1)}
                min="1"
                max="50"
              />
            </div>
            <div className="config-row">
              <label htmlFor="pathCycleMode">Cycle Mode:</label>
              <select
                id="pathCycleMode"
                value={pathCycleMode}
                onChange={(e) => setPathCycleMode(e.target.value as 'LOOP' | 'PING_PONG' | 'ONCE')}
              >
                <option value="LOOP">Loop</option>
                <option value="PING_PONG">Ping Pong</option>
                <option value="ONCE">Once</option>
              </select>
            </div>
            <div className="config-row">
              <label htmlFor="pathBlockSize">Block Size:</label>
              <input
                type="number"
                id="pathBlockSize"
                value={pathBlockSize}
                onChange={(e) => setPathBlockSize(parseInt(e.target.value, 10) || 1)}
                min="1"
                max="10"
              />
            </div>
            <div className="config-row">
              <label htmlFor="pathTrailLength">Trail Length:</label>
              <input
                type="number"
                id="pathTrailLength"
                value={pathTrailLength}
                onChange={(e) => setPathTrailLength(parseInt(e.target.value, 10) || 0)}
                min="0"
              />
            </div>
            <div className="config-row checkbox-row">
              <label htmlFor="pathTrailFade">Trail Fade:</label>
              <input
                type="checkbox"
                id="pathTrailFade"
                checked={pathTrailFade}
                onChange={(e) => setPathTrailFade(e.target.checked)}
              />
            </div>
            <div className="config-row checkbox-row">
              <label htmlFor="pathSharedPixelNumber">Shared Pixel Number:</label>
              <input
                type="checkbox"
                id="pathSharedPixelNumber"
                checked={pathSharedPixelNumber}
                onChange={(e) => setPathSharedPixelNumber(e.target.checked)}
              />
            </div>
          </>
        )}

        {type === 'COUNTDOWN' && (
          <>
            <div className="config-row">
              <label htmlFor="countdownSize">Size:</label>
              <input
                type="number"
                id="countdownSize"
                value={countdownSize}
                onChange={(e) => setCountdownSize(parseInt(e.target.value, 10) || 1)}
                min="1"
              />
            </div>
            <div className="config-row">
              <button onClick={handleSetCountdownArea} className="button-set-area">
                {isDrawingCountdownBounds ? 'Drawing Area...' : 'Set Countdown Area'}
              </button>
              {countdownBounds && (
                <span className="bounds-display">
                  Area: X:{countdownBounds.x}, Y:{countdownBounds.y}, W:{countdownBounds.width}, H:{countdownBounds.height}
                </span>
              )}
            </div>
            <div className="config-row">
              <label htmlFor="countdownSpeed">Speed (ms per step):</label>
              <input
                type="number"
                id="countdownSpeed"
                value={countdownSpeed}
                onChange={(e) => setCountdownSpeed(parseInt(e.target.value, 10) || 100)}
                min="100"
                step="100"
              />
            </div>
            <div className="config-row">
              <label htmlFor="countdownFadeOption">Fade Option:</label>
              <select
                id="countdownFadeOption"
                value={countdownFadeOption}
                onChange={(e) => setCountdownFadeOption(e.target.value as FadeOption)}
              >
                <option value="none">None</option>
                <option value="fadeInFromBottom">Fade In From Bottom</option>
                <option value="fadeInFromTop">Fade In From Top</option>
                <option value="fadeOutToLeft">Fade Out To Left</option>
                <option value="fadeOutToRight">Fade Out To Right</option>
                <option value="digitalDripIn">Digital Drip In</option>
                <option value="digitalDripOut">Digital Drip Out</option>
                <option value="digitalDripCycle">Digital Drip Cycle</option>
              </select>
            </div>
            {countdownFadeOption === 'digitalDripCycle' && (
              <div className="config-row">
                <label htmlFor="countdownHoldDuration">Hold Duration (ms):</label>
                <input
                  type="number"
                  id="countdownHoldDuration"
                  value={countdownHoldDuration}
                  onChange={(e) => setCountdownHoldDuration(parseInt(e.target.value, 10) || 0)}
                  min="0"
                  step="50"
                />
              </div>
            )}
            {/* Main Color is handled by the general color picker */}
            {/* Sparkle Effect Configuration for Countdown */}
            <div className="config-section-divider">Sparkle Effect</div>
            <div className="config-row">
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
                    <div className="config-row">
                        <label>Sparkle Color</label>
                        <div className="color-input-inline">
                            <input
                                type="color"
                                value={countdownSparkleColor}
                                onChange={(e) => setCountdownSparkleColor(e.target.value)}
                            />
                            <input
                                type="text"
                                value={countdownSparkleColor}
                                onChange={(e) => setCountdownSparkleColor(e.target.value)}
                                style={{ marginLeft: '8px', width: '80px' }}
                            />
                        </div>
                    </div>
                    <div className="config-row">
                        <label>Max Sparkles/Frame: {countdownMaxSparklesPerFrame}</label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={countdownMaxSparklesPerFrame}
                            onChange={(e) => setCountdownMaxSparklesPerFrame(Number(e.target.value))}
                        />
                    </div>
                    <div className="config-row">
                        <label>Sparkle Lifetime (frames): {countdownSparkleLifetime}</label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={countdownSparkleLifetime}
                            onChange={(e) => setCountdownSparkleLifetime(Number(e.target.value))}
                        />
                    </div>
                </>
            )}
            {/* Pulsating Gradient Configuration for Countdown */}
            <div className="config-section-divider">Pulsating Gradient (Hold Phase)</div>
            <div className="config-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={countdownEnableGradientPulse}
                  onChange={(e) => setCountdownEnableGradientPulse(e.target.checked)}
                />
                Enable Gradient Pulse
              </label>
            </div>
            {countdownEnableGradientPulse && (
              <>
                <div className="config-row">
                  <label>Gradient Start Color</label>
                  <div className="color-input-inline">
                    <input
                      type="color"
                      value={countdownGradientColorStart}
                      onChange={(e) => setCountdownGradientColorStart(e.target.value)}
                    />
                    <input
                      type="text"
                      value={countdownGradientColorStart}
                      onChange={(e) => setCountdownGradientColorStart(e.target.value)}
                      style={{ marginLeft: '8px', width: '80px' }}
                    />
                  </div>
                </div>
                <div className="config-row">
                  <label>Gradient End Color</label>
                  <div className="color-input-inline">
                    <input
                      type="color"
                      value={countdownGradientColorEnd}
                      onChange={(e) => setCountdownGradientColorEnd(e.target.value)}
                    />
                    <input
                      type="text"
                      value={countdownGradientColorEnd}
                      onChange={(e) => setCountdownGradientColorEnd(e.target.value)}
                      style={{ marginLeft: '8px', width: '80px' }}
                    />
                  </div>
                </div>
                <div className="config-row">
                  <label>Pulse Speed (ms/cycle): {countdownGradientPulseSpeed}</label>
                  <input
                    type="range"
                    min="500" // Min pulse speed
                    max="5000" // Max pulse speed
                    step="100"
                    value={countdownGradientPulseSpeed}
                    onChange={(e) => setCountdownGradientPulseSpeed(Number(e.target.value))}
                  />
                </div>
              </>
            )}
            {/* Static Vertical Gradient Configuration for Countdown */}
            <div className="config-section-divider">Static Vertical Gradient</div>
            <div className="config-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={countdownEnableStaticVerticalGradient}
                  onChange={(e) => setCountdownEnableStaticVerticalGradient(e.target.checked)}
                />
                Enable Static Vertical Gradient
              </label>
            </div>
            {countdownEnableStaticVerticalGradient && (
              <>
                <div className="config-row">
                  <label>Gradient Top Color</label>
                  <div className="color-input-inline">
                    <input
                      type="color"
                      value={countdownStaticGradientColorTop}
                      onChange={(e) => setCountdownStaticGradientColorTop(e.target.value)}
                    />
                    <input
                      type="text"
                      value={countdownStaticGradientColorTop}
                      onChange={(e) => setCountdownStaticGradientColorTop(e.target.value)}
                      style={{ marginLeft: '8px', width: '80px' }}
                    />
                  </div>
                </div>
                <div className="config-row">
                  <label>Gradient Bottom Color</label>
                  <div className="color-input-inline">
                    <input
                      type="color"
                      value={countdownStaticGradientColorBottom}
                      onChange={(e) => setCountdownStaticGradientColorBottom(e.target.value)}
                    />
                    <input
                      type="text"
                      value={countdownStaticGradientColorBottom}
                      onChange={(e) => setCountdownStaticGradientColorBottom(e.target.value)}
                      style={{ marginLeft: '8px', width: '80px' }}
                    />
                  </div>
                </div>
              </>
            )}
            {/* Loading Bar Effect Configuration */}
            <div className="config-section-divider">Loading Bar Effect</div>
            <div className="config-row">
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
                <div className="config-row">
                  <label>Bar Color (for digit 3)</label>
                  <div className="color-input-inline">
                    <input
                      type="color"
                      value={countdownLoadingBarColor1}
                      onChange={(e) => setCountdownLoadingBarColor1(e.target.value)}
                    />
                    <input
                      type="text"
                      value={countdownLoadingBarColor1}
                      onChange={(e) => setCountdownLoadingBarColor1(e.target.value)}
                      style={{ marginLeft: '8px', width: '80px' }}
                    />
                  </div>
                </div>
                <div className="config-row">
                  <label>Bar Color (for digit 2)</label>
                  <div className="color-input-inline">
                    <input
                      type="color"
                      value={countdownLoadingBarColor2}
                      onChange={(e) => setCountdownLoadingBarColor2(e.target.value)}
                    />
                    <input
                      type="text"
                      value={countdownLoadingBarColor2}
                      onChange={(e) => setCountdownLoadingBarColor2(e.target.value)}
                      style={{ marginLeft: '8px', width: '80px' }}
                    />
                  </div>
                </div>
                <div className="config-row">
                  <label>Bar Color (for digit 1)</label>
                  <div className="color-input-inline">
                    <input
                      type="color"
                      value={countdownLoadingBarColor3}
                      onChange={(e) => setCountdownLoadingBarColor3(e.target.value)}
                    />
                    <input
                      type="text"
                      value={countdownLoadingBarColor3}
                      onChange={(e) => setCountdownLoadingBarColor3(e.target.value)}
                      style={{ marginLeft: '8px', width: '80px' }}
                    />
                  </div>
                </div>
                <div className="config-row">
                  <label>Bar Speed Factor: {countdownLoadingBarSpeedFactor.toFixed(1)}</label>
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

            {/* Safe Zone Effect */}
            <div className="config-section-divider">Safe Zone Effect</div>
            <div className="config-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={countdownEnableSafeZone}
                  onChange={(e) => setCountdownEnableSafeZone(e.target.checked)}
                />
                Enable Safe Zone
              </label>
            </div>
            {countdownEnableSafeZone && (
              <>
                <div className="config-row">
                  <label>Intro Animation:</label>
                  <select
                    value={countdownSafeZoneIntroAnimation}
                    onChange={(e) => setCountdownSafeZoneIntroAnimation(e.target.value as 'centerOut' | 'none')}
                  >
                    <option value="centerOut">Center Out</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div className="config-row">
                  <label>Animation Speed: {countdownSafeZoneSpeed.toFixed(1)}x</label>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={countdownSafeZoneSpeed}
                    onChange={(e) => setCountdownSafeZoneSpeed(Number(e.target.value))}
                  />
                </div>
                <div className="config-row">
                  <label>Pause After (ms): {countdownSafeZonePauseDuration}</label>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="100"
                    value={countdownSafeZonePauseDuration}
                    onChange={(e) => setCountdownSafeZonePauseDuration(Number(e.target.value))}
                  />
                </div>
                <div className="config-row">
                  <button
                    onClick={() => {
                      if (currentAnimation && currentAnimation.id) {
                        // Erstelle ein aktualisiertes Animationsobjekt mit den neuen Parametern
                        const updatedAnimation = {
                          ...currentAnimation,
                          countdownSafeZoneSpeed,
                          countdownSafeZonePauseDuration,
                          // Achte darauf, dass diese Eigenschaften korrekt und explizit gesetzt werden
                          countdownTransitionEffect: countdownTransitionEffect || 'thanos',
                          countdownMatrixColor: countdownMatrixColor || '#00FF41',
                          countdownEnableBlackBackground,
                          countdownBlackBackgroundColor,
                          countdownDisintegrationDuration,
                          countdownDisintegrationParticleSize,
                          countdownDisintegrationParticleCount
                        };
                        
                        // Verwende updateAnimationObject aus dem Store, um die Animation zu aktualisieren
                        updateAnimationObject(currentAnimation.id, updatedAnimation);
                        
                        // Visuelles Feedback
                        const button = document.querySelector('.update-button') as HTMLButtonElement;
                        if (button) {
                          const originalText = button.textContent;
                          const originalBg = button.style.backgroundColor;
                          button.textContent = 'Angewendet!';
                          button.style.backgroundColor = '#4CAF50';
                          setTimeout(() => {
                            if (button) {
                              button.textContent = originalText;
                              button.style.backgroundColor = originalBg;
                            }
                          }, 1000);
                        }
                      }
                    }}
                    className="update-button"
                    style={{ 
                      padding: '8px', 
                      backgroundColor: '#4a90e2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginTop: '8px'
                    }}
                  >
                    Änderungen anwenden
                  </button>
                </div>
                <div className="config-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={countdownSafeZonePulse}
                      onChange={(e) => setCountdownSafeZonePulse(e.target.checked)}
                    />
                    Enable Pulsing
                  </label>
                </div>
                <div className="config-row">
                  <button
                    onClick={() => {
                      const newIsDefining = !isDefiningSafeZonePixels;
                      setIsDefiningSafeZonePixels(newIsDefining);
                      if (newIsDefining) {
                        // Deep copy, assuming x, y are numbers
                        const initialPixels = currentAnimation?.countdownSafeZonePixels
                          ? currentAnimation.countdownSafeZonePixels.map(p => ({ ...p }))
                          : [];
                        setTempSafeZonePixels(initialPixels);
                        // Also copy to currentConfigSafeZonePixels as per revised logic
                        setCurrentConfigSafeZonePixels(initialPixels);
                      } else {
                        // Mode is being turned OFF, copy temp to currentConfig
                        setCurrentConfigSafeZonePixels(tempSafeZonePixels.map(p => ({ ...p })));
                      }
                    }}
                  >
                    {isDefiningSafeZonePixels ? 'Editing Safe Zone...' : 'Define Safe Zone Pixels'}
                  </button>
                </div>
              </>
            )}

            {/* Black Background Configuration for Countdown */}
            <div className="config-section-divider">Black Background Effect</div>
            <div className="config-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={countdownEnableBlackBackground}
                  onChange={(e) => setCountdownEnableBlackBackground(e.target.checked)}
                />
                Enable Black Background
              </label>
            </div>
            {countdownEnableBlackBackground && (
              <>
                <div className="config-row">
                  <label>Background Color</label>
                  <div className="color-input-inline">
                    <input
                      type="color"
                      value={countdownBlackBackgroundColor}
                      onChange={(e) => setCountdownBlackBackgroundColor(e.target.value)}
                    />
                    <input
                      type="text"
                      value={countdownBlackBackgroundColor}
                      onChange={(e) => setCountdownBlackBackgroundColor(e.target.value)}
                      style={{ marginLeft: '8px', width: '80px' }}
                    />
                  </div>
                </div>
                <div className="config-row">
                  <label>Transition Effect</label>
                  <select
                    value={countdownTransitionEffect}
                    onChange={(e) => setCountdownTransitionEffect(e.target.value as 'thanos' | 'matrix' | 'spiral')}
                    style={{ padding: '6px', borderRadius: '4px', width: '100%' }}
                  >
                    <option value="thanos">Thanos Disintegration</option>
                    <option value="matrix">Matrix Code</option>
                    <option value="spiral">Rainbow Spiral</option>
                  </select>
                </div>
                {countdownTransitionEffect === 'matrix' && (
                  <div className="config-row">
                    <label>Matrix Color</label>
                    <input
                      type="color"
                      value={countdownMatrixColor}
                      onChange={(e) => setCountdownMatrixColor(e.target.value)}
                      style={{ width: '100%', height: '30px' }}
                    />
                  </div>
                )}
                <div className="config-row">
                  <label>Disintegration Duration (ms): {countdownDisintegrationDuration}</label>
                  <input
                    type="range"
                    min="500"
                    max="3000"
                    step="100"
                    value={countdownDisintegrationDuration}
                    onChange={(e) => setCountdownDisintegrationDuration(Number(e.target.value))}
                  />
                </div>
                <div className="config-row">
                  <label>Particle Size: {countdownDisintegrationParticleSize}</label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={countdownDisintegrationParticleSize}
                    onChange={(e) => setCountdownDisintegrationParticleSize(Number(e.target.value))}
                  />
                </div>
                <div className="config-row">
                  <label>Particle Density: {countdownDisintegrationParticleCount}</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={countdownDisintegrationParticleCount}
                    onChange={(e) => setCountdownDisintegrationParticleCount(Number(e.target.value))}
                  />
                </div>
                <div className="config-row" style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
                  <label>Position Adjustment</label>
                  <div>
                    <button
                      onClick={() => setIsCountdownPositionMode(!isCountdownPositionMode)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: isCountdownPositionMode ? '#4CAF50' : '#4a90e2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        width: '100%',
                        marginBottom: '5px'
                      }}
                    >
                      {isCountdownPositionMode ? 'Positionierung aktiv' : 'Positionierung aktivieren'}
                    </button>
                    {isCountdownPositionMode && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                        <p>Verwende die Pfeiltasten, um den Countdown zu verschieben.</p>
                        <p>Aktuelle Position: X: {countdownOffset.x}, Y: {countdownOffset.y}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
        
        {/* Render On Section */}
        <div className="config-row">
          <label>Render On:</label>
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

        {/* Action Buttons */}
        <div className="config-actions">
          <button onClick={handleSaveAnimation} className="button-save">Save</button>
          <button onClick={closeAnimationConfig} className="button-cancel">Cancel</button>
        </div>
      </div>
    );
  };

  // Define handleSetCountdownArea at the App component level
  const handleSetCountdownArea = () => {
    setIsDrawingCountdownBounds(true);
    // Optionally, immediately switch to a "RECTANGLE" like tool or indicate on canvas
    // For now, just setting the flag. Canvas will need to observe this.
    // setCurrentTool('RECTANGLE'); // This might be too disruptive, consider a dedicated drawing mode.
    alert("Click and drag on the canvas to define the Countdown area.");
    // Ensure the config panel doesn't steal focus from the canvas for drawing
    // Focus management can be handled within Canvas or by other means if necessary.
  };

  // Function to delete an animation object
  const handleDeleteAnimation = (id: string) => {
    // Implement deletion logic here
  };

  // Handle key presses for center position control
  // Funktion zur Handhabung der Countdown-Positionierung mit Pfeiltasten
  const handleCountdownPositioning = (e: React.KeyboardEvent) => {
    // Nur weitermachen, wenn der aktualisierte Modus aktiv ist
    if (!isCountdownPositionMode || !currentAnimation || !currentAnimation.id) return;
    
    // Aktuellen Offset abrufen oder initialisieren
    const currentOffset = countdownOffset || {x: 0, y: 0};
    let newOffset = {...currentOffset};
    
    // Offset basierend auf Pfeiltaste aktualisieren
    switch(e.key) {
      case 'ArrowLeft':
        newOffset.x -= 1;
        break;
      case 'ArrowRight':
        newOffset.x += 1;
        break;
      case 'ArrowUp':
        newOffset.y -= 1;
        break;
      case 'ArrowDown':
        newOffset.y += 1;
        break;
      default:
        return; // Beenden, wenn keine Pfeiltaste gedrückt wurde
    }
    
    // Offset-Status aktualisieren
    setCountdownOffset(newOffset);
    
    // Animation aktualisieren
    updateAnimationObject(currentAnimation.id, { countdownOffset: newOffset });
    
    // Standardverhalten verhindern (z.B. Scrollen)
    e.preventDefault();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prüfen, ob wir im Countdown-Positionsmodus sind
    if (isCountdownPositionMode && currentAnimation && currentAnimation.type === 'COUNTDOWN') {
      handleCountdownPositioning(e);
      return;
    }
    
    // Normale Positionierung für X und andere Typen
    if (!isControllingCenter) return;
    
    // Only proceed if we're controlling center and the panel is focused
    if (document.activeElement !== configPanelRef.current) return;
    
    // Get current position or default to canvas center
    const currentX = centerX !== undefined ? centerX : Math.floor(canvasSize.width / 2);
    const currentY = centerY !== undefined ? centerY : Math.floor(canvasSize.height / 2);
    
    let newX = currentX;
    let newY = currentY;
    
    // Adjust position based on arrow key
    switch (e.key) {
      case 'ArrowLeft':
        newX = Math.max(0, currentX - 1);
        break;
      case 'ArrowRight':
        newX = Math.min(canvasSize.width - 1, currentX + 1);
        break;
      case 'ArrowUp':
        newY = Math.max(0, currentY - 1);
        break;
      case 'ArrowDown':
        newY = Math.min(canvasSize.height - 1, currentY + 1);
        break;
      default:
        return; // Exit if not an arrow key
    }
    
    // Only update if position changed
    if (newX !== currentX || newY !== currentY) {
      setCenterX(newX);
      setCenterY(newY);
      
      // Update animation preview OR existing animation
      const newPosition = { x: newX, y: newY };
      
      // --- Correction Start ---
      if (currentAnimation && currentAnimation.type === 'X') {
        // When editing, only update the *actual* animation object.
        // The useEffect hook listening to centerX/centerY will handle the temp preview update.
        updateAnimationObject(currentAnimation.id, { 
          position: newPosition 
        });
      } else if (!currentAnimation && type === 'X') {
        // When creating a new animation, directly update the temp object for immediate feedback.
        updateTempAnimationObject({ 
          position: newPosition 
        });
      }
      // --- Correction End ---
      
      // Prevent default behavior (scrolling, etc.)
      e.preventDefault();
    }
  };

  // Helper function to check if a point is inside a rectangle
  const isPointInsideRect = (point: { x: number; y: number }, rect: { x: number; y: number; width: number; height: number }): boolean => {
    return (
      point.x >= rect.x &&
      point.x < rect.x + rect.width &&
      point.y >= rect.y &&
      point.y < rect.y + rect.height
    );
  };
  
  // State to track if we're currently loading a project to prevent auto-blocking
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  // Callback to update blocked pixels based on sub-rectangles and viewport
  const updateBlockedPixelsBasedOnSubRects = useCallback(() => {
    // Don't auto-block pixels if we're currently loading a project
    if (isLoadingProject) {
      console.log('Skipping auto-blocking during project load');
      return;
    }

    const { viewportX, viewportY, width, height } = canvasSize;
    const newBlockedPixels: { [key: string]: boolean } = {};

    console.log(`Auto-blocking pixels outside sub-rects within viewport: (${viewportX}, ${viewportY}) size ${width}x${height}`);
    console.log('Sub-rectangles:', subRectangles);

    for (let y = viewportY; y < viewportY + height; y++) {
      for (let x = viewportX; x < viewportX + width; x++) {
        let isInsideAnySubRect = false;
        for (const subRect of subRectangles) {
          if (isPointInsideRect({ x, y }, subRect)) {
            isInsideAnySubRect = true;
            break; // Point is inside one sub-rectangle, no need to check others
          }
        }

        if (!isInsideAnySubRect) {
          newBlockedPixels[`${x},${y}`] = true;
        }
      }
    }
    
    console.log(`Auto-setting ${Object.keys(newBlockedPixels).length} blocked pixels.`);
    setBlockedPixels(newBlockedPixels);
  }, [canvasSize, subRectangles, setBlockedPixels, isLoadingProject]); // Dependencies

  useEffect(() => {
    // Don't auto-update during project loading
    if (!isLoadingProject) {
      updateBlockedPixelsBasedOnSubRects();
    }
  }, [updateBlockedPixelsBasedOnSubRects, isLoadingProject]);

  useEffect(() => {
    // Don't auto-update during project loading
    if (isLoadingProject) {
      return;
    }

    // We only want to automatically block if there *are* sub-rectangles defined.
    if (subRectangles.length > 0) {
      updateBlockedPixelsBasedOnSubRects();
    } else {
      // Optional: Clear blocked pixels if the last sub-rectangle is removed
      // Check if there were previously blocked pixels that might need clearing?
      // For now, let's explicitly clear them when no sub-rects exist.
      console.log('No sub-rectangles, clearing auto-blocked pixels.');
      setBlockedPixels({}); 
    }
  }, [subRectangles, canvasSize, updateBlockedPixelsBasedOnSubRects, setBlockedPixels, isLoadingProject]);

  // State for the new preset name input
  const [newPresetName, setNewPresetName] = useState('');
  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers for Preset Actions
  const handleSavePreset = useCallback(() => {
    if (!newPresetName.trim()) {
      alert('Bitte geben Sie einen Namen für das Preset ein.');
      return;
    }
    addViewportPreset(newPresetName);
    setNewPresetName(''); // Clear input after saving
  }, [newPresetName, addViewportPreset]);

  const handleExportPresets = () => {
    if (viewportPresets.length === 0) {
      alert('Keine Presets zum Exportieren vorhanden.');
      return;
    }
    const dataStr = JSON.stringify(viewportPresets, null, 2); // Pretty print JSON
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'viewport_presets.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    linkElement.remove(); // Clean up the link element
  };

  const handleImportClick = () => {
    fileInputRef.current?.click(); // Trigger hidden file input
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Konnte Datei nicht als Text lesen.');
        }
        const presets = JSON.parse(text);
        // Basic validation already happens in the store action
        const success = importViewportPresets(presets as any[]); // Type assertion
        if (success) {
          alert('Presets erfolgreich importiert!');
        } else {
          alert('Fehler beim Importieren der Presets. Überprüfen Sie das Dateiformat.');
        }
      } catch (error) {
        console.error("Fehler beim Lesen oder Parsen der Preset-Datei:", error);
        alert(`Fehler beim Importieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      } finally {
        // Reset file input value to allow importing the same file again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      alert('Fehler beim Lesen der Datei.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Add global keyboard handlers for undo/redo
  useEffect(() => {
    const handleUndoRedoKeys = (e: KeyboardEvent) => {
      // Undo: Cmd+Z / Ctrl+Z
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Redo: Cmd+Shift+Z / Ctrl+Shift+Z or Cmd+Y / Ctrl+Y
      if ((e.metaKey || e.ctrlKey) && 
          ((e.key.toLowerCase() === 'z' && e.shiftKey) || (e.key.toLowerCase() === 'y'))) {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleUndoRedoKeys);
    return () => window.removeEventListener('keydown', handleUndoRedoKeys);
  }, [undo, redo]);

  return (
    <div className="app-container">
      <MenuBar 
        projectDirectory={projectDirectory} 
        onDirectoryChange={setProjectDirectory}
        onNewProject={handleNewProject}
        onProjectLoadStart={() => setIsLoadingProject(true)}
        onProjectLoadEnd={() => setIsLoadingProject(false)}
      />
      <div className="editor-layout">
        <Toolbar />
        <div className="main-content">
          <ContextBar />
          <div className="canvas-container">
            <Canvas
              isDefiningSafeZonePixels={isDefiningSafeZonePixels}
              currentDefiningSafeZonePixels={tempSafeZonePixels}
              onToggleSafeZonePixel={handleToggleSafeZonePixel}
              drawingMode={drawingMode}
              isDrawingRectangle={isDrawingRectangle}
              onRectangleDrawn={(rectangle, isFinal) => {
                if (!isFinal) {
                  setCurrentRectangle(rectangle);
                  return;
                }
                if (drawingMode === 'STATE') {
                  const newStates = [...rectangleStates];
                  if (drawingStateIndex !== null && drawingStateIndex < newStates.length) {
                    const existingState = newStates[drawingStateIndex];
                    newStates[drawingStateIndex] = { ...rectangle, delay: existingState.delay };
                  } else {
                    newStates.push(rectangle);
                  }
                  setRectangleStates(newStates);
                }
                setDrawingMode(null);
                setIsDrawingRectangle(false);
                setDrawingStateIndex(null);
                setCurrentRectangle(null);
              }}
              currentRectangle={currentRectangle}
              allRectangleStates={type === 'RECTANGLE' ? rectangleStates : []}
              showAllStates={type === 'RECTANGLE'}
              isViewportMode={isViewportMode}
              blockPixelModeActive={blockPixelModeActive}
              isAddingPathPoint={isAddingPathPoint}
              onPathPointAdded={(point) => {
                setPathPoints([...pathPoints, point]);
                setIsAddingPathPoint(false);
              }}
              pathPoints={type === 'PATH' ? pathPoints : []}
              isDrawingCountdownBounds={isDrawingCountdownBounds} // Pass down drawing state
              onCountdownBoundsDrawn={(bounds: { x: number; y: number; width: number; height: number }) => { // Typed callback
                setCountdownBounds(bounds);
                setIsDrawingCountdownBounds(false); // Turn off drawing mode
                // Optionally update temp animation object for immediate preview if config panel is open
                if (showAnimationConfig && type === 'COUNTDOWN') {
                    updateTempAnimationObject({ countdownBounds: bounds });
                }
              }}
            />
          </div>
          <Timeline />
        </div>
        <div className="right-panel">
          <Layers />
          <AnimationObjects 
            onConfigOpen={handleOpenConfig} 
            onDuplicateAnimation={(animation) => {
              // Erstelle eine tiefe Kopie des Animationsobjekts
              const animationCopy = { ...animation } as Omit<AnimationObject, 'id'>;
              // ID wird von addAnimationObject generiert
              addAnimationObject(animationCopy);
            }}
          />
        </div>
      </div>
      {isViewportMode && renderViewportToolOptions()}
      {/* Render the Animation Config Panel using the function */}
      {renderAnimationConfigPanel()}
      <PixelInconsistencyModal />
      
      {/* ProjectManager Modal */}
      {showProjectManager && (
        <ProjectManager
          isOpen={true}
          onClose={() => setShowProjectManager(false)}
          onProjectLoad={handleProjectSelected}
          onDirectoryChange={setProjectDirectory}
          onNewProject={handleNewProject}
        />
      )}
    </div>
  );
}

export default App;
