import React, { useState, useEffect } from 'react';
import { 
  DirectoryAccess, 
  ProjectFile, 
  getLastUsedDirectory,
  selectProjectDirectory, 
  loadProjectFiles, 
  generateProjectThumbnail,
  cleanupVideoUrls,
  resetDirectoryPickerFlag 
} from '../../utils/fileSystemAccess';
import './ProjectManager.css';
import { Folder, FilePlus, FolderOpen, X, ArrowClockwise } from '@phosphor-icons/react';
import useEditorStore from '../../store/editorStore';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectLoad: (projectFile: ProjectFile) => void;
  onDirectoryChange: (directory: DirectoryAccess | null) => void;
  onNewProject?: () => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ isOpen, onClose, onProjectLoad, onDirectoryChange, onNewProject }) => {
  const [directory, setDirectory] = useState<DirectoryAccess | null>(null);
  const [projects, setProjects] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup video URLs when component unmounts
  useEffect(() => {
    return () => {
      cleanupVideoUrls(projects);
    };
  }, [projects]);

  // Lädt den Verzeichniskontext beim Start
  useEffect(() => {
    const loadDirectory = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      try {
        // Prüfe zuerst, ob bereits ein Verzeichnis im State vorhanden ist
        if (directory) {
          await loadProjectsFromDirectory(directory);
        } else {
          const dir = await getLastUsedDirectory();
          if (dir) {
            setDirectory(dir);
            onDirectoryChange(dir);
            await loadProjectsFromDirectory(dir);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden des Verzeichniskontexts:', error);
        setError('Fehler beim Laden des Projekt-Verzeichnisses');
      } finally {
        setLoading(false);
      }
    };

    loadDirectory();
    
    // Cleanup-Funktion, die nichts tun muss, da wir die Lade-Operationen mit isOpen kontrollieren
    return () => {};
    // Alternativ könnte man einen AbortController verwenden, falls die fetch-Operationen cancelable sein sollen
  }, [isOpen, directory]);

  // Lädt die Projekte aus dem ausgewählten Verzeichnis
  const loadProjectsFromDirectory = async (dir: DirectoryAccess) => {
    // Gleich prüfen, ob ein gültiges Verzeichnis übergeben wurde
    if (!dir) {
      console.error('Kein gültiges Verzeichnis übergeben');
      setError('Kein gültiges Projektverzeichnis');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const projectList = await loadProjectFiles(dir);
      // Prüfen, ob sich die Liste tatsächlich geändert hat, um unnötige Rerenders zu vermeiden
      if (JSON.stringify(projectList.map(p => p.name)) !== JSON.stringify(projects.map(p => p.name))) {
        // Cleanup old video URLs before setting new projects
        cleanupVideoUrls(projects);
        
        setProjects(projectList);
        
        // Generiere Thumbnails für die Projekte später
        setTimeout(() => {
          generateThumbnails(projectList);
        }, 100); // Leicht erhöhtes Timeout
      }
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error);
      setError('Fehler beim Laden der Projekte aus dem Verzeichnis');
    } finally {
      setLoading(false);
    }
  };

  // Generiert Thumbnails für die Projekte
  const generateThumbnails = async (projectList: ProjectFile[]) => {
    const updatedList = [...projectList];
    
    for (let i = 0; i < updatedList.length && i < 10; i++) { // Max 10 Thumbnails generieren
      try {
        // Laden Sie die Projektdatei
        const fileData = await (updatedList[i].handle as any).getFile();
        const text = await fileData.text();
        const projectData = JSON.parse(text);
        
        // Prüfen, ob es sich um ein Projekt mit Versionsgeschichte handelt
        if (projectData.currentVersion && projectData.versions && Array.isArray(projectData.versions)) {
          const data = projectData.currentVersion.data;
          
          if (data.frames && data.frames.length > 0) {
            // Pixel aus dem ersten Frame sammeln
            const frame = data.frames[0];
            const canvasSize = data.canvasSize;
            const layers = data.layers;
            
            // Alle Pixel aus dem Frame sammeln
            const allPixels: Array<{x: number, y: number, color: string}> = [];
            
            // Sichtbare Layer auswählen
            const visibleLayers = layers
              .filter((l: any) => l.visible)
              .map((l: any) => l.id);
            
            // Pixel aus allen sichtbaren Layern sammeln
            visibleLayers.forEach((layerId: string) => {
              if (frame.layerData[layerId]) {
                const pixels = frame.layerData[layerId] || [];
                allPixels.push(...pixels.map((p: any) => ({
                  x: p.x,
                  y: p.y,
                  color: p.color
                })));
              }
            });
            
            // Thumbnail generieren
            const thumbnail = generateProjectThumbnail(
              allPixels,
              canvasSize.width,
              canvasSize.height,
              canvasSize.viewportX,
              canvasSize.viewportY
            );
            
            // Thumbnail zum Projekt hinzufügen
            updatedList[i].thumbnailUrl = thumbnail;
          }
        }
      } catch (error) {
        console.error(`Fehler beim Generieren des Thumbnails für ${updatedList[i].name}:`, error);
      }
    }
    
    setProjects(updatedList);
  };

  // Handler für das Auswählen eines neuen Verzeichnisses
  const handleSelectDirectory = async () => {
    // Prevent multiple calls while loading
    if (loading) {
      console.warn('Directory selection already in progress');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const newDirectory = await selectProjectDirectory();
      
      if (newDirectory) {
        setDirectory(newDirectory);
        onDirectoryChange(newDirectory);
        await loadProjectsFromDirectory(newDirectory);
      } else {
        console.log('No directory selected or directory picker was already open');
        setError('Kein Verzeichnis ausgewählt. Falls der Dialog nicht erscheint, versuchen Sie es erneut.');
      }
    } catch (error) {
      console.error('Fehler beim Auswählen des Verzeichnisses:', error);
      setError('Fehler beim Auswählen des Verzeichnisses');
    } finally {
      setLoading(false);
    }
  };

  // Handler zum Zurücksetzen des Directory Picker Flags
  const handleResetPickerFlag = () => {
    resetDirectoryPickerFlag();
    setError(null);
  };

  // Hilfsfunktion zum Prüfen, ob ungespeicherte Änderungen vorliegen
  const checkUnsavedChanges = (): boolean => {
    return useEditorStore.getState().hasUnsavedChanges();
  };
  
  // Hilfsfunktion zum Anzeigen der Speicherabfrage und Handhabung der Bestätigung
  const confirmLoadProject = async (project: ProjectFile) => {
    try {
      setLoading(true); // Zeige Ladeindikator während des Ladens
      onProjectLoad(project);
      // Kurzes Timeout hinzufügen, damit der Laden-Status sichtbar ist
      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 100);
    } catch (error) {
      console.error('Fehler beim Laden des Projekts:', error);
      setError(`Fehler beim Laden des Projekts: ${project.name}`);
      setLoading(false);
    }
  };
  
  // Handler zum Laden eines Projekts mit Speicherabfrage
  const handleLoadProject = async (project: ProjectFile) => {
    // Prüfe, ob es ungespeicherte Änderungen gibt
    if (checkUnsavedChanges()) {
      // Frage den Benutzer, ob er speichern möchte
      const userChoice = window.confirm(
        "Es gibt ungespeicherte Änderungen im aktuellen Projekt. Möchten Sie diese speichern, bevor Sie ein anderes Projekt laden?"
      );
      
      if (userChoice) {
        // Benutzer möchte speichern - wir schließen den Dialog, damit der Benutzer über die MenuBar speichern kann
        alert("Bitte speichern Sie Ihr Projekt über die Speichern-Schaltfläche in der Menüleiste und öffnen Sie den Projektmanager danach erneut, um ein anderes Projekt zu laden.");
        onClose();
        return;
      }
      // Wenn der Benutzer nicht speichern möchte, fahren wir mit dem Laden fort
    }
    
    // Projekt laden, wenn keine Änderungen vorhanden sind oder der Benutzer nicht speichern möchte
    await confirmLoadProject(project);
  };
  
  // Handler für das Erstellen eines neuen Projekts - komplett überarbeitet für Robustheit
  const handleNewProject = async () => {
    if (!directory) {
      setError('Bitte wählen Sie zuerst einen Projektordner aus.');
      return;
    }
    
    // Prüfe, ob es ungespeicherte Änderungen gibt
    if (checkUnsavedChanges()) {
      // Frage den Benutzer, ob er speichern möchte
      const userChoice = window.confirm(
        "Es gibt ungespeicherte Änderungen im aktuellen Projekt. Möchten Sie diese speichern, bevor Sie ein neues Projekt erstellen?"
      );
      
      if (userChoice) {
        // Benutzer möchte speichern - wir schließen den Dialog, damit der Benutzer über die MenuBar speichern kann
        alert("Bitte speichern Sie Ihr Projekt über die Speichern-Schaltfläche in der Menüleiste und öffnen Sie den Projektmanager danach erneut, um ein neues Projekt zu erstellen.");
        onClose();
        return;
      }
      // Wenn der Benutzer nicht speichern möchte, fahren wir mit dem Erstellen fort
    }
    
    // Zeigt dem Benutzer eine visuelle Rückmeldung, dass etwas passiert
    setLoading(true);
    setError(null); // Bestehende Fehler zurücksetzen
    
    try {
      console.log('Erstelle neues Projekt im Verzeichnis:', directory.name);
      
      // WICHTIG: Direkte Aufruf des Callbacks ohne Timeout
      // Das Timeout verursachte möglicherweise Probleme mit dem React-State
      if (onNewProject) {
        // Log zur Nachverfolgung
        console.log('onNewProject-Callback wird synchron aufgerufen');
        
        // Explizit den Callback aufrufen
        onNewProject();
        
        // Projektmanager schließen NACH dem Callback
        onClose();
      } else {
        console.error('Kein gültiger onNewProject-Callback gefunden!');
        setError('Fehler: Die Funktion zum Erstellen eines neuen Projekts fehlt');
        setLoading(false);
      }
    } catch (error) {
      console.error('Fehler beim Erstellen eines neuen Projekts:', error);
      setError(`Fehler beim Erstellen eines neuen Projekts: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      setLoading(false);
    }
  };

  // Aktualisiert die Projektliste
  const handleRefreshProjects = () => {
    if (directory) {
      loadProjectsFromDirectory(directory);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="project-manager-overlay">
      <div className="project-manager-modal">
        <div className="project-manager-header">
          <h2>Projekt-Manager</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="project-manager-toolbar">
          <button 
            className="primary-button" 
            title="Projektordner auswählen"
            onClick={handleSelectDirectory}
            disabled={loading}
          >
            <FolderOpen size={18} />
            <span>Projektordner auswählen</span>
          </button>
          
          <button 
            className="secondary-button" 
            onClick={handleRefreshProjects}
            disabled={!directory}
            title="Projekte aktualisieren"
          >
            <ArrowClockwise size={18} />
            <span>Aktualisieren</span>
          </button>
          
          <button 
            className="primary-button"
            onClick={handleNewProject}
            disabled={!directory}
            title="Neues Projekt erstellen"
          >
            <FilePlus size={18} />
            <span>Neues Projekt</span>
          </button>
        </div>

        {directory && (
          <div className="current-directory">
            <Folder size={18} />
            <span>Aktueller Ordner: {directory.name}</span>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
            {error.includes('Dialog nicht erscheint') && (
              <button 
                onClick={handleResetPickerFlag}
                style={{ 
                  marginLeft: '10px', 
                  padding: '4px 8px', 
                  fontSize: '12px',
                  backgroundColor: '#444',
                  color: 'white',
                  border: '1px solid #666',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Dialog zurücksetzen
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading-message">
            Lade Projekte...
          </div>
        ) : !directory ? (
          <div className="empty-directory-message">
            <p>Kein Projektordner ausgewählt.</p>
            <p>Bitte wählen Sie einen Ordner aus, in dem Ihre Projekte gespeichert werden sollen.</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-projects-message">
            <p>Keine Projekte gefunden.</p>
            <p>Der ausgewählte Ordner enthält keine .ljp Projektdateien.</p>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <div 
                key={project.name} 
                className="project-card"
                onClick={() => handleLoadProject(project)}
                title={`Projekt laden: ${project.name}\nZuletzt geändert: ${new Date(project.lastModified).toLocaleString()}`}
              >
                {project.videoPreviewUrl ? (
                  <video 
                    src={project.videoPreviewUrl} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline // Wichtig für Autoplay auf Mobilgeräten
                    className="project-thumbnail-video"
                    onError={(e) => {
                      console.warn(`Fehler beim Laden der Video-Vorschau für ${project.name}:`, e);
                      // Optional: Fallback zum Thumbnail oder Placeholder, wenn Video fehlschlägt
                      const target = e.target as HTMLVideoElement;
                      target.style.display = 'none'; // Verstecke das Video-Element
                      // Hier könnte man ein Fallback-Bild einblenden
                      const fallbackImage = document.createElement('img');
                      fallbackImage.src = project.thumbnailUrl || './placeholder-thumbnail.png'; // Annahme: Placeholder existiert
                      fallbackImage.alt = project.name;
                      fallbackImage.className = 'project-thumbnail';
                      target.parentElement?.appendChild(fallbackImage); // Füge Fallback hinzu
                    }}
                  />
                ) : project.thumbnailUrl ? (
                  <img src={project.thumbnailUrl} alt={project.name} className="project-thumbnail" />
                ) : (
                  <div className="project-thumbnail-placeholder">
                    <FilePlus size={48} />
                  </div>
                )}
                <div className="project-name">{project.name}</div>
                <div className="project-last-modified">
                  {project.lastModified 
                    ? new Date(project.lastModified).toLocaleDateString() 
                    : 'Unbekanntes Datum'}
                </div>
              </div>
            ))}
          </div>
        )}

        {!directory && (
          <div className="bottom-actions">
            <button 
              className="primary-button full-width"
              onClick={handleSelectDirectory}
            >
              <FolderOpen size={18} />
              <span>Projektordner auswählen</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectManager;
