export type PixelData = {
  x: number;
  y: number;
  color: string;
  animationId?: string; // ID of the animation that generated this pixel
  isHead?: boolean; // For snake animation to mark the head pixel
  pixelNumber?: number; // Für die Pixel-Nummerierung
};

export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
};

export type Frame = {
  id: string;
  duration: number; // in milliseconds
  layerData: Record<string, PixelData[]>; // key is layerId
  isSuperFrameMember?: boolean; // zeigt an, dass dieser Frame Teil eines Superframes ist
  superFrameId?: string; // ID des Superframes, zu dem dieser Frame gehört
  section?: 'startup' | 'main'; // Section the frame belongs to
};

export type CanvasSize = {
  width: number;        // Aktuelle Viewport-Breite
  height: number;       // Aktuelle Viewport-Höhe
  originalWidth: number; // Gesamte Canvas-Breite
  originalHeight: number; // Gesamte Canvas-Höhe
  viewportX: number;    // X-Position des Viewports im Gesamt-Canvas
  viewportY: number;    // Y-Position des Viewports im Gesamt-Canvas
};

export type Tool = 
  | 'BRUSH'
  | 'ERASER'
  | 'BUCKET'
  | 'EYEDROPPER'
  | 'SELECT'
  | 'MOVE'
  | 'VIEWPORT'
  | 'LINE'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'NUMBER'; // Neues Tool zum Nummerieren von Pixeln

export type PredefinedColor = 'red' | 'blue' | 'green' | 'doubleHit';

export type Selection = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export type EasingFunction = 'LINEAR' | 'EASE_IN' | 'EASE_OUT' | 'EASE_IN_OUT';

// Define the state for a rectangle animation
export type RectangleState = {
  x: number;
  y: number;
  width: number;
  height: number;
  delay: number; // Delay in ms before transitioning to next state
};

export interface SubRectangle {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FadeOption = 'none' | 'fadeInFromBottom' | 'fadeInFromTop' | 'fadeOutToLeft' | 'fadeOutToRight' | 'digitalDripIn' | 'digitalDripOut' | 'digitalDripCycle';

export type AnimationType = 'LINE' | 'X' | 'SNAKE' | 'RECTANGLE' | 'PATH' | 'COUNTDOWN';
export type Direction = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
export type Orientation = 'HORIZONTAL' | 'VERTICAL';
export type BorderBehavior = 'WRAP' | 'BOUNCE';
export type RectangleCycleMode = 'LOOP' | 'ONCE' | 'PING_PONG' | 'DIRECT_TO_START' | 'NO_CYCLE';
export type PathCycleMode = 'LOOP' | 'PING_PONG' | 'ONCE';

export type AnimationObject = {
  id: string;
  type: AnimationType;
  color: string;
  frames: string[]; // Frame IDs where this object appears
  layerId?: string; // The layer ID on which this animation should be rendered
  renderPosition?: 'FOREGROUND' | 'BACKGROUND' | 'ON_LAYER'; // Whether to render in foreground, background, or on the specific layer
  renderOnSection?: 'startup' | 'main' | 'both'; // New: Control rendering based on frame section
  direction?: Direction;
  orientation?: Orientation;
  speed?: number; // For LINE animations
  position?: { x: number; y: number }; // For X animations, defines center point
  rotationSpeed?: number; // For X animations, how fast it rotates
  stretchToEdges?: boolean; // For X animations, whether it stretches to canvas edges
  borderBehavior?: BorderBehavior; // How animation behaves at borders
  thickness?: number; // For X animations, defines the thickness in pixels
  // Snake specific properties
  snakeLength?: number; // Length of the snake in pixels
  snakeSpeed?: number; // Speed of the snake
  snakeCount?: number; // Number of snakes to display
  snakeSegments?: Array<{x: number, y: number}>; // Current snake body positions
  snakeCurrentDirection?: Direction; // Current direction the snake is moving
  snakeRandomSeed?: number; // Seed for deterministic random movement
  avoidCollisions?: boolean; // Whether snakes should avoid colliding with each other
  strictCollisions?: boolean; // Whether snakes cannot cross over each other
  // Rectangle specific properties
  rectangleStates?: RectangleState[]; // Use the exported type here
  rectangleSpeed?: number; // Speed of the transformation (1-10)
  rectangleEasingFunction?: EasingFunction; // Use the defined type
  rectangleHasFill?: boolean; // Whether rectangle has a fill or is just an outline
  rectangleCycleMode?: RectangleCycleMode; // Internal state for editor UI
  rectangleState?: 'INITIAL' | 'SETTING_STATE' | 'ANIMATING'; // Internal state for editor UI
  // Path specific properties
  pathPoints?: { x: number; y: number; pixelNumber?: number }[];
  pathSpeed?: number;
  pathCycleMode?: PathCycleMode; // How the path animation should cycle
  pathBlockSize?: number; // Size of the block (1=single pixel, 2=2x2, 3=3x3, etc.)
  pathTrailLength?: number; // Länge des Trails (Anzahl der "Geister"-Pixel)
  pathTrailFade?: boolean;  // Ob der Trail einen Farbverlauf haben soll
  pathSharedPixelNumber?: boolean; // Ob alle Trail-Pixel die gleiche Nummer wie der Hauptpixel haben sollen

  // Countdown specific properties
  countdownSize?: number;
  countdownSpeed?: number; // Milliseconds per step (3, 2, 1)
  countdownFadeOption?: FadeOption;
  countdownBounds?: { x: number; y: number; width: number; height: number }; // For drawing countdown size/position
  countdownHoldDuration?: number; // Hold time in ms for each number in digitalDripCycle
  // Sparkle effect for countdown
  countdownEnableSparkleEffect?: boolean;
  countdownSparkleColor?: string;
  countdownMaxSparklesPerFrame?: number;
  countdownSparkleLifetime?: number; // In frames
  // Pulsating gradient for countdown numbers
  countdownEnableGradientPulse?: boolean;
  countdownGradientColorStart?: string;
  countdownGradientColorEnd?: string;
  countdownGradientPulseSpeed?: number; // Duration of one full pulse cycle in ms
  // Static vertical gradient for countdown numbers
  countdownEnableStaticVerticalGradient?: boolean;
  countdownStaticGradientColorTop?: string;
  countdownStaticGradientColorBottom?: string;
  // Animation for the static vertical gradient
  countdownStaticGradientAnimate?: boolean;
  countdownStaticGradientAnimationSpeed?: number; // e.g., pixels per frame, positive for down, negative for up
  countdownStaticGradientCycle?: boolean; // Whether the gradient movement cycles
  // Loading bar for countdown
  countdownEnableLoadingBar?: boolean;
  countdownLoadingBarArea?: { x: number; y: number; width: number; height: number }; // Absolute coordinates
  countdownLoadingBarColors?: [string, string, string]; // Colors for 3, 2, 1
  autoAdjustLoadingBarArea?: boolean; // For dynamic updates based on sub-rectangles
  countdownLoadingBarSpeedFactor?: number; // Speed multiplier for the loading bar fill animation
  // Safe Zone properties
  countdownEnableSafeZone?: boolean;
  countdownSafeZonePixels?: Array<{ x: number; y: number }>; // These are absolute coordinates on the canvas
  countdownSafeZoneIntroAnimation?: 'centerOut' | 'none';
  countdownSafeZonePulse?: boolean;
  countdownSafeZoneSpeed?: number; // Speed factor for safe zone animation (default 1.0)
  countdownSafeZonePauseDuration?: number; // Pause duration in ms between safe zone and countdown
  // Black background function
  countdownEnableBlackBackground?: boolean;
  countdownBlackBackgroundColor?: string; // Default is black (#000000)
  countdownDisintegrationDuration?: number; // Duration in ms for the disintegration animation after countdown
  countdownDisintegrationParticleSize?: number; // Size of disintegration particles (1-3)
  countdownDisintegrationParticleCount?: number; // Density of particles per frame
  countdownTransitionEffect?: 'thanos' | 'matrix' | 'spiral'; // Field for transition effect type
  countdownMatrixColor?: string; // Color for Matrix transition (default: '#00FF41')
  countdownOffset?: { x: number; y: number }; // Offset position for countdown digits
};

export type PixelInconsistency = {
  superFrameId: string;
  x: number;
  y: number;
  pixelNumbers: (number | undefined)[]; // Array of pixel numbers found for this x,y in the superframe
  frameIds: string[]; // IDs of frames within the superframe where this pixel (x,y) exists
};
export type EditorMode = 'EDIT' | 'PREVIEW';

// Placeholder for GridSettings - will verify in editorStore.ts
// Removed GridSettings as it's not directly in EditorState for now.
// export type GridSettings = {
//   visible: boolean;
//   size: number;
//   // Potentially other grid-related settings
// };

export type Variation = {
  id: string;
  name: string;
  frames: Frame[];
  layers: Layer[];
  canvasSize: CanvasSize; // This includes viewport and original dimensions
  animationObjects: AnimationObject[];
  currentFrameIndex: number;
  currentLayerIndex: number;
  blockedPixels: { [key: string]: boolean }; // Updated to match editorStore.ts
  subRectangles: SubRectangle[];
  selection: Selection | null;
  // gridSettings: GridSettings; // Removed for now
  // Add other relevant state parts here, e.g.,
  // currentTool: Tool; (if tools should be per variation)
  // currentColor: string; (if colors should be per variation)
  // etc. This needs careful consideration based on desired behavior.
  // For now, focusing on core data elements.
};
