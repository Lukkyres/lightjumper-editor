/**
 * File System Access API Utilities für Lightjumper Editor
 * 
 * Dieses Modul bietet Hilfsfunktionen für den Zugriff auf das Dateisystem
 * mithilfe der File System Access API.
 */

// Types für die Projektdateiverwaltung
export interface ProjectFile {
  name: string;
  handle: any; // FileSystemFileHandle
  lastModified: number;
  thumbnailUrl?: string;
  videoPreviewUrl?: string; // Added for video preview
}

export interface DirectoryAccess {
  handle: any; // FileSystemDirectoryHandle
  name: string;
}

// Schlüssel für localStorage
const DIRECTORY_KEY = 'lightjumper-project-directory';

// Flag to prevent multiple directory pickers from opening simultaneously
let isDirectoryPickerOpen = false;

// Reset the flag when the page loads/reloads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    isDirectoryPickerOpen = false;
  });
  
  // Also reset on focus (in case user closed picker externally)
  window.addEventListener('focus', () => {
    // Small delay to ensure any pending operations complete
    setTimeout(() => {
      isDirectoryPickerOpen = false;
    }, 100);
  });
}

/**
 * Prüft, ob die File System Access API verfügbar ist
 */
export const isFileSystemAccessSupported = (): boolean => {
  return 'showDirectoryPicker' in window;
};

/**
 * Setzt das Directory Picker Flag zurück (für Debugging/Recovery)
 */
export const resetDirectoryPickerFlag = (): void => {
  isDirectoryPickerOpen = false;
  console.log('Directory picker flag has been reset');
};

/**
 * Zeigt einen Dialog zur Auswahl eines Projektverzeichnisses
 */
export const selectProjectDirectory = async (): Promise<DirectoryAccess | null> => {
  try {
    if (!isFileSystemAccessSupported()) {
      console.error('File System Access API wird von diesem Browser nicht unterstützt');
      return null;
    }

    // Prevent multiple directory pickers from opening
    if (isDirectoryPickerOpen) {
      console.warn('Directory picker is already open. Please close the current picker first.');
      return null;
    }

    isDirectoryPickerOpen = true;

    try {
      // Verzeichnis auswählen
      const handle = await (window as any).showDirectoryPicker({
        id: 'lightjumper-projects',
        mode: 'readwrite',
        startIn: 'documents'
      });

      // Speichern des Verzeichnisnamens für spätere Referenz
      const directory: DirectoryAccess = {
        handle,
        name: handle.name
      };

      // Speichern des Verzeichnisnamens in localStorage
      localStorage.setItem(DIRECTORY_KEY, handle.name);

      // Speichern des Handles in der globalen Anwendungsumgebung (wird nicht über Neustarts hinweg gespeichert)
      (window as any).lightjumperDirectoryHandle = handle;

      return directory;
    } finally {
      // Always reset the flag, regardless of success or failure
      isDirectoryPickerOpen = false;
    }
  } catch (error) {
    isDirectoryPickerOpen = false; // Reset flag on error
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log('Directory selection was cancelled by user');
        return null;
      } else if (error.name === 'NotAllowedError') {
        console.warn('Directory picker permission denied or already active:', error.message);
        return null;
      }
    }
    
    console.error('Fehler beim Auswählen des Projektverzeichnisses:', error);
    return null;
  }
};

/**
 * Versucht, ein zuvor gewähltes Verzeichnis wiederherzustellen
 */
export const getLastUsedDirectory = async (): Promise<DirectoryAccess | null> => {
  try {
    // Prüfen, ob ein Handle im Anwendungsspeicher existiert
    const savedHandle = (window as any).lightjumperDirectoryHandle;
    if (!savedHandle) {
      return null;
    }

    // Prüfen, ob die Berechtigungen noch gültig sind
    try {
      // Verwenden von type assertion anstelle von TypeScript-Interface
      const permissionStatus = await (savedHandle as any).requestPermission({ mode: 'readwrite' });
      if (permissionStatus !== 'granted') {
        console.log('Keine Berechtigung mehr für das Verzeichnis');
        return null;
      }
    } catch (error) {
      console.error('Fehler beim Prüfen der Berechtigung:', error);
      return null;
    }

    return {
      handle: savedHandle,
      name: savedHandle.name || localStorage.getItem(DIRECTORY_KEY) || 'Projektverzeichnis'
    };
  } catch (error) {
    console.error('Fehler beim Abrufen des letzten Verzeichnisses:', error);
    return null;
  }
};

/**
 * Lädt die Liste der .ljp Projektdateien aus einem Verzeichnis
 */
export const loadProjectFiles = async (directory: DirectoryAccess): Promise<ProjectFile[]> => {
  try {
    const projects: ProjectFile[] = [];
    
    // Iterieren durch alle Dateien im Verzeichnis
    for await (const [name, handle] of (directory.handle as any).entries()) {
      // Nur .ljp-Dateien betrachten
      if (handle.kind === 'file' && name.toLowerCase().endsWith('.ljp')) {
        try {
          const file = await handle.getFile();
          const projectNameFromFile = name.replace(/\.ljp$/i, '');

          let videoUrl: string | undefined = undefined;

          // Try to find a video preview for this project
          try {
            const projectDirHandle = await directory.handle.getDirectoryHandle(projectNameFromFile);
            
            // Attempt to read the .ljp file to determine the last active state (variation or main)
            let lastActiveStateName = 'Hauptzustand'; // Default
            try {
              const ljpFile = await handle.getFile();
              const ljpContentText = await ljpFile.text();
              const ljpData = JSON.parse(ljpContentText);

              if (ljpData.currentVersion && ljpData.currentVersion.data) {
                const currentData = ljpData.currentVersion.data;
                if (currentData.currentVariationId && currentData.variations) {
                  const currentVariation = currentData.variations.find((v: any) => v.id === currentData.currentVariationId);
                  if (currentVariation && currentVariation.name) {
                    lastActiveStateName = currentVariation.name;
                  }
                }
              } else if (ljpData.currentVariationId && ljpData.variations) { // Legacy support
                const currentVariation = ljpData.variations.find((v: any) => v.id === ljpData.currentVariationId);
                if (currentVariation && currentVariation.name) {
                  lastActiveStateName = currentVariation.name;
                }
              }
            } catch (ljpError) {
              console.warn(`Konnte .ljp Datei nicht lesen oder parsen für Projekt ${projectNameFromFile} zur Bestimmung des aktiven Zustands:`, ljpError);
            }

            const sanitizedStateName = lastActiveStateName.replace(/[<>:"/\\|?*]+/g, '_').trim();
            const targetStateName = sanitizedStateName || lastActiveStateName; // Fallback if sanitization results in empty

            try {
              const stateDirHandle = await projectDirHandle.getDirectoryHandle(targetStateName);
              const videoFileHandle = await stateDirHandle.getFileHandle(`${projectNameFromFile}.mp4`);
              const videoFile = await videoFileHandle.getFile();
              videoUrl = URL.createObjectURL(videoFile);
              console.log(`Video-Vorschau gefunden für ${projectNameFromFile} im Zustand ${targetStateName}: ${videoUrl}`);
            } catch (videoError) {
              // If not found in specific state, try 'Hauptzustand' if not already tried
              if (targetStateName !== 'Hauptzustand') {
                try {
                  const hauptzustandDirHandle = await projectDirHandle.getDirectoryHandle('Hauptzustand');
                  const videoFileHandle = await hauptzustandDirHandle.getFileHandle(`${projectNameFromFile}.mp4`);
                  const videoFile = await videoFileHandle.getFile();
                  videoUrl = URL.createObjectURL(videoFile);
                  console.log(`Video-Vorschau gefunden für ${projectNameFromFile} im Fallback-Zustand 'Hauptzustand': ${videoUrl}`);
                } catch (hauptzustandError) {
                  console.log(`Keine Video-Vorschau im Zustand '${targetStateName}' oder 'Hauptzustand' für ${projectNameFromFile} gefunden.`);
                }
              }
            }
          } catch (projectDirError) {
            console.log(`Projektordner ${projectNameFromFile} nicht gefunden, keine Video-Vorschau möglich.`);
          }
          
          const projectFile: ProjectFile = {
            name: projectNameFromFile,
            handle,
            lastModified: file.lastModified
          };

          // Only add videoPreviewUrl if it exists
          if (videoUrl) {
            projectFile.videoPreviewUrl = videoUrl;
          }

          projects.push(projectFile);
        } catch (error) {
          console.error(`Fehler beim Laden der Datei ${name}:`, error);
        }
      }
    }
    
    // Nach Änderungsdatum sortieren (neueste zuerst)
    return projects.sort((a, b) => b.lastModified - a.lastModified);
  } catch (error) {
    console.error('Fehler beim Laden der Projektdateien:', error);
    return [];
  }
};

/**
 * Liest eine Projektdatei und gibt ihren Inhalt zurück
 */
export const readProjectFile = async (fileHandle: any): Promise<any> => {
  try {
    // Datei vom Handle holen
    const file = await fileHandle.getFile();
    
    // Datei als Text lesen
    const content = await file.text();
    
    // JSON parsen
    return JSON.parse(content);
  } catch (error) {
    console.error('Fehler beim Lesen der Projektdatei:', error);
    throw error;
  }
};

/**
 * Speichert Projektdaten in eine Datei im ausgewählten Verzeichnis
 */
export const saveProjectToDirectory = async (
  directory: DirectoryAccess,
  projectName: string,
  projectData: any
): Promise<boolean> => {
  try {
    const fileName = `${projectName}.ljp`;
    
    // Datei im Verzeichnis erstellen oder öffnen
    const fileHandle = await directory.handle.getFileHandle(fileName, { create: true });
    
    // Writable Stream erstellen
    const writable = await fileHandle.createWritable();
    
    // Daten in die Datei schreiben
    await writable.write(JSON.stringify(projectData));
    
    // Stream schließen
    await writable.close();
    
    console.log(`Projekt "${projectName}" erfolgreich gespeichert`);
    return true;
  } catch (error) {
    console.error('Fehler beim Speichern des Projekts:', error);
    return false;
  }
};

/**
 * Bereinigt Video-URLs um Memory Leaks zu vermeiden
 */
export const cleanupVideoUrls = (projects: ProjectFile[]): void => {
  projects.forEach(project => {
    if (project.videoPreviewUrl) {
      URL.revokeObjectURL(project.videoPreviewUrl);
    }
  });
};

/**
 * Generiert ein Thumbnail für eine Projektdatei
 */
export const generateProjectThumbnail = (
  framePixels: Array<{x: number, y: number, color: string}>,
  width: number,
  height: number,
  viewportX: number,
  viewportY: number
): string => {
  // Canvas erstellen
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }
  
  // Schwarzer Hintergrund
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  // Pixel zeichnen
  framePixels.forEach(pixel => {
    const drawX = pixel.x - viewportX;
    const drawY = pixel.y - viewportY;
    
    if (drawX >= 0 && drawX < width && drawY >= 0 && drawY < height) {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(drawX, drawY, 1, 1);
    }
  });
  
  // Als Data URL zurückgeben
  return canvas.toDataURL('image/png');
};
