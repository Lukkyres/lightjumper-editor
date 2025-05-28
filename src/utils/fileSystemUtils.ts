// FileSystem Access API utilities for Lightjumper
import { ProjectWithHistory } from './versionHistoryUtils';
import { requestPermission } from './fileSystemTypes';

// Interface für den aktuellen Verzeichniskontext
export interface DirectoryContext {
  handle: FileSystemDirectoryHandle;
  name: string;
  path: string; // Realer Pfad, kann bei neustart anders sein
}

// Interface für ein Projektfile in einer Liste
export interface ProjectListItem {
  name: string;
  filename: string;
  handle: FileSystemFileHandle;
  lastModified?: number;
  thumbnailDataUrl?: string;
}

// Der aktuelle Verzeichniskontext wird im localStorage gespeichert
const DIRECTORY_CONTEXT_KEY = 'lightjumper-directory-context';

// Speichert den ausgewählten Verzeichniskontext im localStorage
export const saveDirectoryContext = async (directoryHandle: FileSystemDirectoryHandle): Promise<DirectoryContext> => {
  try {
    // Wir versuchen Zugriff zu erhalten und zu speichern
    const hasPermission = await requestPermission(directoryHandle, 'readwrite');
    if (!hasPermission) {
      throw new Error('Keine Berechtigung für das Verzeichnis');
    }

    // Erstellen des Kontextobjekts
    const context: DirectoryContext = {
      handle: directoryHandle,
      name: directoryHandle.name,
      path: directoryHandle.name, // Wir können den realen Pfad nicht erhalten, nur den Namen
    };

    // Als serialisierbares Objekt speichern
    localStorage.setItem(DIRECTORY_CONTEXT_KEY, JSON.stringify({
      name: context.name,
      path: context.path
    }));

    // Das Handle kann nicht serialisiert werden, daher speichern wir es in einer globalen Variable
    (window as any).lightjumperDirectoryHandle = directoryHandle;

    return context;
  } catch (error) {
    console.error('Fehler beim Speichern des Verzeichniskontexts:', error);
    throw error;
  }
};

// Lädt den gespeicherten Verzeichniskontext
export const loadDirectoryContext = async (): Promise<DirectoryContext | null> => {
  try {
    const savedHandle = (window as any).lightjumperDirectoryHandle as FileSystemDirectoryHandle | undefined;
    
    // Wenn kein Handle in der globalen Variable existiert, gibt es keinen Kontext
    if (!savedHandle) {
      return null;
    }

    // Prüfen, ob die Berechtigung noch gültig ist
    const hasPermission = await requestPermission(savedHandle, 'readwrite');
    if (!hasPermission) {
      return null;
    }

    // Laden der serialisierten Daten
    const contextData = localStorage.getItem(DIRECTORY_CONTEXT_KEY);
    if (!contextData) {
      return null;
    }

    const parsedData = JSON.parse(contextData);

    return {
      handle: savedHandle,
      name: parsedData.name || savedHandle.name,
      path: parsedData.path || savedHandle.name
    };
  } catch (error) {
    console.error('Fehler beim Laden des Verzeichniskontexts:', error);
    return null;
  }
};

// Hilfsfunktion zum Auswählen eines Verzeichnisses
export const selectDirectory = async (): Promise<DirectoryContext | null> => {
  try {
    // Zeige den Ordnerauswahldialog
    const directoryHandle = await window.showDirectoryPicker({
      id: 'lightjumper-projects',
      mode: 'readwrite',
      startIn: 'documents'
    });

    return await saveDirectoryContext(directoryHandle);
  } catch (error) {
    console.error('Fehler beim Auswählen des Verzeichnisses:', error);
    return null;
  }
};

// TypeScript-Erweiterung für FileSystemDirectoryHandle
declare global {
  interface FileSystemDirectoryHandle {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  }
  
  interface FileSystemHandle {
    kind: 'file' | 'directory';
  }
  
  interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile(): Promise<File>;
  }
}

// Lädt alle .ljp Dateien aus dem aktuellen Verzeichnis
export const loadProjectList = async (directoryHandle: FileSystemDirectoryHandle): Promise<ProjectListItem[]> => {
  try {
    const projectList: ProjectListItem[] = [];

    // Iterieren über alle Dateien im Verzeichnis
    for await (const [name, handle] of directoryHandle.entries()) {
      // Nur Dateien, keine Unterordner
      if (handle.kind === 'file' && name.endsWith('.ljp')) {
        const file = await handle.getFile();
        
        projectList.push({
          name: name.replace('.ljp', ''),
          filename: name,
          handle: handle as FileSystemFileHandle,
          lastModified: file.lastModified,
        });
      }
    }

    // Sortieren nach Änderungsdatum (neueste zuerst)
    return projectList.sort((a, b) => {
      if (!a.lastModified || !b.lastModified) return 0;
      return b.lastModified - a.lastModified;
    });
  } catch (error) {
    console.error('Fehler beim Laden der Projektliste:', error);
    return [];
  }
};

// Speichert ein Projekt in einer Datei im ausgewählten Verzeichnis
export const saveProjectToFile = async (
  directoryHandle: FileSystemDirectoryHandle,
  filename: string,
  projectWithHistory: ProjectWithHistory
): Promise<void> => {
  try {
    // Stelle sicher, dass die Datei die richtige Endung hat
    if (!filename.endsWith('.ljp')) {
      filename = `${filename}.ljp`;
    }

    // Erstellen oder Öffnen der Datei
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    
    // Umwandlung der Projektdaten in einen JSON-String
    const serializedData = JSON.stringify(projectWithHistory);
    
    // Erstellen eines Writable-Streams und Schreiben der Daten
    const writable = await fileHandle.createWritable();
    await writable.write(serializedData);
    await writable.close();
  } catch (error) {
    console.error('Fehler beim Speichern des Projekts:', error);
    throw error;
  }
};

// Lädt ein Projekt aus einer Datei
export const loadProjectFromFile = async (fileHandle: FileSystemFileHandle): Promise<any> => {
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('Fehler beim Laden des Projekts:', error);
    throw error;
  }
};
