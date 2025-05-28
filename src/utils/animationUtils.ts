import { AnimationObject, PixelData, Frame, EasingFunction, Direction, PathCycleMode, CanvasSize, RectangleState, Orientation, BorderBehavior, RectangleCycleMode as RectCycleModeEnum, AnimationType, FadeOption } from '../types';
import { fillViewportWithBlackExceptExistingPixels, generateDisintegrationParticles, generateMatrixTransitionParticles, generateSpiralTransitionParticles } from './blackBackgroundUtils';

// --- Global Constants for Animations ---
const STANDARD_FRAME_DURATION_MS = 100; // ms per frame (e.g., 10 FPS)

const BASE_NUMBER_PATTERNS: Record<string, number[][]> = {
  '3': [
    [1, 1, 1],
    [0, 0, 1],
    [0, 1, 1],
    [0, 0, 1],
    [1, 1, 1],
  ],
  '2': [
    [1, 1, 1],
    [0, 0, 1],
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 1],
  ],
  '1': [
    [0, 1, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
    [1, 1, 1],
  ],
};

// --- Easing Functions (from old file, used by Rectangle) ---
function linear(t: number): number {
  return t;
}

function easeInQuad(t: number): number {
  return t * t;
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

const easingFunctions = {
  linear,
  easeIn: easeInQuad,
  easeOut: easeOutQuad,
  easeInOut: easeInOutQuad,
};

// --- Interpolation Helper (from old file, used by Rectangle) ---
function interpolate(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Helper function to interpolate between two rectangle states based on center point (from old file)
function interpolateRectangles(
  from: RectangleState,
  to: RectangleState,
  progress: number
): { x: number, y: number, width: number, height: number } {
  const fromCenterX = from.x + from.width / 2 - 0.5;
  const fromCenterY = from.y + from.height / 2 - 0.5;
  const toCenterX = to.x + to.width / 2 - 0.5;
  const toCenterY = to.y + to.height / 2 - 0.5;
  
  const currentCenterX = interpolate(fromCenterX, toCenterX, progress);
  const currentCenterY = interpolate(fromCenterY, toCenterY, progress);
  
  const currentWidth = interpolate(from.width, to.width, progress);
  const currentHeight = interpolate(from.height, to.height, progress);
  
  const finalWidth = Math.max(1, currentWidth);
  const finalHeight = Math.max(1, currentHeight);

  const finalX = currentCenterX - finalWidth / 2 + 0.5;
  const finalY = currentCenterY - finalHeight / 2 + 0.5;

  return {
    x: finalX, 
    y: finalY, 
    width: finalWidth,
    height: finalHeight
  };
}

// --- Rectangle Drawing Helpers (from old file) ---
function drawFilledRectangle(
  x: number, y: number, width: number, height: number, 
  color: string, animationId: string
): PixelData[] {
  const pixels: PixelData[] = [];
  const startX = Math.round(x);
  const startY = Math.round(y);
  const endX = Math.round(x + Math.max(1, width));
  const endY = Math.round(y + Math.max(1, height));
  const finalWidth = Math.max(1, endX - startX);
  const finalHeight = Math.max(1, endY - startY);

  for (let j = startY; j < startY + finalHeight; j++) {
    for (let i = startX; i < startX + finalWidth; i++) {
      pixels.push({ x: i, y: j, color, animationId });
    }
  }
  return pixels;
}

function drawRectangleOutline(
  x: number, y: number, width: number, height: number,
  color: string, animationId: string
): PixelData[] {
  const pixels: PixelData[] = [];
  const startX = Math.round(x);
  const startY = Math.round(y);
  const roundedWidth = Math.max(1, Math.round(width)); 
  const roundedHeight = Math.max(1, Math.round(height));
  const endX = startX + roundedWidth - 1;
  const endY = startY + roundedHeight - 1;

  for (let i = startX; i <= endX; i++) {
    pixels.push({ x: i, y: startY, color, animationId });
  }
  if (roundedHeight > 1) {
    for (let i = startX; i <= endX; i++) {
      pixels.push({ x: i, y: endY, color, animationId });
    }
  }
  for (let j = startY + 1; j < endY; j++) {
      pixels.push({ x: startX, y: j, color, animationId });
  }
  if (roundedWidth > 1) {
      for (let j = startY + 1; j < endY; j++) {
          pixels.push({ x: endX, y: j, color, animationId });
      }
  }
  return pixels;
}

// --- Snake Helpers (from old file) ---
const seededRandom = (seed: number) => {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
};

const constrainToViewport = (x: number, y: number, viewportWidth: number, viewportHeight: number): { x: number, y: number } => {
  return {
    x: Math.max(0, Math.min(viewportWidth - 1, x)),
    y: Math.max(0, Math.min(viewportHeight - 1, y))
  };
};

const modifyColorIntensity = (color: string, intensity: number): string => {
  if (!color.startsWith('#')) return color; // Only modify hex colors
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const newR = Math.max(0, Math.min(255, Math.floor(r * intensity)));
  const newG = Math.max(0, Math.min(255,Math.floor(g * intensity)));
  const newB = Math.max(0, Math.min(255,Math.floor(b * intensity)));
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

// Helper function to parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Helper function to convert RGB to hex color
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0');
}

// Helper function to interpolate between two colors
function interpolateColor(colorStart: string, colorEnd: string, progress: number): string {
  const startRgb = hexToRgb(colorStart);
  const endRgb = hexToRgb(colorEnd);

  if (!startRgb || !endRgb) {
    return colorStart; // Fallback if parsing fails
  }

  const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * progress);
  const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * progress);
  const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * progress);

  return rgbToHex(
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b))
  );
}

// Using the type Direction from types/index.ts
// enum DirectionForSnake { UP = 'UP', DOWN = 'DOWN', LEFT = 'LEFT', RIGHT = 'RIGHT'} // Replaced by type Direction

function getNextPosition(x: number, y: number, direction: Direction): { x: number, y: number } {
  switch (direction) {
    case 'UP': return { x, y: y - 1 };
    case 'DOWN': return { x, y: y + 1 };
    case 'LEFT': return { x: x - 1, y };
    case 'RIGHT': return { x: x + 1, y };
  }
}

function checkCollisionWithOtherSnakes(
  position: { x: number, y: number },
  currentSnakeIndex: number,
  allSnakes: Array<Array<{ x: number, y: number }>>,
  strictMode: boolean = false
): boolean {
  for (let i = 0; i < allSnakes.length; i++) {
    if (i === currentSnakeIndex) continue; 
    for (const segment of allSnakes[i]) {
      if (strictMode) {
        if (segment.x === position.x && segment.y === position.y) return true;
      } else {
        const head = allSnakes[i][allSnakes[i].length - 1];
        if (head && head.x === position.x && head.y === position.y) return true;
      }
    }
  }
  return false;
}


// --- Restored Animation Generation Functions ---

// Generate a snake animation based on parameters (from old file)
const generateSnakeAnimation = (
  animation: AnimationObject,
  canvasSize: CanvasSize,
  frameCount: number 
): Record<string, PixelData[]> => {
  const result: Record<string, PixelData[]> = {};
  if (animation.type !== 'SNAKE' || !animation.frames) return result;

  const { id, color, frames, snakeLength = 5, snakeSpeed = 1, snakeCount = 1, avoidCollisions = false, strictCollisions = false } = animation;
  const viewportWidth = canvasSize.width;
  const viewportHeight = canvasSize.height;
  const viewportX = canvasSize.viewportX || 0;
  const viewportY = canvasSize.viewportY || 0;
  
  frames.forEach(frameId => { result[frameId] = []; });
  
  const allSnakePositions: Array<Array<{x: number, y: number}>> = [];
  const snakeDirections: Direction[] = [];
  
  for (let snakeIndex = 0; snakeIndex < snakeCount; snakeIndex++) {
    const randomGenerator = seededRandom(snakeIndex + 1 + (animation.snakeRandomSeed || 0)); // Include random seed from animation object
    const viewportStartX = Math.floor(randomGenerator() * (viewportWidth - 10)) + 5;
    const viewportStartY = Math.floor(randomGenerator() * (viewportHeight - 10)) + 5;
    const absoluteStartX = viewportX + viewportStartX;
    const absoluteStartY = viewportY + viewportStartY;
    
    let currentDirection = (['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[])[Math.floor(randomGenerator() * 4)];
    snakeDirections[snakeIndex] = currentDirection;
    
    let currentX = absoluteStartX;
    let currentY = absoluteStartY;
    const allPositions: Array<{x: number, y: number}> = [];
    
    for (let i = 0; i < snakeLength; i++) {
      allPositions.push({ x: currentX, y: currentY });
    }
    allSnakePositions.push(allPositions);
    
    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const frameId = frames[frameIndex];
      if (!frameId || !result[frameId]) continue; // Ensure frameId exists in result
      
      currentDirection = snakeDirections[snakeIndex];
      const effectiveSpeed = Math.max(1, Math.min(20, snakeSpeed));
      
      for (let step = 0; step < effectiveSpeed; step++) {
        const margin = 2;
        const relX = currentX - viewportX;
        const relY = currentY - viewportY;
        let changedDirection = false;
        
        if (relX <= margin && currentDirection === 'LEFT') {
          currentDirection = randomGenerator() < 0.5 ? 'UP' : 'DOWN';
          changedDirection = true;
        } else if (relX >= viewportWidth - 1 - margin && currentDirection === 'RIGHT') { // -1 for 0-indexed
          currentDirection = randomGenerator() < 0.5 ? 'UP' : 'DOWN';
          changedDirection = true;
        } else if (relY <= margin && currentDirection === 'UP') {
          currentDirection = randomGenerator() < 0.5 ? 'LEFT' : 'RIGHT';
          changedDirection = true;
        } else if (relY >= viewportHeight - 1 - margin && currentDirection === 'DOWN') { // -1 for 0-indexed
          currentDirection = randomGenerator() < 0.5 ? 'LEFT' : 'RIGHT';
          changedDirection = true;
        }
        
        if (!changedDirection && avoidCollisions && snakeCount > 1) {
          const nextPosition = getNextPosition(currentX, currentY, currentDirection);
          const wouldCollide = checkCollisionWithOtherSnakes(nextPosition, snakeIndex, allSnakePositions, strictCollisions);
          if (wouldCollide) {
            const availableDirections = (['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]).filter(dir => {
              if (currentDirection === 'UP' && dir === 'DOWN') return false;
              if (currentDirection === 'DOWN' && dir === 'UP') return false;
              if (currentDirection === 'LEFT' && dir === 'RIGHT') return false;
              if (currentDirection === 'RIGHT' && dir === 'LEFT') return false;
              const testPosition = getNextPosition(currentX, currentY, dir);
              return !checkCollisionWithOtherSnakes(testPosition, snakeIndex, allSnakePositions, strictCollisions);
            });
            if (availableDirections.length > 0) {
              currentDirection = availableDirections[Math.floor(randomGenerator() * availableDirections.length)];
              changedDirection = true;
            }
          }
        }
        
        if (!changedDirection && randomGenerator() < 0.03) {
          const possibleDirections = (['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]).filter(dir => {
            if (currentDirection === 'UP' && dir === 'DOWN') return false;
            if (currentDirection === 'DOWN' && dir === 'UP') return false;
            if (currentDirection === 'LEFT' && dir === 'RIGHT') return false;
            if (currentDirection === 'RIGHT' && dir === 'LEFT') return false;
            return true;
          });
          currentDirection = possibleDirections[Math.floor(randomGenerator() * possibleDirections.length)];
        }
        
        const { x: newX, y: newY } = getNextPosition(currentX, currentY, currentDirection);
        currentX = newX;
        currentY = newY;
        
        const relXAfterMove = currentX - viewportX;
        const relYAfterMove = currentY - viewportY;
        const constrainedPosition = constrainToViewport(relXAfterMove, relYAfterMove, viewportWidth, viewportHeight);
        currentX = constrainedPosition.x + viewportX;
        currentY = constrainedPosition.y + viewportY;
        
        allPositions.push({ x: currentX, y: currentY });
        if (allPositions.length > snakeLength) {
          allPositions.shift();
        }
        snakeDirections[snakeIndex] = currentDirection;
      }
      
      const segmentsForFrame = [...allPositions];
      for (let i = segmentsForFrame.length - 1; i >= 0; i--) {
        const segment = segmentsForFrame[i];
        const relativePosition = segmentsForFrame.length - 1 - i;
        const intensity = 1.0 - (relativePosition / Math.max(1, segmentsForFrame.length) * 0.7); // Avoid division by zero
        const segmentColor = modifyColorIntensity(color, intensity);
        result[frameId].push({ x: segment.x, y: segment.y, color: segmentColor, animationId: id, isHead: i === segmentsForFrame.length - 1 });
      }
    }
  }
  return result;
};

// Generate a line animation based on parameters (from old file)
const generateLineAnimation = (
  animation: AnimationObject,
  canvasSize: CanvasSize,
  frameCount: number
): Record<string, PixelData[]> => {
  const result: Record<string, PixelData[]> = {};
  if (animation.type !== 'LINE' || !animation.frames || !animation.direction || !animation.orientation) return result;

  const { id, color, direction, orientation, frames, speed = 1, borderBehavior = 'WRAP' } = animation;
  const viewportWidth = canvasSize.width;
  const viewportHeight = canvasSize.height;
  const viewportX = canvasSize.viewportX || 0;
  const viewportY = canvasSize.viewportY || 0;

  const totalDistance = orientation === 'HORIZONTAL' ? viewportWidth : viewportHeight;
  const baseStepSize = totalDistance > 0 && frameCount > 0 ? totalDistance / frameCount : 1; // Avoid division by zero or NaN
  const stepSize = Math.ceil(baseStepSize) * speed;

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) { // Iterate over actual frames for this animation
    const frameId = frames[frameIndex];
    if (!frameId) continue;
    result[frameId] = []; // Initialize pixel array for this frame
    
    const pixels: PixelData[] = [];
    let viewportPosition;
    
    if (orientation === 'HORIZONTAL') {
      if (borderBehavior === 'WRAP') {
        if (direction === 'RIGHT') {
          viewportPosition = viewportWidth > 0 ? (frameIndex * stepSize) % viewportWidth : 0;
        } else { // LEFT
          viewportPosition = viewportWidth > 0 ? viewportWidth - ((frameIndex * stepSize) % viewportWidth) - 1 : 0;
        }
      } else { // BOUNCE
        const cycle = viewportWidth > 0 ? Math.floor((frameIndex * stepSize) / viewportWidth) : 0;
        const offset = viewportWidth > 0 ? (frameIndex * stepSize) % viewportWidth : 0;
        if (cycle % 2 === 0) {
          viewportPosition = direction === 'RIGHT' ? offset : viewportWidth - offset - 1;
        } else {
          viewportPosition = direction === 'RIGHT' ? viewportWidth - offset - 1 : offset;
        }
      }
      if (viewportPosition < 0) viewportPosition = 0; // Ensure position is not negative
      if (viewportPosition >= viewportWidth && viewportWidth > 0) viewportPosition = viewportWidth -1;


      for (let i = 0; i < viewportHeight; i++) {
        const absoluteY = i + viewportY;
        pixels.push({ x: viewportPosition + viewportX, y: absoluteY, color, animationId: id });
      }
    } else { // VERTICAL
      if (borderBehavior === 'WRAP') {
        if (direction === 'DOWN') {
          viewportPosition = viewportHeight > 0 ? (frameIndex * stepSize) % viewportHeight : 0;
        } else { // UP
          viewportPosition = viewportHeight > 0 ? viewportHeight - ((frameIndex * stepSize) % viewportHeight) - 1 : 0;
        }
      } else { // BOUNCE
        const cycle = viewportHeight > 0 ? Math.floor((frameIndex * stepSize) / viewportHeight) : 0;
        const offset = viewportHeight > 0 ? (frameIndex * stepSize) % viewportHeight : 0;
        if (cycle % 2 === 0) {
          viewportPosition = direction === 'DOWN' ? offset : viewportHeight - offset - 1;
        } else {
          viewportPosition = direction === 'DOWN' ? viewportHeight - offset - 1 : offset;
        }
      }
      if (viewportPosition < 0) viewportPosition = 0; // Ensure position is not negative
      if (viewportPosition >= viewportHeight && viewportHeight > 0) viewportPosition = viewportHeight - 1;

      for (let i = 0; i < viewportWidth; i++) {
        const absoluteX = i + viewportX;
        pixels.push({ x: absoluteX, y: viewportPosition + viewportY, color, animationId: id });
      }
    }
    result[frameId] = pixels;
  }
  return result;
};

// Generate an X-shape animation that rotates (from old file)
const generateXAnimation = (
  animation: AnimationObject,
  canvasSize: CanvasSize, // This should be the originalCanvasSize for X
  frameCount: number
): Record<string, PixelData[]> => {
  const result: Record<string, PixelData[]> = {};
  if (animation.type !== 'X' || !animation.frames || animation.rotationSpeed === undefined) return result;

  const { id, color, rotationSpeed, frames, position, stretchToEdges, thickness = 1 } = animation;
  
  // Use original canvas dimensions for X-shape calculations
  const originalWidth = canvasSize.originalWidth;
  const originalHeight = canvasSize.originalHeight;

  let centerX = Math.floor(originalWidth / 2);
  let centerY = Math.floor(originalHeight / 2);
  
  if (position?.x !== undefined && position?.y !== undefined) {
    centerX = position.x; // These should be in original canvas coordinates
    centerY = position.y;
  }
  
  let maxRadius: number;
  if (stretchToEdges) {
    const distToTopLeft = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
    const distToTopRight = Math.sqrt(Math.pow(originalWidth - centerX, 2) + Math.pow(centerY, 2));
    const distToBottomLeft = Math.sqrt(Math.pow(centerX, 2) + Math.pow(originalHeight - centerY, 2));
    const distToBottomRight = Math.sqrt(Math.pow(originalWidth - centerX, 2) + Math.pow(originalHeight - centerY, 2));
    maxRadius = Math.ceil(Math.max(distToTopLeft, distToTopRight, distToBottomLeft, distToBottomRight));
  } else {
    maxRadius = Math.min(centerX, originalWidth - centerX, centerY, originalHeight - centerY);
  }
  if (isNaN(maxRadius) || maxRadius <= 0) maxRadius = Math.min(originalWidth, originalHeight) / 4;
  
  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) { // Iterate over actual frames for this animation
    const frameId = frames[frameIndex];
    if (!frameId) continue;
    result[frameId] = []; // Initialize pixel array for this frame

    const pixels: PixelData[] = [];
    const angle = (frameIndex * rotationSpeed * Math.PI / 180) % (2 * Math.PI);
    
    for (let r = -maxRadius; r <= maxRadius; r++) { // Iterate along the radius
      // Diagonal 1
      const x1 = Math.round(centerX + r * Math.cos(angle));
      const y1 = Math.round(centerY + r * Math.sin(angle));
      if (x1 >= 0 && x1 < originalWidth && y1 >= 0 && y1 < originalHeight) {
         pixels.push({ x: x1, y: y1, color, animationId: id });
      }
      // Diagonal 2 (perpendicular)
      const x2 = Math.round(centerX + r * Math.cos(angle + Math.PI / 2));
      const y2 = Math.round(centerY + r * Math.sin(angle + Math.PI / 2));
      if (x2 >= 0 && x2 < originalWidth && y2 >= 0 && y2 < originalHeight) {
         pixels.push({ x: x2, y: y2, color, animationId: id });
      }
    }
        
    if (thickness > 1) {
      const thickPixelsBase = [...pixels]; // Pixels from the single-pixel lines
      const addedForThickness = new Set<string>(); // To avoid duplicates

      for (const p of thickPixelsBase) {
        for (let tx = -Math.floor((thickness -1) / 2); tx <= Math.ceil((thickness -1) / 2); tx++) {
          for (let ty = -Math.floor((thickness -1)/ 2); ty <= Math.ceil((thickness-1) / 2); ty++) {
            // if (tx === 0 && ty === 0) continue; // Already added
            const newX = p.x + tx;
            const newY = p.y + ty;
            const key = `${newX},${newY}`;

            if (newX >= 0 && newX < originalWidth && newY >= 0 && newY < originalHeight && !addedForThickness.has(key)) {
              // A simple square thickness. For true line thickness, Bresenham or similar would be needed for each thick line segment.
              pixels.push({ x: newX, y: newY, color, animationId: id });
              addedForThickness.add(key);
            }
          }
        }
      }
    }
    result[frameId] = pixels;
  }
  return result;
};

// Generate Rectangle Animation (from old file)
const generateRectangleAnimation = (
  animation: AnimationObject,
  canvasSize: CanvasSize, // Expects original canvas size for state definitions
  frameCount: number 
): Record<string, PixelData[]> => {
  const result: Record<string, PixelData[]> = {};
  if (animation.type !== 'RECTANGLE' || !animation.frames || !animation.rectangleStates || animation.rectangleStates.length === 0) {
    return result;
  }

  const { 
    id, color, frames, rectangleStates, rectangleSpeed = 1, rectangleHasFill = false,
    rectangleEasingFunction = 'LINEAR', rectangleCycleMode = 'PING_PONG' as RectCycleModeEnum
  } = animation;
  
  const clampedSpeed = Math.max(0.1, Math.min(20, rectangleSpeed)); 
  const animWidth = canvasSize.originalWidth; // Rectangle states are in original canvas coordinates
  const animHeight = canvasSize.originalHeight;
  const STANDARD_FRAME_DURATION_MS = 100; 

  frames.forEach(frameId => { result[frameId] = []; });

  const validStates = rectangleStates.map(state => ({ ...state, delay: Math.max(0, state.delay || 0) }));

  if (validStates.length < 2) {
    if (validStates.length === 1) {
        const s = validStates[0];
        const pixels = rectangleHasFill 
            ? drawFilledRectangle(s.x, s.y, s.width, s.height, color, id)
            : drawRectangleOutline(s.x, s.y, s.width, s.height, color, id);
        const filteredPixels = pixels.filter(p => p.x >= 0 && p.x < animWidth && p.y >= 0 && p.y < animHeight);
        frames.forEach(frameId => { result[frameId] = filteredPixels; });
    }
    return result;
  }
  
  const easingName = (rectangleEasingFunction || 'LINEAR').toLowerCase() as keyof typeof easingFunctions;
  const easeFunc = easingFunctions[easingName] || easingFunctions.linear;
  const baseFramesPerTransition = 30; 
  const minFramesPerTransition = 1;   
  const framesPerTransition = Math.max(minFramesPerTransition, Math.round(baseFramesPerTransition / clampedSpeed));

  const phases: { type: 'hold' | 'transition', stateIndex: number, durationFrames: number, nextStateIndex?: number }[] = [];
  let sequenceIndices: number[] = [];
  const numStates = validStates.length;

  if (rectangleCycleMode === 'PING_PONG') {
    for (let i = 0; i < numStates; i++) sequenceIndices.push(i);
    for (let i = numStates - 2; i > 0; i--) sequenceIndices.push(i); 
  } else if (rectangleCycleMode === 'DIRECT_TO_START') {
    for (let i = 0; i < numStates; i++) sequenceIndices.push(i);
  } else { // NO_CYCLE or LOOP (LOOP will behave like DIRECT_TO_START here as we add transition back to 0 if it's not NO_CYCLE)
    for (let i = 0; i < numStates; i++) sequenceIndices.push(i);
  }

  if (sequenceIndices.length === 0) return result; 

  let totalCycleFrames = 0;
  for (let i = 0; i < sequenceIndices.length; i++) {
    const currentStateIndex = sequenceIndices[i];
    const currentState = validStates[currentStateIndex];
    const holdFrames = Math.max(0, Math.round(currentState.delay / STANDARD_FRAME_DURATION_MS));
    if (holdFrames > 0) {
        phases.push({ type: 'hold', stateIndex: currentStateIndex, durationFrames: holdFrames });
        totalCycleFrames += holdFrames;
    }

    let nextSequenceVirtualIndex = i + 1;
    let isLastTransitionInSequence = false;
    
    if (rectangleCycleMode !== 'NO_CYCLE') {
        nextSequenceVirtualIndex = nextSequenceVirtualIndex % sequenceIndices.length; 
    } else if (nextSequenceVirtualIndex >= sequenceIndices.length) {
        isLastTransitionInSequence = true; 
    }

    if (!isLastTransitionInSequence || (rectangleCycleMode === 'DIRECT_TO_START' && i === sequenceIndices.length -1)) {
        const nextStateIndexInValidStates = rectangleCycleMode === 'DIRECT_TO_START' && i === sequenceIndices.length -1 
                                            ? sequenceIndices[0] // Transition back to the very first state
                                            : sequenceIndices[nextSequenceVirtualIndex];

        phases.push({ 
            type: 'transition', stateIndex: currentStateIndex, 
            nextStateIndex: nextStateIndexInValidStates, 
            durationFrames: framesPerTransition 
        });
        totalCycleFrames += framesPerTransition;
    }
  }
  if (rectangleCycleMode === 'LOOP' && sequenceIndices.length > 0) { // Ensure transition from last to first for LOOP
    const lastStateInSequence = sequenceIndices[sequenceIndices.length -1];
    const firstStateInSequence = sequenceIndices[0];
    if(lastStateInSequence !== firstStateInSequence || phases[phases.length-1]?.nextStateIndex !== firstStateInSequence) {
        phases.push({
            type: 'transition', stateIndex: lastStateInSequence,
            nextStateIndex: firstStateInSequence,
            durationFrames: framesPerTransition
        });
        totalCycleFrames += framesPerTransition;
    }
  }


  if (totalCycleFrames <= 0) totalCycleFrames = 1;

  for (let animFrameIdx = 0; animFrameIdx < frameCount; animFrameIdx++) { // Iterate through the number of frames this animation applies to
    const frameId = frames[animFrameIdx % frames.length]; // Cycle through the animation's specified frames if frameCount is larger
    if (!frameId || !result[frameId]) continue;

    let virtualFrameInCycle = 0;
    if (rectangleCycleMode === 'NO_CYCLE') {
        virtualFrameInCycle = Math.min(animFrameIdx, totalCycleFrames - 1);
    } else {
        virtualFrameInCycle = animFrameIdx % totalCycleFrames; 
    }

    let currentPhase: typeof phases[0] | null = null;
    let progressInPhase = 0;
    let cumulativeFrames = 0;

    for (const phase of phases) {
      const phaseEndFrame = cumulativeFrames + phase.durationFrames;
      if (virtualFrameInCycle >= cumulativeFrames && virtualFrameInCycle < phaseEndFrame) {
        currentPhase = phase;
        if (phase.durationFrames > 1) {
            progressInPhase = (virtualFrameInCycle - cumulativeFrames) / (phase.durationFrames - 1);
        } else {
            progressInPhase = 1; 
        }
        break;
      }
      cumulativeFrames += phase.durationFrames;
    }

    let currentPixels: PixelData[] = [];
    if (currentPhase) {
        if (currentPhase.type === 'hold') {
            const state = validStates[currentPhase.stateIndex];
            currentPixels = rectangleHasFill 
                ? drawFilledRectangle(state.x, state.y, state.width, state.height, color, id)
                : drawRectangleOutline(state.x, state.y, state.width, state.height, color, id);
        } else if (currentPhase.type === 'transition' && currentPhase.nextStateIndex !== undefined) {
            const startState = validStates[currentPhase.stateIndex];
            const endState = validStates[currentPhase.nextStateIndex];
            const easedProgress = easeFunc(Math.max(0, Math.min(1, progressInPhase)));
            const interpRect = interpolateRectangles(startState, endState, easedProgress);
            
            if (interpRect.width >= 1 && interpRect.height >= 1) { 
                currentPixels = rectangleHasFill 
                ? drawFilledRectangle(interpRect.x, interpRect.y, interpRect.width, interpRect.height, color, id)
                : drawRectangleOutline(interpRect.x, interpRect.y, interpRect.width, interpRect.height, color, id);
            }
        }
    } else if(validStates.length > 0) {
        const state = validStates[0];
         currentPixels = rectangleHasFill 
            ? drawFilledRectangle(state.x, state.y, state.width, state.height, color, id)
            : drawRectangleOutline(state.x, state.y, state.width, state.height, color, id);
    }
    result[frameId] = currentPixels.filter(p => p.x >= 0 && p.x < animWidth && p.y >= 0 && p.y < animHeight);
  }
  return result;
};
// --- Simple Countdown Animation Generation (Performance Optimized) ---
const generateSimpleCountdownAnimation = (
  animation: AnimationObject,
  canvasSize: CanvasSize,
): Record<string, PixelData[]> => {
  const result: Record<string, PixelData[]> = {};
  const { id, frames: animationFrameIds, color = '#FFFFFF' } = animation;
  
  const finalCountdownSize = Math.max(1, animation.countdownSize || 1);
  const finalCountdownSpeed = animation.countdownSpeed || 1000;
  const STANDARD_FRAME_DURATION_MS = 100;
  const framesPerDigit = Math.max(1, Math.floor(finalCountdownSpeed / STANDARD_FRAME_DURATION_MS));
  
  const digits = ['3', '2', '1'];
  const viewportWidth = canvasSize.width;
  const viewportHeight = canvasSize.height;
  const viewportXBase = canvasSize.viewportX || 0;
  const viewportYBase = canvasSize.viewportY || 0;
  
  let currentGlobalFrameIndexInAnimation = 0;
  
  for (const digit of digits) {
    if (currentGlobalFrameIndexInAnimation >= animationFrameIds.length) break;
    
    const pattern = BASE_NUMBER_PATTERNS[digit];
    if (!pattern) continue;
    
    const basePatternHeight = pattern.length;
    const basePatternWidth = pattern[0]?.length || 0;
    if (basePatternHeight === 0 || basePatternWidth === 0) continue;
    
    const scaledDigitHeight = basePatternHeight * finalCountdownSize;
    const scaledDigitWidth = basePatternWidth * finalCountdownSize;
    
    const offsetX = animation.countdownOffset?.x || 0;
    const offsetY = animation.countdownOffset?.y || 0;
    
    const startXAbsolute = (animation.countdownBounds
      ? animation.countdownBounds.x + Math.floor((animation.countdownBounds.width - scaledDigitWidth) / 2)
      : viewportXBase + Math.floor((viewportWidth - scaledDigitWidth) / 2)) + offsetX;
      
    const startYAbsolute = (animation.countdownBounds
      ? animation.countdownBounds.y + Math.floor((animation.countdownBounds.height - scaledDigitHeight) / 2)
      : viewportYBase + Math.floor((viewportHeight - scaledDigitHeight) / 2)) + offsetY;
    
    // Generate static digit for all frames of this digit
    const digitPixels: PixelData[] = [];
    for (let r = 0; r < basePatternHeight; r++) {
      for (let c = 0; c < basePatternWidth; c++) {
        if (pattern[r][c] === 1) {
          for (let sr = 0; sr < finalCountdownSize; sr++) {
            for (let sc = 0; sc < finalCountdownSize; sc++) {
              const pixelX = startXAbsolute + c * finalCountdownSize + sc;
              const pixelY = startYAbsolute + r * finalCountdownSize + sr;
              digitPixels.push({ x: pixelX, y: pixelY, color, animationId: id });
            }
          }
        }
      }
    }
    
    // Apply to all frames for this digit
    for (let frameOfCurrentDigit = 0; frameOfCurrentDigit < framesPerDigit; frameOfCurrentDigit++) {
      if (currentGlobalFrameIndexInAnimation >= animationFrameIds.length) break;
      const globalFrameId = animationFrameIds[currentGlobalFrameIndexInAnimation];
      result[globalFrameId] = [...digitPixels];
      currentGlobalFrameIndexInAnimation++;
    }
  }
  
  return result;
};

// --- Countdown Animation Generation ---
const generateCountdownAnimation = (
  animation: AnimationObject,
  canvasSize: CanvasSize,
): Record<string, PixelData[]> => {
  const result: Record<string, PixelData[]> = {};
  if (animation.type !== 'COUNTDOWN' || !animation.frames || animation.frames.length === 0) {
    return result;
  }

  // Performance optimization: Early return for simple cases
  const hasComplexEffects = animation.countdownEnableBlackBackground || 
                           animation.countdownEnableSafeZone || 
                           animation.countdownEnableSparkleEffect ||
                           animation.countdownEnableGradientPulse ||
                           animation.countdownEnableStaticVerticalGradient ||
                           animation.countdownEnableLoadingBar;
  
  // For simple countdown without complex effects, use optimized path
  if (!hasComplexEffects && animation.countdownFadeOption === 'none') {
    return generateSimpleCountdownAnimation(animation, canvasSize);
  }

  const {
    id,
    frames: animationFrameIds, // These are global frame IDs
  } = animation;
  const colorToUse = animation.color || '#FFFFFF';
  
  // Black background function parameters
  const enableBlackBackground = animation.countdownEnableBlackBackground ?? false;
  const blackBackgroundColor = animation.countdownBlackBackgroundColor || '#000000';
  const disintegrationDuration = animation.countdownDisintegrationDuration ?? 1000; // Default 1 second
  const disintegrationParticleSize = Math.max(1, Math.min(3, animation.countdownDisintegrationParticleSize ?? 1));
  const disintegrationParticleCount = animation.countdownDisintegrationParticleCount ?? 30; // Density of particles
  let finalCountdownSize = Math.max(1, animation.countdownSize || 1); // Default scaling factor
  const finalCountdownSpeed = animation.countdownSpeed || 1000; // This is ms per step (3, 2, 1) for non-cycle animations
  const finalCountdownFadeOption = animation.countdownFadeOption || 'none';
  const countdownHoldDurationMs = animation.countdownHoldDuration ?? 500; // Default hold time
 
  // Sparkle effect parameters
  const enableSparkleEffect = animation.countdownEnableSparkleEffect ?? false;
  // brightHighlightColor is defined below, use it as default for sparkleColor
  const maxSparklesPerFrame = animation.countdownMaxSparklesPerFrame ?? 1; // Low default for 16x16
  const sparkleLifetime = animation.countdownSparkleLifetime ?? 3; // Short lifetime for 16x16
 
  const viewportWidth = canvasSize.width;
  const viewportHeight = canvasSize.height;
  const viewportXBase = canvasSize.viewportX || 0;
  const viewportYBase = canvasSize.viewportY || 0;

  // Define bright and dark colors for drip effects
  const brightHighlightColor = modifyColorIntensity(colorToUse, 2.0); // Significantly brighter
  const darkTrailColor = modifyColorIntensity(colorToUse, 0.1); // Significantly darker
  const sparkleColor = animation.countdownSparkleColor || brightHighlightColor;
 
  // Pulsating Gradient Parameters
  const enableGradientPulse = animation.countdownEnableGradientPulse ?? false;
  const gradientColorStart = animation.countdownGradientColorStart || colorToUse;
  const gradientColorEnd = animation.countdownGradientColorEnd || brightHighlightColor; // Default to a contrast
  const gradientPulseSpeedMs = animation.countdownGradientPulseSpeed || 2000; // Default 2 seconds for a full pulse
 
  // Static Vertical Gradient Parameters
  const enableStaticVerticalGradient = animation.countdownEnableStaticVerticalGradient ?? false;
  const staticGradientColorTop = animation.countdownStaticGradientColorTop || colorToUse;
  const staticGradientColorBottom = animation.countdownStaticGradientColorBottom || colorToUse;
  // Animation for Static Vertical Gradient
  const staticGradientAnimate = animation.countdownStaticGradientAnimate ?? false;
  const staticGradientAnimationSpeed = animation.countdownStaticGradientAnimationSpeed ?? 1; // Pixels per frame
  const staticGradientCycle = animation.countdownStaticGradientCycle ?? true;
 
  const digits = ['3', '2', '1'];
  // For digitalDripCycle, finalCountdownSpeed is the duration for IN and also for OUT phase.
  // For other modes, it's the total duration for the digit.
  const framesPerPhaseInOut = Math.max(1, Math.floor(finalCountdownSpeed / STANDARD_FRAME_DURATION_MS));
  const framesForHold = Math.max(0, Math.floor(countdownHoldDurationMs / STANDARD_FRAME_DURATION_MS));
  
  let framesPerDigit: number;
  if (finalCountdownFadeOption === 'digitalDripCycle') {
    framesPerDigit = framesPerPhaseInOut * 2 + framesForHold;
  } else {
    framesPerDigit = Math.max(1, Math.floor(finalCountdownSpeed / STANDARD_FRAME_DURATION_MS));
  }
  let currentGlobalFrameIndexInAnimation = 0;

  // --- Safe Zone Intro Animation (Part A) ---
  // This section handles the "Lauflicht" intro animation for safe zone pixels.
  // It runs COMPLETELY before the main countdown digits (3, 2, 1) are displayed.
  const SAFE_ZONE_COLOR = '#00FF00'; // Standard green for safe zone pixels
  
  // Get the customizable speed factor for the SafeZone animation, default to 1.0 if not set
  const safeZoneSpeedFactor = animation.countdownSafeZoneSpeed || 1.0;
  // Adjust the animation duration based on the speed factor (faster speed = shorter duration)
  const INTRO_ANIMATION_DURATION_MS = Math.max(100, 1000 / safeZoneSpeedFactor); // Min 100ms, adjust base duration by speed factor
  
  // STANDARD_FRAME_DURATION_MS is defined globally (e.g., 100ms)
  const introAnimationTotalFrames = Math.floor(INTRO_ANIMATION_DURATION_MS / STANDARD_FRAME_DURATION_MS);
  
  // Flag to track if we should proceed to the countdown animation
  let safeZoneAnimationComplete = true; // Default to true if safe zone is not enabled

  if (
    animation.countdownEnableSafeZone &&
    animation.countdownSafeZonePixels &&
    animation.countdownSafeZonePixels.length > 0 &&
    animation.countdownSafeZoneIntroAnimation === 'centerOut'
  ) {
    // Set flag to false since we need to complete the safe zone animation first
    safeZoneAnimationComplete = false;
    const safeZonePixels = animation.countdownSafeZonePixels;

    // Calculate the geometric center of all safe zone pixels.
    // This center is used as the origin for the 'centerOut' animation.
    let sumX = 0;
    let sumY = 0;
    safeZonePixels.forEach(p => {
      sumX += p.x;
      sumY += p.y;
    });
    // Avoid division by zero if safeZonePixels.length is 0 (though checked above).
    const centerX = safeZonePixels.length > 0 ? sumX / safeZonePixels.length : 0;
    const centerY = safeZonePixels.length > 0 ? sumY / safeZonePixels.length : 0;

    // Calculate the maximum distance from the center to any safe zone pixel.
    // This is used to normalize the animation progress so all pixels are revealed by the end.
    let maxDistanceSquared = 0;
    safeZonePixels.forEach(p => {
      const distSq = Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2);
      if (distSq > maxDistanceSquared) {
        maxDistanceSquared = distSq;
      }
    });
    const maxDistance = Math.sqrt(maxDistanceSquared);

    // Generate frames for the intro animation.
    for (let introFrameIndex = 0; introFrameIndex < introAnimationTotalFrames; introFrameIndex++) {
      if (currentGlobalFrameIndexInAnimation >= animationFrameIds.length) {
        // Stop if there are no more allocated global frames for this animation object.
        // This prevents errors if the animation object's duration is too short for the intro.
        console.warn(`Safe zone intro animation for ${id} truncated due to insufficient frame allocation.`);
        break;
      }
      const globalFrameId = animationFrameIds[currentGlobalFrameIndexInAnimation];
      const pixelsForThisIntroFrame: PixelData[] = [];
      
      // Determine which pixels should be visible based on their distance from the center
      // and the current progress of the intro animation.
      const introProgressRatio = (introFrameIndex + 1) / introAnimationTotalFrames;
      const currentDistanceThreshold = maxDistance * introProgressRatio;

      safeZonePixels.forEach(pixel => {
        const distanceToCenter = Math.sqrt(Math.pow(pixel.x - centerX, 2) + Math.pow(pixel.y - centerY, 2));
        // Pixels within the current distance threshold are made visible.
        if (distanceToCenter <= currentDistanceThreshold) {
          pixelsForThisIntroFrame.push({ x: pixel.x, y: pixel.y, color: SAFE_ZONE_COLOR, animationId: id });
        }
      });
      
      // Add black background if enabled
      if (enableBlackBackground) {
        // Create a set of existing pixels for quick lookup
        const existingPixelSet = new Set<string>();
        pixelsForThisIntroFrame.forEach(pixel => {
          existingPixelSet.add(`${pixel.x},${pixel.y}`);
        });
        
        // Generate black background pixels, excluding existing safe zone pixels
        const blackPixels = fillViewportWithBlackExceptExistingPixels(
          viewportXBase,
          viewportYBase,
          viewportWidth,
          viewportHeight,
          blackBackgroundColor,
          existingPixelSet,
          id
        );
        
        // Add black pixels to this frame
        pixelsForThisIntroFrame.push(...blackPixels);
      }
      
      result[globalFrameId] = pixelsForThisIntroFrame; // Assign the generated pixels to the result for this global frame.
      currentGlobalFrameIndexInAnimation++; // Move to the next global frame index.
      
      // Check if this was the last frame of the safe zone animation
      if (introFrameIndex === introAnimationTotalFrames - 1) {
        safeZoneAnimationComplete = true;
      }
    }
    
    // If we couldn't complete the safe zone animation due to frame constraints,
    // but did use some frames, ensure we mark it as complete to proceed with countdown
    if (!safeZoneAnimationComplete && currentGlobalFrameIndexInAnimation > 0) {
      safeZoneAnimationComplete = true;
    }
  }
  // --- End of Safe Zone Intro Animation ---
  
  // Add pause between SafeZone animation and Countdown if enabled
  const pauseDurationMs = animation.countdownSafeZonePauseDuration || 0; // Default to no pause if not set
  if (safeZoneAnimationComplete && pauseDurationMs > 0) {
    const pauseFrames = Math.floor(pauseDurationMs / STANDARD_FRAME_DURATION_MS);
    
    // Add pause frames with the complete safe zone visible but no countdown yet
    for (let pauseFrameIndex = 0; pauseFrameIndex < pauseFrames; pauseFrameIndex++) {
      if (currentGlobalFrameIndexInAnimation >= animationFrameIds.length) {
        // No more frames available for pause
        break;
      }
      
      const globalFrameId = animationFrameIds[currentGlobalFrameIndexInAnimation];
      const pixelsForPauseFrame: PixelData[] = [];
      
      // Show the complete safe zone during pause
      if (
        animation.countdownEnableSafeZone &&
        animation.countdownSafeZonePixels &&
        animation.countdownSafeZonePixels.length > 0
      ) {
        // Display all safe zone pixels during the pause
        animation.countdownSafeZonePixels.forEach(pixel => {
          pixelsForPauseFrame.push({ x: pixel.x, y: pixel.y, color: SAFE_ZONE_COLOR, animationId: id });
        });
      }
      
      // Add black background if enabled
      if (enableBlackBackground) {
        // Create a set of existing pixels for quick lookup
        const existingPixelSet = new Set<string>();
        pixelsForPauseFrame.forEach(pixel => {
          existingPixelSet.add(`${pixel.x},${pixel.y}`);
        });
        
        // Generate black background pixels, excluding existing safe zone pixels
        const blackPixels = fillViewportWithBlackExceptExistingPixels(
          viewportXBase,
          viewportYBase,
          viewportWidth,
          viewportHeight,
          blackBackgroundColor,
          existingPixelSet,
          id
        );
        
        // Add black pixels to this frame
        pixelsForPauseFrame.push(...blackPixels);
      }
      
      result[globalFrameId] = pixelsForPauseFrame;
      currentGlobalFrameIndexInAnimation++;
    }
  }
  
  // Only proceed with the countdown animation if the safe zone animation is complete or not applicable

  // Only proceed with countdown if safe zone animation is complete
  if (!safeZoneAnimationComplete) {
    // If we can't complete safe zone animation, just fill remaining frames with empty pixels
    while (currentGlobalFrameIndexInAnimation < animationFrameIds.length) {
      const globalFrameId = animationFrameIds[currentGlobalFrameIndexInAnimation];
      result[globalFrameId] = []; // Empty frame
      currentGlobalFrameIndexInAnimation++;
    }
    return result; // Exit early, don't proceed to countdown
  }

  // Variables to track if we are entering the disintegration phase
let countdownComplete = false;
let disintegrationStarted = false;
let disintegrationStartFrame = 0;

// Function to render black background and exclude existing pixels
const addBlackBackgroundToFrame = (framePixels: PixelData[], frameIndex: number) => {
  // Skip if black background isn't enabled
  if (!enableBlackBackground) return;
  
  // Track all existing pixels in a set for quick lookup
  const existingPixelSet = new Set<string>();
  framePixels.forEach(pixel => {
    existingPixelSet.add(`${pixel.x},${pixel.y}`);
  });
  
  // Generate black background pixels
  const blackPixels = fillViewportWithBlackExceptExistingPixels(
    viewportXBase,
    viewportYBase,
    viewportWidth,
    viewportHeight,
    blackBackgroundColor,
    existingPixelSet,
    id
  );
  
  // Add black pixels to frame
  framePixels.push(...blackPixels);
};

for (const digit of digits) {
    if (currentGlobalFrameIndexInAnimation >= animationFrameIds.length) break;

    const pattern = BASE_NUMBER_PATTERNS[digit];
    if (!pattern) continue;

    const basePatternHeight = pattern.length;
    const basePatternWidth = pattern[0]?.length || 0;
    if (basePatternHeight === 0 || basePatternWidth === 0) continue;

    let actualPixelSizeForDigit = finalCountdownSize;

    let boundsX = viewportXBase;
    let boundsY = viewportYBase;
    let boundsWidth = viewportWidth;
    let boundsHeight = viewportHeight;

    if (animation.countdownBounds) {
      boundsX = animation.countdownBounds.x;
      boundsY = animation.countdownBounds.y;
      boundsWidth = animation.countdownBounds.width;
      boundsHeight = animation.countdownBounds.height;

      const scaleFactorW = boundsWidth / basePatternWidth;
      const scaleFactorH = boundsHeight / basePatternHeight;
      actualPixelSizeForDigit = Math.max(1, Math.floor(Math.min(scaleFactorW, scaleFactorH)));
    }
    
    const scaledDigitHeight = basePatternHeight * actualPixelSizeForDigit;
    const scaledDigitWidth = basePatternWidth * actualPixelSizeForDigit;

    // Berücksichtige den Offset-Parameter, falls vorhanden
    const offsetX = animation.countdownOffset?.x || 0;
    const offsetY = animation.countdownOffset?.y || 0;
    
    const startXAbsolute = (animation.countdownBounds
      ? animation.countdownBounds.x + Math.floor((animation.countdownBounds.width - scaledDigitWidth) / 2)
      : viewportXBase + Math.floor((viewportWidth - scaledDigitWidth) / 2))
      + offsetX; // Füge X-Offset hinzu
      
    const startYAbsolute = (animation.countdownBounds
      ? animation.countdownBounds.y + Math.floor((animation.countdownBounds.height - scaledDigitHeight) / 2)
      : viewportYBase + Math.floor((viewportHeight - scaledDigitHeight) / 2))
      + offsetY; // Füge Y-Offset hinzu

    // Staggering and duration for drip effects
    const dripEffectDurationRatio = 0.8; // 80% of time for the actual drip
    const actualDripEffectDurationFrames = Math.max(1, Math.floor(framesPerDigit * dripEffectDurationRatio));
    const totalStaggerTimeFrames = framesPerDigit - actualDripEffectDurationFrames;
    const staggerPerColumnFrames = basePatternWidth > 1 ? totalStaggerTimeFrames / (basePatternWidth - 1) : 0;
 
    let activeSparkles: Array<{ x: number, y: number, lifetime: number, color: string }> = [];
 
    for (let frameOfCurrentDigit = 0; frameOfCurrentDigit < framesPerDigit; frameOfCurrentDigit++) {
      if (currentGlobalFrameIndexInAnimation >= animationFrameIds.length) break;

      const globalFrameId = animationFrameIds[currentGlobalFrameIndexInAnimation];
      const pixelsForCurrentFrame: PixelData[] = [];

      // --- LOADING BAR LOGIC ---
      if (animation.countdownEnableLoadingBar && animation.countdownLoadingBarArea && animation.countdownLoadingBarColors) {
        const loadingBarArea = animation.countdownLoadingBarArea;
        const loadingBarColors = animation.countdownLoadingBarColors;
        const digitIndex = digits.indexOf(digit); // 0 for "3", 1 for "2", 2 for "1"

        // Draw previously filled bars
        for (let i = 0; i < digitIndex; i++) {
          if (loadingBarColors[i]) {
            pixelsForCurrentFrame.push(...drawFilledRectangle(
              loadingBarArea.x,
              loadingBarArea.y,
              loadingBarArea.width,
              loadingBarArea.height,
              loadingBarColors[i],
              id // animationId
            ));
          }
        }

        // Draw current animating bar
        if (loadingBarColors[digitIndex] && loadingBarArea.width > 0 && loadingBarArea.height > 0) {
          // Progress of the current digit's display time, considering speed factor
          const speedFactor = animation.countdownLoadingBarSpeedFactor || 1.0;
          // Ensure effectiveFramesForBar is at least 1 to prevent issues with progress calculation if speedFactor is very high
          const effectiveFramesForBar = Math.max(1, framesPerDigit / speedFactor);
          
          let progress;
          if (framesPerDigit <= 0) { // Should not happen if framesPerDigit is derived from a positive duration
            progress = 1.0;
          } else if (effectiveFramesForBar <= 1) { // Bar should fill instantly or be full if duration is too short
            progress = frameOfCurrentDigit >= 0 ? 1.0 : 0.0; // Fill if on or after first frame of digit
          } else {
            progress = frameOfCurrentDigit / (effectiveFramesForBar -1);
          }
          progress = Math.min(1.0, Math.max(0.0, progress)); // Clamp progress

          const animatingWidth = Math.max(0, Math.min(loadingBarArea.width, Math.round(loadingBarArea.width * progress)));
          
          if (animatingWidth > 0) {
            pixelsForCurrentFrame.push(...drawFilledRectangle(
              loadingBarArea.x,
              loadingBarArea.y,
              animatingWidth,
              loadingBarArea.height,
              loadingBarColors[digitIndex],
              id // animationId
            ));
          }
        }
      }
      // --- END LOADING BAR LOGIC ---

      // Staggering and duration for drip effects (used by digitalDripIn, digitalDripOut, digitalDripCycle)
      // For digitalDripCycle, framesPerPhaseInOut is the duration for one phase (in or out)
      const currentPhaseDurationFrames = (finalCountdownFadeOption === 'digitalDripCycle') ? framesPerPhaseInOut : framesPerDigit;
      const actualDripEffectDurationFramesForPhase = Math.max(1, Math.floor(currentPhaseDurationFrames * dripEffectDurationRatio));
      const totalStaggerTimeFramesForPhase = currentPhaseDurationFrames - actualDripEffectDurationFramesForPhase;
      const staggerPerColumnFramesForPhase = basePatternWidth > 1 ? totalStaggerTimeFramesForPhase / (basePatternWidth - 1) : 0;


      if (finalCountdownFadeOption === 'digitalDripIn') {
        // --- DIGITAL DRIP IN LOGIC ---
        const dripSourceY = animation.countdownBounds ? animation.countdownBounds.y : viewportYBase;
        for (let c = 0; c < basePatternWidth; c++) { // Iterate columns for staggering
          const columnDripStartFrame = Math.floor(c * staggerPerColumnFramesForPhase);
          const currentFrameInColumnDrip = frameOfCurrentDigit - columnDripStartFrame;

          if (currentFrameInColumnDrip < 0 || currentFrameInColumnDrip > actualDripEffectDurationFramesForPhase) {
            if (currentFrameInColumnDrip > actualDripEffectDurationFramesForPhase) { // If finished, draw statically
                 for (let r_static = 0; r_static < basePatternHeight; r_static++) {
                    if (pattern[r_static][c] === 1) {
                        for (let sr = 0; sr < actualPixelSizeForDigit; sr++) {
                            for (let sc = 0; sc < actualPixelSizeForDigit; sc++) {
                                if (c * actualPixelSizeForDigit + sc >= scaledDigitWidth) continue;
                                const pixelX = startXAbsolute + c * actualPixelSizeForDigit + sc;
                                const pixelY = startYAbsolute + r_static * actualPixelSizeForDigit + sr;
                                
                                let finalPixelColor = colorToUse;
                                if (enableStaticVerticalGradient) {
                                    let yPosInDigit = (r_static * actualPixelSizeForDigit + sr);
                                    if (staticGradientAnimate) {
                                        let gradientOffset = frameOfCurrentDigit * staticGradientAnimationSpeed;
                                        // Offset is subtracted to make positive speed scroll downwards
                                        yPosInDigit -= gradientOffset;
                                    }
                                    let relativeY;
                                    if (staticGradientAnimate && staticGradientCycle && scaledDigitHeight > 0) {
                                        relativeY = ((yPosInDigit % scaledDigitHeight) + scaledDigitHeight) % scaledDigitHeight;
                                        relativeY = scaledDigitHeight > 1 ? relativeY / (scaledDigitHeight - 1) : 0.5;
                                    } else {
                                        relativeY = scaledDigitHeight > 1 ? yPosInDigit / (scaledDigitHeight - 1) : 0.5;
                                    }
                                    finalPixelColor = interpolateColor(staticGradientColorTop, staticGradientColorBottom, Math.max(0, Math.min(1, relativeY)));
                                }
                                // Pulse effect is not applied here as this is the "settled" state after drip-in.
                                pixelsForCurrentFrame.push({ x: pixelX, y: pixelY, color: finalPixelColor, animationId: id });
                             }
                         }
                     }
                }
            }
            continue;
          }
          const dripProgress = Math.min(1, currentFrameInColumnDrip / actualDripEffectDurationFramesForPhase);
          for (let r_drip = 0; r_drip < basePatternHeight; r_drip++) {
            if (pattern[r_drip][c] === 1) {
              const targetFatPixelTopY = startYAbsolute + r_drip * actualPixelSizeForDigit;
              const currentAnimatedFatPixelTopY = Math.round(dripSourceY + (targetFatPixelTopY - dripSourceY) * dripProgress);
              
              for (let sr = 0; sr < actualPixelSizeForDigit; sr++) {
                let targetColorForDripPixel = colorToUse;
                if (enableStaticVerticalGradient) {
                  let yPosInDigit = targetFatPixelTopY + sr - startYAbsolute; // Y-pos relative to start of the digit pattern
                  if (staticGradientAnimate) {
                      let gradientOffset = frameOfCurrentDigit * staticGradientAnimationSpeed;
                      yPosInDigit -= gradientOffset;
                  }
                  let relativeYInDigit;
                  if (staticGradientAnimate && staticGradientCycle && scaledDigitHeight > 0) {
                      relativeYInDigit = ((yPosInDigit % scaledDigitHeight) + scaledDigitHeight) % scaledDigitHeight;
                      relativeYInDigit = scaledDigitHeight > 1 ? relativeYInDigit / (scaledDigitHeight - 1) : 0.5;
                  } else {
                      relativeYInDigit = scaledDigitHeight > 1 ? yPosInDigit / (scaledDigitHeight - 1) : 0.5;
                  }
                  targetColorForDripPixel = interpolateColor(staticGradientColorTop, staticGradientColorBottom, Math.max(0, Math.min(1, relativeYInDigit)));
                }
                const finalDripPixelColor = interpolateColor(brightHighlightColor, targetColorForDripPixel, dripProgress);

                for (let sc = 0; sc < actualPixelSizeForDigit; sc++) {
                  if (c * actualPixelSizeForDigit + sc >= scaledDigitWidth) continue;
                  const pixelX = startXAbsolute + c * actualPixelSizeForDigit + sc;
                  const pixelY = currentAnimatedFatPixelTopY + sr;
                  pixelsForCurrentFrame.push({ x: pixelX, y: pixelY, color: finalDripPixelColor, animationId: id });
                }
              }
            }
          }
        }
      } else if (finalCountdownFadeOption === 'digitalDripOut') {
        // --- DIGITAL DRIP OUT LOGIC ---
        const dripTargetY = animation.countdownBounds
            ? (animation.countdownBounds.y + animation.countdownBounds.height)
            : (viewportYBase + viewportHeight);
        for (let c = 0; c < basePatternWidth; c++) {
            const columnDripStartFrame = Math.floor(c * staggerPerColumnFramesForPhase);
            const currentFrameInColumnDrip = frameOfCurrentDigit - columnDripStartFrame;
            for (let r_drip = 0; r_drip < basePatternHeight; r_drip++) {
                if (pattern[r_drip][c] === 1) {
                    const initialFatPixelTopY = startYAbsolute + r_drip * actualPixelSizeForDigit;
                    let currentAnimatedFatPixelTopY = initialFatPixelTopY;
                    let fallProgress = 0;

                    for (let sr = 0; sr < actualPixelSizeForDigit; sr++) {
                        let baseColorForDripOutPixel = colorToUse;
                        if (enableStaticVerticalGradient) {
                            let yPosInDigit = initialFatPixelTopY + sr - startYAbsolute; // Y-pos relative to start of the digit pattern
                            if (staticGradientAnimate) {
                                let gradientOffset = frameOfCurrentDigit * staticGradientAnimationSpeed;
                                yPosInDigit -= gradientOffset;
                            }
                            let relativeYInDigit;
                            if (staticGradientAnimate && staticGradientCycle && scaledDigitHeight > 0) {
                                relativeYInDigit = ((yPosInDigit % scaledDigitHeight) + scaledDigitHeight) % scaledDigitHeight;
                                relativeYInDigit = scaledDigitHeight > 1 ? relativeYInDigit / (scaledDigitHeight - 1) : 0.5;
                            } else {
                                relativeYInDigit = scaledDigitHeight > 1 ? yPosInDigit / (scaledDigitHeight - 1) : 0.5;
                            }
                            baseColorForDripOutPixel = interpolateColor(staticGradientColorTop, staticGradientColorBottom, Math.max(0, Math.min(1, relativeYInDigit)));
                        }
                        
                        let finalDripPixelColor = baseColorForDripOutPixel;

                        if (currentFrameInColumnDrip >= 0 && currentFrameInColumnDrip <= actualDripEffectDurationFramesForPhase) {
                            fallProgress = Math.min(1, currentFrameInColumnDrip / actualDripEffectDurationFramesForPhase);
                            currentAnimatedFatPixelTopY = Math.round(initialFatPixelTopY + (dripTargetY - initialFatPixelTopY) * fallProgress); // This needs to be outside the sr loop if the whole fat pixel moves together
                            
                            const flashProgressEnd = 0.15;
                            if (fallProgress < flashProgressEnd) {
                                finalDripPixelColor = interpolateColor(baseColorForDripOutPixel, brightHighlightColor, fallProgress / flashProgressEnd);
                            } else {
                                finalDripPixelColor = interpolateColor(brightHighlightColor, darkTrailColor, (fallProgress - flashProgressEnd) / (1 - flashProgressEnd));
                            }
                        } else if (currentFrameInColumnDrip > actualDripEffectDurationFramesForPhase) {
                            // This sub-pixel column has fallen, skip rendering its pixels for this sr, sc
                           continue;
                        }
                        
                        // Recalculate currentAnimatedFatPixelTopY here if it wasn't done per sr (it should be per r_drip effectively)
                        // The currentAnimatedFatPixelTopY should be calculated once per r_drip before the sr loop.
                        // Let's assume currentAnimatedFatPixelTopY is correctly set for the "fat pixel" row r_drip.
                        // The fallProgress check also needs to be outside sr loop for the whole fat pixel.

                        if (fallProgress < 1 || (currentFrameInColumnDrip < 0)) { // Render if not fully fallen OR if it hasn't started falling yet for this column
                            for (let sc = 0; sc < actualPixelSizeForDigit; sc++) {
                                if (c * actualPixelSizeForDigit + sc >= scaledDigitWidth) continue;
                                const pixelX = startXAbsolute + c * actualPixelSizeForDigit + sc;
                                // currentAnimatedFatPixelTopY is for the top of the r_drip "fat pixel"
                                // The actual pixelY for the sub-pixel is currentAnimatedFatPixelTopY + sr
                                const pixelY = (currentFrameInColumnDrip >=0 && currentFrameInColumnDrip <= actualDripEffectDurationFramesForPhase)
                                             ? Math.round(initialFatPixelTopY + (dripTargetY - initialFatPixelTopY) * fallProgress) + sr
                                             : initialFatPixelTopY + sr;


                                if (pixelY < canvasSize.originalHeight + scaledDigitHeight && pixelY > -scaledDigitHeight) {
                                     pixelsForCurrentFrame.push({ x: pixelX, y: pixelY, color: finalDripPixelColor, animationId: id });
                                }
                            }
                        }
                    }
                     if (currentFrameInColumnDrip > actualDripEffectDurationFramesForPhase) { // if column has fallen, break from r_drip for this c
                        break;
                    }
                }
            }
        }
      } else if (finalCountdownFadeOption === 'digitalDripCycle') {
        // --- DIGITAL DRIP CYCLE LOGIC ---
        const frameInCurrentPhase = frameOfCurrentDigit % (framesPerPhaseInOut * 2 + framesForHold); // Frame within the full in-hold-out cycle for this digit

        if (frameInCurrentPhase < framesPerPhaseInOut) { // DRIP IN PHASE
          const frameInDripIn = frameInCurrentPhase;
          const dripSourceY = animation.countdownBounds ? animation.countdownBounds.y : viewportYBase;
          for (let c = 0; c < basePatternWidth; c++) {
            const columnDripStartFrame = Math.floor(c * staggerPerColumnFramesForPhase);
            const currentFrameInColumnDrip = frameInDripIn - columnDripStartFrame;
            if (currentFrameInColumnDrip < 0 || currentFrameInColumnDrip > actualDripEffectDurationFramesForPhase) {
              if (currentFrameInColumnDrip > actualDripEffectDurationFramesForPhase) { // Finished dripping in for this column, draw statically
                for (let r_static = 0; r_static < basePatternHeight; r_static++) {
                  if (pattern[r_static][c] === 1) {
                    for (let sr = 0; sr < actualPixelSizeForDigit; sr++) {
                      for (let sc = 0; sc < actualPixelSizeForDigit; sc++) {
                        if (c * actualPixelSizeForDigit + sc >= scaledDigitWidth) continue;
                        const pixelX = startXAbsolute + c * actualPixelSizeForDigit + sc;
                        const pixelY = startYAbsolute + r_static * actualPixelSizeForDigit + sr;
                        
                        let finalPixelColor = colorToUse;
                        if (enableStaticVerticalGradient) {
                            let yPosInDigit = (r_static * actualPixelSizeForDigit + sr);
                             if (staticGradientAnimate) {
                                let gradientOffset = frameOfCurrentDigit * staticGradientAnimationSpeed;
                                yPosInDigit -= gradientOffset;
                            }
                            let relativeY;
                            if (staticGradientAnimate && staticGradientCycle && scaledDigitHeight > 0) {
                                relativeY = ((yPosInDigit % scaledDigitHeight) + scaledDigitHeight) % scaledDigitHeight;
                                relativeY = scaledDigitHeight > 1 ? relativeY / (scaledDigitHeight - 1) : 0.5;
                            } else {
                                relativeY = scaledDigitHeight > 1 ? yPosInDigit / (scaledDigitHeight - 1) : 0.5;
                            }
                            finalPixelColor = interpolateColor(staticGradientColorTop, staticGradientColorBottom, Math.max(0, Math.min(1, relativeY)));
                        }
                        pixelsForCurrentFrame.push({ x: pixelX, y: pixelY, color: finalPixelColor, animationId: id });
                      }
                    }
                  }
                }
              }
              continue;
            }
            const dripProgress = Math.min(1, currentFrameInColumnDrip / actualDripEffectDurationFramesForPhase);
            for (let r_drip = 0; r_drip < basePatternHeight; r_drip++) {
              if (pattern[r_drip][c] === 1) {
                const targetFatPixelTopY = startYAbsolute + r_drip * actualPixelSizeForDigit;
                const currentAnimatedFatPixelTopY = Math.round(dripSourceY + (targetFatPixelTopY - dripSourceY) * dripProgress);
                
                for (let sr = 0; sr < actualPixelSizeForDigit; sr++) {
                  let targetColorForDripPixel = colorToUse;
                  if (enableStaticVerticalGradient) {
                    let yPosInDigit = targetFatPixelTopY + sr - startYAbsolute;
                    if (staticGradientAnimate) {
                        let gradientOffset = frameOfCurrentDigit * staticGradientAnimationSpeed;
                        yPosInDigit -= gradientOffset;
                    }
                    let relativeYInDigit;
                    if (staticGradientAnimate && staticGradientCycle && scaledDigitHeight > 0) {
                        relativeYInDigit = ((yPosInDigit % scaledDigitHeight) + scaledDigitHeight) % scaledDigitHeight;
                        relativeYInDigit = scaledDigitHeight > 1 ? relativeYInDigit / (scaledDigitHeight - 1) : 0.5;
                    } else {
                        relativeYInDigit = scaledDigitHeight > 1 ? yPosInDigit / (scaledDigitHeight - 1) : 0.5;
                    }
                    targetColorForDripPixel = interpolateColor(staticGradientColorTop, staticGradientColorBottom, Math.max(0, Math.min(1, relativeYInDigit)));
                  }
                  const finalDripPixelColor = interpolateColor(brightHighlightColor, targetColorForDripPixel, dripProgress);

                  for (let sc = 0; sc < actualPixelSizeForDigit; sc++) {
                    if (c * actualPixelSizeForDigit + sc >= scaledDigitWidth) continue;
                    const pixelX = startXAbsolute + c * actualPixelSizeForDigit + sc;
                    const pixelY = currentAnimatedFatPixelTopY + sr;
                    pixelsForCurrentFrame.push({ x: pixelX, y: pixelY, color: finalDripPixelColor, animationId: id });
                  }
                }
              }
            }
          }
        } else if (frameInCurrentPhase < framesPerPhaseInOut + framesForHold) { // HOLD PHASE
          let currentStaticTop = staticGradientColorTop; // Base for static gradient
          let currentStaticBottom = staticGradientColorBottom; // Base for static gradient
          let singleColorForHold = colorToUse; // Used if only pulse is active
          let isPulsingActiveInHold = false;

          if (enableGradientPulse && framesForHold > 0) {
            isPulsingActiveInHold = true;
            const currentFrameInHold = frameInCurrentPhase - framesPerPhaseInOut;
            const elapsedHoldTimeMs = currentFrameInHold * STANDARD_FRAME_DURATION_MS;
            const pulseCycleProgress = (elapsedHoldTimeMs % gradientPulseSpeedMs) / gradientPulseSpeedMs;
            const interpolationFactor = (Math.sin(pulseCycleProgress * 2 * Math.PI - Math.PI / 2) + 1) / 2;
            
            if (enableStaticVerticalGradient) {
              // Pulse modulates the start and end colors of the static gradient
              currentStaticTop = interpolateColor(gradientColorStart, gradientColorEnd, interpolationFactor);
              currentStaticBottom = interpolateColor(gradientColorStart, gradientColorEnd, 1 - interpolationFactor); // Or same factor for synced pulse
            } else {
              // Only pulse is active, no static gradient -> whole number pulses
              singleColorForHold = interpolateColor(gradientColorStart, gradientColorEnd, interpolationFactor);
            }
          }

          for (let r_hold = 0; r_hold < basePatternHeight; r_hold++) {
            for (let c_hold = 0; c_hold < basePatternWidth; c_hold++) {
              if (pattern[r_hold][c_hold] === 1) {
                for (let sr = 0; sr < actualPixelSizeForDigit; sr++) {
                  for (let sc = 0; sc < actualPixelSizeForDigit; sc++) {
                    const pixelX = startXAbsolute + c_hold * actualPixelSizeForDigit + sc;
                    const pixelY = startYAbsolute + r_hold * actualPixelSizeForDigit + sr;
                    let finalPixelColor = colorToUse;

                    if (enableStaticVerticalGradient) {
                        let yPosInDigit = (r_hold * actualPixelSizeForDigit + sr);
                        if (staticGradientAnimate) {
                            let gradientOffset = frameOfCurrentDigit * staticGradientAnimationSpeed;
                            yPosInDigit -= gradientOffset;
                        }
                        let relativeY;
                        if (staticGradientAnimate && staticGradientCycle && scaledDigitHeight > 0) {
                            relativeY = ((yPosInDigit % scaledDigitHeight) + scaledDigitHeight) % scaledDigitHeight;
                            relativeY = scaledDigitHeight > 1 ? relativeY / (scaledDigitHeight - 1) : 0.5;
                        } else {
                            relativeY = scaledDigitHeight > 1 ? yPosInDigit / (scaledDigitHeight - 1) : 0.5;
                        }
                        // Use currentStaticTop/Bottom which might have been modulated by pulse
                        finalPixelColor = interpolateColor(currentStaticTop, currentStaticBottom, Math.max(0, Math.min(1, relativeY)));
                    } else if (isPulsingActiveInHold) { // Only pulse is active
                        finalPixelColor = singleColorForHold;
                    } else {
                        finalPixelColor = colorToUse; // No effects, use base color
                    }
                    pixelsForCurrentFrame.push({ x: pixelX, y: pixelY, color: finalPixelColor, animationId: id });
                  }
                }
              }
            }
          }
        } else { // DRIP OUT PHASE
          const frameInDripOut = frameInCurrentPhase - (framesPerPhaseInOut + framesForHold);
          const dripTargetY = animation.countdownBounds
              ? (animation.countdownBounds.y + animation.countdownBounds.height)
              : (viewportYBase + viewportHeight);
          for (let c = 0; c < basePatternWidth; c++) {
            const columnDripStartFrame = Math.floor(c * staggerPerColumnFramesForPhase);
            const currentFrameInColumnDrip = frameInDripOut - columnDripStartFrame;
            
            // Calculate currentAnimatedFatPixelTopY once per column's r_drip, if it's falling
            let animatedYForColumnFatPixel;
            let fallProgressForColumn = 0;
            let shouldRenderColumn = true;

            if (currentFrameInColumnDrip >= 0 && currentFrameInColumnDrip <= actualDripEffectDurationFramesForPhase) {
                fallProgressForColumn = Math.min(1, currentFrameInColumnDrip / actualDripEffectDurationFramesForPhase);
            } else if (currentFrameInColumnDrip > actualDripEffectDurationFramesForPhase) {
                shouldRenderColumn = false; // Column has fully fallen
            }
            // If currentFrameInColumnDrip < 0, it hasn't started falling, so it will render at initial position.

            for (let r_drip = 0; r_drip < basePatternHeight; r_drip++) {
              if (!shouldRenderColumn) break; // Skip rest of r_drip for this column if fully fallen

              if (pattern[r_drip][c] === 1) {
                const initialFatPixelTopY = startYAbsolute + r_drip * actualPixelSizeForDigit;
                
                // Determine the Y position of the current "fat pixel" row
                let currentAnimatedFatPixelTopYForRow = initialFatPixelTopY;
                if (currentFrameInColumnDrip >= 0 && currentFrameInColumnDrip <= actualDripEffectDurationFramesForPhase) {
                    currentAnimatedFatPixelTopYForRow = Math.round(initialFatPixelTopY + (dripTargetY - initialFatPixelTopY) * fallProgressForColumn);
                }


                for (let sr = 0; sr < actualPixelSizeForDigit; sr++) {
                    let baseColorForDripOutPixel = colorToUse;
                    if (enableStaticVerticalGradient) {
                        let yPosInDigit = initialFatPixelTopY + sr - startYAbsolute;
                        if (staticGradientAnimate) {
                            let gradientOffset = frameOfCurrentDigit * staticGradientAnimationSpeed;
                            yPosInDigit -= gradientOffset;
                        }
                        let relativeYInDigit;
                        if (staticGradientAnimate && staticGradientCycle && scaledDigitHeight > 0) {
                            relativeYInDigit = ((yPosInDigit % scaledDigitHeight) + scaledDigitHeight) % scaledDigitHeight;
                            relativeYInDigit = scaledDigitHeight > 1 ? relativeYInDigit / (scaledDigitHeight - 1) : 0.5;
                        } else {
                            relativeYInDigit = scaledDigitHeight > 1 ? yPosInDigit / (scaledDigitHeight - 1) : 0.5;
                        }
                        baseColorForDripOutPixel = interpolateColor(staticGradientColorTop, staticGradientColorBottom, Math.max(0, Math.min(1, relativeYInDigit)));
                    }

                    let finalDripPixelColor = baseColorForDripOutPixel;
                    if (currentFrameInColumnDrip >= 0 && currentFrameInColumnDrip <= actualDripEffectDurationFramesForPhase) {
                        const flashProgressEnd = 0.15;
                        if (fallProgressForColumn < flashProgressEnd) {
                            finalDripPixelColor = interpolateColor(baseColorForDripOutPixel, brightHighlightColor, fallProgressForColumn / flashProgressEnd);
                        } else {
                            finalDripPixelColor = interpolateColor(brightHighlightColor, darkTrailColor, (fallProgressForColumn - flashProgressEnd) / (1 - flashProgressEnd));
                        }
                    }
                    // If currentFrameInColumnDrip < 0, it uses baseColorForDripOutPixel (its static color)

                    if (fallProgressForColumn < 1 || currentFrameInColumnDrip < 0) { // Render if not fully fallen OR if it hasn't started falling
                        for (let sc = 0; sc < actualPixelSizeForDigit; sc++) {
                          if (c * actualPixelSizeForDigit + sc >= scaledDigitWidth) continue;
                          const pixelX = startXAbsolute + c * actualPixelSizeForDigit + sc;
                          const pixelY = currentAnimatedFatPixelTopYForRow + sr;
                          if (pixelY < canvasSize.originalHeight + scaledDigitHeight && pixelY > -scaledDigitHeight) {
                            pixelsForCurrentFrame.push({ x: pixelX, y: pixelY, color: finalDripPixelColor, animationId: id });
                          }
                        }
                    }
                }
              }
            }
          }
        }
      } else { // Existing fade options or 'none' (e.g., simple display, or other fades)
        let currentStaticTopForNoneFade = staticGradientColorTop;
        let currentStaticBottomForNoneFade = staticGradientColorBottom;
        let singleColorForNoneFade = colorToUse;
        let isPulsingInNoneFade = false;

        // Apply pulsing gradient if 'none' fade (always in "hold") and pulse effect is enabled
        if (finalCountdownFadeOption === 'none' && enableGradientPulse && framesPerDigit > 0) {
            isPulsingInNoneFade = true;
            const elapsedHoldTimeMs = frameOfCurrentDigit * STANDARD_FRAME_DURATION_MS;
            const pulseCycleProgress = (elapsedHoldTimeMs % gradientPulseSpeedMs) / gradientPulseSpeedMs;
            const interpolationFactor = (Math.sin(pulseCycleProgress * 2 * Math.PI - Math.PI / 2) + 1) / 2;

            if (enableStaticVerticalGradient) {
                currentStaticTopForNoneFade = interpolateColor(gradientColorStart, gradientColorEnd, interpolationFactor);
                currentStaticBottomForNoneFade = interpolateColor(gradientColorStart, gradientColorEnd, 1 - interpolationFactor); // Or same factor
            } else {
                singleColorForNoneFade = interpolateColor(gradientColorStart, gradientColorEnd, interpolationFactor);
            }
        }
        
        const fadeProgress = (frameOfCurrentDigit + 1) / framesPerDigit; // framesPerDigit here is the total for the digit
        let rowsToRenderFromBottom = scaledDigitHeight;
        let rowsToRenderFromTop = scaledDigitHeight;
        let colsToRenderFromLeft = scaledDigitWidth;
        let colsToRenderFromRight = scaledDigitWidth;

        if (finalCountdownFadeOption === 'fadeInFromBottom') {
          rowsToRenderFromBottom = Math.ceil(scaledDigitHeight * fadeProgress);
        } else if (finalCountdownFadeOption === 'fadeInFromTop') {
          rowsToRenderFromTop = Math.ceil(scaledDigitHeight * fadeProgress);
        } else if (finalCountdownFadeOption === 'fadeOutToLeft') {
          colsToRenderFromRight = Math.ceil(scaledDigitWidth * (1 - fadeProgress));
        } else if (finalCountdownFadeOption === 'fadeOutToRight') {
          colsToRenderFromLeft = Math.ceil(scaledDigitWidth * (1 - fadeProgress));
        }

        for (let r_fade = 0; r_fade < basePatternHeight; r_fade++) {
          for (let c_fade = 0; c_fade < basePatternWidth; c_fade++) {
            if (pattern[r_fade][c_fade] === 1) {
              for (let sr = 0; sr < actualPixelSizeForDigit; sr++) {
                for (let sc = 0; sc < actualPixelSizeForDigit; sc++) {
                  const currentScaledRowInDigit = r_fade * actualPixelSizeForDigit + sr;
                  const currentScaledColInDigit = c_fade * actualPixelSizeForDigit + sc;

                  if (finalCountdownFadeOption === 'fadeInFromBottom' && currentScaledRowInDigit < (scaledDigitHeight - rowsToRenderFromBottom)) continue;
                  if (finalCountdownFadeOption === 'fadeInFromTop' && currentScaledRowInDigit >= rowsToRenderFromTop) continue;
                  if (finalCountdownFadeOption === 'fadeOutToLeft' && currentScaledColInDigit < (scaledDigitWidth - colsToRenderFromRight)) continue;
                  if (finalCountdownFadeOption === 'fadeOutToRight' && currentScaledColInDigit >= colsToRenderFromLeft) continue;

                  const pixelX = startXAbsolute + c_fade * actualPixelSizeForDigit + sc;
                  const pixelY = startYAbsolute + r_fade * actualPixelSizeForDigit + sr;
                  // For other fade options, pulsing is not applied here, only for 'none'
                  // If a fade is active, it takes precedence over the pulse for simplicity.
                  // The color will be colorToUse unless it's 'none' fade and pulse is on.
                  // If other fade options were to have pulsing during their "fully visible" part,
                  // more complex logic would be needed to determine if the fade is complete for that pixel.
                  // For now, only 'none' fade option gets the pulse + static vertical gradient logic here.
                  // Other fades use colorToUse (or their specific fade color logic if they had one).
                  
                  let finalPixelColor = colorToUse; // Default for active fades

                  if (finalCountdownFadeOption === 'none') { // Apply advanced coloring only for 'none' fade
                    if (enableStaticVerticalGradient) {
                        const relativeY = scaledDigitHeight > 1 ? (r_fade * actualPixelSizeForDigit + sr) / (scaledDigitHeight -1) : 0.5;
                        finalPixelColor = interpolateColor(currentStaticTopForNoneFade, currentStaticBottomForNoneFade, Math.max(0, Math.min(1, relativeY)));
                    } else if (isPulsingInNoneFade) {
                        finalPixelColor = singleColorForNoneFade;
                    } else {
                        finalPixelColor = colorToUse; // Fallback if no effects active for 'none'
                    }
                  }
                  // For other fade types (fadeInFromBottom etc.), they don't use the pulse/static gradient from here.
                  // Their visual effect is solely determined by the rows/cols to render.
                  // If a fade is active, we use the base colorToUse.
                  // The 'colorForPixel' variable was an attempt to simplify, but it's clearer to be explicit.

                  pixelsForCurrentFrame.push({ x: pixelX, y: pixelY, color: finalPixelColor, animationId: id });
                }
              }
            }
          }
        }
      }
 
      // --- Pulsing Safe Zone Pixels During Countdown (Part B) ---
      // This section handles the pulsing effect for safe zone pixels.
      // It applies while the main countdown digits (3, 2, 1) are being displayed.
      if (
        animation.countdownEnableSafeZone &&
        animation.countdownSafeZonePixels &&
        animation.countdownSafeZonePixels.length > 0 &&
        animation.countdownSafeZonePulse !== false // Default for countdownSafeZonePulse is true.
      ) {
        const safeZonePixels = animation.countdownSafeZonePixels;
        // Define the cycle duration for one full pulse (e.g., 20 frames = 2 seconds at 10 FPS).
        const pulseCycleTotalFrames = 20;
        
        // Calculate current progress within the pulse cycle.
        // Using currentGlobalFrameIndexInAnimation ensures the pulse is continuous across the
        // entire duration of the AnimationObject, rather than resetting for each digit.
        const currentFrameInPulseCycle = currentGlobalFrameIndexInAnimation % pulseCycleTotalFrames;
        const pulseProgressRatio = currentFrameInPulseCycle / pulseCycleTotalFrames;
        
        // Calculate intensity using a sine wave to create a smooth oscillation.
        // (Math.sin(phase - Math.PI / 2) + 1) / 2 maps sin's -1 to 1 range to a 0 to 1 range.
        const baseIntensityOscillation = (Math.sin(pulseProgressRatio * 2 * Math.PI - Math.PI / 2) + 1) / 2;
        // Scale the 0-1 oscillation to the desired intensity range (e.g., 70% to 100%).
        const pulseIntensity = 0.7 + (0.3 * baseIntensityOscillation);
        
        const pulsedSafeZoneColor = modifyColorIntensity(SAFE_ZONE_COLOR, pulseIntensity);

        // Add the pulsing safe zone pixels to the current frame's pixel data.
        safeZonePixels.forEach(pixel => {
          pixelsForCurrentFrame.push({
            x: pixel.x,
            y: pixel.y,
            color: pulsedSafeZoneColor,
            animationId: id // Associate with the current animation object's ID.
          });
        });
      }
      // --- End of Pulsing Safe Zone Pixels ---

      if (enableSparkleEffect) {
        // 1. Update existing sparkles (move, age, filter)
        const nextActiveSparklesThisFrame: Array<{ x: number, y: number, lifetime: number, color: string }> = [];
        for (const sparkle of activeSparkles) { // Iterate over sparkles from PREVIOUS frame of this digit
            const newLifetime = sparkle.lifetime - 1;
            if (newLifetime > 0) {
                let newX = sparkle.x;
                const newY = sparkle.y + 1; // Move down
                const jitter = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                newX += jitter;
                // Optional: Constrain to viewport if needed, but for falling particles, it's often fine to let them fall off.
                // To keep them within the animation's viewport:
                // newX = Math.max(viewportXBase, Math.min(viewportXBase + viewportWidth - 1, newX));
                // newY = Math.max(viewportYBase, Math.min(viewportYBase + viewportHeight - 1, newY));
                nextActiveSparklesThisFrame.push({ ...sparkle, x: newX, y: newY, lifetime: newLifetime, color: sparkle.color });
            }
        }
        activeSparkles = nextActiveSparklesThisFrame;
 
        // 2. Generate new sparkles based on the current digit's pixels in pixelsForCurrentFrame
        //    (pixelsForCurrentFrame at this point contains only the digit's pixels for this frame)
        if (pixelsForCurrentFrame.length > 0) { // Only add sparkles if the digit is visible
            const bottomPixelsOfDigit: PixelData[] = [];
            let maxY = -1;
            // Find the Y coordinate of the bottom-most pixels of the digit
            pixelsForCurrentFrame.forEach(p => {
                if (p.y > maxY) maxY = p.y;
            });
            // Collect all pixels at this bottom-most Y
            pixelsForCurrentFrame.forEach(p => {
                if (p.y === maxY) bottomPixelsOfDigit.push(p);
            });
 
            const numNewSparklesToAttempt = Math.min(maxSparklesPerFrame, bottomPixelsOfDigit.length > 0 ? maxSparklesPerFrame : 0);
 
            for (let i = 0; i < numNewSparklesToAttempt; i++) {
                if (bottomPixelsOfDigit.length > 0) {
                     const sourcePixel = bottomPixelsOfDigit[Math.floor(Math.random() * bottomPixelsOfDigit.length)];
                     activeSparkles.push({
                         x: sourcePixel.x,
                         y: sourcePixel.y + 1, // Start slightly below the source pixel
                         lifetime: sparkleLifetime,
                         color: sparkleColor
                     });
                }
            }
        }
 
        // 3. Add all current activeSparkles to pixelsForCurrentFrame
        for (const sparkle of activeSparkles) {
            // We add sparkles regardless of viewport here, assuming renderer clips or handles off-screen.
            // If strict viewport clipping for sparkles is needed, add checks for x,y against viewportXBase, viewportYBase, viewportWidth, viewportHeight
            pixelsForCurrentFrame.push({ x: sparkle.x, y: sparkle.y, color: sparkle.color, animationId: id });
        }
      }
 
      // Add black background to the current frame if enabled
      if (enableBlackBackground) {
        addBlackBackgroundToFrame(pixelsForCurrentFrame, frameOfCurrentDigit);
      }
      
      result[globalFrameId] = pixelsForCurrentFrame;
      currentGlobalFrameIndexInAnimation++;
    }
    
    // Mark the current digit as complete
    if (digit === '1') { // Last digit in the countdown
      countdownComplete = true;
    }
  }
  
  // Only run disintegration animation if countdown is complete and black background is enabled
  if (countdownComplete && enableBlackBackground) {
    disintegrationStarted = true;
    disintegrationStartFrame = currentGlobalFrameIndexInAnimation;
    
    // Calculate how many frames to use for disintegration animation
    const disintegrationFrames = Math.floor(disintegrationDuration / STANDARD_FRAME_DURATION_MS);
    
    // Keep track of black background pixels from the last frame
    let currentBlackPixels: PixelData[] = [];
    
    // Get last frame pixels
    if (currentGlobalFrameIndexInAnimation > 0 && animationFrameIds.length > 0) {
      const lastFrameId = animationFrameIds[Math.min(currentGlobalFrameIndexInAnimation - 1, animationFrameIds.length - 1)];
      const lastFramePixels = result[lastFrameId] || [];
      
      // Extract only the black background pixels
      currentBlackPixels = lastFramePixels.filter(pixel => 
        pixel.color === blackBackgroundColor && pixel.animationId === id
      );
    }
    
    // Generate disintegration animation frames
    for (let i = 0; i < disintegrationFrames && currentGlobalFrameIndexInAnimation < animationFrameIds.length; i++) {
      const globalFrameId = animationFrameIds[currentGlobalFrameIndexInAnimation];
      const progress = i / disintegrationFrames; // 0 to 1
      
      // Get all non-black pixels from the last frame
      let pixelsForDisintegrationFrame: PixelData[] = [];
      
      // Add safe zone and other non-black pixels if they exist
      if (animation.countdownEnableSafeZone && animation.countdownSafeZonePixels && animation.countdownSafeZonePixels.length > 0) {
        animation.countdownSafeZonePixels.forEach(pixel => {
          pixelsForDisintegrationFrame.push({ x: pixel.x, y: pixel.y, color: '#00FF00', animationId: id });
        });
      }
      
      // Determine which transition effect to use (default to 'thanos' if not specified)
      const transitionEffect = animation.countdownTransitionEffect || 'thanos';
      
      // Apply the selected transition effect
      let remainingBlackPixels: PixelData[] = [];
      
      if (transitionEffect === 'matrix') {
        // Get matrix color if specified, otherwise use default
        const matrixColor = animation.countdownMatrixColor || '#00FF41';
        
        // Apply Matrix transition effect with custom color
        remainingBlackPixels = generateMatrixTransitionParticles(
          viewportXBase,
          viewportYBase,
          viewportWidth,
          viewportHeight,
          currentBlackPixels,
          progress,
          disintegrationParticleSize,
          id,
          matrixColor // Pass custom matrix color
        );
      } else if (transitionEffect === 'spiral') {
        // Apply Spiral transition effect
        remainingBlackPixels = generateSpiralTransitionParticles(
          viewportXBase,
          viewportYBase,
          viewportWidth,
          viewportHeight,
          currentBlackPixels,
          progress,
          disintegrationParticleSize,
          id
        );
      } else {
        // Default: Apply Thanos disintegration effect
        remainingBlackPixels = generateDisintegrationParticles(
          viewportXBase,
          viewportYBase,
          viewportWidth,
          viewportHeight,
          currentBlackPixels,
          progress,
          disintegrationParticleSize,
          id
        );
      }
      
      // Add the remaining black pixels to this frame
      pixelsForDisintegrationFrame.push(...remainingBlackPixels);
      
      // Set the frame pixels
      result[globalFrameId] = pixelsForDisintegrationFrame;
      currentGlobalFrameIndexInAnimation++;
      
      // Update the black pixels for the next frame
      currentBlackPixels = remainingBlackPixels;
    }
  }

  // Fill remaining frames with empty frames
  while (currentGlobalFrameIndexInAnimation < animationFrameIds.length) {
    const globalFrameId = animationFrameIds[currentGlobalFrameIndexInAnimation];
    result[globalFrameId] = [];
    currentGlobalFrameIndexInAnimation++;
  }

  return result;
};

// Worker-based animation calculation for complex animations
let animationWorker: Worker | null = null;
    
const initAnimationWorker = () => {
  if (typeof Worker !== 'undefined' && !animationWorker) {
    // Create a simple worker for animation calculations
    const workerCode = `
      self.onmessage = function(e) {
        const { type, data } = e.data;
        
        if (type === 'CALCULATE_SIMPLE_COUNTDOWN') {
          // Perform simple countdown calculation in worker
          const result = calculateSimpleCountdownInWorker(data);
          self.postMessage({ type: 'RESULT', result });
        }
      };
      
      function calculateSimpleCountdownInWorker(data) {
        // Simple countdown calculation logic here
        // This is a simplified version for demonstration
        const { animationId, frameIds, color, countdownSize } = data;
        const result = {};
        
        frameIds.forEach(frameId => {
          result[frameId] = []; // Simplified result
  });
  
  return result;
      }
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    animationWorker = new Worker(URL.createObjectURL(blob));
  }
};

// Enhanced animation calculation with worker support
const calculateAnimationWithWorker = async (
  animation: AnimationObject,
  canvasSize: CanvasSize
): Promise<Record<string, PixelData[]>> => {
  return new Promise((resolve) => {
    if (!animationWorker) {
      initAnimationWorker();
  }
  
    if (animationWorker && animation.type === 'COUNTDOWN') {
      const timeout = setTimeout(() => {
        // Fallback to main thread if worker takes too long
        resolve(generateSimpleCountdownAnimation(animation, canvasSize));
      }, 100); // 100ms timeout
      
      animationWorker.onmessage = (e) => {
        clearTimeout(timeout);
        resolve(e.data.result);
      };
      
      animationWorker.postMessage({
        type: 'CALCULATE_SIMPLE_COUNTDOWN',
        data: {
      animationId: animation.id,
          frameIds: animation.frames,
          color: animation.color,
          countdownSize: animation.countdownSize
        }
      });
    } else {
      // Fallback to main thread
      resolve(generateSimpleCountdownAnimation(animation, canvasSize));
    }
  });
};

// Enhanced applyAnimationsToFrames with performance optimizations
export const applyAnimationsToFrames = (
  frames: Frame[],
  animations: AnimationObject[],
  canvasSize: CanvasSize,
  blockedPixels: { [key: string]: boolean }
): Record<string, PixelData[]> => {
  const result: Record<string, PixelData[]> = {};
  
  // Initialize result with empty arrays for all frames
  frames.forEach(frame => {
    result[frame.id] = [];
  });

  // Early return if no animations
  if (!animations || animations.length === 0) {
    return result;
  }

  // Performance optimization: Process animations in parallel where possible
  const animationPromises = animations.map(async (animation) => {
    if (!animation.frames || animation.frames.length === 0) {
      return {};
    }

    // Use worker for simple countdown animations
    if (animation.type === 'COUNTDOWN' && !hasComplexCountdownEffects(animation)) {
      try {
        return await calculateAnimationWithWorker(animation, canvasSize);
      } catch (error) {
        console.warn('Worker calculation failed, falling back to main thread:', error);
      }
    }

    // Fallback to existing animation generation
    switch (animation.type) {
      case 'COUNTDOWN':
        return generateCountdownAnimation(animation, canvasSize);
      case 'RECTANGLE':
        return generateRectangleAnimation(animation, canvasSize, frames.length);
      case 'X':
        return generateXAnimation(animation, canvasSize, frames.length);
      default:
        return {};
    }
  });
  
  // For now, we'll keep the synchronous approach but with optimizations
  // In the future, this could be made async for better performance
  animations.forEach(animation => {
    if (!animation.frames || animation.frames.length === 0) {
      return;
    }

    let animationPixels: Record<string, PixelData[]> = {};

    switch (animation.type) {
      case 'COUNTDOWN':
        animationPixels = generateCountdownAnimation(animation, canvasSize);
        break;
      case 'RECTANGLE':
        animationPixels = generateRectangleAnimation(animation, canvasSize, frames.length);
        break;
      case 'X':
        animationPixels = generateXAnimation(animation, canvasSize, frames.length);
        break;
      default:
        break;
    }

    // Merge animation pixels into result
    Object.entries(animationPixels).forEach(([frameId, pixels]) => {
      if (result[frameId]) {
        result[frameId].push(...pixels);
      }
    });
  });

  return result;
};

// Helper function to check if countdown has complex effects
const hasComplexCountdownEffects = (animation: AnimationObject): boolean => {
  return !!(
    animation.countdownEnableBlackBackground || 
    animation.countdownEnableSafeZone || 
    animation.countdownEnableSparkleEffect ||
    animation.countdownEnableGradientPulse ||
    animation.countdownEnableStaticVerticalGradient ||
    animation.countdownEnableLoadingBar ||
    (animation.countdownFadeOption && animation.countdownFadeOption !== 'none')
  );
};

// Function to apply X animation
const applyXAnimation = (
  frames: Frame[],
  animation: AnimationObject,
  result: Record<string, PixelData[]>,
  blockedPixels: { [key: string]: boolean }
) => {
  // TODO: Implement X animation logic
};

// Function to apply snake animation
const applySnakeAnimation = (
  frames: Frame[],
  animation: AnimationObject,
  result: Record<string, PixelData[]>,
  blockedPixels: { [key: string]: boolean }
) => {
  // TODO: Implement snake animation logic
};

// Function to apply rectangle animation
const applyRectangleAnimation = (
  frames: Frame[],
  animation: AnimationObject,
  result: Record<string, PixelData[]>,
  blockedPixels: { [key: string]: boolean }
) => {
  // TODO: Implement rectangle animation logic
};