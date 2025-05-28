import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FloppyDisk, 
  Upload, 
  Image as ImageIcon, 
  Play, 
  Stop,
  Plus,
  Minus,
  PencilSimple,
  Clock,
  BookmarkSimple,
  CaretLeft,
  CaretRight,
  ArrowsClockwise,
  HouseLine,
  PlusCircle,
  WarningCircle,
  FolderOpen,
  Files,
  FileImage,
  FileText,
  FileVideo,
  FrameCorners,
  FolderSimple,
  FolderSimplePlus,
  GearSix,
  HandPointing,
  ImageSquare,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Square,
  SquaresFour,
  TextT,
  X,
  // Floppy entfernt, da nicht verfügbar
  CirclesFour,
  Download,
  Eraser,
  FileArrowDown,
  FileArrowUp,
  Prohibit
} from '@phosphor-icons/react';
import useEditorStore from '../../store/editorStore';
import './MenuBar.css';
import { AnimationObject, Frame, PixelData } from '../../types';
import ExportProgress from '../ExportProgress/ExportProgress';
import { exportFramesToZIP, exportFramesToFolder, saveProject, loadProject, exportToMP4, exportToGifWithEditor, ExportOptions, generateReducedFrameDataURL, downloadAndExtractZIP, saveZipToProjectState } from '../../utils/exportUtils';
import PixelInconsistencyModal from '../PixelInconsistencyModal/PixelInconsistencyModal';
import ProjectManager from '../ProjectManager/ProjectManager';
import VersionHistory from '../VersionHistory/VersionHistory';
import { ProjectWithHistory, switchToVersion, getVersionById, loadProjectHistoryFromLocalStorage, createAndSaveSnapshot, addVersionToHistory, createProjectWithHistory } from '../../utils/versionHistoryUtils';
import { applyAnimationsToFrames } from '../../utils/animationUtils';
import { saveAs } from 'file-saver';
import { DirectoryAccess, ProjectFile, getLastUsedDirectory, saveProjectToDirectory, readProjectFile } from '../../utils/fileSystemAccess';

// Types for our modal
type CanvasSettingsModal = {
  isOpen: boolean;
  width: number;
  height: number;
};

// Helper to convert hex/rgb color + alpha to rgba string
const toRgbaString = (color: string, alpha: number): string => {
  alpha = Math.max(0, Math.min(1, alpha)); // Clamp alpha 0-1

  // Handle Hex (#RRGGBB)
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Handle rgb(r, g, b) - Strip existing alpha if present
  if (color.startsWith('rgb')) { // Catches rgb and rgba
    const parts = color.match(/\d+/g);
    if (parts && parts.length >= 3) {
      const r = parseInt(parts[0], 10);
      const g = parseInt(parts[1], 10);
      const b = parseInt(parts[2], 10);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  
  // Fallback for unknown formats or short hex (#RGB)
  console.warn(`Cannot accurately convert color '${color}' to RGBA with new alpha. Using default gray.`);
  return `rgba(60, 60, 60, ${alpha})`; 
};

// Type for the export settings dialog state
type ExportSettingsDialog = {
  isOpen: boolean;
  format: 'mp4' | 'gif' | null;
  pixelBgColor: string;
  gridLineColor: string; 
  gridLineAlpha: number; // New: Alpha state (0-1)
};

interface MenuBarProps {
  projectDirectory: DirectoryAccess | null;
  onDirectoryChange?: (directory: DirectoryAccess | null) => void;
  onNewProject?: () => void; // Hinzufügen des onNewProject-Callbacks
  onProjectLoadStart?: () => void; // Callback when project loading starts
  onProjectLoadEnd?: () => void; // Callback when project loading ends
}

const MenuBar: React.FC<MenuBarProps> = ({ projectDirectory, onDirectoryChange, onNewProject, onProjectLoadStart, onProjectLoadEnd }) => {
  const { 
    canvasSize, 
    setCanvasSize, 
    mode, 
    toggleMode,
    pixelSize,
    setPixelSize,
    frames,
    animationObjects,
    projectName,
    setProjectName,
    variations,
    currentVariationId,
    switchToVariation,
    updateCurrentVariation,
    updateMainState,
    checkForPixelNumberInconsistencies // Add the action from the store
  } = useEditorStore();
  
  // const { setOriginalCanvasSize } = useEditorStore(); // This seems incorrect/missing
  
  const [canvasSettingsModal, setCanvasSettingsModal] = useState<CanvasSettingsModal>({
    isOpen: false,
    width: canvasSize.width,
    height: canvasSize.height
  });
  
  // State for dropdown menu
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  // State for project name editing
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState(projectName);
  
  // State für den Projektmanager
  const [showProjectManager, setShowProjectManager] = useState(false);
  
  // Export progress state
  const [exportProgress, setExportProgress] = useState({
    visible: false,
    progress: 0,
    status: '',
    format: 'mp4' as 'mp4' | 'gif'
  });
  
  // State for export settings dialog
  const [exportSettingsDialog, setExportSettingsDialog] = useState<ExportSettingsDialog>({
    isOpen: false,
    format: null,
    pixelBgColor: '#1a1a2e', 
    gridLineColor: '#3c3c3c', // Default grid color (solid hex)
    gridLineAlpha: 0.7 // Default alpha
  });
  
  const [rotateZip180, setRotateZip180] = useState(false); // Added state for 180-degree rotation
  
  // State for loop settings
  const [enableLooping, setEnableLooping] = useState(true);
  const [loopMinDuration, setLoopMinDuration] = useState(10); // Default 10 minutes
  const [loopStartFrame, setLoopStartFrame] = useState(1); // Default is frame 1
  const [showLoopSettings, setShowLoopSettings] = useState(false);
  const [showZipPreviewModal, setShowZipPreviewModal] = useState(false);
  const [zipPreviewDataUrls, setZipPreviewDataUrls] = useState<string[]>([]);
  const [zipPreviewBlob, setZipPreviewBlob] = useState<Blob | null>(null);
  const [currentPreviewFrameIndex, setCurrentPreviewFrameIndex] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(true); // New state for play/pause
  
  // Version history state
  const [projectHistory, setProjectHistory] = useState<ProjectWithHistory | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  
  // Statemanagement für die Anzeige der Variation
  const [isEditingVariationName, setIsEditingVariationName] = useState(false);
  
  // State for saving ZIP to project state
  const [showStateSelectionDialog, setShowStateSelectionDialog] = useState(false);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [isCreatingNewState, setIsCreatingNewState] = useState(false);
  const [newStateName, setNewStateName] = useState('');
  
  // Hilfsfunktion zum Finden des aktuellen Variationsnamens
  const getCurrentVariationName = () => {
    if (!currentVariationId) return null;
    const currentVariation = variations.find(v => v.id === currentVariationId);
    return currentVariation ? currentVariation.name : null;
  };
  
  // Navigationsfunktionen für Variationen
  const switchToNextVariation = () => {
    // Aktuellen Zustand speichern
    updateCurrentVariation();
    
    // Alle IDs: null (Hauptzustand) und alle Variations-IDs
    const allIds = [null, ...variations.map(v => v.id)];
    
    // Aktuelle Position finden
    const currentIndex = allIds.indexOf(currentVariationId);
    
    // Zur nächsten Variation wechseln (oder zum Anfang, wenn wir am Ende sind)
    const nextIndex = (currentIndex + 1) % allIds.length;
    switchToVariation(allIds[nextIndex]);
  };
  
  const switchToPreviousVariation = () => {
    // Aktuellen Zustand speichern
    updateCurrentVariation();
    
    // Alle IDs: null (Hauptzustand) und alle Variations-IDs
    const allIds = [null, ...variations.map(v => v.id)];
    
    // Aktuelle Position finden
    const currentIndex = allIds.indexOf(currentVariationId);
    
    // Zur vorherigen Variation wechseln (oder zum Ende, wenn wir am Anfang sind)
    const prevIndex = (currentIndex - 1 + allIds.length) % allIds.length;
    switchToVariation(allIds[prevIndex]);
  };
  
  // Funktion zum Aktualisieren der aktuellen Variation
  const handleUpdateVariation = () => {
    updateCurrentVariation();
    alert('Variation aktualisiert');
  };
  
  // Toggle export dropdown
  const toggleExportDropdown = () => {
    setShowExportDropdown(!showExportDropdown);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown')) {
        setShowExportDropdown(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  // Handle canvas resize
  const handleCanvasResize = () => {
    setCanvasSize(canvasSettingsModal.width, canvasSettingsModal.height);
    setCanvasSettingsModal({ ...canvasSettingsModal, isOpen: false });
  };
  
  // Export current frame as PNG
  const exportCurrentFrame = () => {
    // Get necessary state from the store
    const {
      frames,
      currentFrameIndex,
      canvasSize,
      blockedPixels,
      animationObjects,
      layers, // Layers werden benötigt
      projectName
    } = useEditorStore.getState();

    // Check if there are frames
    if (frames.length === 0 || currentFrameIndex < 0 || currentFrameIndex >= frames.length) {
      alert('Kein gültiger Frame zum Exportieren ausgewählt!');
      setShowExportDropdown(false);
      return;
    }

    // Get the current frame
    const currentFrame = frames[currentFrameIndex];

    // Calculate animation pixels for the current frame
    let frameSpecificAnimationPixels: PixelData[] = [];
    if (animationObjects && animationObjects.length > 0) {
        const allFramesAnimationData = applyAnimationsToFrames(
            [currentFrame], // Pass only the current frame in an array
            animationObjects,
            canvasSize,
            blockedPixels
        );
        frameSpecificAnimationPixels = allFramesAnimationData[currentFrame.id] || [];
    }

    // Generate the reduced image data URL
    const dataUrl = generateReducedFrameDataURL(
      currentFrame,
      canvasSize,
      blockedPixels,
      animationObjects, // Still passed as it might be used by generateReducedFrameDataURL
      layers, // Layers übergeben
      frameSpecificAnimationPixels // Pass the precalculated animation pixels
    );
 
    if (!dataUrl || !dataUrl.dataUrl) { // Check both dataUrl object and its dataUrl property
      alert('Der Frame ist nach Entfernung blockierter Bereiche leer und kann nicht exportiert werden.');
      setShowExportDropdown(false);
      return;
    }
 
    // Export the canvas
    const link = document.createElement('a');
    // Dynamischer Dateiname
    const safeProjectName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'projekt';
    link.download = `${safeProjectName}_frame_${currentFrameIndex + 1}.png`;
    link.href = dataUrl.dataUrl; // Access the dataUrl property
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Close dropdown after export
    setShowExportDropdown(false);
  };
  
  // Export as PNG
  const exportAsPNG = () => {
    // Not used anymore since we have the dropdown menu

  };
  
  // Export as MP4
  const handleExportMP4Click = () => {
    setShowExportDropdown(false); 
    setExportSettingsDialog(prev => ({ 
      isOpen: true,
      format: 'mp4',
      pixelBgColor: prev.pixelBgColor,
      gridLineColor: prev.gridLineColor, 
      gridLineAlpha: prev.gridLineAlpha // Preserve alpha
    }));
  };
  
  // Export as GIF
  const handleExportGIFClick = () => {
    setShowExportDropdown(false); 
    setExportSettingsDialog(prev => ({ 
      isOpen: true,
      format: 'gif',
      pixelBgColor: prev.pixelBgColor,
      gridLineColor: prev.gridLineColor, 
      gridLineAlpha: prev.gridLineAlpha // Preserve alpha
    }));
  };
  
  // Actually trigger the export from the dialog
  const handleConfirmExport = () => {
    if (!exportSettingsDialog.format) return;

    const format = exportSettingsDialog.format;
    // Combine grid color and alpha into RGBA string for export
    const finalGridLineColor = toRgbaString(
      exportSettingsDialog.gridLineColor,
      exportSettingsDialog.gridLineAlpha
    );
    
    const exportOptions: ExportOptions = {
      HD: true,
      pixelBackgroundColor: exportSettingsDialog.pixelBgColor,
      gridLineColor: finalGridLineColor, // Pass combined RGBA color
      updateProgress: (progress: number, status: string) => {
        setExportProgress((prev) => ({
          ...prev,
          visible: true, 
          progress,
          status,
          format: format
        }));
      }
    };

    // Close the settings dialog first
    setExportSettingsDialog({ ...exportSettingsDialog, isOpen: false });

    // Get required state from store
    const { blockedPixels, frames, animationObjects, canvasSize, projectName, currentVariationId, variations } = useEditorStore.getState();

    let stateNameToUse = "Hauptzustand"; // Default state name
    if (currentVariationId) {
      const currentVariation = variations.find(v => v.id === currentVariationId);
      if (currentVariation) {
        stateNameToUse = currentVariation.name;
      }
    }

    // Start the appropriate export, passing defaultFrameDuration
    const exportPromise = format === 'mp4'
      ? exportToMP4(frames, animationObjects, canvasSize, projectName, blockedPixels, exportOptions, projectDirectory?.handle, stateNameToUse)
      : exportToGifWithEditor(frames, animationObjects, canvasSize, projectName, blockedPixels, exportOptions);

    exportPromise.finally(() => {
      setExportProgress((prev) => ({ ...prev, visible: false }));
    });
  };
  
  // Export as PNGs in ZIP
  const handleExportPNGs = () => {
    const { frames, animationObjects, canvasSize, projectName, blockedPixels, layers } = useEditorStore.getState();
    if (frames.length === 0) {
      alert('Keine Frames zum Exportieren vorhanden.');
      return;
    }
    exportFramesToZIP(
      frames,
      animationObjects,
      canvasSize,
      projectName,
      blockedPixels,
      layers, 
      rotateZip180, // Pass the rotation state
      false, // Don't enable looping for regular export
      loopMinDuration, // Pass the loop duration anyway (won't be used)
      0 // Default start frame (won't be used)
    );
    // For non-looping export, we assume direct download is fine as per previous behavior.
    // If preview is desired here too, this call needs to be updated like handleExportWithLooping.
    setShowExportDropdown(false);
  };
  
  // Export as PNGs in ZIP with black background
  const handleExportPNGsWithBlackBG = async () => { // Make async
    // If looping is enabled, show the loop settings dialog first
    if (enableLooping) {
      setShowLoopSettings(true);
      setShowExportDropdown(false);
      return;
    }
    
    // Otherwise export without looping, but WITH PREVIEW
    setShowExportDropdown(false); // Close dropdown early
    const { frames, animationObjects, canvasSize, projectName, blockedPixels, layers } = useEditorStore.getState();
    if (frames.length === 0) {
      alert('Keine Frames zum Exportieren vorhanden.');
      return;
    }

    setExportProgress(prev => ({ ...prev, visible: true, status: 'Generiere ZIP und Vorschau...', progress: 0, format: 'gif' /* or some generic type */ }));

    const result = await exportFramesToZIP(
      frames,
      animationObjects,
      canvasSize,
      projectName,
      blockedPixels,
      layers,
      rotateZip180,
      false, // Disable looping for non-loop export
      loopMinDuration, // Pass the loop duration
      0 // Convert to 0-indexed
    );

    setExportProgress(prev => ({ ...prev, visible: false }));

    if (result && result.zipBlob && result.previewDataUrls.length > 0) {
      setZipPreviewDataUrls(result.previewDataUrls);
      setZipPreviewBlob(result.zipBlob);
      setCurrentPreviewFrameIndex(0);
      setShowZipPreviewModal(true);
    } else {
      alert('Fehler beim Erstellen der ZIP-Vorschau für den regulären Export.');
      console.error('[MenuBar] Failed to generate ZIP/preview for non-looping black BG export. Result:', result);
    }
  };
  
  // Function to execute export with looping
  const handleExportWithLooping = async () => {
    setShowLoopSettings(false); // Close settings dialog first
    const { frames, animationObjects, canvasSize, projectName, blockedPixels, layers } = useEditorStore.getState();
    if (frames.length === 0) {
      alert('Keine Frames zum Exportieren vorhanden.');
      return;
    }
    
    // Ensure loopStartFrame is within valid range
    const validStartFrame = Math.max(1, Math.min(loopStartFrame, frames.length));

    // Always generate ZIP with preview first, regardless of project directory
    setExportProgress(prev => ({ ...prev, visible: true, status: 'Generiere ZIP mit Loop und Vorschau...', progress: 0, format: 'gif' }));

    const result = await exportFramesToZIP(
      frames,
      animationObjects,
      canvasSize,
      projectName,
      blockedPixels,
      layers,
      rotateZip180,
      true, // Enable looping
      loopMinDuration, // Pass the loop duration
      validStartFrame - 1 // Convert to 0-indexed
    );

    setExportProgress(prev => ({ ...prev, visible: false }));

    if (result && result.zipBlob && result.previewDataUrls.length > 0) {
      setZipPreviewDataUrls(result.previewDataUrls);
      setZipPreviewBlob(result.zipBlob);
      setCurrentPreviewFrameIndex(0);
      setShowZipPreviewModal(true); // This should trigger the modal
    } else {
      alert('Fehler beim Erstellen der ZIP-Vorschau mit Loop.');
      console.error('[MenuBar] Failed to generate ZIP/preview with looping. Result:', result);
    }
  };
  
  // Zoom in/out
  const zoomIn = () => {
    setPixelSize(Math.min(pixelSize + 2, 32));
  };
  
  const zoomOut = () => {
    setPixelSize(Math.max(pixelSize - 2, 4));
  };

  const handleSaveProject = async () => {
    const editorState = useEditorStore.getState();
    
    // Erstelle die Projektdaten
    const projectData = {
      canvasSize,
      frames,
      layers: useEditorStore.getState().layers,
      animationObjects,
      projectName: tempProjectName,
      // Neue Variations-Daten hinzufügen
      variations: editorState.variations,
      currentVariationId: editorState.currentVariationId,
      mainProjectState: editorState.mainProjectState,
      // Viewport-Einstellungen direkt speichern
      blockedPixels: editorState.blockedPixels,
      subRectangles: editorState.subRectangles
    };
    
    // Erstelle die Versionsgeschichte
    let projectWithHistory: ProjectWithHistory;
    
    if (projectHistory) {
      // Füge eine neue Version zur bestehenden Geschichte hinzu
      projectWithHistory = await addVersionToHistory(projectHistory, projectData);
    } else {
      // Erstelle eine neue Projektgeschichte
      projectWithHistory = await createProjectWithHistory(projectData);
    }
    
    // Setze die lokale Projektgeschichte
    setProjectHistory(projectWithHistory);
    
    // Speichern je nach ausgewähltem Verzeichnis
    if (projectDirectory) {
      try {
        // Speichere im ausgewählten Verzeichnis
        const success = await saveProjectToDirectory(
          projectDirectory,
          tempProjectName || 'lightjumper-project',
          projectWithHistory
        );
        
        if (success) {
          // Aktualisiere den lastSavedHistoryIndex nach erfolgreichem Speichern
          useEditorStore.setState({
            lastSavedHistoryIndex: editorState.historyIndex
          });
          alert(`Projekt "${tempProjectName}" erfolgreich im Verzeichnis gespeichert.`);
        } else {
          // Fallback zum herunterladen, wenn es Probleme gibt
          await saveProject(projectData, projectHistory || undefined);
          
          // Auch bei Fallback den lastSavedHistoryIndex aktualisieren
          useEditorStore.setState({
            lastSavedHistoryIndex: editorState.historyIndex
          });
        }
      } catch (error) {
        console.error('Fehler beim Speichern des Projekts im Verzeichnis:', error);
        // Fallback zum herunterladen
        await saveProject(projectData, projectHistory || undefined);
        
        // Auch bei Fallback den lastSavedHistoryIndex aktualisieren
        useEditorStore.setState({
          lastSavedHistoryIndex: editorState.historyIndex
        });
      }
    } else {
      // Herkömmliches Speichern (Download)
      await saveProject(projectData, projectHistory || undefined);
      
      // Auch bei Herkömmlichem Speichern den lastSavedHistoryIndex aktualisieren
      useEditorStore.setState({
        lastSavedHistoryIndex: editorState.historyIndex
      });
    }
  };

  // Effect for preview animation
  useEffect(() => {
    let animationInterval: number;
    if (showZipPreviewModal && zipPreviewDataUrls.length > 0 && isPlayingPreview) { // Check isPlayingPreview
      animationInterval = window.setInterval(() => {
        setCurrentPreviewFrameIndex(prevIndex => (prevIndex + 1) % zipPreviewDataUrls.length);
      }, 100);
    }
    return () => {
      window.clearInterval(animationInterval);
    };
  }, [showZipPreviewModal, zipPreviewDataUrls, isPlayingPreview]); // Add isPlayingPreview to dependencies

  const handleDownloadZipFromPreview = () => {
    if (zipPreviewBlob) {
      saveAs(zipPreviewBlob, `${projectName || 'animation'}.zip`);
    }
    setShowZipPreviewModal(false);
    setZipPreviewDataUrls([]);
    setZipPreviewBlob(null);
  };

  const handleDownloadAndExtractZipFromPreview = async () => {
    if (!zipPreviewBlob) {
      alert('Keine ZIP-Datei verfügbar.');
      return;
    }

    // Ask user for confirmation with performance warning
    const userChoice = confirm(
      `ZIP-Datei entpacken?\n\n` +
      `⚠️ Hinweis: Das automatische Entpacken kann bei vielen Dateien langsam sein.\n\n` +
      `• OK = Entpacken (kann länger dauern)\n` +
      `• Abbrechen = Normaler ZIP-Download (empfohlen für große Dateien)`
    );

    if (!userChoice) {
      // User chose normal download
      handleDownloadZipFromPreview();
      return;
    }

    setShowZipPreviewModal(false);
    setZipPreviewDataUrls([]);
    setZipPreviewBlob(null);

    // Show progress dialog
    setExportProgress(prev => ({ 
      ...prev, 
      visible: true, 
      status: 'Bereite Download und Entpackung vor...', 
      progress: 0, 
      format: 'gif' 
    }));

    try {
      const success = await downloadAndExtractZIP(
        zipPreviewBlob,
        projectName || 'animation',
        (progress: number, status: string) => {
          setExportProgress(prev => ({ ...prev, progress, status }));
        }
      );

      setExportProgress(prev => ({ ...prev, visible: false }));

      if (success) {
        alert(`ZIP-Datei erfolgreich entpackt! Alle Dateien wurden in den Ordner "${projectName || 'animation'}" extrahiert.`);
      } else {
        // downloadAndExtractZIP handles fallback to normal download
        console.log('Fallback zu normalem ZIP-Download wurde verwendet.');
      }
    } catch (error) {
      setExportProgress(prev => ({ ...prev, visible: false }));
      console.error('Fehler beim Herunterladen und Entpacken:', error);
      alert('Fehler beim Herunterladen und Entpacken. Versuchen Sie den normalen Download.');
    }
  };

  const handleExportToFolderFromPreview = async () => {
    if (!projectDirectory || !projectDirectory.handle) {
      alert('Kein Projektordner geöffnet.');
      return;
    }

    setShowZipPreviewModal(false);
    setZipPreviewDataUrls([]);
    setZipPreviewBlob(null);

    // Get the current state
    const { frames, animationObjects, canvasSize, projectName, blockedPixels, layers } = useEditorStore.getState();
    const validStartFrame = Math.max(1, Math.min(loopStartFrame, frames.length));

    // Export to folder with the same settings
    setExportProgress(prev => ({ 
      ...prev, 
      visible: true, 
      status: 'Exportiere Frames mit Loop in Ordner...', 
      progress: 0, 
      format: 'gif' 
    }));

    const success = await exportFramesToFolder(
      frames,
      animationObjects,
      canvasSize,
      projectName,
      blockedPixels,
      layers,
      projectDirectory.handle,
      rotateZip180,
      true, // Enable looping
      loopMinDuration, // Pass the loop duration
      validStartFrame - 1, // Convert to 0-indexed
      3,
      (progress: number, status: string) => {
        setExportProgress(prev => ({ ...prev, progress, status }));
      }
    );

    setExportProgress(prev => ({ ...prev, visible: false }));

    if (success) {
      alert(`Frames mit Loop erfolgreich in Ordner "${projectName}" exportiert.`);
    } else {
      alert('Fehler beim Exportieren der Frames mit Loop in den Ordner.');
    }
  };

  const handleSaveZipToProjectState = () => {
    if (!projectDirectory || !projectDirectory.handle) {
      alert('Kein Projektordner geöffnet. Bitte öffnen Sie zuerst einen Projektordner.');
      return;
    }

    if (!zipPreviewBlob) {
      alert('Keine ZIP-Datei verfügbar.');
      return;
    }

    // Show dialog to select state
    setShowStateSelectionDialog(true);
    setSelectedStateId(currentVariationId); // Default to current state
    setIsCreatingNewState(false);
    setNewStateName('');
  };

  const handleConfirmSaveZipToState = async () => {
    let targetStateName: string;
    
    if (isCreatingNewState) {
      if (!newStateName.trim()) {
        alert('Bitte geben Sie einen Namen für den neuen Zustand ein.');
        return;
      }
      targetStateName = newStateName.trim();
    } else {
      // Use existing state
      if (selectedStateId === null) {
        targetStateName = 'Hauptzustand';
      } else {
        const selectedVariation = variations.find(v => v.id === selectedStateId);
        if (!selectedVariation) {
          alert('Ausgewählter Zustand nicht gefunden.');
          return;
        }
        targetStateName = selectedVariation.name;
      }
    }

    if (!projectDirectory || !projectDirectory.handle || !zipPreviewBlob) {
      alert('Fehler: Projektordner oder ZIP-Datei nicht verfügbar.');
      return;
    }

    setShowStateSelectionDialog(false);
    setShowZipPreviewModal(false);
    setZipPreviewDataUrls([]);
    setZipPreviewBlob(null);

    // Show progress dialog
    setExportProgress(prev => ({ 
      ...prev, 
      visible: true, 
      status: 'Speichere ZIP in Zustandsordner...', 
      progress: 0, 
      format: 'gif' 
    }));

    try {
      const success = await saveZipToProjectState(
        zipPreviewBlob,
        projectDirectory.handle,
        projectName || 'animation',
        targetStateName,
        (progress: number, status: string) => {
          setExportProgress(prev => ({ ...prev, progress, status }));
        }
      );

      setExportProgress(prev => ({ ...prev, visible: false }));

      if (success) {
        alert(`ZIP-Datei erfolgreich im Zustand "${targetStateName}" gespeichert!\n\nPfad: ${projectName}/${targetStateName}/`);
      } else {
        alert('Fehler beim Speichern der ZIP-Datei im Zustandsordner.');
      }
    } catch (error) {
      setExportProgress(prev => ({ ...prev, visible: false }));
      console.error('Fehler beim Speichern der ZIP-Datei:', error);
      alert('Fehler beim Speichern der ZIP-Datei im Zustandsordner.');
    }
  };
  
  const handleLoadProject = async () => {
    // Sicherstellen, dass das Projektverzeichnis aktuell ist
    try {
      await updateProjectDirectory();
      
      // Prüfen, ob ein Projektverzeichnis ausgewählt ist
      if (projectDirectory) {
        // Wenn ja, zeige den Projektmanager an
        setShowProjectManager(true);
      } else {
        // Herkömmlicher Dateiauswahldialog
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.ljp';
        
        // Listen for file selection
        fileInput.onchange = async (event) => {
          const target = event.target as HTMLInputElement;
          const files = target.files;
          
          if (files && files.length > 0) {
            try {
              // Lade das Projekt mit der herkömmlichen Methode
              loadProjectFromFile(files[0]);
            } catch (error: unknown) {
              console.error('Error loading project:', error);
              alert(`Fehler beim Laden des Projekts: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
            }
          }
        };
        
        // Trigger file selection dialog
        fileInput.click();
      }
    } catch (error) {
      console.error('Fehler beim Laden des Projektverzeichnisses:', error);
      alert('Fehler beim Zugriff auf das Projektverzeichnis. Bitte versuchen Sie es erneut.');
    }
  };
  
  // Gemeinsame Funktion zum Laden eines Projekts aus Datei oder FileHandle
  const loadProjectFromFile = async (fileOrHandle: File | any) => {
    try {
      // Signal start of project loading
      onProjectLoadStart?.();
      
      // Sicherstellen, dass das Projektverzeichnis aktuell ist
      await updateProjectDirectory();
      
      let projectData;
      
      // Unterscheiden zwischen File und FileSystemFileHandle
      if (fileOrHandle instanceof File) {
        projectData = await loadProject(fileOrHandle);
      } else {
        // FileSystemFileHandle
        projectData = await readProjectFile(fileOrHandle);
        
        // Wenn es sich um ein Projekt mit Versionsgeschichte handelt, extrahiere die aktuelle Version
        if (projectData.currentVersion && projectData.versions) {
          // Speichere die komplette Versionsgeschichte
          setProjectHistory(projectData);
          
          // Verwende die aktuelle Version als Projektdaten
          projectData = {
            ...projectData.currentVersion.data,
            projectHistory: projectData
          };
        }
      }
      
      // Logging für Debug-Zwecke
      console.log('Projekt geladen:', projectData.projectName || 'Unbenanntes Projekt');
      console.log('Projektverzeichnis:', projectDirectory?.name || 'Keines');

      // Backward compatibility: Ensure frames have a section and animationObjects have renderOn
      if (projectData.frames && Array.isArray(projectData.frames)) {
        projectData.frames.forEach((frame: Frame) => {
          if (typeof frame.section === 'undefined') {
            frame.section = 'main';
          }
        });
      }

      if (projectData.animationObjects && Array.isArray(projectData.animationObjects)) {
        projectData.animationObjects.forEach((animObject: AnimationObject) => {
          if (typeof animObject.renderOnSection === 'undefined') {
            animObject.renderOnSection = 'main';
          }
        });
      }
      
      // Store project history if available
      if (projectData.projectHistory) {
        setProjectHistory(projectData.projectHistory);
      }
      
      // Store referenz
      const editorStore = useEditorStore.getState();
      
      // Projektname setzen
      editorStore.setProjectName(projectData.projectName || 'Level 1');
      setTempProjectName(projectData.projectName || 'Level 1');
      
      // State aktualisieren
      const editorState = {
        frames: projectData.frames,
        layers: projectData.layers,
        animationObjects: projectData.animationObjects || [],
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        variations: projectData.variations || [],
        currentVariationId: projectData.currentVariationId || null,
        mainProjectState: projectData.mainProjectState || null
      };
      
      useEditorStore.setState({
        canvasSize: projectData.canvasSize, // Apply the loaded canvasSize
        frames: editorState.frames,
        layers: editorState.layers,
        animationObjects: editorState.animationObjects,
        currentFrameIndex: editorState.currentFrameIndex,
        currentLayerIndex: editorState.currentLayerIndex,
        selectedLayerId: editorState.layers.length > 0 ? editorState.layers[0].id : null,
        // Viewport-Einstellungen wiederherstellen
        blockedPixels: projectData.blockedPixels || {},
        subRectangles: projectData.subRectangles || []
      });
      
      // Using setTimeout to avoid UI freezing
      setTimeout(() => {
        // Sicherstellen, dass der Projektmanager geschlossen wird
        setShowProjectManager(false);
        alert(`Projekt erfolgreich geladen: ${projectData.projectName || 'Unbenanntes Projekt'}`);
        
        // Signal end of project loading
        onProjectLoadEnd?.();
      }, 100);
    } catch (error: unknown) {
      console.error('Error loading project:', error);
      alert(`Fehler beim Laden des Projekts: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      
      // Signal end of project loading even on error
      onProjectLoadEnd?.();
    }
  };
  
  // Funktion zum Verarbeiten eines ausgewählten Projekts aus dem ProjectManager
  const handleProjectSelected = (projectFile: ProjectFile) => {
    // Projekt-Handle zum Laden verwenden
    try {
      console.log('Projekt zum Laden ausgewählt:', projectFile.name);
      loadProjectFromFile(projectFile.handle);
    } catch (error) {
      console.error('Fehler beim Verarbeiten des ausgewählten Projekts:', error);
      alert(`Fehler beim Laden des Projekts: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  // Load project history and directory from local storage on component mount
  useEffect(() => {
    // Load project history from local storage
    const localHistory = loadProjectHistoryFromLocalStorage();
    if (localHistory) {
      setProjectHistory(localHistory);
    }
    
    // Versuche das zuletzt verwendete Verzeichnis zu laden
    const loadLastDirectory = async () => {
      try {
        const directory = await getLastUsedDirectory();
        if (directory) {
          // Verwende den Callback, um das Verzeichnis in der übergeordneten Komponente zu aktualisieren
          if (onDirectoryChange) {
            onDirectoryChange(directory);
          }
          console.log('Letztes Projektverzeichnis geladen:', directory.name);
        }
      } catch (error) {
        console.error('Fehler beim Laden des letzten Projektverzeichnisses:', error);
        // Keine Alert-Meldung hier, da dies beim Laden der Komponente passiert
      }
    };
    
    loadLastDirectory();
  }, [onDirectoryChange]);
  
  // Verbesserte Funktion zum Aktualisieren des Projektverzeichnisses
  const updateProjectDirectory = async () => {
    if (!projectDirectory && onDirectoryChange) {
      try {
        const lastDir = await getLastUsedDirectory();
        if (lastDir) {
          onDirectoryChange(lastDir);
          console.log('Projektverzeichnis aktualisiert:', lastDir.name);
        }
      } catch (error) {
        console.error('Fehler bei der Aktualisierung des Projektverzeichnisses:', error);
      }
    }
  };

  // Handle version history display
  const handleShowVersionHistory = () => {
    if (!projectHistory) {
      alert('Keine Versionshistorie verfügbar. Erstellen Sie zuerst einen Snapshot oder speichern Sie das Projekt.');
      return;
    }
    
    setShowVersionHistory(true);
  };
  
  // Handle version selection
  const handleVersionSelect = (versionId: string) => {
    if (!projectHistory) return;
    
    try {
      // Signal start of project loading
      onProjectLoadStart?.();
      const updatedProjectHistory = switchToVersion(projectHistory, versionId);
      if (!updatedProjectHistory) {
        alert('Version konnte nicht geladen werden.');
        return;
      }
      
      setProjectHistory(updatedProjectHistory);
      
      const selectedVersion = getVersionById(updatedProjectHistory, versionId);
      if (!selectedVersion) return;
      
      const versionData = selectedVersion.data;
      
      // Update canvas size
      setCanvasSize(
        versionData.canvasSize.width,
        versionData.canvasSize.height
      );
      
      // Update project name
      setProjectName(versionData.projectName || 'Level 1');
      setTempProjectName(versionData.projectName || 'Level 1');
      
      // Update store state
      const storeState = useEditorStore.getState();
      
      // Create new layers
      const newLayers = versionData.layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked
      }));
      
      // Create new frames
      const newFrames = versionData.frames.map(frame => ({
        id: frame.id,
        duration: frame.duration,
        layerData: {...frame.layerData},
        isSuperFrameMember: frame.isSuperFrameMember,
        superFrameId: frame.superFrameId
      }));
      
      // Update state
      useEditorStore.setState({
        ...storeState,
        layers: newLayers,
        frames: newFrames,
        animationObjects: versionData.animationObjects || [],
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        selectedLayerId: newLayers.length > 0 ? newLayers[0].id : null,
        // Viewport-Einstellungen wiederherstellen
        blockedPixels: versionData.blockedPixels || {},
        subRectangles: versionData.subRectangles || [],
        // Variations wiederherstellen
        variations: versionData.variations || [],
        currentVariationId: versionData.currentVariationId || null,
        mainProjectState: versionData.mainProjectState || null
      });
      
      // Using setTimeout to avoid UI freezing
      setTimeout(() => {
        alert(`Version vom ${new Date(selectedVersion.timestamp).toLocaleString()} geladen`);
        
        // Signal end of project loading
        onProjectLoadEnd?.();
      }, 100);
    } catch (error) {
      console.error('Fehler beim Laden der Version:', error);
      alert('Es ist ein Fehler beim Laden der Version aufgetreten.');
      
      // Signal end of project loading even on error
      onProjectLoadEnd?.();
    }
  };

  // Funktion zum Erstellen eines Snapshots
  const handleCreateSnapshot = () => {
    setSnapshotDialogOpen(true);
  };
  
  // Funktion zum Speichern eines Snapshots mit Beschreibung
  const handleSaveSnapshot = () => {
    if (isCreatingSnapshot) return; // Prevent multiple calls
    
    try {
      setIsCreatingSnapshot(true);
      
      const description = snapshotDescription.trim() !== '' 
        ? snapshotDescription 
        : `Snapshot vom ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      
      // Use a setTimeout to avoid blocking UI
      setTimeout(() => {
        try {
          const editorState = useEditorStore.getState();
          const newProjectHistory = createAndSaveSnapshot(
            {
              canvasSize,
              frames,
              layers: editorState.layers,
              animationObjects,
              projectName: tempProjectName,
              variations: editorState.variations,
              currentVariationId: editorState.currentVariationId,
              mainProjectState: editorState.mainProjectState,
              blockedPixels: editorState.blockedPixels,
              subRectangles: editorState.subRectangles
            },
            projectHistory,
            description
          );
          
          setProjectHistory(newProjectHistory);
          setSnapshotDialogOpen(false);
          setSnapshotDescription('');
          
          // Feedback für den Benutzer
          alert('Snapshot erstellt und lokal gespeichert');
        } catch (err) {
          console.error('Fehler beim Erstellen des Snapshots:', err);
          alert('Fehler beim Erstellen des Snapshots. Versuchen Sie es mit weniger Frames oder Ebenen.');
        } finally {
          setIsCreatingSnapshot(false);
        }
      }, 100);
    } catch (error) {
      console.error('Fehler beim Initiieren des Snapshot-Prozesses:', error);
      setIsCreatingSnapshot(false);
      alert('Fehler beim Erstellen des Snapshots');
    }
  };

  // Neue Handler für das Bearbeiten des Projektnamens
  const handleProjectNameBlur = () => {
    if (tempProjectName.trim() !== '') {
      setProjectName(tempProjectName.trim());
    } else {
      setTempProjectName(projectName);
    }
    setIsEditingProjectName(false);
  };

  const handleProjectNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleProjectNameBlur();
    } else if (e.key === 'Escape') {
      setTempProjectName(projectName);
      setIsEditingProjectName(false);
    }
  };

  // Funktion zum Aktualisieren des Hauptzustands
  const handleUpdateMainState = () => {
    updateMainState();
    alert('Hauptzustand aktualisiert');
  };

  // Funktion zum Hinzufügen einer neuen Variation
  const handleAddVariation = () => {
    // Einfaches Prompt zum Eingeben des Namens der neuen Variation
    const variationName = prompt('Name für die neue Variation:');
    if (variationName && variationName.trim() !== '') {
      // Erstelle neue Variation mit dem eingegebenen Namen
      useEditorStore.getState().createVariation(variationName.trim());
    }
  };

  // --- Temporarily comment out unused/broken canvas size dialog logic --- 
  /*
  const [showCanvasSizeDialog, setShowCanvasSizeDialog] = useState(false);
  const [newCanvasSize, setNewCanvasSize] = useState({
    originalWidth: canvasSize.originalWidth,
    originalHeight: canvasSize.originalHeight
  });

  const toggleCanvasSizeDialog = () => {
    setShowCanvasSizeDialog(!showCanvasSizeDialog);
    if (!showCanvasSizeDialog) {
      setNewCanvasSize({
        originalWidth: canvasSize.originalWidth,
        originalHeight: canvasSize.originalHeight
      });
    }
  };

  const handleCanvasSizeChange = () => {
    // This needs a dedicated store action if only original size should change
    // setOriginalCanvasSize(
    //   newCanvasSize.originalWidth,
    //   newCanvasSize.originalHeight
    // );
    setShowCanvasSizeDialog(false);
  };
  */
  // --- End of commented out section ---

  const updateVariation = useEditorStore(state => state.updateCurrentVariation);
  const undo = useEditorStore(state => state.undo);
  const redo = useEditorStore(state => state.redo);

  // Function to handle undo
  const handleUndo = () => {
    undo();
  };

  // Function to handle redo
  const handleRedo = () => {
    redo();
  };

  const handleCheckPixelInconsistencies = () => {
    checkForPixelNumberInconsistencies();
  };

  return (
    <div className="menu-bar">
      <div className="menu-bar-left">
        <div className="project-name-container">
          {isEditingProjectName ? (
            <input
              type="text"
              value={tempProjectName}
              onChange={(e) => setTempProjectName(e.target.value)}
              onBlur={handleProjectNameBlur}
              onKeyDown={handleProjectNameKeyDown}
              autoFocus
              className="project-name-input"
            />
          ) : (
            <div className="project-name" onClick={() => setIsEditingProjectName(true)}>
              {projectName}
            </div>
          )}
        </div>

        {/* Undo/Redo buttons */}
        <div className="menu-bar-history-controls">
          <button 
            onClick={handleUndo} 
            title="Rückgängig (Cmd+Z / Ctrl+Z)"
            className="menu-button"
          >
            <ArrowsClockwise style={{ transform: 'scaleX(-1)' }} />
          </button>
          <button 
            onClick={handleRedo} 
            title="Wiederherstellen (Cmd+Shift+Z / Cmd+Y / Ctrl+Shift+Z / Ctrl+Y)"
            className="menu-button"
          >
            <ArrowsClockwise />
          </button>
        </div>
        
        {/* Variationsanzeige und Navigation */}
        <div className="variation-navigation">
          <button
            className="icon-button"
            onClick={switchToPreviousVariation}
            title="Vorherige Variation"
          >
            <CaretLeft size={20} />
          </button>
          
          <div className="variation-indicator">
            {currentVariationId ? (
              <span className="variation-name" title="Aktive Variation">
                {getCurrentVariationName()}
              </span>
            ) : (
              <span className="main-project-name" title="Hauptprojektzustand">
                Hauptzustand
              </span>
            )}
          </div>
          
          <button
            className="icon-button"
            onClick={switchToNextVariation}
            title="Nächste Variation"
          >
            <CaretRight size={20} />
          </button>
          
          {/* Button zum Hinzufügen einer neuen Variation */}
          <button
            className="icon-button add-variation-button"
            onClick={handleAddVariation}
            title="Neue Variation hinzufügen"
          >
            <PlusCircle size={20} />
          </button>
          
          {currentVariationId ? (
            <>
              <button
                className="icon-button update-variation-button"
                onClick={handleUpdateVariation}
                title="Aktuelle Variation aktualisieren"
              >
                <ArrowsClockwise size={20} />
              </button>
              <button
                className="icon-button update-main-button"
                onClick={handleUpdateMainState}
                title="Hauptzustand aktualisieren"
              >
                <HouseLine size={20} />
              </button>
            </>
          ) : null}
        </div>
      </div>
      
      <div className="menu-bar-center">
        <div className="toolbar-group">
          <button 
            className={`menu-button ${mode === 'EDIT' ? 'active' : ''}`}
            onClick={toggleMode}
            title="Edit Mode"
          >
            <PencilSimple size={24} />
          </button>
          <button 
            className={`menu-button ${mode === 'PREVIEW' ? 'active' : ''}`}
            onClick={toggleMode}
            title="Preview Mode"
          >
            <Play size={24} />
          </button>
        </div>
        
        <div className="toolbar-group">
          <button 
            className="menu-button zoom-button"
            onClick={zoomIn}
            title="Zoom In"
          >
            <Plus size={24} />
          </button>
          <button 
            className="menu-button zoom-button"
            onClick={zoomOut}
            title="Zoom Out"
          >
            <Minus size={24} />
          </button>
        </div>
      </div>
      
      <div className="menu-bar-right">
        <div className="menu-buttons">
          {/* Pixel Inconsistency Check Button moved here */}
          <button onClick={handleCheckPixelInconsistencies} title="Pixelnummern-Inkonsistenzen prüfen" className="menu-button">
            <WarningCircle size={24} />
          </button>
          <button
            className="menu-button"
            onClick={handleSaveProject}
            title="Save Project"
          >
            <FloppyDisk size={24} />
          </button>
          <button
            className="menu-button"
            onClick={handleLoadProject}
            title="Load Project"
          >
            <Upload size={24} />
          </button>
          <div className="dropdown">
            <button 
              className="menu-button"
              onClick={toggleExportDropdown}
              title="Export"
            >
              <ImageIcon size={24} />
            </button>
            {showExportDropdown && (
              <div className="dropdown-menu">
                <button onClick={exportCurrentFrame}>Export current frame as PNG</button>
                <button onClick={handleExportPNGs}>Export all frames as PNGs</button>
                <div className="dropdown-menu-item-with-checkbox">
                  <button onClick={handleExportPNGsWithBlackBG}>Export all frames as PNGs (black BG)</button>
                  <label className="small-checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={enableLooping}
                      onChange={() => setEnableLooping(!enableLooping)}
                    />
                    <span className="checkbox-label">Loop</span>
                  </label>
                </div>
                <button onClick={handleExportMP4Click}>Export as MP4</button>
                <button onClick={handleExportGIFClick}>Export as GIF</button>
              </div>
            )}
          </div>
          <button 
            className="menu-button"
            onClick={handleCreateSnapshot}
            title="Create Snapshot (Version)"
          >
            <BookmarkSimple size={24} />
          </button>
          <button 
            className="menu-button"
            onClick={handleShowVersionHistory}
            title="Version History"
          >
            <Clock size={24} />
          </button>
          <button 
            className="menu-button"
            onClick={() => setShowProjectManager(true)}
            title="Projektmanager öffnen"
          >
            <FolderOpen size={24} />
          </button>
        </div>
      </div>
      
      {/* Canvas Settings Modal */}
      {canvasSettingsModal.isOpen && (
        <div className="dialog-overlay">
          <div className="dialog slide-up">
            <div className="dialog-header">
              <h2 className="dialog-title">Canvas Settings</h2>
            </div>
            
            <div className="dialog-content">
              <div className="form-group">
                <label htmlFor="canvas-width">Width (px)</label>
                <input
                  id="canvas-width"
                  type="number"
                  min="1"
                  max="128"
                  value={canvasSettingsModal.width}
                  onChange={(e) => setCanvasSettingsModal({
                    ...canvasSettingsModal,
                    width: Math.max(1, Math.min(128, parseInt(e.target.value) || 0))
                  })}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="canvas-height">Height (px)</label>
                <input
                  id="canvas-height"
                  type="number"
                  min="1"
                  max="128"
                  value={canvasSettingsModal.height}
                  onChange={(e) => setCanvasSettingsModal({
                    ...canvasSettingsModal,
                    height: Math.max(1, Math.min(128, parseInt(e.target.value) || 0))
                  })}
                />
              </div>
            </div>
            
            <div className="dialog-footer">
              <button 
                onClick={() => setCanvasSettingsModal({ ...canvasSettingsModal, isOpen: false })}
              >
                Cancel
              </button>
              
              <button 
                className="primary-button"
                onClick={handleCanvasResize}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* NEW: Export Settings Dialog */} 
      {exportSettingsDialog.isOpen && (
        <div className="dialog-overlay">
          <div className="dialog slide-up" style={{ minWidth: '350px' }}> {/* Increased width */}
            <div className="dialog-header">
              <h2 className="dialog-title">Export Settings ({exportSettingsDialog.format?.toUpperCase()})</h2>
            </div>
            
            <div className="dialog-content">
              {/* Pixel Background Color Picker */}
              <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}> {/* Increased margin */}
                <label htmlFor="pixel-bg-color">Empty Pixel Color:</label>
                <input
                  id="pixel-bg-color"
                  type="color"
                  value={exportSettingsDialog.pixelBgColor}
                  onChange={(e) => setExportSettingsDialog({
                    ...exportSettingsDialog,
                    pixelBgColor: e.target.value
                  })}
                  style={{ padding: '2px', border: '1px solid #555', cursor: 'pointer' }}
                />
              </div>
              {/* Grid Line Color Picker */}
              <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}> {/* Adjusted margin */}
                <label htmlFor="grid-line-color">Grid Line Color:</label>
                <input
                  id="grid-line-color"
                  type="color"
                  value={exportSettingsDialog.gridLineColor} // Now stores base color
                  onChange={(e) => setExportSettingsDialog({
                    ...exportSettingsDialog,
                    gridLineColor: e.target.value
                  })}
                  style={{ padding: '2px', border: '1px solid #555', cursor: 'pointer' }}
                />
              </div>
              {/* Grid Line Alpha Slider */}
              <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label htmlFor="grid-line-alpha" style={{ fontSize: '0.9em', color: '#aaa' }}>└ Opacity:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    id="grid-line-alpha"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={exportSettingsDialog.gridLineAlpha}
                    onChange={(e) => setExportSettingsDialog({
                      ...exportSettingsDialog,
                      gridLineAlpha: parseFloat(e.target.value)
                    })}
                    style={{ cursor: 'pointer', flexGrow: 1 }}
                  />
                  <span style={{ fontSize: '0.9em', color: '#aaa', minWidth: '30px', textAlign: 'right' }}>
                    {Math.round(exportSettingsDialog.gridLineAlpha * 100)}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="dialog-footer">
              <button 
                onClick={() => setExportSettingsDialog({ ...exportSettingsDialog, isOpen: false })}
              >
                Cancel
              </button>
              <button 
                className="primary-button"
                onClick={handleConfirmExport}
              >
                Export {exportSettingsDialog.format?.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Export Progress */}
      {exportProgress.visible && (
        <ExportProgress 
          visible={exportProgress.visible}
          progress={exportProgress.progress} 
          status={exportProgress.status} 
          format={exportProgress.format}
          onCancel={() => {
            setExportProgress({
              ...exportProgress,
              visible: false
            });
          }}
        />
      )}
      
      {/* Snapshot Dialog */}
      {snapshotDialogOpen && (
        <div className="dialog-overlay">
          <div className="dialog slide-up">
            <div className="dialog-header">
              <h2 className="dialog-title">Snapshot erstellen</h2>
            </div>
            
            <div className="dialog-content">
              <div className="form-group">
                <label htmlFor="snapshot-description">Beschreibung (optional)</label>
                <input
                  id="snapshot-description"
                  type="text"
                  value={snapshotDescription}
                  onChange={(e) => setSnapshotDescription(e.target.value)}
                  placeholder="z.B. Vor großen Änderungen"
                  autoFocus
                />
              </div>
              <p className="dialog-info">
                Der Snapshot wird lokal im Browser gespeichert und beim nächsten Speichern der Projektdatei mitgesichert.
              </p>
            </div>
            
            <div className="dialog-footer">
              <button 
                onClick={() => {
                  setSnapshotDialogOpen(false);
                  setSnapshotDescription('');
                }}
              >
                Abbrechen
              </button>
              <button 
                className="primary-button"
                onClick={handleSaveSnapshot}
              >
                Snapshot erstellen
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Version History Dialog */}
      {showVersionHistory && projectHistory && (
        <VersionHistory
          projectHistory={projectHistory}
          onVersionSelect={handleVersionSelect}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
      
      {/* Pixel Inconsistency Modal */}
      {useEditorStore.getState().showPixelInconsistencyModal && (
        <PixelInconsistencyModal />
      )}
      
      {/* Projektmanager */}
      {showProjectManager && (
        <ProjectManager
          isOpen={true}
          onClose={() => setShowProjectManager(false)}
          onProjectLoad={handleProjectSelected}
          onDirectoryChange={(dir) => {
            if (onDirectoryChange) onDirectoryChange(dir);
          }}
          onNewProject={onNewProject} // Übergeben des onNewProject-Callbacks
        />
      )}

      {/* Loop Settings Dialog */}
      {showLoopSettings && (
        <div className="dialog-overlay">
          <div className="dialog slide-up" style={{ minWidth: '350px' }}>
            <div className="dialog-header">
              <h2 className="dialog-title">Loop-Einstellungen</h2>
            </div>
            
            <div className="dialog-content">
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label htmlFor="loop-enable">Loop aktivieren:</label>
                <input
                  id="loop-enable"
                  type="checkbox"
                  checked={enableLooping}
                  onChange={() => setEnableLooping(!enableLooping)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="loop-min-duration">Mindestdauer (Minuten):</label>
                <input
                  id="loop-min-duration"
                  type="number"
                  min="1"
                  max="60"
                  value={loopMinDuration}
                  onChange={(e) => setLoopMinDuration(Math.max(1, Math.min(60, parseInt(e.target.value) || 10)))}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="loop-start-frame">Ab Frame starten:</label>
                <input
                  id="loop-start-frame"
                  type="number"
                  min="1"
                  max={useEditorStore.getState().frames.length || 1}
                  value={loopStartFrame}
                  onChange={(e) => setLoopStartFrame(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              
              <p className="dialog-info">
                Die Loopfunktion fügt weitere Frames hinzu, wenn zwei gleiche Frames erkannt werden.
                Die Frames ab dem ausgewählten Start-Frame bis zum ersten Duplikat werden wiederholt, 
                bis die Mindestdauer erreicht ist.
              </p>
            </div>
            
            <div className="dialog-footer">
              <button 
                onClick={() => setShowLoopSettings(false)}
              >
                Abbrechen
              </button>
              
              <button 
                className="primary-button"
                onClick={handleExportWithLooping}
              >
                Mit Loop exportieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZIP Preview Modal */}
      {showZipPreviewModal && (
        <div className="dialog-overlay">
          <div className="dialog slide-up" style={{ minWidth: '350px' }}>
            <div className="dialog-header">
              <h2 className="dialog-title">ZIP Export Preview</h2>
            </div>
            <div className="dialog-content" style={{ textAlign: 'center' }}>
              {zipPreviewDataUrls.length > 0 && currentPreviewFrameIndex < zipPreviewDataUrls.length ? (
                <img
                  src={zipPreviewDataUrls[currentPreviewFrameIndex]}
                  alt={`Preview Frame ${currentPreviewFrameIndex + 1}`}
                  style={{
                    maxWidth: '100%',
                    minHeight: '150px',
                    border: '1px solid #555',
                    objectFit: 'contain',
                    backgroundColor: '#000',
                    imageRendering: 'pixelated'
                  }}
                />
              ) : (
                <p>Loading preview...</p>
              )}
              <div style={{ marginTop: '15px' }}>

                <input
                  type="range"
                  min="0"
                  max={zipPreviewDataUrls.length > 0 ? zipPreviewDataUrls.length - 1 : 0}
                  value={currentPreviewFrameIndex}
                  onChange={(e) => {
                    setCurrentPreviewFrameIndex(parseInt(e.target.value));
                    setIsPlayingPreview(false); // Pause on scrub
                  }}
                  style={{ width: '80%', cursor: 'pointer' }}
                  disabled={zipPreviewDataUrls.length === 0}
                />
                <p style={{ marginTop: '5px', fontSize: '0.9em', color: '#aaa' }}>
                  Frame {currentPreviewFrameIndex + 1} / {zipPreviewDataUrls.length}
                </p>
              </div>
            </div>
            <div className="dialog-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                <button
                  onClick={() => setIsPlayingPreview(!isPlayingPreview)}
                  disabled={zipPreviewDataUrls.length === 0}
                  style={{ marginRight: '10px' }}
                >
                  {isPlayingPreview ? <Stop size={18} /> : <Play size={18} />}
                  {isPlayingPreview ? ' Pause' : ' Play'}
                </button>
              </div>
              <div>
                <button
                  onClick={() => {
                    setShowZipPreviewModal(false);
                    setZipPreviewDataUrls([]);
                    setZipPreviewBlob(null);
                    setIsPlayingPreview(true); // Reset for next time
                  }}
                  style={{ marginRight: '10px' }}
                >
                  Cancel
                </button>
                {projectDirectory && projectDirectory.handle && (
                  <>
                    <button
                      className="secondary-button"
                      onClick={handleExportToFolderFromPreview}
                      style={{ marginRight: '10px' }}
                    >
                      Export to Folder
                    </button>
                    <button
                      className="secondary-button"
                      onClick={handleSaveZipToProjectState}
                      style={{ marginRight: '10px' }}
                      title="ZIP-Datei in Zustandsordner speichern"
                    >
                      <FolderSimplePlus size={18} />
                      Save to State
                    </button>
                  </>
                )}
                <button
                  className="secondary-button"
                  onClick={handleDownloadAndExtractZipFromPreview}
                  style={{ marginRight: '10px' }}
                  title="ZIP automatisch entpacken (kann bei vielen Dateien langsam sein)"
                >
                  Auto-Extract (⚠️)
                </button>
                <button
                  className="primary-button"
                  onClick={handleDownloadZipFromPreview}
                >
                  Download ZIP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State Selection Dialog */}
      {showStateSelectionDialog && (
        <div className="dialog-overlay">
          <div className="dialog slide-up" style={{ minWidth: '400px' }}>
            <div className="dialog-header">
              <h2 className="dialog-title">Zustand für ZIP-Export wählen</h2>
            </div>
            <div className="dialog-content">
              {!isCreatingNewState ? (
                <>
                  <div className="form-group">
                    <label>Bestehenden Zustand wählen:</label>
                    <div style={{ marginTop: '10px' }}>
                      {/* Hauptzustand Option */}
                      <div 
                        className={`state-option ${selectedStateId === null ? 'selected' : ''}`}
                        onClick={() => setSelectedStateId(null)}
                        style={{
                          padding: '10px',
                          border: selectedStateId === null ? '2px solid #4a4a8e' : '1px solid #3a3a5e',
                          borderRadius: '5px',
                          marginBottom: '8px',
                          cursor: 'pointer',
                          backgroundColor: selectedStateId === null ? '#2a2a4e' : '#1a1a2e'
                        }}
                      >
                        <strong>Hauptzustand</strong>
                        {currentVariationId === null && <span style={{ color: '#4a4a8e', marginLeft: '10px' }}>(Aktuell)</span>}
                      </div>
                      
                      {/* Variationen */}
                      {variations.map((variation) => (
                        <div 
                          key={variation.id}
                          className={`state-option ${selectedStateId === variation.id ? 'selected' : ''}`}
                          onClick={() => setSelectedStateId(variation.id)}
                          style={{
                            padding: '10px',
                            border: selectedStateId === variation.id ? '2px solid #4a4a8e' : '1px solid #3a3a5e',
                            borderRadius: '5px',
                            marginBottom: '8px',
                            cursor: 'pointer',
                            backgroundColor: selectedStateId === variation.id ? '#2a2a4e' : '#1a1a2e'
                          }}
                        >
                          <strong>{variation.name}</strong>
                          {currentVariationId === variation.id && <span style={{ color: '#4a4a8e', marginLeft: '10px' }}>(Aktuell)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '15px' }}>
                    <button 
                      onClick={() => setIsCreatingNewState(true)}
                      style={{ 
                        background: 'none', 
                        border: '1px dashed #4a4a8e', 
                        color: '#4a4a8e', 
                        padding: '8px 15px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      + Neuen Zustand erstellen
                    </button>
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label htmlFor="new-state-name">Name des neuen Zustands:</label>
                  <input
                    id="new-state-name"
                    type="text"
                    value={newStateName}
                    onChange={(e) => setNewStateName(e.target.value)}
                    placeholder="z.B. Version_1, Final, Test..."
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleConfirmSaveZipToState();
                      } else if (e.key === 'Escape') {
                        setIsCreatingNewState(false);
                      }
                    }}
                    autoFocus
                  />
                  <button 
                    onClick={() => setIsCreatingNewState(false)}
                    style={{ 
                      marginTop: '10px',
                      background: 'none', 
                      border: 'none', 
                      color: '#aaa', 
                      cursor: 'pointer',
                      fontSize: '0.9em'
                    }}
                  >
                    ← Zurück zur Auswahl
                  </button>
                </div>
              )}
              
              <p className="dialog-info" style={{ marginTop: '15px', fontSize: '0.9em', color: '#aaa' }}>
                Die ZIP-Datei wird im Projektordner unter "{projectName || 'animation'}/[Zustandsname]/" gespeichert.
                Bestehende Dateien werden überschrieben.
              </p>
            </div>
            <div className="dialog-footer">
              <button 
                onClick={() => {
                  setShowStateSelectionDialog(false);
                  setIsCreatingNewState(false);
                  setNewStateName('');
                }}
                style={{ marginRight: '10px' }}
              >
                Abbrechen
              </button>
              <button 
                className="primary-button"
                onClick={handleConfirmSaveZipToState}
                disabled={isCreatingNewState ? !newStateName.trim() : selectedStateId === undefined}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuBar;
