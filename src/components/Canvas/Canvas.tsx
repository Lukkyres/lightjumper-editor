import * as React from 'react';
import useEditorStore from '../../store/editorStore';
import { PixelData, SubRectangle } from '../../types';
import './Canvas.css';
import { applyAnimationsToFrames } from '../../utils/animationUtils';
import { useState, useEffect, useMemo, useRef } from 'react';

// Global animation cache for Canvas component
const canvasAnimationCache = new Map<string, Record<string, PixelData[]>>();

// Generate cache key for animations
const generateAnimationCacheKey = (
  animationIds: string[],
  frameIds: string[],
  canvasSize: { width: number; height: number; originalWidth: number; originalHeight: number }
): string => {
  return `${animationIds.join(',')}_${frameIds.join(',')}_${canvasSize.width}x${canvasSize.height}`;
};

interface CanvasProps {
  isDrawingRectangle?: boolean;
  drawingMode?: 'STATE' | null;
  onRectangleDrawn?: (rectangle: { x: number, y: number, width: number, height: number, delay: number }, isFinal?: boolean) => void;
  currentRectangle?: { x: number, y: number, width: number, height: number, delay: number } | null;
  allRectangleStates?: Array<{
    x: number, 
    y: number,
    width: number,
    height: number,
    delay: number
  }>;
  showAllStates?: boolean;
  isViewportMode?: boolean;
  blockPixelModeActive?: boolean;
  isAddingPathPoint?: boolean;
  onPathPointAdded?: (point: {x: number, y: number}) => void;
  pathPoints?: Array<{x: number, y: number}>;
  isDrawingCountdownBounds?: boolean;
  onCountdownBoundsDrawn?: (bounds: { x: number; y: number; width: number; height: number }) => void;
  isDefiningSafeZonePixels?: boolean;
  currentDefiningSafeZonePixels?: Array<{ x: number; y: number }>;
  onToggleSafeZonePixel?: (x: number, y: number) => void;
}

const Canvas = ({
  isDrawingRectangle,
  drawingMode,
  onRectangleDrawn,
  currentRectangle,
  allRectangleStates = [],
  showAllStates = false,
  isViewportMode = false,
  blockPixelModeActive = false,
  isAddingPathPoint = false,
  onPathPointAdded,
  pathPoints = [],
  isDrawingCountdownBounds = false,
  onCountdownBoundsDrawn,
  isDefiningSafeZonePixels = false,
  currentDefiningSafeZonePixels = [],
  onToggleSafeZonePixel
}: CanvasProps) => {
  const {
    canvasSize,
    pixelSize,
    currentTool,
    currentColor,
    brushSize,
    setPixel,
    erasePixel,
    fillArea,
    startSelection,
    updateSelection,
    commitSelection,
    moveSelection,
    clearSelection,
    mode,
    frames,
    currentFrameIndex,
    layers,
    currentLayerIndex,
    selection,
    isMovingSelection,
    animationObjects,
    tempAnimationObject,
    moveViewport,
    expandViewport,
    shrinkViewport,
    setViewport,
    setPixelSize,
    blockedPixels,
    isPixelBlocked,
    blockPixel,
    unblockPixel,
    clearBlockedPixels,
    isDrawingSubRectangle,
    addSubRectangle,
    subRectangles,
    toggleSubRectangleDrawing, // Destructure toggle function
    numberingMode, // NEU
    currentPixelNumber, // NEU
    setCurrentPixelNumber // NEU
  } = useEditorStore();
  
  // Canvas-Ref
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  // Crop-Tool-Zustände
  const [isDraggingViewport, setIsDraggingViewport] = React.useState(false);
  const [isResizingViewport, setIsResizingViewport] = React.useState(false);
  const [resizeDirection, setResizeDirection] = React.useState<'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM' | 'TOPLEFT' | 'TOPRIGHT' | 'BOTTOMLEFT' | 'BOTTOMRIGHT' | null>(null);
  const [dragStart, setDragStart] = React.useState<{x: number, y: number} | null>(null);
  
  // State für Pinch-to-Zoom Gesten
  const [lastDistance, setLastDistance] = React.useState<number | null>(null);
  
  // Funktion zum Konvertieren von Mauskoordinaten zu Canvas-Koordinaten
  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const pixelX = Math.floor((clientX - rect.left) / pixelSize);
    const pixelY = Math.floor((clientY - rect.top) / pixelSize);
    
    // Im normalen Modus berücksichtigen wir den Viewport-Offset für die Zeichenoperationen
    // (aber nicht im Viewport-Modus selbst, da wir dort den ganzen Canvas anzeigen)
    if (!isViewportMode) {
      const { viewportX, viewportY } = canvasSize;
      return {
        x: pixelX + viewportX,
        y: pixelY + viewportY
      };
    }
    
    return { x: pixelX, y: pixelY };
  };
  
  // Funktion zum Konvertieren von Canvas-Koordinaten zu Viewport-Koordinaten
  const getViewportCoordinates = (canvasX: number, canvasY: number) => {
    const { viewportX, viewportY } = canvasSize;
    return {
      x: canvasX - viewportX,
      y: canvasY - viewportY
    };
  };
  
  // Funktion zum Prüfen, ob ein Punkt auf einem Handle liegt
  const isPointOnHandle = (clientX: number, clientY: number, handlePosition: 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM' | 'TOPLEFT' | 'TOPRIGHT' | 'BOTTOMLEFT' | 'BOTTOMRIGHT') => {
    if (!canvasRef.current) return false;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    const { viewportX, viewportY, width, height } = canvasSize;
    
    // Handle-Positionen in Pixel-Koordinaten (nicht Grid-Koordinaten)
    const handlePositions = {
      'LEFT': { 
        x: viewportX * pixelSize, 
        y: (viewportY + height / 2) * pixelSize 
      },
      'RIGHT': { 
        x: (viewportX + width) * pixelSize, 
        y: (viewportY + height / 2) * pixelSize 
      },
      'TOP': { 
        x: (viewportX + width / 2) * pixelSize, 
        y: viewportY * pixelSize 
      },
      'BOTTOM': { 
        x: (viewportX + width / 2) * pixelSize, 
        y: (viewportY + height) * pixelSize 
      },
      'TOPLEFT': { 
        x: viewportX * pixelSize, 
        y: viewportY * pixelSize 
      },
      'TOPRIGHT': { 
        x: (viewportX + width) * pixelSize, 
        y: viewportY * pixelSize 
      },
      'BOTTOMLEFT': { 
        x: viewportX * pixelSize, 
        y: (viewportY + height) * pixelSize 
      },
      'BOTTOMRIGHT': { 
        x: (viewportX + width) * pixelSize, 
        y: (viewportY + height) * pixelSize 
      }
    };
    
    const handle = handlePositions[handlePosition];
    
    // Größerer Hitbox-Bereich für die Handles (12 Pixel), damit sie leichter zu treffen sind
    const hitboxSize = 12;
    
    return (
      mouseX >= handle.x - hitboxSize / 2 &&
      mouseX <= handle.x + hitboxSize / 2 &&
      mouseY >= handle.y - hitboxSize / 2 &&
      mouseY <= handle.y + hitboxSize / 2
    );
  };
  
  // Funktion zum Prüfen, ob ein Punkt innerhalb des Viewports liegt
  const isPointInViewport = (x: number, y: number) => {
    const { viewportX, viewportY, width, height } = canvasSize;
    
    return (
      x >= viewportX &&
      x < viewportX + width &&
      y >= viewportY &&
      y < viewportY + height
    );
  };
  
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [lastPosition, setLastPosition] = React.useState<{ x: number, y: number } | null>(null);
  const [selectionStartPos, setSelectionStartPos] = React.useState<{ x: number, y: number } | null>(null);

  // Zustände für Linien- und Formenwerkzeuge
  const [lineStart, setLineStart] = React.useState<{ x: number, y: number } | null>(null);
  const [circleCenter, setCircleCenter] = React.useState<{ x: number, y: number } | null>(null);
  const [rectangleStart, setRectangleStart] = React.useState<{ x: number, y: number } | null>(null);
  const [previewPixels, setPreviewPixels] = React.useState<PixelData[]>([]);
  const [eraserPreview, setEraserPreview] = React.useState<Array<{x: number, y: number}>>([]);

  // Zustand für das Zeichnen von Sub-Rectangles
  const [currentDrawingSubRect, setCurrentDrawingSubRect] = React.useState<{ x: number, y: number, width: number, height: number } | null>(null);
  // State for drawing countdown bounds
  const [countdownStartPos, setCountdownStartPos] = React.useState<{ x: number, y: number } | null>(null);
  const [currentCountdownBoundsPreview, setCurrentCountdownBoundsPreview] = React.useState<{ x: number, y: number, width: number, height: number } | null>(null);

  // Bresenham's line algorithm
  const drawLine = (x0: number, y0: number, x1: number, y1: number, color: string) => {
    const pixels: PixelData[] = [];

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    let currentX = x0;
    let currentY = y0;

    while (true) {
      const pixelData: PixelData = { x: currentX, y: currentY, color };
      pixels.push(pixelData);

      if ((currentX === x1) && (currentY === y1)) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; currentX += sx; }
      if (e2 < dx) { err += dx; currentY += sy; }
    }
    return { pixels };
  };

  // Funktion zum Zeichnen eines Kreises (Ellipse mit gleichen Radien)
  const drawCircle = (centerX: number, centerY: number, radiusX: number, radiusY: number, color: string) => {
    const pixels: PixelData[] = [];

    // Iterate over a bounding box around the ellipse
    for (let x = Math.round(centerX - radiusX); x <= Math.round(centerX + radiusX); x++) {
      for (let y = Math.round(centerY - radiusY); y <= Math.round(centerY + radiusY); y++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const equation = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);

        if (radiusX === 0 && radiusY === 0 && x === centerX && y === centerY) {
           const pixelData: PixelData = { x, y, color };
           pixels.push(pixelData);
        } else if (radiusX > 0 && radiusY > 0 && equation >= 0.8 && equation <= 1.2) { // Adjust tolerance for larger ellipses
          const pixelData: PixelData = { x, y, color };
          pixels.push(pixelData);
        }
      }
    }
    return { pixels };
  };


  // Funktion zum Zeichnen eines gefüllten Kreises (Ellipse)
  const drawFilledCircle = (centerX: number, centerY: number, radiusX: number, radiusY: number, color: string) => {
    const pixels: PixelData[] = [];

    for (let y = Math.floor(centerY - radiusY); y <= Math.ceil(centerY + radiusY); y++) {
      for (let x = Math.floor(centerX - radiusX); x <= Math.ceil(centerX + radiusX); x++) {
        if (radiusX === 0 && radiusY === 0 && x === centerX && y === centerY) {
            const pixelData: PixelData = { x, y, color };
            pixels.push(pixelData);
        } else if (radiusX > 0 || radiusY > 0) { // Avoid division by zero if both radii are zero
          if (((x - centerX) ** 2) / (radiusX ** 2 || 1) + ((y - centerY) ** 2) / (radiusY ** 2 || 1) <= 1) {
            const pixelData: PixelData = { x, y, color };
            pixels.push(pixelData);
          }
        }
      }
    }
    return { pixels };
  };


  const drawRectangleOutline = (x: number, y: number, width: number, height: number, color: string): {pixels: PixelData[]} => {
    const pixels: PixelData[] = [];

    // Top and bottom lines
    for (let i = 0; i < width; i++) {
      let pixelDataTop: PixelData = { x: x + i, y: y, color };
      pixels.push(pixelDataTop);

      if (height > 1) { // Avoid double-drawing for 1-pixel high rects
        let pixelDataBottom: PixelData = { x: x + i, y: y + height - 1, color };
        pixels.push(pixelDataBottom);
      }
    }

    // Left and right lines (excluding corners already drawn)
    for (let i = 1; i < height - 1; i++) {
      let pixelDataLeft: PixelData = { x: x, y: y + i, color };
      pixels.push(pixelDataLeft);

      if (width > 1) { // Avoid double-drawing for 1-pixel wide rects
        let pixelDataRight: PixelData = { x: x + width - 1, y: y + i, color };
        pixels.push(pixelDataRight);
      }
    }
    return { pixels };
  };

  // Funktion zum Zeichnen eines gefüllten Rechtecks
  const drawFilledRectangle = (x: number, y: number, width: number, height: number, color: string) => {
    const pixels: PixelData[] = [];
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        const pixelData: PixelData = { x: x + i, y: y + j, color };
        pixels.push(pixelData);
      }
    }
    return { pixels };
  };

  // Die Vorschau-Pixel werden jetzt im Haupt-Rendering-Zyklus gezeichnet
  // Dieser Effect wurde entfernt, um das Problem mit überlappenden Previews zu lösen

  // PERFORMANCE OPTIMIZATION: Cache animation calculations outside useEffect
  const animationPixels = useMemo(() => {
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame || (animationObjects.length === 0 && !tempAnimationObject)) {
      return [];
    }

    const allAnimations = [...animationObjects, ...(tempAnimationObject ? [tempAnimationObject] : [])];
    const frameIds = frames.map(f => f.id);
    const animationIds = allAnimations.map(a => a.id);
    
    // Generate cache key
    const cacheKey = generateAnimationCacheKey(animationIds, frameIds, canvasSize);
    
    // Check cache first
    let cachedResult = canvasAnimationCache.get(cacheKey);
    
    if (!cachedResult) {
      // Calculate animations only if not cached
      console.log('Canvas: Calculating animations (cache miss)');
      cachedResult = applyAnimationsToFrames(
        frames,
        allAnimations,
        canvasSize,
        blockedPixels
      );
      
      // Cache the result
      canvasAnimationCache.set(cacheKey, cachedResult);
      
      // Limit cache size to prevent memory issues
      if (canvasAnimationCache.size > 50) {
        const firstKey = canvasAnimationCache.keys().next().value;
        if (firstKey) {
          canvasAnimationCache.delete(firstKey);
        }
      }
    } else {
      console.log('Canvas: Using cached animations (cache hit)');
    }
    
    // Return pixels for current frame
    return cachedResult[currentFrame.id] || [];
  }, [
    currentFrameIndex,
    animationObjects,
    tempAnimationObject,
    frames.length, // Only depend on frame count, not all frame data
    canvasSize.width,
    canvasSize.height,
    canvasSize.originalWidth,
    canvasSize.originalHeight
    // Removed blockedPixels from dependencies for better caching
  ]);

  // Draw the canvas grid and pixels
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Im Crop-Modus immer den gesamten Original-Canvas anzeigen (100x100)
    let displayWidth, displayHeight;
    if (isViewportMode) {
      displayWidth = canvasSize.originalWidth;
      displayHeight = canvasSize.originalHeight;
    } else {
      displayWidth = canvasSize.width;
      displayHeight = canvasSize.height;
    }
    
    // Setze die Größe des Canvas auf die anzuzeigende Breite/Höhe mit Berücksichtigung des pixelSize
    const canvasWidth = displayWidth * pixelSize;
    const canvasHeight = displayHeight * pixelSize;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Lösche den Canvas - wieder die ursprüngliche Wrapper-Farbe
    ctx.fillStyle = '#1e1e1e'; // Zurück zur ursprünglichen Wrapper-Farbe
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Zeichne den Hintergrund für JEDEN Pixel basierend auf Block-Status
    for (let x = 0; x < displayWidth; x++) {
      for (let y = 0; y < displayHeight; y++) {
        // Berechne die tatsächlichen Canvas-Koordinaten
        const actualX = isViewportMode ? x : x + canvasSize.viewportX;
        const actualY = isViewportMode ? y : y + canvasSize.viewportY;
        
        if (isPixelBlocked(actualX, actualY)) {
          // Blockierter Pixel: Fülle mit #252525
          ctx.fillStyle = '#252525'; 
        } else {
          // Nicht blockierter Pixel: Fülle mit Standard-Hintergrund #282c34
          ctx.fillStyle = '#282c34';
        }
        // Fülle das Pixel-Rechteck
        ctx.fillRect(
          x * pixelSize, 
          y * pixelSize, 
          pixelSize, 
          pixelSize
        );
      }
    }
    
    // Zeichne Gitternetz, aber nicht für blockierte Pixel
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.5)';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= canvasWidth; x += pixelSize) {
      for (let y = 0; y <= canvasHeight; y += pixelSize) {
        const canvasX = Math.floor(x / pixelSize);
        const canvasY = Math.floor(y / pixelSize);
        
        // Berechne die tatsächlichen Canvas-Koordinaten
        const actualX = isViewportMode ? canvasX : canvasX + canvasSize.viewportX;
        const actualY = isViewportMode ? canvasY : canvasY + canvasSize.viewportY;
        
        // Wenn der Pixel nicht blockiert ist, zeichne das Gitternetz an dieser Stelle
        if (!isPixelBlocked(actualX, actualY)) {
          // Vertikale Linie
          if (x % pixelSize === 0) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + pixelSize);
            ctx.stroke();
          }
          
          // Horizontale Linie
          if (y % pixelSize === 0) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + pixelSize, y);
            ctx.stroke();
          }
        }
      }
    }
    
    // Zeichne den aktuellen Frame (Layer und Animationen)
    const drawPixel = (ctx: CanvasRenderingContext2D, pixel: PixelData, opacity: number = 1) => {
      const { x, y, color, pixelNumber } = pixel;
      
      // Debug-Log für Animations-Pixel hinzufügen
      if (pixel.animationId) {

      }
      
      // Prüfe, ob der Pixel blockiert ist - wenn ja, zeichne ihn nicht
      if (isPixelBlocked(x, y)) {
        return;
      }
      
      // Prüfe, ob der Pixel innerhalb des Canvas liegt
      if (x >= 0 && x < canvasSize.originalWidth && y >= 0 && y < canvasSize.originalHeight) {
        // Berechne die tatsächliche Zeichenposition unter Berücksichtigung des Viewports
        // Im Viewport-Modus zeigen wir den ganzen Canvas, sonst nur den Ausschnitt
        let drawX = x;
        let drawY = y;
        
        if (!isViewportMode) {
          // Rechne die Viewport-Position heraus, um nur den sichtbaren Bereich zu zeichnen
          drawX = x - canvasSize.viewportX;
          drawY = y - canvasSize.viewportY;
          
          // Wenn der Pixel außerhalb des sichtbaren Bereichs liegt, zeichne ihn nicht
          if (drawX < 0 || drawX >= canvasSize.width || drawY < 0 || drawY >= canvasSize.height) {
            if (pixel.animationId) {

            }
            return;
          }
        }
        
        // Zeichne den Pixel an der berechneten Position
        ctx.fillStyle = color.replace(/rgb\(([^)]+)\)/, (_, rgb) => `rgba(${rgb}, ${opacity})`);
        ctx.fillRect(drawX * pixelSize, drawY * pixelSize, pixelSize, pixelSize);
        
        // Zeige Pixelnummer an, wenn vorhanden
        if (pixelNumber !== undefined) {
          // Schrifteinstellungen
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 1;
          const fontSize = Math.max(12, Math.floor(pixelSize * 0.7));
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Position genau in der Mitte des Pixels
          const textX = (drawX * pixelSize) + (pixelSize / 2);
          const textY = (drawY * pixelSize) + (pixelSize / 2);
          
          // Text mit Umriss zeichnen
          ctx.strokeText(pixelNumber.toString(), textX, textY);
          ctx.fillText(pixelNumber.toString(), textX, textY);
        }
      }
    };
    
    // Get the current frame being displayed
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame) return;
    
    // Draw layer pixels first
    layers.forEach((layer, index) => {
      if (!layer.visible) return;
      
      const layerPixels = currentFrame.layerData[layer.id] || [];
      layerPixels.forEach(pixel => {

        drawPixel(ctx, pixel, layer.id === layers[currentLayerIndex]?.id ? 1 : 0.8);
      });
      
      // Draw animation pixels associated with this specific layer
      if (animationPixels.length > 0) {
        // Filter animation pixels for this specific layer
        const layerAnimationPixels = animationPixels.filter(pixel => {
          // Find which animation object this pixel belongs to
          const pixelAnimation = [...animationObjects, ...(tempAnimationObject ? [tempAnimationObject] : [])]
            .find(anim => pixel.animationId === anim.id);
          
          // Check if this animation is assigned to be rendered on this layer
          return pixelAnimation && 
            ((pixelAnimation.layerId === layer.id && pixelAnimation.renderPosition === 'ON_LAYER') || 
             (pixelAnimation.renderPosition === 'BACKGROUND' && index === 0));
        });
        
        // Draw these layer-specific animations
        const opacity = mode === 'EDIT' ? 0.7 : 1;
        layerAnimationPixels.forEach(pixel => {
          drawPixel(ctx, pixel, opacity);
        });
      }
    });
    
    // Draw animations that should be in the foreground (after all layers)
    if (animationPixels.length > 0) {
      // Filter for animation pixels that should be rendered in the foreground
      const foregroundAnimationPixels = animationPixels.filter(pixel => {
        // Find which animation object this pixel belongs to
        const pixelAnimation = [...animationObjects, ...(tempAnimationObject ? [tempAnimationObject] : [])]
          .find(anim => pixel.animationId === anim.id);
        
        // Check if this animation is set to foreground
        return pixelAnimation && pixelAnimation.renderPosition === 'FOREGROUND';
      });
      
      // Draw these foreground animations
      const opacity = mode === 'EDIT' ? 0.7 : 1;
      foregroundAnimationPixels.forEach(pixel => {
        drawPixel(ctx, pixel, opacity);
      });
    }

    // Visual feedback for selected safe zone pixels
    if (isDefiningSafeZonePixels && currentDefiningSafeZonePixels.length > 0) {
      currentDefiningSafeZonePixels.forEach(safePixel => {
        let drawX = safePixel.x;
        let drawY = safePixel.y;

        if (!isViewportMode) {
          drawX = safePixel.x - canvasSize.viewportX;
          drawY = safePixel.y - canvasSize.viewportY;

          if (drawX < 0 || drawX >= canvasSize.width || drawY < 0 || drawY >= canvasSize.height) {
            return; // Cull if outside viewport
          }
        }
        // Ensure it's within the displayable area even in viewport mode
        // (displayWidth and displayHeight are defined earlier in this useEffect)
        if (drawX < 0 || drawX >= displayWidth || drawY < 0 || drawY >= displayHeight) {
            return;
        }

        ctx.fillStyle = 'rgba(76, 175, 80, 0.4)'; // Light green semi-transparent
        ctx.fillRect(drawX * pixelSize, drawY * pixelSize, pixelSize, pixelSize);
        
        ctx.strokeStyle = 'rgba(56, 142, 60, 0.8)'; // Darker green border
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX * pixelSize, drawY * pixelSize, pixelSize, pixelSize);
      });
    }
    
    // Draw selection box if exists
    if (selection) {
      const { startX, startY, endX, endY } = selection;
      const selectionWidth = Math.abs(endX - startX) + 1;
      const selectionHeight = Math.abs(endY - startY) + 1;
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      
      // Wenn wir nicht im Viewport-Modus sind, müssen wir die Viewport-Offsets berücksichtigen
      const offsetX = isViewportMode ? 0 : canvasSize.viewportX;
      const offsetY = isViewportMode ? 0 : canvasSize.viewportY;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        (x - offsetX) * pixelSize, 
        (y - offsetY) * pixelSize, 
        selectionWidth * pixelSize, 
        selectionHeight * pixelSize
      );
      ctx.setLineDash([]);
    }
    
    // Draw current rectangle if in rectangle drawing mode
    if (currentRectangle && (drawingMode || isDrawingRectangle)) {
      // Wenn wir nicht im Viewport-Modus sind, müssen wir die Viewport-Offsets berücksichtigen
      const offsetX = isViewportMode ? 0 : canvasSize.viewportX;
      const offsetY = isViewportMode ? 0 : canvasSize.viewportY;
      
      ctx.strokeStyle = drawingMode === 'STATE' ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        (currentRectangle.x - offsetX) * pixelSize, 
        (currentRectangle.y - offsetY) * pixelSize, 
        currentRectangle.width * pixelSize, 
        currentRectangle.height * pixelSize
      );
      ctx.setLineDash([]);
    }
    
    // Draw all rectangle states if showAllStates is true
    if (showAllStates && allRectangleStates.length > 0) {
      allRectangleStates.forEach((rectangle, index) => {
        // Skip drawing the current rectangle if it's being edited
        if (currentRectangle && 
            rectangle.x === currentRectangle.x && 
            rectangle.y === currentRectangle.y && 
            rectangle.width === currentRectangle.width && 
            rectangle.height === currentRectangle.height) {
          return;
        }
        
        // Wenn wir nicht im Viewport-Modus sind, müssen wir die Viewport-Offsets berücksichtigen
        const offsetX = isViewportMode ? 0 : canvasSize.viewportX;
        const offsetY = isViewportMode ? 0 : canvasSize.viewportY;
        
        ctx.strokeStyle = getStateColor(index);
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          (rectangle.x - offsetX) * pixelSize, 
          (rectangle.y - offsetY) * pixelSize, 
          rectangle.width * pixelSize, 
          rectangle.height * pixelSize
        );
      });
      ctx.setLineDash([]);
    }
    
    // Draw Sub-Rectangle Preview
    if (currentDrawingSubRect) {
      ctx.strokeStyle = 'rgba(50, 150, 255, 0.9)'; // Light blue dashed line
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      const previewX = currentDrawingSubRect.x;
      const previewY = currentDrawingSubRect.y;
      const previewWidth = currentDrawingSubRect.width;
      const previewHeight = currentDrawingSubRect.height;

      // Adjust coordinates based on viewport if NOT in viewport mode
      if (!isViewportMode) {
          const vpCoords = getViewportCoordinates(previewX, previewY);
          ctx.strokeRect(
              vpCoords.x * pixelSize,
              vpCoords.y * pixelSize,
              previewWidth * pixelSize,
              previewHeight * pixelSize
          );
      } else {
          // Draw directly if in viewport mode
           ctx.strokeRect(
              previewX * pixelSize,
              previewY * pixelSize,
              previewWidth * pixelSize,
              previewHeight * pixelSize
          );
      }
      ctx.setLineDash([]); // Reset line dash
    }

    // Draw saved Sub-Rectangles if in Viewport Mode
    if (isViewportMode && subRectangles.length > 0) {
      subRectangles.forEach(rect => {
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)'; // Orange for saved rects
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(
          rect.x * pixelSize,
          rect.y * pixelSize,
          rect.width * pixelSize,
          rect.height * pixelSize
        );

        // Draw the name
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // White text
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(
          rect.name || `Rect ${rect.id.substring(0, 4)}`, // Fallback name
          rect.x * pixelSize + 2, // Small offset from top-left
          rect.y * pixelSize + 2
        );
      });
       ctx.setLineDash([]); // Reset line dash
    }

    // Zeichne Crop-Modus-Overlay, wenn aktiviert
    if (isViewportMode) {
      drawViewportOverlay(ctx);
    }

    // Draw Countdown Bounds Preview
    if (currentCountdownBoundsPreview) {
      ctx.strokeStyle = 'rgba(128, 0, 128, 0.8)'; // Purple dashed line for countdown bounds
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      const { x, y, width, height } = currentCountdownBoundsPreview;
      // Adjust coordinates based on viewport if NOT in viewport mode
      const drawX = isViewportMode ? x : x - canvasSize.viewportX;
      const drawY = isViewportMode ? y : y - canvasSize.viewportY;

      ctx.strokeRect(
        drawX * pixelSize,
        drawY * pixelSize,
        width * pixelSize,
        height * pixelSize
      );
      ctx.setLineDash([]);
    }

    // Zeichne Pfadpunkte und Verbindungslinien
    if (pathPoints.length > 0) {
      // Zeichne Verbindungslinien zwischen den Punkten
      if (pathPoints.length > 1) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)'; // Helles Grün für den Pfad
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]); // Gestrichelte Linie
        
        ctx.beginPath();
        // Berücksichtige Viewport-Offset wenn nicht im Viewport-Modus
        const adjustX = isViewportMode ? 0 : -canvasSize.viewportX;
        const adjustY = isViewportMode ? 0 : -canvasSize.viewportY;
        
        // Beginne mit dem ersten Punkt
        ctx.moveTo(
          (pathPoints[0].x + adjustX) * pixelSize + pixelSize / 2,
          (pathPoints[0].y + adjustY) * pixelSize + pixelSize / 2
        );
        
        // Verbinde zu allen weiteren Punkten
        for (let i = 1; i < pathPoints.length; i++) {
          ctx.lineTo(
            (pathPoints[i].x + adjustX) * pixelSize + pixelSize / 2,
            (pathPoints[i].y + adjustY) * pixelSize + pixelSize / 2
          );
        }
        ctx.stroke();
        ctx.setLineDash([]); // Zurücksetzen
      }
      
      // Zeichne jeden Pfadpunkt als markierten Punkt
      pathPoints.forEach((point, index) => {
        const drawX = (point.x + (isViewportMode ? 0 : -canvasSize.viewportX));
        const drawY = (point.y + (isViewportMode ? 0 : -canvasSize.viewportY));
        
        // Prüfe, ob der Punkt im sichtbaren Bereich liegt
        if (drawX >= 0 && drawX < canvasSize.width && 
            drawY >= 0 && drawY < canvasSize.height) {
          
          // Zeichne den Punkt
          ctx.fillStyle = index === 0 
            ? 'rgba(0, 200, 0, 0.8)'  // Startpunkt in Grün
            : index === pathPoints.length - 1 
              ? 'rgba(255, 0, 0, 0.8)'  // Endpunkt in Rot
              : 'rgba(255, 255, 0, 0.8)';  // Mittelpunkte in Gelb
          
          ctx.beginPath();
          ctx.arc(
            drawX * pixelSize + pixelSize / 2,
            drawY * pixelSize + pixelSize / 2,
            pixelSize / 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
          
          // Zeige die Punktnummer
          ctx.fillStyle = 'white';
          ctx.font = `${Math.max(10, pixelSize * 0.7)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            `${index + 1}`,
            drawX * pixelSize + pixelSize / 2,
            drawY * pixelSize + pixelSize / 2
          );
        }
      });
    }

    // Draw eraser preview
    if (currentTool === 'ERASER' && eraserPreview.length > 0) {
      eraserPreview.forEach(pixel => {
        let drawX = pixel.x;
        let drawY = pixel.y;

        if (!isViewportMode) {
          const viewportCoords = getViewportCoordinates(pixel.x, pixel.y);
          drawX = viewportCoords.x;
          drawY = viewportCoords.y;
        }

        const displayWidth = isViewportMode ? canvasSize.originalWidth : canvasSize.width;
        const displayHeight = isViewportMode ? canvasSize.originalHeight : canvasSize.height;

        if (drawX >= 0 && drawX < displayWidth && drawY >= 0 && drawY < displayHeight) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // Semi-transparent white for eraser preview
          ctx.fillRect(drawX * pixelSize, drawY * pixelSize, pixelSize, pixelSize);
        }
      });
    }

    // Zeichne Vorschau-Pixel für Linien, Rechtecke und Ellipsen
    if (previewPixels.length > 0) {
      previewPixels.forEach(pixel => {
        let drawX = pixel.x;
        let drawY = pixel.y;

        if (!isViewportMode) {
          const viewportCoords = getViewportCoordinates(pixel.x, pixel.y);
          drawX = viewportCoords.x;
          drawY = viewportCoords.y;
        }

        // Check if the pixel is within the displayable area
        const displayWidth = isViewportMode ? canvasSize.originalWidth : canvasSize.width;
        const displayHeight = isViewportMode ? canvasSize.originalHeight : canvasSize.height;

        if (drawX >= 0 && drawX < displayWidth && drawY >= 0 && drawY < displayHeight) {
          ctx.fillStyle = pixel.color.replace(/rgb\(([^)]+)\)/, (_, rgb) => `rgba(${rgb}, 0.5)`);
          ctx.fillRect(drawX * pixelSize, drawY * pixelSize, pixelSize, pixelSize);
        }
      });
    }
  }, [
    canvasSize, 
    pixelSize, 
    currentFrameIndex, 
    layers, 
    currentLayerIndex, 
    selection, 
    mode,
    animationPixels, // Use memoized animation pixels instead of raw objects
    currentRectangle,
    drawingMode,
    allRectangleStates,
    showAllStates,
    isViewportMode,
    isDrawingRectangle,
    blockedPixels,
    isPixelBlocked,
    currentDrawingSubRect,
    subRectangles,
    pathPoints,
    previewPixels, // Wichtig: previewPixels zu den Dependencies hinzufügen
    eraserPreview, // Add eraserPreview to dependencies
    currentTool // Add currentTool to dependencies for eraser preview
  ]);
  
  // Funktion zum Zeichnen, die den Viewport-Kontext berücksichtigt
  const drawToCanvas = (ctx: CanvasRenderingContext2D, pixelsArray: PixelData[][], layerIndex: number) => {
    const { viewportX, viewportY, width, height } = canvasSize;
    
    // Nur im normalen Zeichenmodus (nicht im Viewport-Modus) 
    // berücksichtigen wir das Viewport-Fenster
    const offsetX = isViewportMode ? 0 : viewportX;
    const offsetY = isViewportMode ? 0 : viewportY;
    const visibleWidth = isViewportMode ? canvasSize.originalWidth : width;
    const visibleHeight = isViewportMode ? canvasSize.originalHeight : height;
    
    // Zeichne alle Pixel des Arrays auf den Canvas
    pixelsArray.forEach((pixels, layerIdx) => {
      // Überspringe Layer, die nicht zum aktuellen Frame gehören
      if (layerIndex !== layerIdx) return;
      
      pixels.forEach(pixel => {
        const adjustedX = pixel.x - offsetX;
        const adjustedY = pixel.y - offsetY;
        
        // Zeichne nur Pixel, die im sichtbaren Bereich sind
        if (adjustedX >= 0 && adjustedX < visibleWidth && 
            adjustedY >= 0 && adjustedY < visibleHeight) {
          ctx.fillStyle = pixel.color;
          ctx.fillRect(adjustedX * pixelSize, adjustedY * pixelSize, pixelSize, pixelSize);
        }
      });
    });
  };
  
  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Get canvas coordinates from mouse position
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    // HIGHEST PRIORITY: Defining Safe Zone Pixels
    if (isDefiningSafeZonePixels) {
      if (onToggleSafeZonePixel) {
        // x and y from getCanvasCoordinates are already absolute canvas coordinates
        onToggleSafeZonePixel(x, y);
      }
      return; // Prevent other tool actions
    }

    // Prüfe zuerst, ob wir im Pfadpunkt-Hinzufügen-Modus sind
    if (isAddingPathPoint && onPathPointAdded) {
      onPathPointAdded({ x, y });
      return; // Verhindere alle weiteren Verarbeitungen
    }

    // Handle Countdown Bounds Drawing
    if (isDrawingCountdownBounds) {
      setIsDrawing(true);
      setCountdownStartPos({ x, y });
      setCurrentCountdownBoundsPreview({ x, y, width: 1, height: 1 }); // Initial 1x1 preview
      return;
    }

    // Handle Rectangle State Drawing FIRST if active
    if (isDrawingRectangle) {

      setIsDrawing(true);
      setRectangleStart({ x, y });
      // Optionally, call onRectangleDrawn here with a 1x1 initial rect? Or wait for mouse move.
      // For now, we just set the start point.
      return; // Prevent other tools/modes when drawing state rects
    }

    // Verarbeite Crop-Modus zuerst
    if (isViewportMode) {
      // Im Viewport-Modus
      
      // PRIORITÄT 1: Sub-Rechteck zeichnen, wenn aktiv?
      if (isDrawingSubRectangle) {
        setIsDrawing(true);
        setRectangleStart({ x, y }); // Reuse rectangleStart state for simplicity
        setCurrentDrawingSubRect({ x, y, width: 0, height: 0 });
        return; // Verhindert alle anderen Viewport-Interaktionen
      }
      
      // PRIORITÄT 2: Pixel blockieren/freigeben, wenn aktiv?
      if (blockPixelModeActive) {
        // Block/Unblock Pixel Modus
        if (isPixelBlocked(x, y)) {
          unblockPixel(x, y);
        } else {
          blockPixel(x, y);
        }
        return; // Keine andere Aktion im Block-Modus
      }
      
      // Original Viewport-Funktionalität
      if (isPointOnHandle(e.clientX, e.clientY, 'TOPLEFT')) {
        setIsResizingViewport(true);
        setResizeDirection('TOPLEFT');
        setDragStart({ x, y });
        return;
      } else if (isPointOnHandle(e.clientX, e.clientY, 'TOPRIGHT')) {
        setIsResizingViewport(true);
        setResizeDirection('TOPRIGHT');
        setDragStart({ x, y });
        return;
      } else if (isPointOnHandle(e.clientX, e.clientY, 'BOTTOMLEFT')) {
        setIsResizingViewport(true);
        setResizeDirection('BOTTOMLEFT');
        setDragStart({ x, y });
        return;
      } else if (isPointOnHandle(e.clientX, e.clientY, 'BOTTOMRIGHT')) {
        setIsResizingViewport(true);
        setResizeDirection('BOTTOMRIGHT');
        setDragStart({ x, y });
        return;
      } else if (isPointOnHandle(e.clientX, e.clientY, 'LEFT')) {
        setIsResizingViewport(true);
        setResizeDirection('LEFT');
        setDragStart({ x, y });
        return;
      } else if (isPointOnHandle(e.clientX, e.clientY, 'RIGHT')) {
        setIsResizingViewport(true);
        setResizeDirection('RIGHT');
        setDragStart({ x, y });
        return;
      } else if (isPointOnHandle(e.clientX, e.clientY, 'TOP')) {
        setIsResizingViewport(true);
        setResizeDirection('TOP');
        setDragStart({ x, y });
        return;
      } else if (isPointOnHandle(e.clientX, e.clientY, 'BOTTOM')) {
        setIsResizingViewport(true);
        setResizeDirection('BOTTOM');
        setDragStart({ x, y });
        return;
      } else if (isPointInViewport(x, y)) {
        setIsDraggingViewport(true);
        setDragStart({ x, y });
        return;
      } else {
        // Wenn wir hier sind, wurde weder ein Handle noch der Viewport getroffen
        return;
      }
    }
 
    // Block/Unblock Pixel Modus
    if (blockPixelModeActive) {
      if (isPixelBlocked(x, y)) {
        unblockPixel(x, y);
      } else {
        blockPixel(x, y);
      }
      return; // Keine andere Aktion im Block-Modus
    }
    
    // Sub-Rectangle Drawing Logic
    if (isDrawingSubRectangle) {
      setIsDrawing(true);
      setRectangleStart({ x, y }); // Reuse rectangleStart state for simplicity
      setCurrentDrawingSubRect({ x, y, width: 0, height: 0 });
      return; // Prevent other tools from activating
    }

    setIsDrawing(true);

    if (currentTool === 'BRUSH' && !isAddingPathPoint) {
      setPixel(x, y, currentColor);
    } else if (currentTool === 'NUMBER') {
      // NUMBER Tool: Set pixel with current color and pixel number
      setPixel(x, y, currentColor, currentPixelNumber);
    } else if (currentTool === 'ERASER') {
      erasePixel(x, y);
    } else if (currentTool === 'LINE') {
      setLineStart({ x, y });
    } else if (currentTool === 'ELLIPSE') {
      setCircleCenter({ x, y });
    } else if (currentTool === 'RECTANGLE') {
      setRectangleStart({ x, y });
    }
  };
  
  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY); // Get coordinates regardless of isDrawing for preview

    if (currentTool === 'ERASER') {
      const newEraserPreview: Array<{x: number, y: number}> = [];
      const halfBrushSize = Math.floor(brushSize / 2);
      for (let i = 0; i < brushSize; i++) {
        for (let j = 0; j < brushSize; j++) {
          newEraserPreview.push({
            x: x - halfBrushSize + i,
            y: y - halfBrushSize + j,
          });
        }
      }
      setEraserPreview(newEraserPreview);
    } else { // If not ERASER tool
      if (eraserPreview.length > 0) { // And preview is currently shown
        setEraserPreview([]); // Clear it
      }
    }

    if (!isDrawing) return;
    // const { x, y } = getCanvasCoordinates(e.clientX, e.clientY); // Already got coordinates, no need to recall

    if (isDrawingCountdownBounds && countdownStartPos) {
      const startX = Math.min(countdownStartPos.x, x);
      const startY = Math.min(countdownStartPos.y, y);
      const width = Math.abs(x - countdownStartPos.x) + 1;
      const height = Math.abs(y - countdownStartPos.y) + 1;
      setCurrentCountdownBoundsPreview({ x: startX, y: startY, width, height });
      return;
    }

    if (isDrawingRectangle && rectangleStart && onRectangleDrawn && drawingMode === 'STATE') {
      const startX = Math.min(rectangleStart.x, x);
      const startY = Math.min(rectangleStart.y, y);
      const rectWidth = Math.abs(x - rectangleStart.x) + 1;
      const rectHeight = Math.abs(y - rectangleStart.y) + 1;
      // setCurrentRectanglePreview({ x: startX, y: startY, width: rectWidth, height: rectHeight, delay: 0 }); // Auskommentiert, da Funktion nicht definiert
      // onRectangleDrawn({ x: startX, y: startY, width: rectWidth, height: rectHeight, delay: 0 }, false); // Preview, not final
      return;
    }

    if (currentTool === 'BRUSH' && !isAddingPathPoint) {
      setPixel(x, y, currentColor);
      setLastPosition({ x, y });
    } else if (currentTool === 'ERASER') {
      erasePixel(x, y);
      setLastPosition({ x, y });
    } else if (currentTool === 'LINE' && lineStart) {
      const { pixels: linePixels } = drawLine(lineStart.x, lineStart.y, x, y, currentColor);
      setPreviewPixels(linePixels);
    } else if (currentTool === 'RECTANGLE' && rectangleStart) {
      const startX = Math.min(rectangleStart.x, x);
      const startY = Math.min(rectangleStart.y, y);
      const width = Math.abs(x - rectangleStart.x) + 1;
      const height = Math.abs(y - rectangleStart.y) + 1;
      const { isRectFilled } = useEditorStore.getState();
      const { pixels: rectPixels } = isRectFilled
        ? drawFilledRectangle(startX, startY, width, height, currentColor)
        : drawRectangleOutline(startX, startY, width, height, currentColor);
      setPreviewPixels(rectPixels);
    } else if (currentTool === 'ELLIPSE' && circleCenter) {
      const radiusX = Math.abs(x - circleCenter.x);
      const radiusY = Math.abs(y - circleCenter.y);
      const { isEllipseFilled } = useEditorStore.getState();
      const { pixels: ellipsePixels } = isEllipseFilled
        ? drawFilledCircle(circleCenter.x, circleCenter.y, radiusX, radiusY, currentColor)
        : drawCircle(circleCenter.x, circleCenter.y, radiusX, radiusY, currentColor);
      setPreviewPixels(ellipsePixels);
    } else if (currentTool === 'SELECT' && selection && selection.startX !== -1) {
      updateSelection(x, y);
    }

    if (isDrawingSubRectangle && rectangleStart) {
      const startX = Math.min(rectangleStart.x, x);
      const startY = Math.min(rectangleStart.y, y);
      const width = Math.abs(x - rectangleStart.x) + 1;
      const height = Math.abs(y - rectangleStart.y) + 1;
      setCurrentDrawingSubRect({ x: startX, y: startY, width, height });
    } else if (currentTool === 'SELECT' && selection) {
      commitSelection();
    }

  };
  
  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    if (isDrawingCountdownBounds && countdownStartPos && onCountdownBoundsDrawn) {
      const startX = Math.min(countdownStartPos.x, x);
      const startY = Math.min(countdownStartPos.y, y);
      const width = Math.abs(x - countdownStartPos.x) + 1;
      const height = Math.abs(y - countdownStartPos.y) + 1;
      onCountdownBoundsDrawn({ x: startX, y: startY, width, height });
      setCountdownStartPos(null);
      setCurrentCountdownBoundsPreview(null);
      setIsDrawing(false);
      return;
    }

    if (isDrawingRectangle && rectangleStart && onRectangleDrawn) {
      const startX = Math.min(rectangleStart.x, x);
      const startY = Math.min(rectangleStart.y, y);
      const width = Math.abs(x - rectangleStart.x) + 1;
      const height = Math.abs(y - rectangleStart.y) + 1;

      if (drawingMode === 'STATE') {
         onRectangleDrawn({ x: startX, y: startY, width, height, delay: 0 }, true); 
      }
      setRectangleStart(null);
    }


    if (currentTool === 'LINE' && lineStart) {
      const { pixels: drawnPixels } = drawLine(lineStart.x, lineStart.y, x, y, currentColor);
      drawnPixels.forEach(p => {
        const numberToSet = numberingMode === 'same' ? currentPixelNumber : undefined;
        setPixel(p.x, p.y, p.color, numberToSet);
      });
      setLineStart(null);
    } else if (currentTool === 'RECTANGLE' && rectangleStart) {
      const startX = Math.min(rectangleStart.x, x);
      const startY = Math.min(rectangleStart.y, y);
      const width = Math.abs(x - rectangleStart.x) + 1;
      const height = Math.abs(y - rectangleStart.y) + 1;
      const { isRectFilled } = useEditorStore.getState();
      const { pixels: drawnPixels } = isRectFilled
        ? drawFilledRectangle(startX, startY, width, height, currentColor)
        : drawRectangleOutline(startX, startY, width, height, currentColor);
      drawnPixels.forEach(p => {
        const numberToSet = numberingMode === 'same' ? currentPixelNumber : undefined;
        setPixel(p.x, p.y, p.color, numberToSet);
      });
      setRectangleStart(null);
    } else if (currentTool === 'ELLIPSE' && circleCenter) {
      const radiusX = Math.abs(x - circleCenter.x);
      const radiusY = Math.abs(y - circleCenter.y);
      const { isEllipseFilled } = useEditorStore.getState();
      const { pixels: drawnPixels } = isEllipseFilled
        ? drawFilledCircle(circleCenter.x, circleCenter.y, radiusX, radiusY, currentColor)
        : drawCircle(circleCenter.x, circleCenter.y, radiusX, radiusY, currentColor);
      drawnPixels.forEach(p => {
        const numberToSet = numberingMode === 'same' ? currentPixelNumber : undefined;
        setPixel(p.x, p.y, p.color, numberToSet);
      });
      setCircleCenter(null);
    } else if (currentTool === 'SELECT' && selection) {
      commitSelection();
    }

    setIsDrawing(false);
    setLastPosition(null);
    setPreviewPixels([]); // Clear preview pixels on mouse up
  };
  
  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsDrawing(false);
    setLastPosition(null);
    setPreviewPixels([]); // Lösche Vorschau-Pixel wenn Maus Canvas verlässt
    setEraserPreview([]); // Clear eraser preview on mouse leave
    // Zusätzlich alle drawing states zurücksetzen
    setLineStart(null);
    setCircleCenter(null);
    setRectangleStart(null);
  };
  
  // Handle wheel events for zooming
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    // Zoomen nur erlauben, wenn wir nicht im Viewport-Modus sind
    if (isViewportMode) return;
    
    // Standardverhalten verhindern (z.B. Seitenscrolling)
    e.preventDefault();
    
    // Zoom-Faktor basierend auf der Scroll-Richtung
    // deltaY ist negativ beim nach oben Scrollen (Zoom in) und positiv beim nach unten Scrollen (Zoom out)
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    
    // Trackpad-Scrollereignisse sind oft kleiner, daher den Zoom-Faktor anpassen
    // Die Überprüfung auf ctrlKey hilft zu erkennen, ob das Trackpad-Zoomen verwendet wird
    const isTrackpadZoom = e.ctrlKey || Math.abs(e.deltaY) < 10;
    const adjustedZoomFactor = isTrackpadZoom ? 
      1 + (e.deltaY < 0 ? 0.05 : -0.05) : zoomFactor;
    
    // Aktuellen Pixel-Größe anpassen
    const newPixelSize = Math.max(4, Math.min(32, pixelSize * adjustedZoomFactor));
    
    // Nur aktualisieren, wenn sich die Größe tatsächlich ändert
    if (newPixelSize !== pixelSize) {
      setPixelSize(newPixelSize);
    }
  };
  
  // Für MacOS Pinch-to-Zoom Gesten
  const handleGestureStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Zoomen nur erlauben, wenn wir nicht im Viewport-Modus sind
    if (isViewportMode) return;
    
    // Wenn es zwei Touch-Punkte gibt, kann es sich um eine Pinch-Geste handeln
    if (e.touches.length === 2) {
      e.preventDefault();
      
      // Berechne den Abstand zwischen den beiden Touch-Punkten
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Speichere diesen Abstand für Vergleiche in handleGestureChange
      setLastDistance(distance);
    }
  };
  
  const handleGestureChange = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Zoomen nur erlauben, wenn wir nicht im Viewport-Modus sind
    if (isViewportMode) return;
    
    // Wenn es zwei Touch-Punkte gibt und wir einen letzten Abstand haben
    if (e.touches.length === 2 && lastDistance !== null) {
      e.preventDefault();
      
      // Berechne den aktuellen Abstand
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Berechne das Verhältnis zum letzten Abstand (> 1 bedeutet Zoom-In, < 1 bedeutet Zoom-Out)
      const scale = distance / lastDistance;
      
      // Zoom nur anwenden, wenn die Änderung signifikant ist
      if (Math.abs(scale - 1) > 0.02) {
        // Aktuellen Pixel-Größe anpassen
        const newPixelSize = Math.max(4, Math.min(32, pixelSize * scale));
        
        // Nur aktualisieren, wenn sich die Größe tatsächlich ändert
        if (newPixelSize !== pixelSize) {
          setPixelSize(newPixelSize);
        }
        
        // Aktualisiere den letzten Abstand
        setLastDistance(distance);
      }
    }
  };
  
  const handleGestureEnd = () => {
    // Zurücksetzen des gespeicherten Abstands
    setLastDistance(null);
  };
  
  // Helper function to draw a single pixel on the canvas
  const drawPixel = (ctx: CanvasRenderingContext2D, pixel: PixelData, opacity: number = 1) => {
    ctx.fillStyle = pixel.color;
    ctx.globalAlpha = opacity;
    ctx.fillRect(
      pixel.x * pixelSize,
      pixel.y * pixelSize,
      pixelSize,
      pixelSize
    );
    ctx.globalAlpha = 1.0;
  };
  
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
  
  // Handle keyboard events for selection actions
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selection) {
        clearSelection();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, clearSelection]);

  // --- Block Pixel Controls Panel ---
  const BlockPixelControls = () => (
    <div className="canvas-controls-panel block-pixel-controls">
      <h4>Block Pixels</h4>
      <button onClick={() => clearBlockedPixels()}>Clear All Blocks</button>
      <div>Blocked: {blockedPixels.size}</div>
    </div>
  );

  // Funktion zum Zeichnen des Viewports und der Handles im Crop-Modus
  const drawViewportOverlay = (ctx: CanvasRenderingContext2D) => {
    const { viewportX, viewportY, width, height, originalWidth, originalHeight } = canvasSize;
    
    // Zeichne den "abgedunkelten" Bereich außerhalb des Viewports
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    
    // Oben
    ctx.fillRect(0, 0, originalWidth * pixelSize, viewportY * pixelSize);
    // Links
    ctx.fillRect(0, viewportY * pixelSize, viewportX * pixelSize, height * pixelSize);
    // Rechts
    ctx.fillRect(
      (viewportX + width) * pixelSize, 
      viewportY * pixelSize, 
      (originalWidth - viewportX - width) * pixelSize, 
      height * pixelSize
    );
    // Unten
    ctx.fillRect(
      0, 
      (viewportY + height) * pixelSize, 
      originalWidth * pixelSize, 
      (originalHeight - viewportY - height) * pixelSize
    );
    
    // Zeichne den Viewport-Rahmen
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      viewportX * pixelSize,
      viewportY * pixelSize,
      width * pixelSize,
      height * pixelSize
    );
    ctx.setLineDash([]);
    
    // Zeichne die Handles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    // Handle-Positionen
    const handles = [
      { name: 'LEFT', x: viewportX, y: viewportY + height / 2 },
      { name: 'RIGHT', x: viewportX + width, y: viewportY + height / 2 },
      { name: 'TOP', x: viewportX + width / 2, y: viewportY },
      { name: 'BOTTOM', x: viewportX + width / 2, y: viewportY + height },
      { name: 'TOPLEFT', x: viewportX, y: viewportY },
      { name: 'TOPRIGHT', x: viewportX + width, y: viewportY },
      { name: 'BOTTOMLEFT', x: viewportX, y: viewportY + height },
      { name: 'BOTTOMRIGHT', x: viewportX + width, y: viewportY + height }
    ];
    
    // Größe der Handles vergrößern und deutlicher darstellen
    const handleSizePx = 8;
    
    handles.forEach(handle => {
      ctx.fillRect(
        handle.x * pixelSize - handleSizePx / 2,
        handle.y * pixelSize - handleSizePx / 2,
        handleSizePx,
        handleSizePx
      );
    });
    
    // Zeige Viewport-Größe als Text
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${width} x ${height}`,
      (viewportX + width / 2) * pixelSize,
      (viewportY - 5) * pixelSize // Position über dem Rechteck
    );
  };

  return (
    <div className={`canvas-container ${isViewportMode ? 'viewport-mode' : ''}`}> 
      <canvas
        ref={canvasRef}
        className={`canvas ${currentTool?.toLowerCase()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onTouchStart={handleGestureStart}
        onTouchMove={handleGestureChange}
        onTouchEnd={handleGestureEnd}
      />
      
      {/* Die Block-Pixel-Steuerelemente anzeigen */}
      {isViewportMode && <BlockPixelControls />}
      
      {/* Farbauswahl */}
      {currentTool === 'EYEDROPPER' && (
        <div 
          className="color-picker"
          style={{
            left: `${canvasSize.width * pixelSize}px`,
            top: '0px'
          }}
        >
          <div className="color-picker-header">
            <h4>Farbauswahl</h4>
          </div>
          <div className="color-picker-body">
            <div className="color-picker-colors">
              <div className="color-picker-color" style={{ backgroundColor: '#FF0000' }}></div>
              <div className="color-picker-color" style={{ backgroundColor: '#00FF00' }}></div>
              <div className="color-picker-color" style={{ backgroundColor: '#0000FF' }}></div>
              <div className="color-picker-color" style={{ backgroundColor: '#FFFF00' }}></div>
              <div className="color-picker-color" style={{ backgroundColor: '#FF00FF' }}></div>
              <div className="color-picker-color" style={{ backgroundColor: '#00FFFF' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;
