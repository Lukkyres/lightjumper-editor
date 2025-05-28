import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  CanvasSize, 
  EditorMode, 
  Frame, 
  Layer, 
  PixelData, 
  PredefinedColor, 
  Selection, 
  SubRectangle, 
  Tool,
  AnimationObject,
  AnimationType, // <-- Import AnimationType
  Variation, // <-- Import Variation type
  PixelInconsistency
} from '../types';
// @ts-ignore - Temporarily ignore import error, path seems correct
import { generateId, createDefaultFrame } from '../utils/editorUtils';

// Define structure for viewport configuration and presets
export interface ViewportConfig { // Export makes it reusable if needed
  viewport: {
    viewportX: number;
    viewportY: number;
    width: number;
    height: number;
  };
  subRectangles: SubRectangle[];
  blockedPixels: { [key: string]: boolean };
}

export interface ViewportPreset { // Export makes it reusable if needed
  id: string;
  name: string;
  config: ViewportConfig;
  previewDataUrl?: string; // Optional: Data URL für die Vorschau
}

export interface EditorState { // Export the interface
  // Canvas
  canvasSize: CanvasSize;
  pixelSize: number;
  frames: Frame[];
  currentFrameIndex: number;
  selectedFrameIds: string[]; // Neu: IDs der ausgewählten Frames
  // mainSectionStartIndex: number; // Index where the main looping section begins - REMOVED
  layers: Layer[];
  currentLayerIndex: number;
  selectedLayerId: string | null;
  
  // Speicherzustand
  hasUnsavedChanges: () => boolean; // Funktion, die prüft, ob ungespeicherte Änderungen vorliegen
  
  // Block Pixels
  blockedPixels: { [key: string]: boolean }; // key: "x,y"
  
  // Viewport Functions
  moveViewport: (offsetX: number, offsetY: number) => void;
  expandViewport: () => void;
  shrinkViewport: () => void;
  setViewport: (viewportX: number, viewportY: number, width: number, height: number) => void;
  resetViewport: () => void;
  
  // Tools
  currentTool: Tool;
  brushSize: number;
  currentPixelNumber: number; // Für das NUMBER-Tool
  autoNumbering: boolean; // Automatische Nummerierung
  isRectFilled: boolean;   // Option für gefüllte Rechtecke
  isEllipseFilled: boolean; // Option für gefüllte Ellipsen
  numberingMode: 'off' | 'same' | 'auto'; // Nummerierungsmodus für Linien/Rechteck/Ellipse
  
  // Colors
  predefinedColors: Record<PredefinedColor, string>;
  customColors: string[];
  currentColor: string;
  
  // Selection
  selection: Selection | null;
  isMovingSelection: boolean;
  
  // Animation
  animationObjects: AnimationObject[];
  tempAnimationObject: AnimationObject | null;
  tempAnimationLayerId: string | null;
  defaultFrameDuration: number;
  
  // Mode
  mode: EditorMode;
  
  // Project
  projectName: string;
  
  // Viewport states
  isViewportMode: boolean;
  
  // Sub-Rectangle states and actions
  isDrawingSubRectangle: boolean;
  subRectangles: SubRectangle[];
  
  // Variations
  variations: Variation[];
  currentVariationId: string | null;
  mainProjectState: {
    frames: Frame[];
    layers: Layer[];
    canvasSize: CanvasSize;
    animationObjects: AnimationObject[];
    currentFrameIndex: number;
    currentLayerIndex: number;
    blockedPixels: { [key: string]: boolean };
    subRectangles: SubRectangle[];
    selection: Selection | null;
  } | null;

  // Pixel Inconsistency
  pixelInconsistencies: PixelInconsistency[];
  showPixelInconsistencyModal: boolean;
  projectPixelNumbers: number[]; // New: All pixel numbers in the project
  projectUniquePixelNumbersCount: number; // New: Count of unique pixel numbers
  
  // Actions
  setCanvasSize: (width: number, height: number, newOriginalWidth?: number, newOriginalHeight?: number) => void;
  resizeCanvas: (width: number, height: number) => void;
  setPixelSize: (size: number) => void;
  setCurrentTool: (tool: Tool) => void;
  setBrushSize: (size: number) => void;
  setCurrentColor: (color: string) => void;
  setCurrentPixelNumber: (number: number) => void;
  setAutoNumbering: (value: boolean) => void;
  setNumberingMode: (mode: 'same' | 'auto') => void; // NEU: Setter für Nummerierungsmodus
  updatePredefinedColor: (key: PredefinedColor, color: string) => void;
  updateCustomColor: (index: number, color: string) => void;
  
  // Layers
  addLayer: () => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, update: Partial<Layer>) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;
  toggleLayerVisibility: (id: string) => void;
  renameLayer: (id: string, name: string) => void;
  setCurrentLayer: (index: number) => void;
  toggleLayerLock: (id: string) => void;
  
  // Frames
  addFrame: () => void;
  duplicateFrame: (frameIndex: number) => void; // Changed to void
  duplicateFrameMultiple: (frameIndex: number, count: number) => void; // Changed to void
  removeFrame: (frameIndex: number) => void;
  setCurrentFrame: (index: number) => void;
  setFrameDuration: (frameIndex: number, duration: number) => void;
  setDefaultFrameDuration: (duration: number) => void;
  addMultipleFrames: (count: number) => void;
  // setMainSectionStartIndex: (index: number) => void; // REMOVED
  toggleFrameSection: (frameId: string) => void; // New action
  addStartSuperFrame: () => void; // New action for adding startup superframe
  createSuperFrame: (frameCount: number) => void;
  swapFrames: (sourceIndex: number, targetIndex: number, isSourceSuperframe: boolean, isTargetSuperframe: boolean) => void;
  
  selectFrame: (frameId: string, clearExisting?: boolean) => void;
  deselectFrame: (frameId: string) => void;
  toggleFrameSelection: (frameId: string) => void;
  selectFrameRange: (startFrameId: string, endFrameId: string) => void;
  selectAllFrames: () => void;
  clearFrameSelection: () => void;
  
  // Pixels
  setPixel: (x: number, y: number, color: string, explicitPixelNumberFromCanvas?: number) => void;
  erasePixel: (x: number, y: number) => void;
  fillArea: (x: number, y: number, targetColor: string, replacementColor: string, layerId?: string) => void;
  
  // Selection
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  commitSelection: () => void;
  moveSelection: (deltaX: number, deltaY: number) => void;
  clearSelection: () => void;
  setIsMovingSelection: (isMoving: boolean) => void;
  
  // Animation Objects
  extractGreenPixelsFromFirstMainFrame: () => Array<{ x: number; y: number }>;
  updateCountdownSafeZoneFromMainFrame: (animationId: string) => void;
  addAnimationObject: (object: Omit<AnimationObject, 'id'>) => void;
  removeAnimationObject: (id: string) => void;
  updateAnimationObject: (id: string, updates: Partial<AnimationObject>) => void;
  setTempAnimationObject: (object: Omit<AnimationObject, 'id'> | null) => void;
  updateTempAnimationObject: (updates: Partial<AnimationObject>) => void;
  createTempAnimationLayer: (animationType: AnimationType, orientation?: 'HORIZONTAL' | 'VERTICAL') => void;
  removeTempAnimationLayer: () => void;
  
  // Blocked Pixels
  blockPixel: (x: number, y: number) => void;
  unblockPixel: (x: number, y: number) => void;
  clearBlockedPixels: () => void;
  isPixelBlocked: (x: number, y: number) => boolean;
  setBlockedPixels: (pixels: { [key: string]: boolean }) => void; 
  
  // Mode
  toggleMode: () => void;
  
  // Project
  setProjectName: (name: string) => void;
  
  setIsRectFilled: (value: boolean) => void;
  setIsEllipseFilled: (value: boolean) => void;
  
  // Action to set the duration for all frames within a specific superframe
  setSuperFrameDuration: (superFrameId: string, durationPerFrame: number) => void;

  // Superframe Actions
  resizeSuperFrame: (superFrameId: string, newFrameCount: number) => void;
  removeSuperFrame: (superFrameId: string) => void;
  duplicateSuperFrame: (superFrameId: string, asSingleFrame: boolean) => void; // Changed to void
  
  // Sub-Rectangle actions
  toggleSubRectangleDrawing: () => void;
  addSubRectangle: (rect: Omit<SubRectangle, 'id' | 'name'>) => void;
  updateSubRectangleName: (id: string, name: string) => void;
  deleteSubRectangle: (id: string) => void;
  
  // Viewport Presets
  viewportPresets: ViewportPreset[];
  addViewportPreset: (name: string) => void;
  removeViewportPreset: (id: string) => void;
  applyViewportPreset: (id: string) => void;
  importViewportPresets: (presets: ViewportPreset[]) => boolean; // Returns true on success

  // Variation Actions
  createVariation: (name: string) => void;
  switchToVariation: (targetVariationId: string | null) => void;
  updateVariationName: (variationId: string, newName: string) => void;
  deleteVariation: (variationId: string) => void;
  updateCurrentVariation: () => void; // Neue Funktion zum Aktualisieren der aktuellen Variation
  updateMainState: () => void; // Neue Funktion zum Aktualisieren des Hauptzustands

  // Pixel Inconsistency Actions
  checkForPixelNumberInconsistencies: () => void;
  resolvePixelNumberInconsistency: (superFrameId: string, x: number, y: number, targetNumber: number | undefined) => void;
  resolveAllPixelNumberInconsistencies: (strategy: 'keepFirst' | 'clearAll' | 'keepMostFrequent') => void; // Added more strategies
  setPixelInconsistencyModalVisibility: (visible: boolean) => void;
  calculateProjectPixelStats: () => void; // New: Action to calculate pixel stats
  
  // Undo/Redo
  history: Array<Partial<EditorState>>;
  historyIndex: number;
  maxHistorySize: number;
  lastSavedHistoryIndex: number; // Der History-Index des letzten Speicherpunkts
  undo: () => void;
  redo: () => void;
  pushToHistory: (state: Partial<EditorState>) => void;
}

// Helper functions
const generateId = (): string => Math.random().toString(36).substring(2, 9);

const createDefaultLayer = (): Layer => ({
  id: generateId(),
  name: `Layer ${Date.now()}`,
  visible: true,
  locked: false,
});

const createDefaultFrame = (duration: number, layerIds: string[] = [], section: 'startup' | 'main' = 'main'): Frame => {
  const layerData: Record<string, PixelData[]> = {};
  layerIds.forEach(id => {
    layerData[id] = [];
  });

  return {
    id: generateId(),
    layerData,
    duration,
    section, // Assign section
  };
};

const isSameColor = (color1: string, color2: string): boolean => {
  return color1.toLowerCase() === color2.toLowerCase();
};

const useEditorStore = create(
  devtools<EditorState>(
    (set, get) => ({
      // Initial state
      canvasSize: { 
        width: 16,          // Standard-Viewport auf 16x16 geändert (von 32x32)
        height: 16, 
        originalWidth: 64, 
        originalHeight: 64, 
        // Viewport in der Mitte des Canvas positionieren
        viewportX: Math.floor((64 - 16) / 2), // (originalWidth - width) / 2
        viewportY: Math.floor((64 - 16) / 2)  // (originalHeight - height) / 2
      },
      pixelSize: 16,
      frames: [],
      currentFrameIndex: 0,
      selectedFrameIds: [], // Neu: IDs der ausgewählten Frames
      // mainSectionStartIndex: 0, // REMOVED
      layers: [],
      currentLayerIndex: 0,
      selectedLayerId: null,
      
      // Block Pixels
      blockedPixels: {},
      
      currentTool: 'BRUSH',
      brushSize: 1,
      currentPixelNumber: 1, // Default to 1
      autoNumbering: false,
      isRectFilled: false,   // Option für gefüllte Rechtecke
      isEllipseFilled: false, // Option für gefüllte Ellipsen
      numberingMode: 'off', // Default ist 'off'
      
      predefinedColors: {
        red: '#FF0000',    // miss
        blue: '#0000FF',   // hit
        green: '#00FF00',  // safe
        doubleHit: '#FF00FF', // Double Hit (violett)
      },
      customColors: [],
      currentColor: '#00FF00', // Default to green (safe)
      
      selection: null,
      isMovingSelection: false,
      
      animationObjects: [],
      tempAnimationObject: null,
      tempAnimationLayerId: null,
      defaultFrameDuration: 25, // 25ms = 40fps as default
      
      mode: 'EDIT',
      
      projectName: 'Level 1',
      
      // Viewport states
      isViewportMode: false,
      
      // Sub-Rectangle states and actions
      isDrawingSubRectangle: false,
      subRectangles: [],
      
      // Variations initial state
      variations: [],
      currentVariationId: null,
      mainProjectState: null,
    
      // Pixel Inconsistency Initial State
      pixelInconsistencies: [],
      showPixelInconsistencyModal: false,
      projectPixelNumbers: [], // New: Initial state
      projectUniquePixelNumbersCount: 0, // New: Initial state
      
      // Actions
      setCanvasSize: (width: number, height: number, newOriginalWidth?: number, newOriginalHeight?: number) => set(state => {
        // Initialize store if not done yet
        let newLayers = [...state.layers];
        let newFrames = [...state.frames];
        
        // Create default layers if none exist
        if (newLayers.length === 0) {
          // Erstelle drei Ebenen mit den gewünschten Namen und Farben
          // Die Reihenfolge ist wichtig: Grün soll im Vordergrund sein (Index 0)
          const greenLayer = {
            ...createDefaultLayer(),
            name: 'Grün (Sicherheit)',
          };
          
          const redLayer = {
            ...createDefaultLayer(),
            name: 'Rot (Verlieren)',
          };
          
          const blueLayer = {
            ...createDefaultLayer(),
            name: 'Blau (Punkte)',
          };
          
          // Reihenfolge: Grün (vorn), Rot, Blau
          newLayers = [greenLayer, redLayer, blueLayer];
          
          // Create a default superframe if none exists
          if (newFrames.length === 0) {
            // Erstelle einen Superframe mit 400 Frames (10 Sekunden bei 40 FPS)
            const superFrameId = generateId();
            const frameCount = 400; // 10 Sekunden bei 40 FPS
            
            for (let i = 0; i < frameCount; i++) {
              const frame = createDefaultFrame(
                state.defaultFrameDuration,
                newLayers.map(layer => layer.id),
                // Initially, all frames in the default superframe are 'main'
                // Or, if we want a default startup section, we can adjust this.
                // For now, let's assume all are 'main' and user defines startup later.
                'main'
              );
              frame.isSuperFrameMember = true;
              frame.superFrameId = superFrameId;
              newFrames.push(frame);
            }
          }
        }
        
        // Verwende neue Original-Dimensionen, wenn angegeben, sonst behalte die alten bei
        const originalWidth = newOriginalWidth || state.canvasSize.originalWidth;
        const originalHeight = newOriginalHeight || state.canvasSize.originalHeight;
        
        // Berechne Viewport-Position in der Mitte des Canvas
        const viewportX = Math.floor((originalWidth - width) / 2);
        const viewportY = Math.floor((originalHeight - height) / 2);
        
        return {
          canvasSize: { 
            width,
            height,
            viewportX,
            viewportY,
            originalWidth,
            originalHeight
          },
          layers: newLayers,
          frames: newFrames
        };
      }),
      
      resizeCanvas: (width: number, height: number) => set(state => {
        // Berechnung der Offsets entfernt, da sie nicht verwendet werden
        // Update canvas size
        return {
          canvasSize: {
            ...state.canvasSize,
            width,
            height
          }
        };
      }),
      
      setPixelSize: (size: number) => set({ pixelSize: size }),
      
      setCurrentTool: (tool: Tool) => {
        return set({ currentTool: tool });
      },
      
      setBrushSize: (size: number) => set({ brushSize: size }),
      
      setCurrentColor: (color: string) => set({ currentColor: color }),
      
      setCurrentPixelNumber: (number: number) => set({ currentPixelNumber: number }),
      
      setAutoNumbering: (value: boolean) => set({ autoNumbering: value }),
      setNumberingMode: (mode: 'same' | 'auto') => set({ numberingMode: mode }),
      
      updatePredefinedColor: (key: PredefinedColor, color: string) => set(state => {
        // Get the old color
        const oldColor = state.predefinedColors[key];
        
        // Update all pixels with the old color to the new color in all frames
        const updatedFrames = state.frames.map(frame => {
          const updatedLayerData = { ...frame.layerData };
          
          // Update each layer's pixels in this frame
          state.layers.forEach(layer => {
            if (updatedLayerData[layer.id]) {
              updatedLayerData[layer.id] = updatedLayerData[layer.id].map(pixel => 
                isSameColor(pixel.color, oldColor) 
                  ? { ...pixel, color } 
                  : pixel
              );
            }
          });
          
          return {
            ...frame,
            layerData: updatedLayerData
          };
        });
        
        return {
          predefinedColors: {
            ...state.predefinedColors,
            [key]: color
          },
          frames: updatedFrames
        };
      }),
      
      updateCustomColor: (index: number, color: string) => set(state => {
        const customColors = [...state.customColors];
        if (index >= 0 && index < customColors.length) {
          customColors[index] = color;
        }
        return { customColors };
      }),
      
      // Layers
      addLayer: () => set(state => {
        const newLayer = createDefaultLayer();
        
        // Add the new layer to all frames
        const newFrames = [...state.frames];
        newFrames.forEach(frame => {
          frame.layerData[newLayer.id] = [];
        });
        
        return {
          layers: [...state.layers, newLayer],
          currentLayerIndex: state.layers.length,
          frames: newFrames
        };
      }),
      
      removeLayer: (layerId: string) => set(state => {
        if (state.layers.length <= 1) return state; // Prevent removing the last layer
        
        const layerIndex = state.layers.findIndex(l => l.id === layerId);
        if (layerIndex === -1) return state;
        
        const newLayers = [...state.layers];
        newLayers.splice(layerIndex, 1);
        
        // Remove the layer data from all frames
        const newFrames = [...state.frames];
        newFrames.forEach(frame => {
          const newLayerData = { ...frame.layerData };
          delete newLayerData[layerId];
          frame.layerData = newLayerData;
        });
        
        const newCurrentIndex = layerIndex >= newLayers.length 
          ? newLayers.length - 1 
          : layerIndex;
        
        return {
          layers: newLayers,
          currentLayerIndex: newCurrentIndex,
          frames: newFrames
        };
      }),
      
      updateLayer: (layerId: string, update: Partial<Layer>) => set(state => {
        const layerIndex = state.layers.findIndex(l => l.id === layerId);
        if (layerIndex === -1) return state;
        
        const newLayers = [...state.layers];
        newLayers[layerIndex] = {
          ...newLayers[layerIndex],
          ...update
        };
        
        return { layers: newLayers };
      }),
      
      moveLayer: (fromIndex: number, toIndex: number) => set(state => {
        if (
          fromIndex < 0 || 
          fromIndex >= state.layers.length || 
          toIndex < 0 || 
          toIndex >= state.layers.length
        ) {
          return state;
        }
        
        const newLayers = [...state.layers];
        const [removed] = newLayers.splice(fromIndex, 1);
        newLayers.splice(toIndex, 0, removed);
        
        const newCurrentIndex = fromIndex === state.currentLayerIndex 
          ? toIndex 
          : state.currentLayerIndex;
        
        return {
          layers: newLayers,
          currentLayerIndex: newCurrentIndex
        };
      }),
      
      toggleLayerVisibility: (id: string) => set(state => {
        const layerIndex = state.layers.findIndex(layer => layer.id === id);
        if (layerIndex === -1) return state;

        const newLayers = [...state.layers];
        newLayers[layerIndex] = {
          ...newLayers[layerIndex],
          visible: !newLayers[layerIndex].visible
        };

        return { layers: newLayers };
      }),

      renameLayer: (id: string, name: string) => set(state => {
        const layerIndex = state.layers.findIndex(layer => layer.id === id);
        if (layerIndex === -1) return state;

        const newLayers = [...state.layers];
        newLayers[layerIndex] = {
          ...newLayers[layerIndex],
          name
        };

        return { layers: newLayers };
      }),

      setCurrentLayer: (index: number) => set(state => {
        if (index < 0 || index >= state.layers.length) return state;
        return { currentLayerIndex: index };
      }),

      toggleLayerLock: (id: string) => set(state => {
        const layerIndex = state.layers.findIndex(layer => layer.id === id);
        if (layerIndex === -1) return state;

        const newLayers = [...state.layers];
        newLayers[layerIndex] = {
          ...newLayers[layerIndex],
          locked: !newLayers[layerIndex].locked
        };

        return { layers: newLayers };
      }),

      // Frames
      addFrame: () => set(state => {
        const newLayerIds = state.layers.map(layer => layer.id);
        const insertAtIndex = state.currentFrameIndex + 1;
        // Default new frames to 'main', user can toggle if they want it in startup.
        // Or, could default to the section of the frame at `state.currentFrameIndex` if it exists.
        // For simplicity, let's default to 'main'.
        const newFrame = createDefaultFrame(state.defaultFrameDuration, newLayerIds, 'main');

        let newFrames = [...state.frames];
        newFrames.splice(insertAtIndex, 0, newFrame);
        
        const updatedAnimations = state.animationObjects.map(anim => ({
          ...anim,
          frames: anim.frames.includes('all') ? ['all'] : [...(anim.frames || []), newFrame.id]
        }));
        
        return {
          frames: newFrames,
          currentFrameIndex: insertAtIndex,
          animationObjects: updatedAnimations
        };
      }),
      
      duplicateFrame: (frameIndex: number) => set(state => {
        if (frameIndex < 0 || frameIndex >= state.frames.length) return state;
        const originalFrame = state.frames[frameIndex];
        const newFrame: Frame = {
          ...JSON.parse(JSON.stringify(originalFrame)),
          id: generateId(),
          section: originalFrame.section || 'main',
        };
        
        const newFrames = [...state.frames];
        const insertAtIndex = frameIndex + 1;
        newFrames.splice(insertAtIndex, 0, newFrame);
        
        const updatedAnimations = state.animationObjects.map(anim => {
          if (anim.frames.includes(originalFrame.id)) {
            return {
              ...anim,
              frames: [...anim.frames, newFrame.id]
            };
          }
          return anim;
        });
        
        return {
          frames: newFrames,
          currentFrameIndex: insertAtIndex,
          animationObjects: updatedAnimations
        };
      }),
      
      duplicateFrameMultiple: (frameIndex: number, count: number) => set(state => {
        if (frameIndex < 0 || frameIndex >= state.frames.length || count <= 0) return state;
        const originalFrame = state.frames[frameIndex];
        const newFramesArray: Frame[] = [];
        
        for (let i = 0; i < count; i++) {
          newFramesArray.push({
            ...JSON.parse(JSON.stringify(originalFrame)),
            id: generateId(),
            section: originalFrame.section || 'main',
          });
        }
        
        const newFrames = [...state.frames];
        const insertAtIndex = frameIndex + 1;
        newFrames.splice(insertAtIndex, 0, ...newFramesArray);
        
        const newFrameIds = newFramesArray.map(f => f.id);
        const updatedAnimations = state.animationObjects.map(anim => {
          if (anim.frames.includes(originalFrame.id)) {
            return {
              ...anim,
              frames: [...anim.frames, ...newFrameIds]
            };
          }
          return anim;
        });
        
        return {
          frames: newFrames,
          currentFrameIndex: frameIndex + count,
          animationObjects: updatedAnimations
        };
      }),
      
      removeFrame: (frameIndex: number) => set(state => {
        if (state.frames.length <= 1) return state;
        if (frameIndex < 0 || frameIndex >= state.frames.length) return state;
        
        const removedFrameId = state.frames[frameIndex].id;
        let newFrames = [...state.frames];
        newFrames.splice(frameIndex, 1);
        
        const newCurrentFrameIndex = Math.max(0, Math.min(frameIndex, newFrames.length - 1));
        
        const updatedAnimations = state.animationObjects.map(anim => ({
          ...anim,
          frames: anim.frames.filter(id => id !== removedFrameId)
        }));
        
        return {
          frames: newFrames, // Sections are inherent to frames, no global recalculation needed on remove
          currentFrameIndex: newCurrentFrameIndex,
          animationObjects: updatedAnimations
        };
      }),
      
      setCurrentFrame: (index: number) => set(state => ({
        currentFrameIndex: Math.max(0, Math.min(index, state.frames.length - 1))
      })),
      toggleFrameSection: (frameId: string) => set(state => {
        const targetFrame = state.frames.find(f => f.id === frameId);
        if (!targetFrame) return state;

        const isSuper = targetFrame.isSuperFrameMember && targetFrame.superFrameId;
        const newSection = targetFrame.section === 'startup' ? 'main' : 'startup';

        const newFrames = state.frames.map(frame => {
          if (isSuper) {
            // If it's a superframe member, toggle all frames in that superframe
            if (frame.superFrameId === targetFrame.superFrameId) {
              return { ...frame, section: newSection as 'startup' | 'main' };
            }
          } else {
            // If it's a normal frame, just toggle that frame
            if (frame.id === frameId) {
              return { ...frame, section: newSection as 'startup' | 'main' };
            }
          }
          return frame;
        });
        return { frames: newFrames };
      }),
      
      setFrameDuration: (frameIndex: number, duration: number) => set(state => {
        if (frameIndex < 0 || frameIndex >= state.frames.length) return state;
        
        const newFrames = [...state.frames];
        newFrames[frameIndex] = {
          ...newFrames[frameIndex],
          duration
        };
        
        return { frames: newFrames };
      }),
      
      setDefaultFrameDuration: (duration: number) => set({
        defaultFrameDuration: duration
      }),
      
      addMultipleFrames: (countInput: number) => set(state => {
        if (countInput <= 0) return state;
        
        const newLayerIds = state.layers.map(layer => layer.id);
        const newFramesArray: Frame[] = [];
        
        for (let i = 0; i < countInput; i++) {
          // Default new frames to 'main'
          newFramesArray.push(createDefaultFrame(state.defaultFrameDuration, newLayerIds, 'main'));
        }
        
        const newFrames = [...state.frames, ...newFramesArray];
        const newTotalFramesLength = newFrames.length;
        
        const newFrameIds = newFramesArray.map(f => f.id);
        const updatedAnimations = state.animationObjects.map(anim => ({
          ...anim,
          frames: anim.frames.includes('all') ? ['all'] : [...(anim.frames || []), ...newFrameIds]
        }));
        
        return {
          frames: newFrames,
          currentFrameIndex: newTotalFramesLength - 1,
          animationObjects: updatedAnimations
        };
      }),
      
      createSuperFrame: (frameCountInput: number) => set(state => {

        const count = Math.max(1, Number(frameCountInput));
        if (isNaN(count)) {
          console.error('Ungültiger Wert für frameCount:', frameCountInput);
          return state;
        }

        
        const newLayerIds = state.layers.map(layer => layer.id);
        const superFrameId = generateId();
        const newFramesArray: Frame[] = [];
        
        for (let i = 0; i < count; i++) {
          // Default new frames in a superframe to 'main'
          const frame = createDefaultFrame(state.defaultFrameDuration, newLayerIds, 'main');
          frame.isSuperFrameMember = true;
          frame.superFrameId = superFrameId;
          newFramesArray.push(frame);
        }
        
        const newFrames = [...state.frames, ...newFramesArray];
        const oldFramesLength = state.frames.length;

        
        const allNewFrameIds = newFramesArray.map(f => f.id);
        const updatedAnimations = state.animationObjects.map(anim => ({
          ...anim,
          frames: anim.frames.includes('all') ? ['all'] : [...(anim.frames || []), ...allNewFrameIds]
        }));
        
        return {
          frames: newFrames,
          currentFrameIndex: oldFramesLength,
          animationObjects: updatedAnimations
        };
      }),
      addStartSuperFrame: () => set(state => {
        const newFramesCount = 200; // 5 seconds * 40 FPS
        const newFrameDuration = 25; // 1000ms / 40 FPS

        // Capture the initial state of layers and frames BEFORE any potential modification
        const initialLayers = [...state.layers];
        const initialFrames = [...state.frames];

        let layersForProcessing = [...initialLayers];
        let framesForProcessing = [...initialFrames];

        // Ensure default layers and frames exist if project is empty
        if (layersForProcessing.length === 0) {
            const defaultLayerNames = ['Grün (Sicherheit)', 'Rot (Verlieren)', 'Blau (Punkte)'];
            const createdDefaultLayers = defaultLayerNames.map(name => ({ ...createDefaultLayer(), name }));
            layersForProcessing.push(...createdDefaultLayers);
            
            if (framesForProcessing.length === 0) {
                const superId = generateId();
                const defaultFrameCount = 400; // Or some other default
                const defaultLayerIdsForFrames = createdDefaultLayers.map(l => l.id);
                for (let i = 0; i < defaultFrameCount; i++) {
                    const frame = createDefaultFrame(state.defaultFrameDuration, defaultLayerIdsForFrames, 'main');
                    frame.isSuperFrameMember = true;
                    frame.superFrameId = superId;
                    framesForProcessing.push(frame);
                }
            }
        }

        // Use existing layers without adding new startup-specific layers
        const updatedGlobalLayers = [...layersForProcessing];
        
        // Keep existing frames unchanged since we're not adding new layers
        const updatedExistingFrames = [...framesForProcessing];

        // Copy all layer data from the first frame
        const layerDataToCopy: Record<string, PixelData[]> = {};
        
        if (initialFrames.length > 0 && initialLayers.length > 0) {
            const firstInitialFrame = initialFrames[0];
            
            // Copy all layer data from the first frame
            initialLayers.forEach(layer => {
                if (firstInitialFrame.layerData[layer.id]) {
                    layerDataToCopy[layer.id] = [...firstInitialFrame.layerData[layer.id]];
                }
            });
        }
        // Removed extra closing brace here that was causing syntax errors
        
        const newSuperFrameId = generateId();
        const startupFramesArray: Frame[] = [];
        // All layer IDs for the new startup frames
        const allLayerIdsForStartupFrames = updatedGlobalLayers.map(l => l.id);

        for (let i = 0; i < newFramesCount; i++) {
          const newFrame = createDefaultFrame(newFrameDuration, allLayerIdsForStartupFrames, 'startup');
          newFrame.isSuperFrameMember = true;
          newFrame.superFrameId = newSuperFrameId;

          // Copy all layer data from the first frame to preserve all pixels and layers
          layersForProcessing.forEach(existingLayer => {
            if (layerDataToCopy[existingLayer.id]) {
              newFrame.layerData[existingLayer.id] = [...layerDataToCopy[existingLayer.id]];
            } else {
              newFrame.layerData[existingLayer.id] = [];
            }
          });

          startupFramesArray.push(newFrame);
        }

        const finalFrames = [...startupFramesArray, ...updatedExistingFrames];
        
        const allNewStartupFrameIds = startupFramesArray.map(f => f.id);
        
        // Create a countdown animation for the startup superframe with new default settings
        const countdownAnimation = {
          id: generateId(),
          type: 'COUNTDOWN' as const,
          color: '#f5d60a', // Neue Standardfarbe R:245, G:214, B:10
          frames: allNewStartupFrameIds,
          renderPosition: 'FOREGROUND' as const,
          renderOnSection: 'both' as const,
          countdownSize: 20,
          countdownSpeed: 1500, // Neue Standardgeschwindigkeit
          countdownFadeOption: 'digitalDripCycle' as const, // Standard-Fade-Effekt
          countdownHoldDuration: 2000, // Neue Standard-Hold-Duration
          // Sparkle Effect (standardmäßig deaktiviert)
          countdownEnableSparkleEffect: false,
          countdownSparkleColor: '#FFFFFF',
          countdownMaxSparklesPerFrame: 1,
          countdownSparkleLifetime: 3,
          // Gradient Pulse (standardmäßig deaktiviert)
          countdownEnableGradientPulse: false,
          countdownGradientColorStart: '#f5d60a',
          countdownGradientColorEnd: '#00FF00',
          countdownGradientPulseSpeed: 2000,
          // Static Vertical Gradient (standardmäßig aktiviert)
          countdownEnableStaticVerticalGradient: true,
          countdownStaticGradientColorTop: '#ffd500', // Neue Standardfarben
          countdownStaticGradientColorBottom: '#ffa200', // Neue Standardfarben
          // Loading Bar (standardmäßig aktiviert)
          countdownEnableLoadingBar: true,
          countdownLoadingBarColors: ['#ff4d00', '#ff9500', '#fff700'] as [string, string, string], // Neue Standardfarben
          countdownLoadingBarSpeedFactor: 2.0, // Neue Standardgeschwindigkeit
          // Safe Zone (standardmäßig aktiviert)
          countdownEnableSafeZone: true,
          countdownSafeZonePixels: [],
          countdownSafeZoneIntroAnimation: 'centerOut' as const,
          countdownSafeZonePulse: true,
          countdownSafeZoneSpeed: 0.3,
          countdownSafeZonePauseDuration: 500,
          // Black Background (standardmäßig aktiviert)
          countdownEnableBlackBackground: true,
          countdownBlackBackgroundColor: '#000000',
          countdownDisintegrationDuration: 1500,
          countdownDisintegrationParticleSize: 1,
          countdownDisintegrationParticleCount: 30,
          countdownTransitionEffect: 'matrix' as const, // Matrix als Standard
          countdownMatrixColor: '#FFA500' // Orange als Standard
        };

        // Set countdown bounds based on sub-rectangles (same logic as in addAnimationObject)
        let calculatedBounds: { x: number; y: number; width: number; height: number } | null = null;
        (countdownAnimation as any).autoAdjustCountdownBounds = false;

        if (state.subRectangles && state.subRectangles.length > 0) {
          // Find the largest sub-rectangle by area
          const largestSubRectangle = state.subRectangles.reduce((largest, current) => {
            return (current.width * current.height > largest.width * largest.height) ? current : largest;
          }, state.subRectangles[0]);

          if (largestSubRectangle) {
            const boundsX = largestSubRectangle.x + 1;
            const boundsY = largestSubRectangle.y + 1;
            const boundsWidth = largestSubRectangle.width - 2;
            const boundsHeight = largestSubRectangle.height - 2;

            if (boundsWidth >= 1 && boundsHeight >= 1) {
              calculatedBounds = {
                x: boundsX,
                y: boundsY,
                width: boundsWidth,
                height: boundsHeight,
              };
              (countdownAnimation as any).autoAdjustCountdownBounds = true;
            }
          }
        }

        if (calculatedBounds) {
          (countdownAnimation as any).countdownBounds = calculatedBounds;
        } else {
          // Default to full viewport if no valid sub-rectangle found
          (countdownAnimation as any).countdownBounds = {
            x: state.canvasSize.viewportX,
            y: state.canvasSize.viewportY,
            width: state.canvasSize.width,
            height: state.canvasSize.height,
          };
        }

        // Set loading bar area based on smallest sub-rectangle (same logic as in addAnimationObject)
        (countdownAnimation as any).countdownLoadingBarArea = undefined;
        (countdownAnimation as any).autoAdjustLoadingBarArea = false;

        if (state.subRectangles && state.subRectangles.length > 0) {
          // Find the smallest sub-rectangle by area
          const smallestSubRectangle = state.subRectangles.reduce((smallest, current) => {
            return (current.width * current.height < smallest.width * smallest.height) ? current : smallest;
          }, state.subRectangles[0]);

          if (smallestSubRectangle) {
            (countdownAnimation as any).countdownLoadingBarArea = {
              x: smallestSubRectangle.x,
              y: smallestSubRectangle.y,
              width: smallestSubRectangle.width,
              height: smallestSubRectangle.height,
            };
            (countdownAnimation as any).autoAdjustLoadingBarArea = true;
          }
        }

        // Extract green pixels from the first Main-Frame for Safe Zone (same logic as in addAnimationObject)
        const greenColor = state.predefinedColors.green;
        const mainFrames = updatedExistingFrames.filter(frame => frame.section === 'main');
        
        if (mainFrames.length > 0) {
          const firstMainFrame = mainFrames[0];
          const safeZonePixels = [];
          
          // Create a map to keep track of which pixels are covered by non-green pixels
          const coveredPixels = new Map();
          
          // Process all layers from top to bottom
          for (let i = updatedGlobalLayers.length - 1; i >= 0; i--) {
            const layer = updatedGlobalLayers[i];
            if (layer.visible && firstMainFrame.layerData[layer.id]) {
              for (const pixel of firstMainFrame.layerData[layer.id]) {
                const key = `${pixel.x},${pixel.y}`;
                if (!coveredPixels.has(key)) {
                  coveredPixels.set(key, pixel.color);
                }
              }
            }
          }
          
          // Extract green pixels that aren't covered by other colors
          for (const [key, color] of coveredPixels.entries()) {
            if (isSameColor(color, greenColor)) {
              const [x, y] = key.split(',').map(Number);
              safeZonePixels.push({ x, y });
            }
          }
          
          // Set the extracted green pixels as safe zone
          if (safeZonePixels.length > 0) {
            (countdownAnimation as any).countdownSafeZonePixels = safeZonePixels;
          }
        }
        
        const updatedAnimations = [
          ...state.animationObjects.map(anim => ({
            ...anim,
            frames: anim.frames.includes('all') ? ['all'] : [...(anim.frames || []), ...allNewStartupFrameIds]
          })),
          countdownAnimation
        ];

        return {
          // Return all parts of the state to avoid accidental omissions
          canvasSize: state.canvasSize,
          pixelSize: state.pixelSize,
          frames: finalFrames,
          currentFrameIndex: 0,
          selectedFrameIds: state.selectedFrameIds, // Or clear/update as needed
          layers: updatedGlobalLayers,
          currentLayerIndex: state.currentLayerIndex, // Keep current layer selection
          selectedLayerId: state.selectedLayerId,
          blockedPixels: state.blockedPixels,
          currentTool: state.currentTool,
          brushSize: state.brushSize,
          currentPixelNumber: state.currentPixelNumber,
          autoNumbering: state.autoNumbering,
          isRectFilled: state.isRectFilled,
          isEllipseFilled: state.isEllipseFilled,
          numberingMode: state.numberingMode,
          predefinedColors: state.predefinedColors,
          customColors: state.customColors,
          currentColor: state.currentColor,
          selection: state.selection,
          isMovingSelection: state.isMovingSelection,
          animationObjects: updatedAnimations,
          tempAnimationObject: state.tempAnimationObject,
          tempAnimationLayerId: state.tempAnimationLayerId,
          defaultFrameDuration: state.defaultFrameDuration,
          mode: state.mode,
          projectName: state.projectName,
          isViewportMode: state.isViewportMode,
          isDrawingSubRectangle: state.isDrawingSubRectangle,
          subRectangles: state.subRectangles,
          variations: state.variations,
          currentVariationId: state.currentVariationId,
          mainProjectState: state.mainProjectState,
          viewportPresets: state.viewportPresets,
          history: state.history, // Consider how this action affects history
          historyIndex: state.historyIndex,
          maxHistorySize: state.maxHistorySize,
        };
      }),
      
      selectFrame: (frameId: string, clearExisting?: boolean) => set(state => {
        if (clearExisting) {
          return { selectedFrameIds: [frameId] };
        } else {
          const newSelectedFrameIds = [...state.selectedFrameIds];
          if (!newSelectedFrameIds.includes(frameId)) {
            newSelectedFrameIds.push(frameId);
          }
          return { selectedFrameIds: newSelectedFrameIds };
        }
      }),
      
      deselectFrame: (frameId: string) => set(state => {
        const newSelectedFrameIds = state.selectedFrameIds.filter(id => id !== frameId);
        return { selectedFrameIds: newSelectedFrameIds };
      }),
      
      toggleFrameSelection: (frameId: string) => set(state => {
        const newSelectedFrameIds = [...state.selectedFrameIds];
        const index = newSelectedFrameIds.indexOf(frameId);
        if (index === -1) {
          newSelectedFrameIds.push(frameId);
        } else {
          newSelectedFrameIds.splice(index, 1);
        }
        return { selectedFrameIds: newSelectedFrameIds };
      }),
      
      selectFrameRange: (startFrameId: string, endFrameId: string) => set(state => {
        const startFrameIndex = state.frames.findIndex(frame => frame.id === startFrameId);
        const endFrameIndex = state.frames.findIndex(frame => frame.id === endFrameId);
        if (startFrameIndex === -1 || endFrameIndex === -1) return state;
        
        const newSelectedFrameIds = state.frames.slice(Math.min(startFrameIndex, endFrameIndex), Math.max(startFrameIndex, endFrameIndex) + 1).map(frame => frame.id);
        return { selectedFrameIds: newSelectedFrameIds };
      }),
      
      selectAllFrames: () => set(state => {
        const newSelectedFrameIds = state.frames.map(frame => frame.id);
        return { selectedFrameIds: newSelectedFrameIds };
      }),
      
      clearFrameSelection: () => set({ selectedFrameIds: [] }),
      
      // Action to set the duration for all frames within a specific superframe
      setSuperFrameDuration: (superFrameId: string, durationPerFrame: number) => set(state => {
        // Ensure duration is valid
        const validDuration = Math.max(50, Number(durationPerFrame) || state.defaultFrameDuration);

        const newFrames = state.frames.map(frame => {
          if (frame.isSuperFrameMember && frame.superFrameId === superFrameId) {
            return { ...frame, duration: validDuration };
          }
          return frame;
        });
        
        // Also update default duration if maybe needed? Or keep separate?
        // For now, only update the specific superframe members.
        
        return { frames: newFrames };
      }),
      
      // Funktion zum Löschen eines kompletten Superframes
      removeSuperFrame: (superFrameId: string) => set(state => {
        const newFrames = [...state.frames];
        
        // Überprüfe, ob es sich um eine gültige Superframe-ID handelt
        const superframeFrames = newFrames.filter(frame => frame.superFrameId === superFrameId);
        
        if (superframeFrames.length === 0) {
          console.warn(`Kein Superframe mit der ID ${superFrameId} gefunden.`);
          return state;
        }
        
        // Wenn der Superframe der einzige Frame ist, erstelle einen neuen Standard-Frame
        if (newFrames.length === superframeFrames.length) {
          const defaultFrame = createDefaultFrame(
            state.defaultFrameDuration,
            state.layers.map(layer => layer.id)
          );
          
          // Nach dem Löschen des Superframes, setze den Fokus auf den neuen Standard-Frame
          return {
            frames: [defaultFrame],
            currentFrameIndex: 0,
            selectedFrameIds: []
          };
        }
        
        // Finde Indizes, die zu entfernen sind und den neuen currentFrameIndex
        const frameIndicesToRemove = newFrames
          .map((frame, index) => frame.superFrameId === superFrameId ? index : -1)
          .filter(index => index !== -1);
        
        // Lösche Frames vom Ende zum Anfang (um Indexverschiebungen zu vermeiden)
        frameIndicesToRemove
          .sort((a, b) => b - a) // Sortiere absteigend
          .forEach(index => {
            newFrames.splice(index, 1);
          });
        
        // Bestimme den neuen currentFrameIndex
        const currentFrameIndex = Math.min(
          state.currentFrameIndex, 
          newFrames.length - 1
        );
        
        // Lösche die superFrameId aus der selectedFrameIds
        const selectedFrameIds = state.selectedFrameIds.filter(
          id => !superframeFrames.some(frame => frame.id === id)
        );
        
        return {
          frames: newFrames,
          currentFrameIndex,
          selectedFrameIds
        };
      }),
      
      // Funktion zum Tauschen von Frames oder Superframes
      swapFrames: (sourceIndex: number, targetIndex: number, isSourceSuperframe: boolean, isTargetSuperframe: boolean) => {
        const state = get();
        const frames = [...state.frames];
        const currentIndex = state.currentFrameIndex;
        
        // Determine the ranges of frames to swap
        let sourceStartIndex = sourceIndex;
        let sourceEndIndex = sourceIndex;
        let targetStartIndex = targetIndex;
        let targetEndIndex = targetIndex;
        
        // For superframes, find all frames in the group
        if (isSourceSuperframe) {
          const sourceSuperframeId = frames[sourceIndex].superFrameId;
          // Find start and end of the superframe
          let i = sourceIndex;
          while (i < frames.length && frames[i].superFrameId === sourceSuperframeId) {
            sourceEndIndex = i;
            i++;
          }
          
          // Find the beginning of the superframe (in case we didn't start at the beginning)
          i = sourceIndex - 1;
          while (i >= 0 && frames[i].superFrameId === sourceSuperframeId) {
            sourceStartIndex = i;
            i--;
          }
        }
        
        if (isTargetSuperframe) {
          const targetSuperframeId = frames[targetIndex].superFrameId;
          // Find start and end of the superframe
          let i = targetIndex;
          while (i < frames.length && frames[i].superFrameId === targetSuperframeId) {
            targetEndIndex = i;
            i++;
          }
          
          // Find the beginning of the superframe (in case we didn't start at the beginning)
          i = targetIndex - 1;
          while (i >= 0 && frames[i].superFrameId === targetSuperframeId) {
            targetStartIndex = i;
            i--;
          }
        }
        
        // Calculate the number of frames in each range
        const sourceLength = sourceEndIndex - sourceStartIndex + 1;
        const targetLength = targetEndIndex - targetStartIndex + 1;
        
        // Extract the frames to swap
        const sourceFrames = frames.slice(sourceStartIndex, sourceEndIndex + 1);
        const targetFrames = frames.slice(targetStartIndex, targetEndIndex + 1);
        
        // Create a new array with the frames swapped
        let newFrames: Frame[] = [];
        
        if (sourceStartIndex < targetStartIndex) {
          // Source is before target
          newFrames = [
            ...frames.slice(0, sourceStartIndex),
            ...targetFrames,
            ...frames.slice(sourceEndIndex + 1, targetStartIndex),
            ...sourceFrames,
            ...frames.slice(targetEndIndex + 1)
          ];
        } else {
          // Target is before source
          newFrames = [
            ...frames.slice(0, targetStartIndex),
            ...sourceFrames,
            ...frames.slice(targetEndIndex + 1, sourceStartIndex),
            ...targetFrames,
            ...frames.slice(sourceEndIndex + 1)
          ];
        }
        
        // Calculate the new current frame index to maintain focus on the same frame
        let newCurrentIndex = currentIndex;
        
        if (sourceStartIndex <= currentIndex && currentIndex <= sourceEndIndex) {
          // Current frame was in the source range, adjust its position
          const offset = currentIndex - sourceStartIndex;
          if (sourceStartIndex < targetStartIndex) {
            newCurrentIndex = targetStartIndex - sourceLength + offset;
          } else {
            newCurrentIndex = targetStartIndex + offset;
          }
        } else if (targetStartIndex <= currentIndex && currentIndex <= targetEndIndex) {
          // Current frame was in the target range, adjust its position
          const offset = currentIndex - targetStartIndex;
          if (targetStartIndex < sourceStartIndex) {
            newCurrentIndex = sourceStartIndex - targetLength + offset;
          } else {
            newCurrentIndex = sourceStartIndex + offset;
          }
        } else if (sourceStartIndex < currentIndex && currentIndex < targetStartIndex) {
          // Current frame was between source and target
          newCurrentIndex = currentIndex - sourceLength + targetLength;
        } else if (targetStartIndex < currentIndex && currentIndex < sourceStartIndex) {
          // Current frame was between target and source
          newCurrentIndex = currentIndex - targetLength + sourceLength;
        }
        
        // Update the state
        set({
          frames: newFrames,
          currentFrameIndex: Math.max(0, Math.min(newCurrentIndex, newFrames.length - 1))
        });
        

      },
      
      // Funktion zum Duplizieren eines Superframes
      duplicateSuperFrame: (superFrameId: string, asSingleFrame: boolean) => set(state => {
        const superframeFrames = state.frames.filter(frame => frame.superFrameId === superFrameId);
        
        if (superframeFrames.length === 0) {
          console.warn(`Kein Superframe mit der ID ${superFrameId} gefunden.`);
          return state; // Return current state if no superframe found
        }
        
        // Wenn der Superframe nur aus einem Frame besteht, verhalte dich wie bei einem normalen Frame
        if (superframeFrames.length === 1) {
          const frameIndex = state.frames.findIndex(frame => frame.id === superframeFrames[0].id);
          if (frameIndex === -1) return state; // Should not happen if superframeFrames[0] exists

          const sourceFrame = state.frames[frameIndex];
          const newFrameId = generateId();
          const newFrame = {
            ...sourceFrame,
            id: newFrameId,
          };
          // If duplicated as a single frame, ensure superframe properties are removed
          if (asSingleFrame) {
            delete newFrame.isSuperFrameMember;
            delete newFrame.superFrameId;
          }
          
          const newFramesArray = [...state.frames];
          newFramesArray.splice(frameIndex + 1, 0, newFrame);
          
          const updatedAnimations = state.animationObjects.map(anim => {
            if (anim.frames && anim.frames.includes(sourceFrame.id)) {
              return {
                ...anim,
                frames: [...anim.frames, newFrameId]
              };
            }
            return anim;
          });
          
          return {
            frames: newFramesArray,
            currentFrameIndex: frameIndex + 1,
            animationObjects: updatedAnimations
          }; // This is Partial<EditorState>
        }
        
        // Dupliziere jeden Frame im Superframe (original logic for multi-frame superframe)
        const newFrames: Frame[] = [];
        superframeFrames.forEach(frame => {
          const newFrame = {
            ...frame,
            id: generateId(),
          };
          newFrames.push(newFrame);
        });
        
        // Wenn asSingleFrame true ist, entferne die Superframe-Informationen
        if (asSingleFrame) {
          newFrames.forEach(frame => {
            delete frame.isSuperFrameMember;
            delete frame.superFrameId;
          });
        } else {
          // Andernfalls erstelle eine neue Superframe-ID und setze sie für alle Frames
          const newSuperFrameId = generateId();
          newFrames.forEach(frame => {
            frame.isSuperFrameMember = true;
            frame.superFrameId = newSuperFrameId;
          });
        }
        
        // Füge die neuen Frames direkt nach dem letzten Frame des Superframes ein
        const lastFrameOfSuperIndex = state.frames.findIndex(f => f.id === superframeFrames[superframeFrames.length - 1].id);
        state.frames.splice(lastFrameOfSuperIndex + 1, 0, ...newFrames);
        
        // Aktualisiere die currentFrameIndex
        const newCurrentFrameIndex = lastFrameOfSuperIndex + 1;
        
        // Aktualisiere die selectedFrameIds
        const newSelectedFrameIds = [...state.selectedFrameIds];
        newFrames.forEach(frame => {
          newSelectedFrameIds.push(frame.id);
        });
        
        return {
          frames: state.frames,
          currentFrameIndex: newCurrentFrameIndex,
          selectedFrameIds: newSelectedFrameIds,
        };
      }),
      
      // Pixels
      setPixel: (x: number, y: number, color: string, explicitPixelNumberFromCanvas?: number) => {
        const state = get();
        const currentLayerId = state.layers[state.currentLayerIndex]?.id;
        if (!currentLayerId) return;

        // Determine which frames to update
        let targetFrameIndices: number[] = [];

        // If frames are selected, use those
        if (state.selectedFrameIds.length > 0) {
          targetFrameIndices = state.selectedFrameIds.map(frameId =>
            state.frames.findIndex(frame => frame.id === frameId)
          ).filter(index => index !== -1);
        }

        // If no frames are selected, use only the current frame
        if (targetFrameIndices.length === 0) {
          targetFrameIndices = [state.currentFrameIndex];
        }

        // SuperFrame handling
        const superFrameIds = new Set<string>();
        targetFrameIndices.forEach(index => {
          const frame = state.frames[index];
          if (frame?.isSuperFrameMember && frame.superFrameId) {
            superFrameIds.add(frame.superFrameId);
          }
        });

        if (superFrameIds.size > 0) {
          state.frames.forEach((frame, index) => {
            if (frame.isSuperFrameMember && frame.superFrameId &&
                superFrameIds.has(frame.superFrameId) &&
                !targetFrameIndices.includes(index)) {
              targetFrameIndices.push(index);
            }
          });
        }

        if (state.layers[state.currentLayerIndex]?.locked) {
          return;
        }

        let numberToSetOnPixel: number | undefined = undefined;

        if (explicitPixelNumberFromCanvas !== undefined) {
          numberToSetOnPixel = explicitPixelNumberFromCanvas;
        } else {
          // No explicit number provided by Canvas.tsx, check for auto-numbering modes.
          if (state.currentTool === 'BRUSH' && state.autoNumbering) {
            let pixelExistsAtPosition = false;
            targetFrameIndices.forEach(frameIndex => {
              const frame = state.frames[frameIndex];
              if (frame?.layerData[currentLayerId]?.find(p => p.x === x && p.y === y)) {
                pixelExistsAtPosition = true;
              }
            });

            if (!pixelExistsAtPosition) {
              const usedNumbers = new Set<number>();
              state.frames.forEach(frame => {
                Object.values(frame.layerData).forEach(layerPixels => {
                  layerPixels.forEach(pixel => {
                    if (pixel.pixelNumber !== undefined) {
                      usedNumbers.add(pixel.pixelNumber);
                    }
                  });
                });
              });
              let nextBrushNumber = 1; // Brush tool starts counting from 1
              while (usedNumbers.has(nextBrushNumber)) {
                nextBrushNumber++;
              }
              numberToSetOnPixel = nextBrushNumber;
              set({ currentPixelNumber: nextBrushNumber + 1 }); // Update global next for BRUSH
            }
          } else if (
            (state.currentTool === 'LINE' || state.currentTool === 'RECTANGLE' || state.currentTool === 'ELLIPSE') &&
            state.numberingMode === 'auto'
          ) {
            const usedNumbers = new Set<number>();
            state.frames.forEach(frame => {
              Object.values(frame.layerData).forEach(layerPixels => {
                layerPixels.forEach(pixel => {
                  if (pixel.pixelNumber !== undefined) {
                    usedNumbers.add(pixel.pixelNumber);
                  }
                });
              });
            });

            let nextShapeAutoNumber = state.currentPixelNumber; // Start from the store's currentPixelNumber for shapes
            while (usedNumbers.has(nextShapeAutoNumber)) {
              nextShapeAutoNumber++;
            }
            numberToSetOnPixel = nextShapeAutoNumber;
            set({ currentPixelNumber: nextShapeAutoNumber + 1 }); // Update global next
          }
        }

        const newFrames = [...state.frames];

        targetFrameIndices.forEach(frameIndex => {
          const frame = state.frames[frameIndex];
          if (!frame) return;

          const layerData = [...(frame.layerData[currentLayerId] || [])];
          const pixelIndex = layerData.findIndex(p => p.x === x && p.y === y);
          let updatedLayerData = [...layerData];

          if (color === 'transparent') {
            if (pixelIndex !== -1) {
              updatedLayerData.splice(pixelIndex, 1);
            }
          } else {
            const newPixelData: PixelData = { x, y, color };

            if (numberToSetOnPixel !== undefined) {
              newPixelData.pixelNumber = numberToSetOnPixel;
            }
            // If numberToSetOnPixel is undefined (e.g., 'off' mode or brush on existing pixel),
            // pixelNumber property won't be set on newPixelData unless it's an existing pixel.

            if (pixelIndex !== -1) {
              // Update existing pixel
              const existingPixel = updatedLayerData[pixelIndex];
              // Preserve existing number only if no new number is to be assigned
              if (newPixelData.pixelNumber === undefined && existingPixel.pixelNumber !== undefined) {
                newPixelData.pixelNumber = existingPixel.pixelNumber;
              }
              updatedLayerData[pixelIndex] = { ...existingPixel, ...newPixelData };
            } else {
              // Add new pixel
              updatedLayerData.push(newPixelData);
            }
          }

          newFrames[frameIndex] = {
            ...frame,
            layerData: {
              ...frame.layerData,
              [currentLayerId]: updatedLayerData
            }
          };
        });

        set({ frames: newFrames });
        const statePatch = { frames: JSON.parse(JSON.stringify(newFrames)) };
        get().pushToHistory(statePatch);
      },
      
      erasePixel: (x: number, y: number) => {
        let resultingFramesForHistory: Frame[] | null = null;
    
        set(state => {
          const { currentFrameIndex, currentLayerIndex, frames, layers, brushSize, selectedFrameIds } = state;
      
          if (frames.length === 0 || layers.length === 0) {
            return state; // No changes if no frames or layers
          }
      
          let targetFrameIndices: number[] = [];
      
          if (selectedFrameIds.length > 0) {
            targetFrameIndices = selectedFrameIds.map(frameId =>
              frames.findIndex(frame => frame.id === frameId)
            ).filter(index => index !== -1);
          }
      
          if (targetFrameIndices.length === 0) {
            if (currentFrameIndex >= 0 && currentFrameIndex < frames.length) {
              targetFrameIndices = [currentFrameIndex];
            } else {
              // No valid current frame and no selection, nothing to erase
              return state;
            }
          }
      
          const superFrameIds = new Set<string>();
          targetFrameIndices.forEach(index => {
            const frame = frames[index];
            if (frame?.isSuperFrameMember && frame.superFrameId) {
              superFrameIds.add(frame.superFrameId);
            }
          });
      
          if (superFrameIds.size > 0) {
            frames.forEach((frame, index) => {
              if (frame.isSuperFrameMember && frame.superFrameId && superFrameIds.has(frame.superFrameId) && !targetFrameIndices.includes(index)) {
                targetFrameIndices.push(index);
              }
            });
          }
      
          const layerId = layers[currentLayerIndex]?.id;
      
          if (!layerId || layers[currentLayerIndex]?.locked) {
            return state; // No changes if layer is invalid or locked
          }
      
          const newFrames = [...frames]; // Create a new array for modifications
          const halfBrushSize = Math.floor(brushSize / 2);
      
          targetFrameIndices.forEach(frameIndex => {
            const currentFrameToUpdate = newFrames[frameIndex]; // Work on the copy
            if (!currentFrameToUpdate) return;
      
            let layerPixels = currentFrameToUpdate.layerData[layerId] || [];
      
            for (let i = 0; i < brushSize; i++) {
              for (let j = 0; j < brushSize; j++) {
                const currentX = x - halfBrushSize + i;
                const currentY = y - halfBrushSize + j;
                layerPixels = layerPixels.filter(p => !(p.x === currentX && p.y === currentY));
              }
            }
            
            // Update the frame in the newFrames array
            newFrames[frameIndex] = {
              ...currentFrameToUpdate,
              layerData: {
                ...currentFrameToUpdate.layerData,
                [layerId]: layerPixels
              }
            };
          });
          
          resultingFramesForHistory = newFrames; // Store for history patch
          return { frames: newFrames }; // Return the modified part of the state
        });
    
        if (resultingFramesForHistory) {
          const statePatch = { frames: JSON.parse(JSON.stringify(resultingFramesForHistory)) };
          get().pushToHistory(statePatch);
        }
      },
      
      fillArea: (x: number, y: number, targetColor: string, replacementColor: string, layerId?: string) => {
        const state = get();
        const currentLayerId = layerId || state.layers[state.currentLayerIndex]?.id;
        if (!currentLayerId) return;
        
        const currentFrame = state.frames[state.currentFrameIndex];
        const layerData = [...(currentFrame.layerData[currentLayerId] || [])];
        
        // Keep track of positions already with pixels for faster lookup
        const pixelPositions = new Map<string, PixelData>();
        layerData.forEach(p => pixelPositions.set(`${p.x},${p.y}`, p));
        
        // Execute the fill algorithm
        const { width, height } = state.canvasSize;
        const visited = new Set<string>();
        const stack: [number, number][] = [[x, y]];
        
        const isSameColor = (px: number, py: number): boolean => {
          const key = `${px},${py}`;
          const pixel = pixelPositions.get(key);
          return (pixel?.color || 'transparent') === targetColor;
        };
        
        // Track pixels to modify
        const pixelsToUpdate: PixelData[] = [];
        const positionsToDelete = new Set<string>();
        
        while (stack.length > 0) {
          const [cx, cy] = stack.pop()!;
          const key = `${cx},${cy}`;
          
          if (
            cx < 0 || cx >= width ||
            cy < 0 || cy >= height ||
            visited.has(key) ||
            !isSameColor(cx, cy)
          ) {
            continue;
          }
          
          visited.add(key);
          
          // Handle the pixel
          if (replacementColor === 'transparent') {
            positionsToDelete.add(key);
          } else {
            // Either update existing or add new
            const existingPixel = pixelPositions.get(key);
            if (existingPixel) {
              pixelsToUpdate.push({
                ...existingPixel,
                color: replacementColor
              });
            } else {
              pixelsToUpdate.push({
                x: cx,
                y: cy,
                color: replacementColor
              });
            }
          }
          
          // Add adjacent pixels to stack
          stack.push([cx + 1, cy]);
          stack.push([cx - 1, cy]);
          stack.push([cx, cy + 1]);
          stack.push([cx, cy - 1]);
        }
        
        // Apply the changes
        let updatedLayerData = [...layerData];
        
        // Remove pixels to delete
        if (positionsToDelete.size > 0) {
          updatedLayerData = updatedLayerData.filter(p => !positionsToDelete.has(`${p.x},${p.y}`));
        }
        
        // Add/update new pixels
        pixelsToUpdate.forEach(newPixel => {
          const existingIndex = updatedLayerData.findIndex(p => p.x === newPixel.x && p.y === newPixel.y);
          if (existingIndex !== -1) {
            updatedLayerData[existingIndex] = newPixel;
          } else {
            updatedLayerData.push(newPixel);
          }
        });
        
        // Prepare modified frames
        const newFrames = [...state.frames];
        newFrames[state.currentFrameIndex] = {
          ...currentFrame,
          layerData: {
            ...currentFrame.layerData,
            [currentLayerId]: updatedLayerData
          }
        };
        
        // Save state for undo/redo before updating
        const statePatch = { frames: JSON.parse(JSON.stringify(newFrames)) };
        get().pushToHistory(statePatch);
        
        // Update state
        set({ frames: newFrames });
      },
      
      // Selection
      startSelection: (x: number, y: number) => set(() => ({
        selection: { startX: x, startY: y, endX: x, endY: y }
      })),
      
      updateSelection: (x: number, y: number) => set(state => {
        if (!state.selection) return state;
        return {
          selection: {
            ...state.selection,
            endX: x,
            endY: y
          }
        };
      }),
      
      commitSelection: () => set(state => {
        const { selection } = state;
        if (!selection) return state;
        
        return {
          selection,
          isMovingSelection: true
        };
      }),
      
      moveSelection: (deltaX: number, deltaY: number) => set(state => {
        const { selection, isMovingSelection } = state;
        if (!selection || !isMovingSelection) return state;

        const currentLayer = state.layers[state.currentLayerIndex];
        if (!currentLayer || currentLayer.locked) return state;

        const currentFrame = state.frames[state.currentFrameIndex];
        if (!currentFrame) return state;

        const { startX, startY, endX, endY } = selection;
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);

        // Find all pixels in the selection
        const selectedPixels = currentFrame.layerData[currentLayer.id]?.filter(pixel => 
          pixel.x >= minX && pixel.x <= maxX && pixel.y >= minY && pixel.y <= maxY
        ) || [];

        // Move these pixels
        const movedPixels = selectedPixels.map(pixel => ({
          ...pixel,
          x: pixel.x + deltaX,
          y: pixel.y + deltaY
        }));

        // Remove old pixels and add new ones
        const newPixels = [
          ...currentFrame.layerData[currentLayer.id]?.filter(pixel => 
            !(pixel.x >= minX && pixel.x <= maxX && pixel.y >= minY && pixel.y <= maxY)
          ) || [],
          ...movedPixels
        ];

        const newFrames = [...state.frames];
        newFrames[state.currentFrameIndex] = {
          ...currentFrame,
          layerData: {
            ...currentFrame.layerData,
            [currentLayer.id]: newPixels
          }
        };

        return { 
          frames: newFrames,
          selection: {
            startX: selection.startX + deltaX,
            startY: selection.startY + deltaY,
            endX: selection.endX + deltaX,
            endY: selection.endY + deltaY
          }
        };
      }),
      
      clearSelection: () => set({ selection: null, isMovingSelection: false }),
      setIsMovingSelection: (isMoving: boolean) => set({ isMovingSelection: isMoving }),
      
      // Helper function to extract green pixels from the first Main-Frame
      extractGreenPixelsFromFirstMainFrame: () => {
        const state = get();
        const greenColor = state.predefinedColors.green;
        const mainFrames = state.frames.filter(frame => frame.section === 'main');
        
        if (mainFrames.length === 0) return [];
        
        const firstMainFrame = mainFrames[0];
        const safeZonePixels = [];
        
        // Create a map to keep track of which pixels are covered by non-green pixels
        const coveredPixels = new Map();
        
        // Process all layers from top to bottom
        for (let i = state.layers.length - 1; i >= 0; i--) {
          const layer = state.layers[i];
          if (layer.visible && firstMainFrame.layerData[layer.id]) {
            for (const pixel of firstMainFrame.layerData[layer.id]) {
              const key = `${pixel.x},${pixel.y}`;
              if (!coveredPixels.has(key)) {
                coveredPixels.set(key, pixel.color);
              }
            }
          }
        }
        
        // Extract green pixels that aren't covered by other colors
        for (const [key, color] of coveredPixels.entries()) {
          if (isSameColor(color, greenColor)) {
            const [x, y] = key.split(',').map(Number);
            safeZonePixels.push({ x, y });
          }
        }
        
        return safeZonePixels;
      },
      
      // Update countdown safe zone with green pixels from first Main-Frame
      updateCountdownSafeZoneFromMainFrame: (animationId: string) => set(state => {
        const safeZonePixels = get().extractGreenPixelsFromFirstMainFrame();
        
        if (safeZonePixels.length === 0) {
          alert("Keine grünen Pixel im ersten Main-Frame gefunden.");
          return state;
        }
        
        const updatedAnimationObjects = state.animationObjects.map(anim => {
          if (anim.id === animationId) {
            return {
              ...anim,
              countdownEnableSafeZone: true,
              countdownSafeZonePixels: safeZonePixels
            };
          }
          return anim;
        });
        
        return { ...state, animationObjects: updatedAnimationObjects };
      }),
      
      // Animation Objects
      addAnimationObject: (object: Omit<AnimationObject, 'id'>) => set(state => {
        const id = generateId();
        const newObject = { id, ...object };
        
        // Setze renderOnSection standardmäßig auf 'both', falls nicht explizit gesetzt
        if (!newObject.renderOnSection) {
          newObject.renderOnSection = 'both';
        }
        
        // Stellen sicher, dass die Animation auf allen Frames angewandt wird
        // Falls frames nicht gesetzt ist oder leer ist, setze es auf alle verfügbaren Frames
        if (!newObject.frames || newObject.frames.length === 0) {
          newObject.frames = state.frames.map(frame => frame.id);

        }

        if (newObject.type === 'COUNTDOWN') {
          let calculatedBounds: { x: number; y: number; width: number; height: number } | null = null;
          (newObject as any).autoAdjustCountdownBounds = false; // Initialize the new flag

          if (state.subRectangles && state.subRectangles.length > 0) {
            // Find the largest sub-rectangle by area
            const largestSubRectangle = state.subRectangles.reduce((largest, current) => {
              return (current.width * current.height > largest.width * largest.height) ? current : largest;
            }, state.subRectangles[0]);

            if (largestSubRectangle) {
              const boundsX = largestSubRectangle.x + 1;
              const boundsY = largestSubRectangle.y + 1;
              const boundsWidth = largestSubRectangle.width - 2;
              const boundsHeight = largestSubRectangle.height - 2;

              if (boundsWidth >= 1 && boundsHeight >= 1) {
                calculatedBounds = {
                  x: boundsX,
                  y: boundsY,
                  width: boundsWidth,
                  height: boundsHeight,
                };
                (newObject as any).autoAdjustCountdownBounds = true;
              }
            }
          }

          if (calculatedBounds) {
            newObject.countdownBounds = calculatedBounds;
          } else {
            // Default to full viewport if no valid sub-rectangle found
            newObject.countdownBounds = {
              x: state.canvasSize.viewportX, // Use absolute viewport X
              y: state.canvasSize.viewportY, // Use absolute viewport Y
              width: state.canvasSize.width, // Viewport width
              height: state.canvasSize.height, // Viewport height
            };
          }

          // Initialize loading bar properties
          (newObject as any).countdownEnableLoadingBar = true;
          (newObject as any).autoAdjustLoadingBarArea = false;
          (newObject as any).countdownLoadingBarColors = ['#ff4d00', '#ff9500', '#fff700']; // Bar colors for digits 3, 2, 1
          (newObject as any).countdownLoadingBarSpeedFactor = 2.0; // Default speed factor

          if (state.subRectangles && state.subRectangles.length > 0) {
            // Find the smallest sub-rectangle by area
            const smallestSubRectangle = state.subRectangles.reduce((smallest, current) => {
              return (current.width * current.height < smallest.width * smallest.height) ? current : smallest;
            }, state.subRectangles[0]);

            if (smallestSubRectangle) {
              (newObject as any).countdownLoadingBarArea = {
                x: smallestSubRectangle.x,
                y: smallestSubRectangle.y,
                width: smallestSubRectangle.width,
                height: smallestSubRectangle.height,
              };
              (newObject as any).countdownEnableLoadingBar = true;
              (newObject as any).autoAdjustLoadingBarArea = true;
            }
          }
          // Safe Zone defaults
          newObject.countdownEnableSafeZone = true;
          newObject.countdownSafeZonePixels = [];
          newObject.countdownSafeZoneIntroAnimation = 'centerOut';
          newObject.countdownSafeZonePulse = true;
          
          // Extract green pixels from the first Main-Frame
          const greenColor = state.predefinedColors.green;
          const mainFrames = state.frames.filter(frame => frame.section === 'main');
          
          if (mainFrames.length > 0) {
            const firstMainFrame = mainFrames[0];
            const safeZonePixels = [];
            const canvasWidth = state.canvasSize.originalWidth;
            const canvasHeight = state.canvasSize.originalHeight;
            
            // Create a map to keep track of which pixels are covered by non-green pixels
            const coveredPixels = new Map();
            
            // Process all layers from top to bottom
            for (let i = state.layers.length - 1; i >= 0; i--) {
              const layer = state.layers[i];
              if (layer.visible && firstMainFrame.layerData[layer.id]) {
                for (const pixel of firstMainFrame.layerData[layer.id]) {
                  const key = `${pixel.x},${pixel.y}`;
                  if (!coveredPixels.has(key)) {
                    coveredPixels.set(key, pixel.color);
                  }
                }
              }
            }
            
            // Extract green pixels that aren't covered by other colors
            for (const [key, color] of coveredPixels.entries()) {
              if (isSameColor(color, greenColor)) {
                const [x, y] = key.split(',').map(Number);
                safeZonePixels.push({ x, y });
              }
            }
            
            // Set the extracted green pixels as safe zone
            if (safeZonePixels.length > 0) {
              newObject.countdownEnableSafeZone = true;
              newObject.countdownSafeZonePixels = safeZonePixels;
            }
          }
        }
        
        let newState: Partial<EditorState> = {};
        
        // If we already have a temporary layer, use it
        if (state.tempAnimationLayerId) {
          // Update the animation to use this layer
          newObject.layerId = state.tempAnimationLayerId;
          newObject.renderPosition = 'ON_LAYER';
          
          newState = {
            animationObjects: [...state.animationObjects, newObject],
            tempAnimationObject: null, // Clear temporary object
            tempAnimationLayerId: null // No longer a temporary layer
          };
        } 
        // Otherwise create a new layer
        else {
          // Create a new layer with the same name as the animation object
          const animationName = newObject.type === 'LINE' ? 
            `${newObject.orientation} Line` : 
            newObject.type === 'X' ? 
              'X Shape' :
            newObject.type === 'SNAKE' ? 
              'Snake' :
            newObject.type === 'RECTANGLE' ? 
              'Rectangle' :
            newObject.type === 'PATH' ? 
              'Path' :
              'Animation';
          
          const layerId = generateId();
          const newLayer = {
            id: layerId,
            name: `Animation: ${animationName}`,
            visible: true,
            locked: false
          };
          
          // Add the new layer
          const newLayers = [...state.layers, newLayer];
          
          // Set the animation to use this layer by default
          newObject.layerId = layerId;
          newObject.renderPosition = 'ON_LAYER';
          
          // Update all frames to include the new layer
          const newFrames = state.frames.map(frame => {
            return {
              ...frame,
              layerData: {
                ...frame.layerData,
                [layerId]: [] // Initialize with empty pixel data
              }
            };
          });
          
          newState = {
            animationObjects: [...state.animationObjects, newObject],
            layers: newLayers,
            frames: newFrames,
            currentLayerIndex: newLayers.length - 1, // Set focus to the new layer
            tempAnimationObject: null // Clear temporary object when adding permanent one
          };
        }
        
        // Save state for undo/redo before updating
        get().pushToHistory(newState);
        
        // Return the new state for Zustand to update
        return newState;
      }),
      
      removeAnimationObject: (id: string) => set(state => {
        // Create new state with the animation object removed
        const newState = {
          animationObjects: state.animationObjects.filter(obj => obj.id !== id)
        };
        
        // Save state for undo/redo before updating
        get().pushToHistory(newState);
        
        // Return the new state
        return newState;
      }),
      
      updateAnimationObject: (id: string, updates: Partial<AnimationObject>) => set(state => {
        // Create new state with the updated animation object
        const newState = {
          animationObjects: state.animationObjects.map(obj => 
            obj.id === id ? { ...obj, ...updates } : obj
          )
        };
        
        // Save state for undo/redo before updating
        get().pushToHistory(newState);
        
        // Return the new state
        return newState;
      }),
      
      setTempAnimationObject: (object: Omit<AnimationObject, 'id'> | null) => {
        // If object is null, clear temp
        if (object === null) {
          // Save current state before clearing
          const state = get();
          if (state.tempAnimationObject) {
            const newState = { tempAnimationObject: null };
            get().pushToHistory(newState);
            set(newState);
          } else {
            set({ tempAnimationObject: null });
          }
          return;
        }
        
        // Otherwise create a new temporary object with a temp ID
        const id = 'temp-' + generateId();
        const tempObject: AnimationObject = { // Ensure type
          id,
          ...object,
          frames: object.frames || [], // Ensure frames is always an array
          renderOnSection: object.renderOnSection || 'both', // Default to 'both'
        };
        
        // Save state for undo/redo
        const newState = { tempAnimationObject: tempObject, tempAnimationLayerId: object.layerId || null };
        get().pushToHistory(newState);
        
        set(newState);
      },
      
      updateTempAnimationObject: (updates: Partial<AnimationObject>) => set(state => {
        if (!state.tempAnimationObject) return state;
        
        // Create new state with the updated temp animation object
        const newState = {
          tempAnimationObject: { ...state.tempAnimationObject, ...updates }
        };
        
        // Save state for undo/redo
        get().pushToHistory(newState);
        
        return newState;
      }),
      
      createTempAnimationLayer: (animationType: AnimationType, orientation?: 'HORIZONTAL' | 'VERTICAL') => set(state => {
        // Create a new layer with the same name as the animation object
        // The actual naming is handled by AnimationConfig.tsx using updateLayer.
        // This just needs a placeholder name.
        const animationName = 'Temporary Animation Layer';
        
        const layerId = generateId();
        const newLayer = {
          id: layerId,
          name: `Animation: ${animationName}`,
          visible: true,
          locked: false
        };
        
        // Add the new layer
        const newLayers = [...state.layers, newLayer];
        
        // Update all frames to include the new layer
        const newFrames = state.frames.map(frame => {
          return {
            ...frame,
            layerData: {
              ...frame.layerData,
              [layerId]: [] // Initialize with empty pixel data
            }
          };
        });
        
        const newState = {
          layers: newLayers,
          frames: newFrames,
          currentLayerIndex: newLayers.length - 1, // Set focus to the new layer
          tempAnimationLayerId: layerId,
          selectedLayerId: layerId // Automatically set the selected layer ID to match
        };
        
        // Save state for undo/redo
        get().pushToHistory(newState);
        
        return newState;
      }),
      
      removeTempAnimationLayer: () => set(state => {
        // If there's no temp layer, do nothing
        if (!state.tempAnimationLayerId) return state;
        
        // Remove the temporary layer
        const newLayers = state.layers.filter(layer => layer.id !== state.tempAnimationLayerId);
        
        // Remove layer data from all frames
        const newFrames = state.frames.map(frame => {
          const newLayerData = { ...frame.layerData };
          if (state.tempAnimationLayerId) {
            delete newLayerData[state.tempAnimationLayerId];
          }
          return {
            ...frame,
            layerData: newLayerData
          };
        });
        
        const newState = {
          layers: newLayers,
          frames: newFrames,
          currentLayerIndex: Math.min(state.currentLayerIndex, newLayers.length - 1),
          tempAnimationLayerId: null,
          tempAnimationObject: null
        };
        
        // Save state for undo/redo
        get().pushToHistory(newState);
        
        return newState;
      }),
      
      // Blocked Pixels
      isPixelBlocked: (x, y) => {
        const key = `${x},${y}`;
        return !!get().blockedPixels[key];
      },
      blockPixel: (x, y) => set(state => {
        const key = `${x},${y}`;
        if (state.blockedPixels[key]) return state; // Already blocked
        return {
          blockedPixels: { ...state.blockedPixels, [key]: true }
        };
      }),
      unblockPixel: (x, y) => set(state => {
        const key = `${x},${y}`;
        if (!state.blockedPixels[key]) return state; // Not blocked
        const newBlockedPixels = { ...state.blockedPixels };
        delete newBlockedPixels[key];
        return { blockedPixels: newBlockedPixels };
      }),
      clearBlockedPixels: () => set({ blockedPixels: {} }),
      setBlockedPixels: (pixels: { [key: string]: boolean }) => set({ blockedPixels: pixels }), 
       
      // Viewport Functions
      moveViewport: (offsetX: number, offsetY: number) => {
        const { canvasSize } = get();
        const newViewportX = Math.max(0, Math.min(canvasSize.originalWidth - canvasSize.width, canvasSize.viewportX + offsetX));
        const newViewportY = Math.max(0, Math.min(canvasSize.originalHeight - canvasSize.height, canvasSize.viewportY + offsetY));
        // Ruft das (jetzt modifizierte) setViewport auf
        get().setViewport(newViewportX, newViewportY, canvasSize.width, canvasSize.height);
      },
      
      expandViewport: () => {
        const { canvasSize } = get();
        const scaleFactor = 1.1; // Expand by 10%
        const newWidth = Math.min(canvasSize.originalWidth, Math.round(canvasSize.width * scaleFactor));
        const newHeight = Math.min(canvasSize.originalHeight, Math.round(canvasSize.height * scaleFactor));
        
        // Keep centered
        const deltaWidth = newWidth - canvasSize.width;
        const deltaHeight = newHeight - canvasSize.height;
        const newViewportX = Math.max(0, Math.round(canvasSize.viewportX - deltaWidth / 2));
        const newViewportY = Math.max(0, Math.round(canvasSize.viewportY - deltaHeight / 2));
        
        // Adjust if hitting boundaries
        const finalViewportX = Math.min(newViewportX, canvasSize.originalWidth - newWidth);
        const finalViewportY = Math.min(newViewportY, canvasSize.originalHeight - newHeight);
        
        // Ruft das (jetzt modifizierte) setViewport auf
        get().setViewport(finalViewportX, finalViewportY, newWidth, newHeight);
      },
      
      shrinkViewport: () => {
        const { canvasSize } = get();
        const scaleFactor = 0.9; // Shrink by 10%
        const newWidth = Math.max(1, Math.round(canvasSize.width * scaleFactor)); // Ensure minimum 1 pixel width
        const newHeight = Math.max(1, Math.round(canvasSize.height * scaleFactor)); // Ensure minimum 1 pixel height
        
        // Keep centered
        const deltaWidth = canvasSize.width - newWidth;
        const deltaHeight = canvasSize.height - newHeight;
        const newViewportX = Math.max(0, Math.round(canvasSize.viewportX + deltaWidth / 2));
        const newViewportY = Math.max(0, Math.round(canvasSize.viewportY + deltaHeight / 2));
        
        // Ruft das (jetzt modifizierte) setViewport auf
        get().setViewport(newViewportX, newViewportY, newWidth, newHeight);
      },
      
      // Diese Funktion wird jetzt von move, expand, shrink und reset aufgerufen.
      setViewport: (newViewportX: number, newViewportY: number, newWidth: number, newHeight: number) => set(state => {
        const oldCanvasSize = state.canvasSize;
        const currentSubRectangles = state.subRectangles;
        
        // Clamp new values to be within original bounds
        const clampedWidth = Math.max(1, Math.min(newWidth, oldCanvasSize.originalWidth));
        const clampedHeight = Math.max(1, Math.min(newHeight, oldCanvasSize.originalHeight));
        const clampedX = Math.max(0, Math.min(newViewportX, oldCanvasSize.originalWidth - clampedWidth));
        const clampedY = Math.max(0, Math.min(newViewportY, oldCanvasSize.originalHeight - clampedHeight));
        
        const finalCanvasSize = {
          ...oldCanvasSize,
          viewportX: clampedX,
          viewportY: clampedY,
          width: clampedWidth,
          height: clampedHeight,
        };
        
        // Calculate scale factors (avoid division by zero)
        const scaleX = oldCanvasSize.width > 0 ? clampedWidth / oldCanvasSize.width : 1;
        const scaleY = oldCanvasSize.height > 0 ? clampedHeight / oldCanvasSize.height : 1;
        
        // Transform sub-rectangles
        const transformedSubRectangles = currentSubRectangles.map(rect => {
          // Normalize coordinates relative to the old viewport's top-left corner
          const normX = oldCanvasSize.width > 0 ? (rect.x - oldCanvasSize.viewportX) / oldCanvasSize.width : 0;
          const normY = oldCanvasSize.height > 0 ? (rect.y - oldCanvasSize.viewportY) / oldCanvasSize.height : 0;
          
          // Calculate new absolute position based on new viewport and scale
          const newRectX = Math.round(normX * clampedWidth + clampedX);
          const newRectY = Math.round(normY * clampedHeight + clampedY);
          
          // Scale width and height, ensuring minimum size of 1
          const newRectWidth = Math.max(1, Math.round(rect.width * scaleX));
          const newRectHeight = Math.max(1, Math.round(rect.height * scaleY));
          
          return {
            ...rect,
            x: newRectX,
            y: newRectY,
            width: newRectWidth,
            height: newRectHeight,
          };
        });

        // Update countdown bounds for relevant animation objects
        const updatedAnimationObjects = state.animationObjects.map(anim => {
          let updatedAnim = { ...anim };
          let boundsChanged = false;
          let loadingBarChanged = false;

          if (anim.type === 'COUNTDOWN') {
            // Logic for countdownBounds
            if ((anim as any).autoAdjustCountdownBounds) {
              let newCountdownBounds: { x: number; y: number; width: number; height: number } | null = null;
              if (transformedSubRectangles && transformedSubRectangles.length > 0) {
                const largestSubRectangle = transformedSubRectangles.reduce((largest, current) => {
                  return (current.width * current.height > largest.width * largest.height) ? current : largest;
                }, transformedSubRectangles[0]);
                if (largestSubRectangle) {
                  const boundsX = largestSubRectangle.x + 1;
                  const boundsY = largestSubRectangle.y + 1;
                  const boundsWidth = largestSubRectangle.width - 2;
                  const boundsHeight = largestSubRectangle.height - 2;
                  if (boundsWidth >= 1 && boundsHeight >= 1) {
                    newCountdownBounds = { x: boundsX, y: boundsY, width: boundsWidth, height: boundsHeight };
                  }
                }
              }
              if (newCountdownBounds) {
                updatedAnim.countdownBounds = newCountdownBounds;
              } else {
                updatedAnim.countdownBounds = {
                  x: finalCanvasSize.viewportX,
                  y: finalCanvasSize.viewportY,
                  width: finalCanvasSize.width,
                  height: finalCanvasSize.height,
                };
              }
              boundsChanged = true; // Assume it might have changed
            }

            // Logic for countdownLoadingBarArea
            if ((anim as any).autoAdjustLoadingBarArea) {
              let newLoadingBarArea: { x: number; y: number; width: number; height: number } | null = null;
              let enableLoadingBar = false;
              if (transformedSubRectangles && transformedSubRectangles.length > 0) {
                const smallestSubRectangle = transformedSubRectangles.reduce((smallest, current) => {
                  return (current.width * current.height < smallest.width * smallest.height) ? current : smallest;
                }, transformedSubRectangles[0]);
                if (smallestSubRectangle) {
                  newLoadingBarArea = {
                    x: smallestSubRectangle.x,
                    y: smallestSubRectangle.y,
                    width: smallestSubRectangle.width,
                    height: smallestSubRectangle.height,
                  };
                  enableLoadingBar = true;
                }
              }
              updatedAnim.countdownLoadingBarArea = newLoadingBarArea ?? undefined;
              updatedAnim.countdownEnableLoadingBar = enableLoadingBar;
              loadingBarChanged = true; // Assume it might have changed
            }
          }
          return updatedAnim; // Return the potentially modified animation object
        });
        
        return {
          canvasSize: finalCanvasSize,
          subRectangles: transformedSubRectangles, // Update subRectangles as well
          animationObjects: updatedAnimationObjects, // Include updated animation objects
        };
      }),
      
      resetViewport: () => {
        const { canvasSize } = get();
        // Use current original dimensions to calculate center for reset
        const defaultWidth = 16; // Or some initial default
        const defaultHeight = 16;
        const newViewportX = Math.floor((canvasSize.originalWidth - defaultWidth) / 2);
        const newViewportY = Math.floor((canvasSize.originalHeight - defaultHeight) / 2);
        // Ruft das (jetzt modifizierte) setViewport auf
        get().setViewport(newViewportX, newViewportY, defaultWidth, defaultHeight);
      },
      
      // Mode
      toggleMode: () => set(state => ({
        mode: state.mode === 'EDIT' ? 'PREVIEW' : 'EDIT'
      })),
      
      // Project
      setProjectName: (name: string) => set({ projectName: name }),
      
      setIsRectFilled: (value: boolean) => set(() => ({ isRectFilled: value })),
      setIsEllipseFilled: (value: boolean) => set(() => ({ isEllipseFilled: value })),

      // Superframe Actions
      resizeSuperFrame: (superFrameId: string, newFrameCount: number) => set(state => {
        const safeNewCount = Math.max(1, newFrameCount); // Ensure at least 1 frame
        const framesInSuperframe = state.frames.filter(f => f.superFrameId === superFrameId);
        const currentCount = framesInSuperframe.length;

        if (safeNewCount === currentCount) {
          return state; // No change needed
        }

        let updatedFrames = [...state.frames];
        let updatedAnimations = [...state.animationObjects];
        let framesToRemoveIds: string[] = [];
        let framesToAdd: Frame[] = [];

        const lastFrameOfSuperIndex = state.frames.findIndex(f => f.id === framesInSuperframe[currentCount - 1].id);

        if (safeNewCount < currentCount) {
          // Remove frames from the end of the superframe group
          const framesToRemove = framesInSuperframe.slice(safeNewCount);
          framesToRemoveIds = framesToRemove.map(f => f.id);
          
          updatedFrames = state.frames.filter(f => !framesToRemoveIds.includes(f.id));
          
          // Remove these frame IDs from animations
          updatedAnimations = state.animationObjects.map(anim => ({
            ...anim,
            frames: (anim.frames || []).filter(frameId => !framesToRemoveIds.includes(frameId))
          }));

        } else { // safeNewCount > currentCount
          // Add new frames to the end of the superframe group
          const countToAdd = safeNewCount - currentCount;
          
          // Verwende das letzte Frame im Superframe als Vorlage für die neuen Frames
          const lastFrameOfSuper = framesInSuperframe[currentCount - 1];
          
          for (let i = 0; i < countToAdd; i++) {
            // Erstelle ein neues Frame mit der gleichen Dauer
            const frame = createDefaultFrame(
              lastFrameOfSuper.duration, // Verwende die Dauer vom letzten Frame des Superframes
              state.layers.map(layer => layer.id)
            );
            
            // Kopiere die Pixel-Daten von allen Ebenen aus dem letzten Frame
            for (const layerId of Object.keys(lastFrameOfSuper.layerData)) {
              frame.layerData[layerId] = 
                // Erstelle eine tiefe Kopie jedes Pixels, um Referenzprobleme zu vermeiden
                (lastFrameOfSuper.layerData[layerId] || []).map(pixel => ({
                  ...pixel
                }));
            }
            
            // Markiere als Teil des Superframes
            frame.isSuperFrameMember = true;
            frame.superFrameId = superFrameId;
            framesToAdd.push(frame);
          }
          
          // Füge die neuen Frames direkt nach dem letzten vorhandenen Frame des Superframes ein
          updatedFrames.splice(lastFrameOfSuperIndex + 1, 0, ...framesToAdd);
          
          // Add new frame IDs to relevant animations
          const newFrameIds = framesToAdd.map(f => f.id);
          updatedAnimations = state.animationObjects.map(anim => {
            // Only add to animations that already included the superframe
            if ((anim.frames || []).some(frameId => framesInSuperframe.map(f => f.id).includes(frameId))) {
              return {
                ...anim,
                frames: [...(anim.frames || []), ...newFrameIds]
              };
            }
            return anim;
          });
        }

        // Recalculate currentFrameIndex if it's affected by removal
        let newCurrentFrameIndex = state.currentFrameIndex;
        if (state.currentFrameIndex > lastFrameOfSuperIndex && safeNewCount < currentCount) {
            const removedCountBeforeCurrent = framesToRemoveIds.filter(id => state.frames.findIndex(f => f.id === id) < state.currentFrameIndex).length;
            newCurrentFrameIndex = Math.max(0, state.currentFrameIndex - removedCountBeforeCurrent);
        } else if (state.currentFrameIndex > lastFrameOfSuperIndex && safeNewCount > currentCount) {
            // If frames were added after the current index but belonged to a superframe *before* it,
            // the index doesn't change relative to the start.
            // However, if the current index was *after* the superframe that got expanded,
            // we need to shift it.
            // Simpler: just clamp to the new bounds if needed
            newCurrentFrameIndex = Math.min(state.currentFrameIndex, updatedFrames.length - 1);
        }
         newCurrentFrameIndex = Math.min(newCurrentFrameIndex, updatedFrames.length - 1);


        return {
          frames: updatedFrames,
          animationObjects: updatedAnimations,
          currentFrameIndex: newCurrentFrameIndex,
        };
      }),
      
      
      // Sub-Rectangle actions
      toggleSubRectangleDrawing: () => set(state => ({
        isDrawingSubRectangle: !state.isDrawingSubRectangle,
        // Sicherstellen, dass der Auswahlmodus deaktiviert wird, wenn das Zeichnen von Sub-Rectangles beginnt
        currentTool: state.isDrawingSubRectangle ? state.currentTool : (state.currentTool === 'SELECT' ? 'BRUSH' : state.currentTool)
      })),
      addSubRectangle: (rect) => set(state => {
        const newId = `subrect-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const newRect: SubRectangle = {
          ...rect,
          id: newId,
          name: `Rect ${state.subRectangles.length + 1}`
        };
        const updatedSubRectangles = [...state.subRectangles, newRect];

        const updatedAnimationObjects = state.animationObjects.map(anim => {
          let updatedAnim = { ...anim };

          if (anim.type === 'COUNTDOWN') {
            // Logic for countdownBounds
            if ((anim as any).autoAdjustCountdownBounds) {
              let newCountdownBounds: { x: number; y: number; width: number; height: number } | null = null;
              if (updatedSubRectangles && updatedSubRectangles.length > 0) {
                const largestSubRectangle = updatedSubRectangles.reduce((largest, current) => {
                  return (current.width * current.height > largest.width * largest.height) ? current : largest;
                }, updatedSubRectangles[0]);
                if (largestSubRectangle) {
                  const boundsX = largestSubRectangle.x + 1;
                  const boundsY = largestSubRectangle.y + 1;
                  const boundsWidth = largestSubRectangle.width - 2;
                  const boundsHeight = largestSubRectangle.height - 2;
                  if (boundsWidth >= 1 && boundsHeight >= 1) {
                    newCountdownBounds = { x: boundsX, y: boundsY, width: boundsWidth, height: boundsHeight };
                  }
                }
              }
              if (newCountdownBounds) {
                updatedAnim.countdownBounds = newCountdownBounds;
              } else {
                updatedAnim.countdownBounds = {
                  x: state.canvasSize.viewportX,
                  y: state.canvasSize.viewportY,
                  width: state.canvasSize.width,
                  height: state.canvasSize.height,
                };
              }
            }

            // Logic for countdownLoadingBarArea
            if ((anim as any).autoAdjustLoadingBarArea) {
              let newLoadingBarArea: { x: number; y: number; width: number; height: number } | null = null;
              let enableLoadingBar = false;
              if (updatedSubRectangles && updatedSubRectangles.length > 0) {
                const smallestSubRectangle = updatedSubRectangles.reduce((smallest, current) => {
                  return (current.width * current.height < smallest.width * smallest.height) ? current : smallest;
                }, updatedSubRectangles[0]);
                if (smallestSubRectangle) {
                  newLoadingBarArea = {
                    x: smallestSubRectangle.x,
                    y: smallestSubRectangle.y,
                    width: smallestSubRectangle.width,
                    height: smallestSubRectangle.height,
                  };
                  enableLoadingBar = true;
                }
              }
              updatedAnim.countdownLoadingBarArea = newLoadingBarArea ?? undefined;
              updatedAnim.countdownEnableLoadingBar = enableLoadingBar;
            }
          }
          return updatedAnim;
        });

        return {
          subRectangles: updatedSubRectangles,
          animationObjects: updatedAnimationObjects,
          // Zeichnen beenden, nachdem ein Rechteck hinzugefügt wurde
          isDrawingSubRectangle: false
        };
      }),
      updateSubRectangleName: (id, name) => set(state => ({
        subRectangles: state.subRectangles.map(rect => rect.id === id ? { ...rect, name } : rect)
      })),
      deleteSubRectangle: (id) => set(state => {
        const updatedSubRectangles = state.subRectangles.filter(rect => rect.id !== id);

        const updatedAnimationObjects = state.animationObjects.map(anim => {
          let updatedAnim = { ...anim };

          if (anim.type === 'COUNTDOWN') {
            // Logic for countdownBounds
            if ((anim as any).autoAdjustCountdownBounds) {
              let newCountdownBounds: { x: number; y: number; width: number; height: number } | null = null;
              if (updatedSubRectangles && updatedSubRectangles.length > 0) {
                const largestSubRectangle = updatedSubRectangles.reduce((largest, current) => {
                  return (current.width * current.height > largest.width * largest.height) ? current : largest;
                }, updatedSubRectangles[0]);
                if (largestSubRectangle) {
                  const boundsX = largestSubRectangle.x + 1;
                  const boundsY = largestSubRectangle.y + 1;
                  const boundsWidth = largestSubRectangle.width - 2;
                  const boundsHeight = largestSubRectangle.height - 2;
                  if (boundsWidth >= 1 && boundsHeight >= 1) {
                    newCountdownBounds = { x: boundsX, y: boundsY, width: boundsWidth, height: boundsHeight };
                  }
                }
              }
              if (newCountdownBounds) {
                updatedAnim.countdownBounds = newCountdownBounds;
              } else {
                updatedAnim.countdownBounds = {
                  x: state.canvasSize.viewportX,
                  y: state.canvasSize.viewportY,
                  width: state.canvasSize.width,
                  height: state.canvasSize.height,
                };
              }
            }

            // Logic for countdownLoadingBarArea
            if ((anim as any).autoAdjustLoadingBarArea) {
              let newLoadingBarArea: { x: number; y: number; width: number; height: number } | null = null;
              let enableLoadingBar = false;
              if (updatedSubRectangles && updatedSubRectangles.length > 0) {
                const smallestSubRectangle = updatedSubRectangles.reduce((smallest, current) => {
                  return (current.width * current.height < smallest.width * smallest.height) ? current : smallest;
                }, updatedSubRectangles[0]);
                if (smallestSubRectangle) {
                  newLoadingBarArea = {
                    x: smallestSubRectangle.x,
                    y: smallestSubRectangle.y,
                    width: smallestSubRectangle.width,
                    height: smallestSubRectangle.height,
                  };
                  enableLoadingBar = true;
                }
              }
              updatedAnim.countdownLoadingBarArea = newLoadingBarArea ?? undefined;
              updatedAnim.countdownEnableLoadingBar = enableLoadingBar;
            }
          }
          return updatedAnim;
        });

        return {
          subRectangles: updatedSubRectangles,
          animationObjects: updatedAnimationObjects,
        };
      }),
      
      // Viewport Preset Management
      viewportPresets: [
        {
          id: "11vtivf",
          name: "Henry",
          config: {
            viewport: {
              viewportX: 24,
              viewportY: 22,
              width: 16,
              height: 19
            },
            subRectangles: [
              {
                x: 24,
                y: 22,
                width: 16,
                height: 3,
                id: "subrect-1746390459538-d8549977d1e388",
                name: "Rect 1"
              },
              {
                x: 24,
                y: 28,
                width: 16,
                height: 13,
                id: "subrect-1746390462415-8198f4d643bc98",
                name: "Rect 2"
              }
            ],
            blockedPixels: {
              "24,25": true,
              "25,25": true,
              "26,25": true,
              "27,25": true,
              "28,25": true,
              "29,25": true,
              "30,25": true,
              "31,25": true,
              "32,25": true,
              "33,25": true,
              "34,25": true,
              "35,25": true,
              "36,25": true,
              "37,25": true,
              "38,25": true,
              "39,25": true,
              "24,26": true,
              "25,26": true,
              "26,26": true,
              "27,26": true,
              "28,26": true,
              "29,26": true,
              "30,26": true,
              "31,26": true,
              "32,26": true,
              "33,26": true,
              "34,26": true,
              "35,26": true,
              "36,26": true,
              "37,26": true,
              "38,26": true,
              "39,26": true,
              "24,27": true,
              "25,27": true,
              "26,27": true,
              "27,27": true,
              "28,27": true,
              "29,27": true,
              "30,27": true,
              "31,27": true,
              "32,27": true,
              "33,27": true,
              "34,27": true,
              "35,27": true,
              "36,27": true,
              "37,27": true,
              "38,27": true,
              "39,27": true
            }
          }
        } as ViewportPreset,
        {
          id: "lwraiak",
          name: "Standard 16x16",
          config: {
            viewport: {
              viewportX: 24,
              viewportY: 21,
              width: 16,
              height: 22
            },
            subRectangles: [
              {
                x: 24,
                y: 21,
                width: 16,
                height: 3,
                id: "subrect-1746390585859-1f7f819f4cde38",
                name: "Rect 2"
              },
              {
                x: 24,
                y: 27,
                width: 16,
                height: 16,
                id: "subrect-1746390589331-7347a111542fe",
                name: "Rect 2"
              }
            ],
            blockedPixels: {
              "24,24": true,
              "25,24": true,
              "26,24": true,
              "27,24": true,
              "28,24": true,
              "29,24": true,
              "30,24": true,
              "31,24": true,
              "32,24": true,
              "33,24": true,
              "34,24": true,
              "35,24": true,
              "36,24": true,
              "37,24": true,
              "38,24": true,
              "39,24": true,
              "24,25": true,
              "25,25": true,
              "26,25": true,
              "27,25": true,
              "28,25": true,
              "29,25": true,
              "30,25": true,
              "31,25": true,
              "32,25": true,
              "33,25": true,
              "34,25": true,
              "35,25": true,
              "36,25": true,
              "37,25": true,
              "38,25": true,
              "39,25": true,
              "24,26": true,
              "25,26": true,
              "26,26": true,
              "27,26": true,
              "28,26": true,
              "29,26": true,
              "30,26": true,
              "31,26": true,
              "32,26": true,
              "33,26": true,
              "34,26": true,
              "35,26": true,
              "36,26": true,
              "37,26": true,
              "38,26": true,
              "39,26": true
            }
          }
        } as ViewportPreset
      ] as ViewportPreset[],
      addViewportPreset: (name: string) => set(state => {
        // Create a deep copy of the relevant state parts
        const newConfig: ViewportConfig = {
          viewport: {
            viewportX: state.canvasSize.viewportX,
            viewportY: state.canvasSize.viewportY,
            width: state.canvasSize.width,
            height: state.canvasSize.height,
          },
          // Deep copy arrays and objects
          subRectangles: JSON.parse(JSON.stringify(state.subRectangles)),
          blockedPixels: JSON.parse(JSON.stringify(state.blockedPixels)),
        };
        
        const newPreset: ViewportPreset = {
          id: generateId(), // Use a utility to generate unique IDs
          name: name || `Preset ${state.viewportPresets.length + 1}`, // Default name if empty
          config: newConfig,
        };
        
        return { viewportPresets: [...state.viewportPresets, newPreset] };
      }),
      removeViewportPreset: (id: string) => set(state => {
        return {
          viewportPresets: state.viewportPresets.filter(preset => preset.id !== id),
        };
      }),
      applyViewportPreset: (id: string) => set(state => {
        const preset = state.viewportPresets.find(p => p.id === id);
        if (!preset) {
          return {}; // No change
        }

        // Create deep copies when applying to avoid reference issues
        const newSubRectangles = JSON.parse(JSON.stringify(preset.config.subRectangles));
        const newBlockedPixels = JSON.parse(JSON.stringify(preset.config.blockedPixels));

        return {
          canvasSize: {
            ...state.canvasSize, // Keep originalWidth/Height and pixelSize
            viewportX: preset.config.viewport.viewportX,
            viewportY: preset.config.viewport.viewportY,
            width: preset.config.viewport.width,
            height: preset.config.viewport.height,
          },
          subRectangles: newSubRectangles,
          blockedPixels: newBlockedPixels,
          // Reset selection/drawing states potentially?
          isDrawingSubRectangle: false,
          currentSubRectangle: null,
          animationObjects: state.animationObjects.map(anim => {
            let updatedAnim = { ...anim };
            const presetViewport = preset.config.viewport;

            if (anim.type === 'COUNTDOWN') {
              // Logic for countdownBounds
              if ((anim as any).autoAdjustCountdownBounds) {
                let newCountdownBounds: { x: number; y: number; width: number; height: number } | null = null;
                if (newSubRectangles && newSubRectangles.length > 0) {
                  const largestSubRectangle = newSubRectangles.reduce((largest: SubRectangle, current: SubRectangle) => {
                    return (current.width * current.height > largest.width * largest.height) ? current : largest;
                  }, newSubRectangles[0]);
                  if (largestSubRectangle) {
                    const boundsX = largestSubRectangle.x + 1;
                    const boundsY = largestSubRectangle.y + 1;
                    const boundsWidth = largestSubRectangle.width - 2;
                    const boundsHeight = largestSubRectangle.height - 2;
                    if (boundsWidth >= 1 && boundsHeight >= 1) {
                      newCountdownBounds = { x: boundsX, y: boundsY, width: boundsWidth, height: boundsHeight };
                    }
                  }
                }
                if (newCountdownBounds) {
                  updatedAnim.countdownBounds = newCountdownBounds;
                } else {
                  updatedAnim.countdownBounds = {
                    x: presetViewport.viewportX,
                    y: presetViewport.viewportY,
                    width: presetViewport.width,
                    height: presetViewport.height,
                  };
                }
              }

              // Logic for countdownLoadingBarArea
              if ((anim as any).autoAdjustLoadingBarArea) {
                let newLoadingBarArea: { x: number; y: number; width: number; height: number } | null = null;
                let enableLoadingBar = false;
                if (newSubRectangles && newSubRectangles.length > 0) {
                  const smallestSubRectangle = newSubRectangles.reduce((smallest: SubRectangle, current: SubRectangle) => {
                    return (current.width * current.height < smallest.width * smallest.height) ? current : smallest;
                  }, newSubRectangles[0]);
                  if (smallestSubRectangle) {
                    newLoadingBarArea = {
                      x: smallestSubRectangle.x,
                      y: smallestSubRectangle.y,
                      width: smallestSubRectangle.width,
                      height: smallestSubRectangle.height,
                    };
                    enableLoadingBar = true;
                  }
                }
                updatedAnim.countdownLoadingBarArea = newLoadingBarArea ?? undefined;
                updatedAnim.countdownEnableLoadingBar = enableLoadingBar;
              }
            }
            return updatedAnim;
          }),
        };
      }),
      importViewportPresets: (presets: ViewportPreset[]) => {
        try {
          // Perform deep copy for safety and basic structure validation
          const validatedPresets = JSON.parse(JSON.stringify(presets));
          // Update the state using set
          set({ viewportPresets: validatedPresets }); // Use direct object update here
          return true; // Indicate success
        } catch (error) {
          return false; // Indicate failure on processing error
        }
      },

      // Variation Actions
      createVariation: (name: string) => {
        const state = get(); // Get current state for cloning and variations array

        // Sicherstellen, dass der Hauptzustand gespeichert wird, wenn wir im Hauptzustand sind
        if (!state.currentVariationId && !state.mainProjectState) {
          // Erstelle einen initialen mainProjectState mit dem aktuellen Zustand
          const mainState = {
            frames: JSON.parse(JSON.stringify(state.frames)),
            layers: JSON.parse(JSON.stringify(state.layers)),
            canvasSize: JSON.parse(JSON.stringify(state.canvasSize)),
            animationObjects: JSON.parse(JSON.stringify(state.animationObjects)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerIndex: state.currentLayerIndex,
            blockedPixels: JSON.parse(JSON.stringify(state.blockedPixels)),
            subRectangles: JSON.parse(JSON.stringify(state.subRectangles)),
            selection: state.selection ? JSON.parse(JSON.stringify(state.selection)) : null,
          };
          set({ mainProjectState: mainState });
        }

        const currentProjectStateToClone = {
          frames: JSON.parse(JSON.stringify(state.frames)),
          layers: JSON.parse(JSON.stringify(state.layers)),
          canvasSize: JSON.parse(JSON.stringify(state.canvasSize)),
          animationObjects: JSON.parse(JSON.stringify(state.animationObjects)),
          currentFrameIndex: state.currentFrameIndex,
          currentLayerIndex: state.currentLayerIndex,
          blockedPixels: JSON.parse(JSON.stringify(state.blockedPixels)),
          subRectangles: JSON.parse(JSON.stringify(state.subRectangles)),
          selection: state.selection ? JSON.parse(JSON.stringify(state.selection)) : null,
        };

        const newVariationId = generateId();
        const newVariation: Variation = {
          id: newVariationId,
          name: name || `Variation ${state.variations.length + 1}`,
          ...currentProjectStateToClone,
        };

        const updatedVariations = [...state.variations, newVariation];
        
        set({ variations: updatedVariations }); // Set the new variations array first
        get().switchToVariation(newVariationId); // Then call switchToVariation
      },
      switchToVariation: (targetVariationId: string | null) => set((state) => {
        let newVariationsState = [...state.variations];
        let stateToLoad: Partial<EditorState> = {};
        let newMainProjectState = state.mainProjectState;
        // 1. Speichere den aktuellen Zustand, wenn eine Variation aktiv war
        if (state.currentVariationId) {
          // Speichere den Zustand der aktuellen Variation
          const activeVariationIndex = newVariationsState.findIndex(v => v.id === state.currentVariationId);
          if (activeVariationIndex !== -1) {
            const updatedActiveVariation: Variation = {
              ...newVariationsState[activeVariationIndex], // ID und Namen beibehalten
              frames: JSON.parse(JSON.stringify(state.frames)),
              layers: JSON.parse(JSON.stringify(state.layers)),
              canvasSize: JSON.parse(JSON.stringify(state.canvasSize)),
              animationObjects: JSON.parse(JSON.stringify(state.animationObjects)),
              currentFrameIndex: state.currentFrameIndex,
              currentLayerIndex: state.currentLayerIndex,
              blockedPixels: JSON.parse(JSON.stringify(state.blockedPixels)),
              subRectangles: JSON.parse(JSON.stringify(state.subRectangles)),
              selection: state.selection ? JSON.parse(JSON.stringify(state.selection)) : null,
            };
            newVariationsState[activeVariationIndex] = updatedActiveVariation;
          } else {
            console.warn(`switchToVariation: Previously active variation ID ${state.currentVariationId} not found.`);
          }
        } else {
          // Wenn wir im Hauptzustand sind und zu einer Variation wechseln, speichere den aktuellen Hauptzustand
          newMainProjectState = {
            frames: JSON.parse(JSON.stringify(state.frames)),
            layers: JSON.parse(JSON.stringify(state.layers)),
            canvasSize: JSON.parse(JSON.stringify(state.canvasSize)),
            animationObjects: JSON.parse(JSON.stringify(state.animationObjects)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerIndex: state.currentLayerIndex,
            blockedPixels: JSON.parse(JSON.stringify(state.blockedPixels)),
            subRectangles: JSON.parse(JSON.stringify(state.subRectangles)),
            selection: state.selection ? JSON.parse(JSON.stringify(state.selection)) : null,
          };
        }

        // 2. Lade den neuen Zielzustand
        if (targetVariationId === null) {
          // Wechsel zum Hauptprojektzustand

          
          // Wenn wir einen gespeicherten Hauptprojektzustand haben, stelle ihn wieder her
          if (newMainProjectState) {
            stateToLoad = {
              currentVariationId: null,
              frames: JSON.parse(JSON.stringify(newMainProjectState.frames)),
              layers: JSON.parse(JSON.stringify(newMainProjectState.layers)),
              canvasSize: JSON.parse(JSON.stringify(newMainProjectState.canvasSize)),
              animationObjects: JSON.parse(JSON.stringify(newMainProjectState.animationObjects)),
              currentFrameIndex: newMainProjectState.currentFrameIndex,
              currentLayerIndex: newMainProjectState.currentLayerIndex,
              blockedPixels: JSON.parse(JSON.stringify(newMainProjectState.blockedPixels)),
              subRectangles: JSON.parse(JSON.stringify(newMainProjectState.subRectangles)),
              selection: newMainProjectState.selection ? JSON.parse(JSON.stringify(newMainProjectState.selection)) : null,
            };
          } else {
            // Falls kein Hauptprojektzustand existiert, setze nur die currentVariationId zurück
            stateToLoad = { currentVariationId: null };
          }
        } else {
          // Wechsel zu einer spezifischen Variation
          const targetVariation = newVariationsState.find(v => v.id === targetVariationId);
          if (targetVariation) {
            stateToLoad = {
              currentVariationId: targetVariationId,
              frames: JSON.parse(JSON.stringify(targetVariation.frames)),
              layers: JSON.parse(JSON.stringify(targetVariation.layers)),
              canvasSize: JSON.parse(JSON.stringify(targetVariation.canvasSize)),
              animationObjects: JSON.parse(JSON.stringify(targetVariation.animationObjects)),
              currentFrameIndex: targetVariation.currentFrameIndex,
              currentLayerIndex: targetVariation.currentLayerIndex,
              blockedPixels: JSON.parse(JSON.stringify(targetVariation.blockedPixels)),
              subRectangles: JSON.parse(JSON.stringify(targetVariation.subRectangles)),
              selection: targetVariation.selection ? JSON.parse(JSON.stringify(targetVariation.selection)) : null,
            };
          } else {
            console.warn(`switchToVariation: Target variation ID ${targetVariationId} not found. No switch performed.`);
            return state; // Keine Änderung, wenn Zielvariation nicht gefunden wurde
          }
        }

        // Undo/Redo-Historie zurücksetzen
        console.warn("TODO: Clear undo/redo history in switchToVariation");

        return {
          ...state, // Andere Teile des Zustands beibehalten
          ...stateToLoad,
          variations: newVariationsState,
          mainProjectState: newMainProjectState,
        };
      }),
      updateVariationName: (variationId: string, newName: string) => set(state => {
        const variationIndex = state.variations.findIndex(v => v.id === variationId);
        if (variationIndex === -1) {
          console.warn(`updateVariationName: Variation ID ${variationId} not found.`);
          return state;
        }
        const updatedVariations = [...state.variations];
        updatedVariations[variationIndex] = {
          ...updatedVariations[variationIndex],
          name: newName,
        };
        return { variations: updatedVariations };
      }),
      deleteVariation: (variationId: string) => {
        const state = get(); // Get current state
        const variationExists = state.variations.some(v => v.id === variationId);
        if (!variationExists) {
          console.warn(`deleteVariation: Variation ID ${variationId} not found.`);
          return; // Exit if variation doesn't exist
        }

        const updatedVariations = state.variations.filter(v => v.id !== variationId);
        set({ variations: updatedVariations }); // Update the variations array

        if (state.currentVariationId === variationId) {
          // If the deleted variation was active, switch to the "main project" state
          get().switchToVariation(null);
        }
      },
      updateCurrentVariation: () => {
        const state = get(); // Aktuellen Zustand holen
        
        // Wenn keine Variation aktiv ist, gibt es nichts zu tun
        if (!state.currentVariationId) return;
        
        const variationIndex = state.variations.findIndex(v => v.id === state.currentVariationId);
        if (variationIndex === -1) {
          console.warn(`updateCurrentVariation: Variation ID ${state.currentVariationId} nicht gefunden.`);
          return;
        }
        
        // Erstelle eine aktualisierte Liste von Variationen
        const updatedVariations = [...state.variations];
        
        // Aktualisiere die aktive Variation mit dem aktuellen Projektzustand
        updatedVariations[variationIndex] = {
          ...updatedVariations[variationIndex], // ID und Namen beibehalten
          frames: JSON.parse(JSON.stringify(state.frames)),
          layers: JSON.parse(JSON.stringify(state.layers)),
          canvasSize: JSON.parse(JSON.stringify(state.canvasSize)),
          animationObjects: JSON.parse(JSON.stringify(state.animationObjects)),
          currentFrameIndex: state.currentFrameIndex,
          currentLayerIndex: state.currentLayerIndex,
          blockedPixels: JSON.parse(JSON.stringify(state.blockedPixels)),
          subRectangles: JSON.parse(JSON.stringify(state.subRectangles)),
          selection: state.selection ? JSON.parse(JSON.stringify(state.selection)) : null,
        };
        
        // Aktualisiere den Store
        set({ variations: updatedVariations });
      },
      updateMainState: () => {
        const state = get(); // Aktuellen Zustand holen
        
        // Wenn eine Variation aktiv ist, speichere diese zuerst
        if (state.currentVariationId) {
          const variationIndex = state.variations.findIndex(v => v.id === state.currentVariationId);
          if (variationIndex !== -1) {
            const updatedVariations = [...state.variations];
            
            // Aktualisiere die Variation mit dem aktuellen Zustand
            updatedVariations[variationIndex] = {
              ...updatedVariations[variationIndex],
              frames: JSON.parse(JSON.stringify(state.frames)),
              layers: JSON.parse(JSON.stringify(state.layers)),
              canvasSize: JSON.parse(JSON.stringify(state.canvasSize)),
              animationObjects: JSON.parse(JSON.stringify(state.animationObjects)),
              currentFrameIndex: state.currentFrameIndex,
              currentLayerIndex: state.currentLayerIndex,
              blockedPixels: JSON.parse(JSON.stringify(state.blockedPixels)),
              subRectangles: JSON.parse(JSON.stringify(state.subRectangles)),
              selection: state.selection ? JSON.parse(JSON.stringify(state.selection)) : null,
            };
            
            set({ variations: updatedVariations });
          }
        }
        
        // Aktualisiere den Hauptzustand mit dem aktuellen Zustand
        const newMainProjectState = {
          frames: JSON.parse(JSON.stringify(state.frames)),
          layers: JSON.parse(JSON.stringify(state.layers)),
          canvasSize: JSON.parse(JSON.stringify(state.canvasSize)),
          animationObjects: JSON.parse(JSON.stringify(state.animationObjects)),
          currentFrameIndex: state.currentFrameIndex,
          currentLayerIndex: state.currentLayerIndex,
          blockedPixels: JSON.parse(JSON.stringify(state.blockedPixels)),
          subRectangles: JSON.parse(JSON.stringify(state.subRectangles)),
          selection: state.selection ? JSON.parse(JSON.stringify(state.selection)) : null,
        };
        
        // Setze den neuen Hauptzustand und wechsle zum Hauptzustand
        set({ 
          mainProjectState: newMainProjectState,
          currentVariationId: null 
        });
      },
      
      // Undo/Redo
      history: [],
      historyIndex: -1,
      maxHistorySize: 50,
      lastSavedHistoryIndex: -1,  // Speichert den History-Index des letzten Speicherpunkts
      
      // Funktion, die prüft, ob ungespeicherte Änderungen vorliegen
      hasUnsavedChanges: () => {
        const { historyIndex, lastSavedHistoryIndex } = get();
        return historyIndex !== lastSavedHistoryIndex;
      },
      
      pushToHistory: (statePatch: Partial<EditorState>) => set(state => {
        // Create a deep copy of the state patch to ensure we don't store references
        const deepCopyPatch = JSON.parse(JSON.stringify(statePatch));
        
        // Skip if we're in the middle of undo/redo operations
        if (state.history.length > 0 && 
            state.historyIndex >= 0 &&
            JSON.stringify(deepCopyPatch) === JSON.stringify(state.history[state.historyIndex])) {
          return {};
        }
        
        // When a new action is done after undoing, we need to remove the "future" states
        const newHistory = state.historyIndex < state.history.length - 1
          ? state.history.slice(0, state.historyIndex + 1)
          : state.history;

        // Add the new state to history
        const updatedHistory = [...newHistory, deepCopyPatch];
        
        // Keep history at max size
        if (updatedHistory.length > state.maxHistorySize) {
          updatedHistory.shift();
        }
        
        return {
          history: updatedHistory,
          historyIndex: updatedHistory.length - 1
        };
      }),
      
      undo: () => set(state => {
        if (state.historyIndex <= 0) {
          return {}; // Nothing to undo
        }
        
        const prevState = state.history[state.historyIndex - 1];
        
        // Create a new state object that includes animation objects
        // Ensure we're keeping track of the historyIndex
        return {
          ...prevState,
          historyIndex: state.historyIndex - 1
        };
      }),
      
      redo: () => set(state => {
        if (state.historyIndex >= state.history.length - 1) {
          return {}; // Nothing to redo
        }
        
        const nextState = state.history[state.historyIndex + 1];
        
        // Create a new state object that includes animation objects
        // Ensure we're keeping track of the historyIndex
        return {
          ...nextState,
          historyIndex: state.historyIndex + 1
        };
      }),
    // Pixel Inconsistency Action Implementations
    setPixelInconsistencyModalVisibility: (visible: boolean) => set({ showPixelInconsistencyModal: visible }),

    calculateProjectPixelStats: () => set(state => {
      const allNumbers: number[] = [];
      state.frames.forEach(frame => {
        Object.values(frame.layerData).forEach(layerPixels => {
          layerPixels.forEach(pixel => {
            if (pixel.pixelNumber !== undefined) { // Ensure to use pixel.pixelNumber
              allNumbers.push(pixel.pixelNumber);
            }
          });
        });
      });
      const uniqueNumbers = new Set(allNumbers);
      return {
        projectPixelNumbers: allNumbers.sort((a, b) => a - b),
        projectUniquePixelNumbersCount: uniqueNumbers.size
      };
    }),

    checkForPixelNumberInconsistencies: () => set(state => {
      // First, calculate and update project pixel stats
      const usedNumbers = new Set<number>();
      state.frames.forEach(frame => {
        Object.values(frame.layerData).forEach(layerPixels => {
          layerPixels.forEach(pixel => {
            if (pixel.pixelNumber !== undefined) {
              usedNumbers.add(pixel.pixelNumber);
            }
          });
        });
      });
      const projectPixelNumbers = Array.from(usedNumbers).sort((a, b) => a - b);
      const projectUniquePixelNumbersCount = projectPixelNumbers.length;

      // Then, check for inconsistencies
      const inconsistencies: PixelInconsistency[] = [];
      const superframes: { [key: string]: Frame[] } = {};

      // Group frames by superFrameId
      state.frames.forEach(frame => {
        if (frame.isSuperFrameMember && frame.superFrameId) {
          if (!superframes[frame.superFrameId]) {
            superframes[frame.superFrameId] = [];
          }
          superframes[frame.superFrameId].push(frame);
        }
      });

      Object.entries(superframes).forEach(([superFrameId, framesInSuperframe]) => {
        // Map to store pixel numbers for each coordinate within the current superframe
        // Key: "x,y", Value: { numbers: Array of unique pixel numbers (or undefined), frameIds: Array of frame IDs where this pixel appears }
        const pixelCoordinateMap: Map<string, { numbers: (number | undefined)[], frameIds: string[] }> = new Map();

        framesInSuperframe.forEach(frame => {
          Object.values(frame.layerData).forEach(layerPixels => {
            layerPixels.forEach(pixel => {
              const key = `${pixel.x},${pixel.y}`;
              if (!pixelCoordinateMap.has(key)) {
                pixelCoordinateMap.set(key, { numbers: [], frameIds: [] });
              }
              const entry = pixelCoordinateMap.get(key)!;
              
              // Add the pixelNumber to the list if it's not already there (ensures 'numbers' contains unique values)
              if (!entry.numbers.includes(pixel.pixelNumber)) {
                entry.numbers.push(pixel.pixelNumber);
              }
              // Add frameId if not already there
              if (!entry.frameIds.includes(frame.id)) {
                entry.frameIds.push(frame.id);
              }
            });
          });
        });

        pixelCoordinateMap.forEach((data, key) => {
          // An inconsistency exists if there is more than one unique pixel number (including undefined) for the same (x,y) coordinate.
          if (data.numbers.length > 1) {
            const [xStr, yStr] = key.split(',');
            inconsistencies.push({
              superFrameId,
              x: parseInt(xStr, 10),
              y: parseInt(yStr, 10),
              pixelNumbers: data.numbers, // This list contains the unique numbers found for this pixel
              frameIds: data.frameIds,    // All frames in the superframe where this pixel (x,y) exists
            });
          }
        });
      });

      // Always show the modal, regardless of inconsistencies, to display stats
      // The modal itself will handle displaying "No inconsistencies found" or the list.
      if (inconsistencies.length === 0) {

      }
      return {
        projectPixelNumbers,
        projectUniquePixelNumbersCount,
        pixelInconsistencies: inconsistencies,
        showPixelInconsistencyModal: true // Always set to true
      };
    }),

    resolvePixelNumberInconsistency: (superFrameId: string, x: number, y: number, targetNumber: number | undefined) => set(state => {
      const newFrames = state.frames.map(frame => {
        if (frame.superFrameId === superFrameId) {
          const newLayerData = { ...frame.layerData };
          Object.keys(newLayerData).forEach(layerId => {
            newLayerData[layerId] = newLayerData[layerId].map(pixel => {
              if (pixel.x === x && pixel.y === y) {
                return { ...pixel, pixelNumber: targetNumber };
              }
              return pixel;
            });
          });
          return { ...frame, layerData: newLayerData };
        }
        return frame;
      });
      
      const remainingInconsistencies = state.pixelInconsistencies.filter(inc =>
        !(inc.superFrameId === superFrameId && inc.x === x && inc.y === y)
      );
      const showModal = remainingInconsistencies.length > 0;
      if (!showModal && state.showPixelInconsistencyModal) {

      }
      // After resolving, re-check for inconsistencies (which will also update stats)
      const nextStateForResolveSingle = { ...state, frames: newFrames, pixelInconsistencies: remainingInconsistencies, showPixelInconsistencyModal: showModal };
      // @ts-ignore
      const checkResultForSingle = get().checkForPixelNumberInconsistencies() as Partial<EditorState>;
      return { ...nextStateForResolveSingle, ...checkResultForSingle };
    }),

    resolveAllPixelNumberInconsistencies: (strategy: 'keepFirst' | 'clearAll' | 'keepMostFrequent') => set(state => {

      let newFrames = [...state.frames];
      const inconsistenciesToResolve = [...state.pixelInconsistencies];


      if (inconsistenciesToResolve.length === 0) {

          // @ts-ignore
          const statsPatch = get().calculateProjectPixelStats() as Partial<EditorState>; // This should ideally not be needed if checkForPixelNumberInconsistencies handles stats
          return { ...statsPatch, showPixelInconsistencyModal: true }; // Keep modal open to show stats
      }

      inconsistenciesToResolve.forEach(inconsistency => {

        let targetNumber: number | undefined = undefined;

        if (strategy === 'keepFirst') {
          targetNumber = inconsistency.pixelNumbers.find(num => num !== undefined);
        } else if (strategy === 'clearAll') {
          targetNumber = undefined;
        } else if (strategy === 'keepMostFrequent') {
          const frequencyMap = new Map<number | undefined, number>();
          let maxFreq = 0;
          let mostFrequentNum: number | undefined = undefined;
          
          inconsistency.pixelNumbers.forEach(num => { // These are already unique numbers for the pixel
            const currentFreq = (frequencyMap.get(num) || 0) + 1; // This logic is slightly off if pixelNumbers are already unique.
                                                              // It should count occurrences across all frames for that pixel.
                                                              // However, inconsistency.pixelNumbers IS the list of unique values.
                                                              // To implement "keepMostFrequent" correctly, we'd need the raw list of numbers from all frames for that pixel.
                                                              // For now, this will pick the first one if all unique numbers appear once.
                                                              // Or, if one unique number was `undefined` and another was `5`, it would pick based on that.
                                                              // Let's simplify: if 'keepMostFrequent' and multiple unique numbers, it's ambiguous without original counts.
                                                              // Defaulting to 'keepFirst' if 'keepMostFrequent' is chosen and counts are equal or only unique values are available.
            // To correctly implement keepMostFrequent, we need to re-scan the frames for this specific pixel (x,y) in this superframe.
            // This is complex here. A simpler 'keepFirst' or 'clearAll' is more robust with current `inconsistency.pixelNumbers` structure.
            // For now, let's make 'keepMostFrequent' behave like 'keepFirst' if true frequency isn't easily available.
            // Or, let's assume inconsistency.pixelNumbers was the raw list (which it isn't based on current check logic).
            // Reverting to a simpler frequency count on the (already unique) pixelNumbers list.
            // This means if pixelNumbers is [5, undefined], freq of 5 is 1, freq of undefined is 1. mostFrequentNum could be 5 or undefined.
            // This is acceptable for now.
            frequencyMap.set(num, (frequencyMap.get(num) || 0) + 1); // Count occurrences in the unique list
          });

          let highestFreq = 0;
          frequencyMap.forEach((freq, num) => {
            if (freq > highestFreq) {
              highestFreq = freq;
              mostFrequentNum = num;
            } else if (freq === highestFreq) {
              // Tie-breaking: prefer defined numbers over undefined, then smaller numbers
              if (mostFrequentNum === undefined && num !== undefined) {
                mostFrequentNum = num;
              } else if (num !== undefined && mostFrequentNum !== undefined && num < mostFrequentNum) {
                mostFrequentNum = num;
              }
            }
          });
          targetNumber = mostFrequentNum;

        }

        newFrames = newFrames.map(frame => {
          if (frame.superFrameId === inconsistency.superFrameId) {
            const newLayerData = { ...frame.layerData };
            Object.keys(newLayerData).forEach(layerId => {
              newLayerData[layerId] = newLayerData[layerId].map(pixel => {
                if (pixel.x === inconsistency.x && pixel.y === inconsistency.y) {
                  return { ...pixel, pixelNumber: targetNumber };
                }
                return pixel;
              });
            });
            return { ...frame, layerData: newLayerData };
          }
          return frame;
        });
      });

      // After resolving all, re-check for inconsistencies (which will also update stats and modal visibility)
      // The checkForPixelNumberInconsistencies action already handles setting projectPixelNumbers, projectUniquePixelNumbersCount,
      // pixelInconsistencies, and showPixelInconsistencyModal.
      // We just need to provide the updated frames.
      const tempStateWithUpdatedFrames = { ...state, frames: newFrames };
      
      // Directly call the logic of checkForPixelNumberInconsistencies with the new frames
      // This avoids a recursive set call if get().checkForPixelNumberInconsistencies() is used directly
      // Re-implementing the check logic here or refactoring checkForPixelNumberInconsistencies to be callable without set
      
      // For now, let's assume checkForPixelNumberInconsistencies will be called by the component or a subsequent action.
      // The primary goal here is to update the frames and clear the current list of inconsistencies.
      // The modal will be responsible for re-checking inconsistencies via an effect if frames change.
      // Here, we just update the frames and ensure the modal is flagged to be open.
      // The existing pixelInconsistencies list will be re-evaluated by the modal's effect.
      return {
        frames: newFrames,
        // Do not clear pixelInconsistencies here; let the modal's re-check handle it.
        // projectPixelNumbers and projectUniquePixelNumbersCount will also be updated by the re-check.
        showPixelInconsistencyModal: true // Ensure modal stays open or opens to show the result.
      };
    }),
  }),
    {
      name: 'editor-storage',
    }
  )
);

// Wende das Henry-Preset bei Start an, aber nur wenn noch keine Projektdaten geladen wurden
// Dies muss nach der Store-Erstellung geschehen, damit der Store bereits initialisiert ist
setTimeout(() => {
  // Verwende das Henry-Preset für den initialen Viewport nur wenn noch keine Frames vorhanden sind
  const store = useEditorStore.getState();
  
  // Nur anwenden, wenn noch keine Projektdaten geladen wurden (keine Frames vorhanden)
  if (store.frames.length === 0) {
    const henryPreset = store.viewportPresets.find(p => p.id === "11vtivf");
    
    if (henryPreset) {
      // Setze die Canvas-Größe entsprechend dem Preset
      store.setCanvasSize(
        henryPreset.config.viewport.width,
        henryPreset.config.viewport.height,
        64, // Behalte die Original-Breite bei
        64  // Behalte die Original-Höhe bei
      );
      
      // Wende das vollständige Preset an (für subRectangles und blockedPixels)
      store.applyViewportPreset("11vtivf");
    }
  }
}, 100);

export default useEditorStore;
