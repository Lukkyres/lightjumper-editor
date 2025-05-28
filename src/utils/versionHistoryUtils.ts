import { AnimationObject, CanvasSize, Frame, Layer, Variation, SubRectangle, Selection } from '../types';

// Type definition for a project version
export interface ProjectVersion {
  id: string;
  timestamp: number;
  description: string;
  data: {
    canvasSize: CanvasSize;
    frames: Frame[];
    layers: Layer[];
    animationObjects: AnimationObject[];
    projectName?: string;
    // Neue Felder für Variations
    variations?: Variation[];
    currentVariationId?: string | null;
    mainProjectState?: {
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
    // Viewport-Einstellungen als direkte Eigenschaften
    blockedPixels?: { [key: string]: boolean };
    subRectangles?: SubRectangle[];
  };
}

// Type definition for a project with version history
export interface ProjectWithHistory {
  currentVersion: ProjectVersion;
  versions: ProjectVersion[];
  projectName?: string;
}

// Key für die Speicherung im localStorage
export const LOCAL_STORAGE_KEY = 'lightjumper_project_history';

// Maximum number of versions to keep in history
export const MAX_VERSION_HISTORY = 20;

// Debounce timer for localStorage operations
let saveDebounceTimer: number | null = null;

// Generate a unique ID for versions
export const generateVersionId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

// Create a timestamp-based version description
export const createVersionDescription = (): string => {
  const now = new Date();
  return `Version vom ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
};

// Create a new version from project data
export const createVersion = (
  projectData: {
    canvasSize: CanvasSize;
    frames: Frame[];
    layers: Layer[];
    animationObjects: AnimationObject[];
    projectName?: string;
    variations?: Variation[];
    currentVariationId?: string | null;
    mainProjectState?: {
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
    blockedPixels?: { [key: string]: boolean };
    subRectangles?: SubRectangle[];
  }, 
  description?: string
): ProjectVersion => {
  return {
    id: generateVersionId(),
    timestamp: Date.now(),
    description: description || createVersionDescription(),
    data: { ...projectData }
  };
};

// Create a project with history from a regular project
export const createProjectWithHistory = (
  projectData: {
    canvasSize: CanvasSize;
    frames: Frame[];
    layers: Layer[];
    animationObjects: AnimationObject[];
    projectName?: string;
    variations?: Variation[];
    currentVariationId?: string | null;
    mainProjectState?: {
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
    blockedPixels?: { [key: string]: boolean };
    subRectangles?: SubRectangle[];
  }
): ProjectWithHistory => {
  const initialVersion = createVersion(projectData);
  
  return {
    currentVersion: initialVersion,
    versions: [initialVersion],
    projectName: projectData.projectName
  };
};

// Add a new version to a project's history
export const addVersionToHistory = (
  projectWithHistory: ProjectWithHistory,
  projectData: {
    canvasSize: CanvasSize;
    frames: Frame[];
    layers: Layer[];
    animationObjects: AnimationObject[];
    projectName?: string;
    variations?: Variation[];
    currentVariationId?: string | null;
    mainProjectState?: {
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
    blockedPixels?: { [key: string]: boolean };
    subRectangles?: SubRectangle[];
  },
  description?: string
): ProjectWithHistory => {
  const newVersion = createVersion(projectData, description);
  
  // Limit the number of versions (keep the most recent ones)
  let updatedVersions = [...projectWithHistory.versions, newVersion];
  if (updatedVersions.length > MAX_VERSION_HISTORY) {
    updatedVersions = updatedVersions.slice(-MAX_VERSION_HISTORY);
  }
  
  return {
    currentVersion: newVersion,
    versions: updatedVersions,
    projectName: projectData.projectName
  };
};

// Get a specific version from history by ID
export const getVersionById = (
  projectWithHistory: ProjectWithHistory,
  versionId: string
): ProjectVersion | undefined => {
  return projectWithHistory.versions.find(version => version.id === versionId);
};

// Switch to a specific version in the project history
export const switchToVersion = (
  projectWithHistory: ProjectWithHistory,
  versionId: string
): ProjectWithHistory | null => {
  const version = getVersionById(projectWithHistory, versionId);
  
  if (!version) {
    return null;
  }
  
  return {
    ...projectWithHistory,
    currentVersion: version
  };
};

// Debounced function to save to localStorage
export const saveProjectHistoryToLocalStorage = (
  projectWithHistory: ProjectWithHistory
): void => {
  try {
    // Clear any existing debounce timer
    if (saveDebounceTimer !== null) {
      window.clearTimeout(saveDebounceTimer);
    }
    
    // Set a new debounce timer (300ms delay)
    saveDebounceTimer = window.setTimeout(() => {
      try {
        const serializedData = JSON.stringify(projectWithHistory);
        localStorage.setItem(LOCAL_STORAGE_KEY, serializedData);
        console.log('Projekt-History im Browser gespeichert');
      } catch (error) {
        console.error('Fehler beim Speichern der Projekt-History im lokalen Speicher:', error);
      }
      saveDebounceTimer = null;
    }, 300);
  } catch (error) {
    console.error('Fehler beim Einrichten des Debouncing:', error);
  }
};

// Lade die Versionshistorie aus dem lokalen Speicher des Browsers
export const loadProjectHistoryFromLocalStorage = (): ProjectWithHistory | null => {
  try {
    const serializedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!serializedData) {
      return null;
    }
    
    const projectWithHistory = JSON.parse(serializedData) as ProjectWithHistory;
    
    // Ensure we don't exceed the max version count
    if (projectWithHistory.versions.length > MAX_VERSION_HISTORY) {
      projectWithHistory.versions = projectWithHistory.versions.slice(-MAX_VERSION_HISTORY);
    }
    
    return projectWithHistory;
  } catch (error) {
    console.error('Fehler beim Laden der Projekt-History aus dem lokalen Speicher:', error);
    return null;
  }
};

// Füge eine Snapshot-Version zur Historie hinzu und speichere im lokalen Speicher
export const createAndSaveSnapshot = (
  projectData: {
    canvasSize: CanvasSize;
    frames: Frame[];
    layers: Layer[];
    animationObjects: AnimationObject[];
    projectName?: string;
    variations?: Variation[];
    currentVariationId?: string | null;
    mainProjectState?: {
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
    blockedPixels?: { [key: string]: boolean };
    subRectangles?: SubRectangle[];
  },
  existingProjectHistory?: ProjectWithHistory | null,
  description?: string
): ProjectWithHistory => {
  // Erstelle oder aktualisiere die Projekthistorie
  let projectWithHistory: ProjectWithHistory;
  
  if (existingProjectHistory) {
    // Füge eine neue Version zur existierenden Historie hinzu
    projectWithHistory = addVersionToHistory(existingProjectHistory, projectData, description);
  } else {
    // Erstelle eine neue Projekthistorie
    projectWithHistory = createProjectWithHistory(projectData);
  }
  
  // Speichere im lokalen Speicher
  saveProjectHistoryToLocalStorage(projectWithHistory);
  
  return projectWithHistory;
}; 