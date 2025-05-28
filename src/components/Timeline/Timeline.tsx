import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Plus,
  Trash,
  Copy,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FilmStrip,
  PencilSimple,
  DotsSixVertical,
} from '@phosphor-icons/react';
import useEditorStore from '../../store/editorStore';
import { Frame, Layer, PixelData } from '../../types';
import { applyAnimationsToFrames } from '../../utils/animationUtils';
import './Timeline.css';
import SuperframeConfigModal from './SuperframeConfigModal';

// Canvas pool removed - not needed for current implementation

// Simple pixel rendering for frame previews (no animations)
const renderLayerPixels = (
  ctx: CanvasRenderingContext2D,
  pixels: PixelData[],
  scale: number,
  scaledSize: number
) => {
  // Simple direct rendering without batching for maximum speed
  pixels.forEach(pixel => {
    const scaledX = Math.floor(pixel.x * scale);
    const scaledY = Math.floor(pixel.y * scale);
    ctx.fillStyle = pixel.color;
    ctx.fillRect(scaledX, scaledY, scaledSize, scaledSize);
  });
};

// Optimized pixel batching for better rendering performance
const batchPixelRender = (
  ctx: CanvasRenderingContext2D,
  pixels: PixelData[],
  scale: number,
  scaledSize: number
) => {
  // Group pixels by color for batch rendering
  const pixelsByColor = new Map<string, { x: number; y: number }[]>();
  
  pixels.forEach(pixel => {
    const scaledX = Math.floor(pixel.x * scale);
    const scaledY = Math.floor(pixel.y * scale);
    
    if (!pixelsByColor.has(pixel.color)) {
      pixelsByColor.set(pixel.color, []);
    }
    pixelsByColor.get(pixel.color)!.push({ x: scaledX, y: scaledY });
  });
  
  // Render pixels in batches by color to minimize fillStyle changes
  pixelsByColor.forEach((positions, color) => {
    ctx.fillStyle = color;
    positions.forEach(({ x, y }) => {
      ctx.fillRect(x, y, scaledSize, scaledSize);
    });
  });
};

interface FrameDurationModalProps {
  currentDuration: number;
  onUpdate: (duration: number) => void;
  onClose: () => void;
}

interface CountInputModalProps {
  title: string;
  defaultValue: number;
  onSubmit: (count: number) => void;
  onClose: () => void;
}

interface SuperframeDuplicateModalProps {
  onDuplicate: (asSingleFrame: boolean) => void;
  onClose: () => void;
}

const CountInputModal = ({
  title,
  defaultValue,
  onSubmit,
  onClose
}: CountInputModalProps) => {
  const [count, setCount] = useState(defaultValue);
  
  const handleSubmit = () => {
    // Stelle sicher, dass die Anzahl als Zahl übergeben wird, nicht als String
    const countNumber = Number(count);
    onSubmit(countNumber);
    onClose();
  };
  
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog count-dialog slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">{title}</h2>
        </div>
        
        <div className="dialog-content">
          <div className="form-group">
            <label htmlFor="frame-count">Count</label>
            <input
              id="frame-count"
              type="number"
              min="1"
              max="1000"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
              autoFocus
            />
          </div>
          
          <div className="count-presets">
            <button onClick={() => setCount(3)}>3</button>
            <button onClick={() => setCount(5)}>5</button>
            <button onClick={() => setCount(10)}>10</button>
            <button onClick={() => setCount(20)}>20</button>
          </div>
        </div>
        
        <div className="dialog-footer">
          <button onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={handleSubmit}>Apply</button>
        </div>
      </div>
    </div>
  );
};

const FrameDurationModal = ({
  currentDuration,
  onUpdate,
  onClose
}: FrameDurationModalProps) => {
  const [duration, setDuration] = useState(currentDuration);
  
  const handleSubmit = () => {
    onUpdate(duration);
    onClose();
  };
  
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog duration-dialog slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">Frame Duration</h2>
        </div>
        
        <div className="dialog-content">
          <div className="form-group">
            <label htmlFor="frame-duration">Duration (ms)</label>
            <input
              id="frame-duration"
              type="number"
              min="50"
              max="10000"
              step="50"
              value={duration}
              onChange={(e) => setDuration(Math.max(50, parseInt(e.target.value) || 0))}
              autoFocus
            />
          </div>
          
          <div className="duration-presets">
            <button onClick={() => setDuration(100)}>100ms</button>
            <button onClick={() => setDuration(200)}>200ms</button>
            <button onClick={() => setDuration(500)}>500ms</button>
            <button onClick={() => setDuration(1000)}>1s</button>
          </div>
        </div>
        
        <div className="dialog-footer">
          <button onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={handleSubmit}>Apply</button>
        </div>
      </div>
    </div>
  );
};

const SuperframeDuplicateModal = ({
  onDuplicate,
  onClose
}: SuperframeDuplicateModalProps) => {
  const handleSubmit = (asSingleFrame: boolean) => {
    onDuplicate(asSingleFrame);
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog superframe-duplicate-dialog slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">Duplicate Superframe</h2>
        </div>
        
        <div className="dialog-content">
          <div className="form-group">
            <label>Duplicate as:</label>
            <div className="duplicate-options">
              <button onClick={() => handleSubmit(false)}>Multiple Frames</button>
              <button onClick={() => handleSubmit(true)}>Single Frame</button>
            </div>
          </div>
        </div>
        
        <div className="dialog-footer">
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Frame Preview Component
interface FramePreviewProps {
  frame: Frame;
  canvasSize: {
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
    viewportX: number;
    viewportY: number;
  };
  layers: Layer[];
  frames: Frame[];
  animationObjects: any[]; // Using any temporarily for simplicity
  tempAnimationObject: any | null; // Using any temporarily for simplicity
}

const FramePreview = ({ 
  frame, 
  canvasSize, 
  layers, 
  frames,
  animationObjects,
  tempAnimationObject
}: FramePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderRequestRef = useRef<number | null>(null);
  
  // PERFORMANCE FIX: Completely disable animation calculations for frame previews
  // Frame previews should only show layer data for maximum performance
  const animationPixels: PixelData[] = [];
  
  // Memoize layer pixels to avoid recalculation
  const layerPixels = useMemo(() => {
    const allLayerPixels: PixelData[] = [];
    layers.forEach((layer) => {
      if (!layer.visible) return;
      const pixels = frame.layerData[layer.id] || [];
      allLayerPixels.push(...pixels);
    });
    return allLayerPixels;
  }, [frame.layerData, layers]);
  
  // Optimized rendering with requestAnimationFrame
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Scale factor for the preview (make it smaller)
    const scale = Math.min(
      canvas.width / canvasSize.width,
      canvas.height / canvasSize.height
    );
    const scaledSize = Math.max(1, Math.floor(scale));
    
    // Only render layer pixels for maximum performance
    if (layerPixels.length > 0) {
      renderLayerPixels(ctx, layerPixels, scale, scaledSize);
    }
    
    // Animation pixels are disabled for frame previews to improve performance
    // Animations are only calculated during actual playback
  }, [layerPixels, canvasSize.width, canvasSize.height]);
  
  useEffect(() => {
    // Cancel any pending render request
    if (renderRequestRef.current) {
      cancelAnimationFrame(renderRequestRef.current);
    }
    
    // Schedule render with requestAnimationFrame for better performance
    renderRequestRef.current = requestAnimationFrame(renderFrame);
    
    return () => {
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
    };
  }, [renderFrame]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={40} 
      height={40} 
      className="frame-preview-canvas"
    />
  );
};

const Timeline = () => {
  const {
    frames,
    currentFrameIndex,
    addFrame,
    duplicateFrame,
    removeFrame,
    setCurrentFrame,
    setFrameDuration,
    defaultFrameDuration,
    setDefaultFrameDuration,
    addMultipleFrames,
    duplicateFrameMultiple,
    mode,
    toggleMode,
    layers,
    animationObjects,
    tempAnimationObject,
    selectedFrameIds,
    selectFrame,
    deselectFrame,
    toggleFrameSelection,
    selectFrameRange,
    selectAllFrames,
    clearFrameSelection,
    createSuperFrame,
    removeSuperFrame,
    duplicateSuperFrame,
    swapFrames,
    // mainSectionStartIndex, // REMOVED
    // setMainSectionStartIndex, // REMOVED
    toggleFrameSection, // <-- Fetch new action
    addStartSuperFrame // <-- Fetch new action
  } = useEditorStore();

  const hasStartupSection = useMemo(() => frames.some(frame => frame.section === 'startup'), [frames]);
  
  // Group frames by Superframe ID with performance optimization
  const groupedFrames = useMemo(() => {
    const groups: Array<{ isSuper: boolean; frames: Frame[]; superFrameId?: string }> = [];
    if (frames.length === 0) return groups;

    let currentGroup: Frame[] = [];
    let currentSuperFrameId: string | undefined = undefined;

    frames.forEach((frame, index) => {
      // Log the specific frame being processed

      
      const isSuper = !!(frame.isSuperFrameMember && frame.superFrameId);
      const superId = frame.superFrameId;

      if (index === 0) {
        // Start the first group
        currentGroup = [frame];
        currentSuperFrameId = superId;
      } else {
        const prevFrame = frames[index - 1];
        const prevIsSuper = !!(prevFrame.isSuperFrameMember && prevFrame.superFrameId);
        const prevSuperId = prevFrame.superFrameId;

        if (isSuper && prevIsSuper && superId === prevSuperId) {
          // Belongs to the same superframe group
          currentGroup.push(frame);
        } else {
          // Finish the previous group
          groups.push({
            isSuper: prevIsSuper,
            frames: currentGroup,
            superFrameId: prevSuperId
          });
          // Start a new group
          currentGroup = [frame];
          currentSuperFrameId = superId;
        }
      }

      // Add the last group after the loop finishes
      if (index === frames.length - 1) {
        groups.push({
          isSuper: isSuper,
          frames: currentGroup,
          superFrameId: currentSuperFrameId
        });
      }
    });


    return groups;
  }, [frames]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [frameDurationModal, setFrameDurationModal] = useState<{
    isOpen: boolean;
    currentDuration: number;
  }>({
    isOpen: false,
    currentDuration: 0
  });
  const [countInputModal, setCountInputModal] = useState<{
    isOpen: boolean;
    title: string;
    defaultValue: number;
    onSubmit: (count: number) => void;
  }>({
    isOpen: false,
    title: '',
    defaultValue: 0,
    onSubmit: () => {}
  });
  const [superframeModalData, setSuperframeModalData] = useState<{ frames: Frame[]; superFrameId?: string } | null>(null);
  const [superframeDuplicateModal, setSuperframeDuplicateModal] = useState<{
    isOpen: boolean;
    superFrameId: string;
  }>({
    isOpen: false,
    superFrameId: ''
  });
  
  // State für Drag & Drop
  const [draggedFrame, setDraggedFrame] = useState<{
    index: number;
    isSuperframe: boolean;
  } | null>(null);
  
  const [dropTarget, setDropTarget] = useState<{
    index: number;
    isSuperframe: boolean;
  } | null>(null);
  
  // Tastatur-Event-Handler für Cmd+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+A zur Auswahl aller Frames
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        // Überprüfen, ob der Fokus im document ist
        if (document.activeElement === document.body || 
            document.activeElement?.closest('.timeline-panel')) {
          e.preventDefault(); // Verhindern der Standard-Selektion
          selectAllFrames();

        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectAllFrames]);

  // Referenz zum zuletzt geklickten Frame für Shift-Selektion
  const lastClickedFrameRef = useRef<string | null>(null);

  // Handle frame selection
  const handleFrameClick = (index: number, e: React.MouseEvent, isGroupClick = false, groupFrames?: Frame[]) => {
    const frameId = frames[index].id;
    const targetFrameIds = isGroupClick && groupFrames ? groupFrames.map(f => f.id) : [frameId];

    if (e.shiftKey && lastClickedFrameRef.current) {
      selectFrameRange(lastClickedFrameRef.current, frameId); // Range selection might need rework for groups
      setCurrentFrame(index); 
    } else if (e.metaKey || e.ctrlKey) {
      // Toggle selection for all frames in the group if it's a group click
      if (isGroupClick) {
        const allSelected = targetFrameIds.every(id => selectedFrameIds.includes(id));
        if (allSelected) {
          targetFrameIds.forEach(id => deselectFrame(id));
        } else {
          targetFrameIds.forEach(id => selectFrame(id));
        }
      } else {
        toggleFrameSelection(frameId);
      }
      setCurrentFrame(index); 
    } else {
      // Normal click selects the group (if group click) or single frame
      clearFrameSelection();
      targetFrameIds.forEach(id => selectFrame(id));
      setCurrentFrame(index);
    }

    lastClickedFrameRef.current = frameId; // Store the first frame of the group/single frame
  };
  
  // Handle opening the frame duration modal
  const openFrameDurationModal = (duration: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFrameDurationModal({
      isOpen: true,
      currentDuration: duration
    });
  };
  
  // Handle updating frame duration
  const handleUpdateFrameDuration = (duration: number) => {
    // Update the current frame's duration
    setFrameDuration(currentFrameIndex, duration);
  };
  
  // Handle frame duplication
  const handleDuplicateFrame = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Duplicate the current frame
    duplicateFrame(currentFrameIndex);
  };
  
  // Handle frame removal
  const handleRemoveFrame = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Remove the current frame
    removeFrame(currentFrameIndex);
  };
  
  // Handle adding multiple frames
  const handleAddMultipleFrames = () => {
    setCountInputModal({
      isOpen: true,
      title: 'Add Multiple Frames',
      defaultValue: 5,
      onSubmit: (count) => {
        addMultipleFrames(count);
      }
    });
  };
  
  // Handle duplicating multiple frames
  const handleDuplicateMultipleFrames = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCountInputModal({
      isOpen: true,
      title: 'Duplicate Multiple Frames',
      defaultValue: 3,
      onSubmit: (count) => {
        duplicateFrameMultiple(currentFrameIndex, count);
      }
    });
  };
  
  // Handle creating a superframe
  // Drag and Drop Funktionen
  const handleDragStart = (e: React.DragEvent, frameIndex: number, isSuperframe: boolean) => {
    // Speichere Informationen über das gezogene Frame
    setDraggedFrame({ index: frameIndex, isSuperframe });
    
    // Setze das Drag-Image (kann optional angepasst werden)
    if (e.dataTransfer && e.currentTarget) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', frameIndex.toString());
      
      // Füge eine CSS-Klasse für visuelles Feedback hinzu
      e.currentTarget.classList.add('dragging');
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    // Prevent default to allow drop
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDragEnter = (e: React.DragEvent, frameIndex: number, isSuperframe: boolean) => {
    // Prevent default to allow drop
    e.preventDefault();
    e.stopPropagation();
    
    // Markiere das potenzielle Dropziel
    setDropTarget({ index: frameIndex, isSuperframe });
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent, targetIndex: number, isTargetSuperframe: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Stelle sicher, dass wir Drag-Informationen haben
    if (!draggedFrame) return;
    
    const { index: sourceIndex, isSuperframe: isSourceSuperframe } = draggedFrame;
    
    // Verhindere das Ablegen auf sich selbst
    if (sourceIndex === targetIndex && isSourceSuperframe === isTargetSuperframe) {
      setDropTarget(null);
      setDraggedFrame(null);
      return;
    }
    
    // Rufe die swapFrames-Funktion des Stores auf
    swapFrames(sourceIndex, targetIndex, isSourceSuperframe, isTargetSuperframe);
    
    // Zurücksetzen der Drag & Drop Zustände
    setDropTarget(null);
    setDraggedFrame(null);
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Entferne die CSS-Klasse
    if (e.currentTarget) {
      e.currentTarget.classList.remove('dragging');
    }
    
    // Zurücksetzen der Drag & Drop Zustände
    setDropTarget(null);
    setDraggedFrame(null);
  };

  const handleCreateSuperFrame = () => {
    // Define the callback for when the frame count is submitted
    const submitCallback = (count: number) => {
      // Get the current state before creating the frame
      const currentState = useEditorStore.getState();
      const initialFrameCount = currentState.frames.length;
      
      // Call the store action to create the superframe
      createSuperFrame(count); 

      // Get the state *after* the superframe is created
      const newState = useEditorStore.getState();
      const newFrames = newState.frames.slice(initialFrameCount);
      const createdSuperFrame = newFrames.find(f => f.isSuperFrameMember);

      // Open the config modal for the newly created superframe
      if (createdSuperFrame && createdSuperFrame.superFrameId) {
        const group = { 
            isSuper: true, 
            frames: newFrames.filter(f => f.superFrameId === createdSuperFrame.superFrameId), 
            superFrameId: createdSuperFrame.superFrameId 
        };
        openSuperframeConfigModal(group);
      } else {
        console.error("Couldn't find newly created superframe to open config modal.");
      }
    };

    // Open the count input modal first to ask for the number of frames
    setCountInputModal({
      isOpen: true,
      title: 'Create Superframe (Number of Frames)',
      defaultValue: 100,
      onSubmit: submitCallback // Use the callback defined above
    });
  };
  
  // Handle default frame duration change
  const handleDefaultDurationChange = () => {
    const duration = window.prompt('Enter default frame duration (ms):', defaultFrameDuration.toString());
    if (duration) {
      const newDuration = parseInt(duration);
      if (!isNaN(newDuration) && newDuration >= 50) {
        setDefaultFrameDuration(newDuration);
      }
    }
  };
  
  // Toggle play/pause
  const togglePlayPause = () => {
    if (mode === 'EDIT') {
      toggleMode();
    }
    setIsPlaying(!isPlaying);
  };
  
  // Skip to first frame
  const skipToFirstFrame = () => {
    setCurrentFrame(0);
  };
  
  // Skip to last frame
  const skipToLastFrame = () => {
    setCurrentFrame(frames.length - 1);
  };

  // Animation logic - simplified for better performance
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    let timeoutId: number | null = null;

    const playNextFrame = () => {
      const currentFrame = frames[currentFrameIndex];
      if (!currentFrame) return; // Should not happen if frames.length > 0

      // Use frame duration directly without complex calculations
      const duration = currentFrame.duration || defaultFrameDuration;

      timeoutId = window.setTimeout(() => {
        let nextFrameIndex = currentFrameIndex + 1;
        
        const startupFrames = frames.filter(f => f.section === 'startup');
        const mainFrames = frames.filter(f => f.section === 'main');
        const currentFrameIsStartup = frames[currentFrameIndex]?.section === 'startup';
        const currentFrameIsMain = frames[currentFrameIndex]?.section === 'main';

        if (currentFrameIsStartup) {
          const currentStartupIndex = startupFrames.findIndex(f => f.id === frames[currentFrameIndex].id);
          if (currentStartupIndex < startupFrames.length - 1) {
            // More startup frames to play
            const nextStartupFrame = startupFrames[currentStartupIndex + 1];
            nextFrameIndex = frames.findIndex(f => f.id === nextStartupFrame.id);
          } else {
            // Last startup frame played, move to first main frame if any
            if (mainFrames.length > 0) {
              nextFrameIndex = frames.findIndex(f => f.id === mainFrames[0].id);
            } else {
              // No main frames, stop playback
              setIsPlaying(false);
              // Stay on the last startup frame
              nextFrameIndex = currentFrameIndex;
            }
          }
        } else if (currentFrameIsMain) {
          if (mainFrames.length > 0) {
            const currentMainIndex = mainFrames.findIndex(f => f.id === frames[currentFrameIndex].id);
            if (currentMainIndex < mainFrames.length - 1) {
              // More main frames to play in the current loop
              const nextMainFrame = mainFrames[currentMainIndex + 1];
              nextFrameIndex = frames.findIndex(f => f.id === nextMainFrame.id);
            } else {
              // Last main frame played, loop back to the first main frame
              nextFrameIndex = frames.findIndex(f => f.id === mainFrames[0].id);
            }
          } else {
             // Should not happen if currentFrameIsMain is true, but as a fallback, stop.
            setIsPlaying(false);
            nextFrameIndex = currentFrameIndex;
          }
        } else {
           // Current frame has no section or an unknown section, or we are at the end of non-main frames.
           // This case implies we might have only startup frames and finished them, or an issue.
           // If there are main frames, try to jump to them. Otherwise, stop.
           if (mainFrames.length > 0) {
             nextFrameIndex = frames.findIndex(f => f.id === mainFrames[0].id);
           } else {
            setIsPlaying(false);
            nextFrameIndex = currentFrameIndex; // Stay on current
           }
        }
        
        // If, after all logic, isPlaying is false (e.g. end of startup with no main), don't proceed.
        if (!isPlaying) {
             setCurrentFrame(nextFrameIndex); // Set to the determined final frame
             return;
        }

        setCurrentFrame(nextFrameIndex);
        if (isPlaying) { // Re-check local isPlaying state
           playNextFrame();
        }
      }, duration);
    };

    playNextFrame();

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isPlaying, currentFrameIndex, frames, setCurrentFrame, defaultFrameDuration, setIsPlaying]);

  // Handle opening the superframe config modal
  const openSuperframeConfigModal = (group: { isSuper: boolean; frames: Frame[]; superFrameId?: string }) => {
    if (!group.isSuper) return; // Only open for actual superframes
    setSuperframeModalData({ frames: group.frames, superFrameId: group.superFrameId });
  };
  
  // Handle closing the superframe config modal
  const closeSuperframeConfigModal = () => {
    setSuperframeModalData(null);
  };

  // Handle opening the superframe duplicate modal
  const openSuperframeDuplicateModal = (superFrameId: string) => {
    setSuperframeDuplicateModal({
      isOpen: true,
      superFrameId
    });
  };

  // Handle closing the superframe duplicate modal
  const closeSuperframeDuplicateModal = () => {
    setSuperframeDuplicateModal({
      isOpen: false,
      superFrameId: ''
    });
  };

  // Handle duplicating a superframe
  const handleDuplicateSuperFrame = (asSingleFrame: boolean) => {
    const { superFrameId } = superframeDuplicateModal;
    duplicateSuperFrame(superFrameId, asSingleFrame);
    closeSuperframeDuplicateModal();
  };

  return (
    <div className="timeline-panel">
      <div className="timeline-header">
        <h2>Timeline</h2>
        <div className="timeline-controls">
          <button
            className="timeline-control-button"
            onClick={skipToFirstFrame}
            title="First Frame"
          >
            <SkipBack size={16} />
          </button>
          
          <button
            className="timeline-control-button play-button"
            onClick={togglePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          
          <button
            className="timeline-control-button"
            onClick={skipToLastFrame}
            title="Last Frame"
          >
            <SkipForward size={16} />
          </button>
        </div>
        
        <div className="timeline-actions">
          {!hasStartupSection && (
            <button
              className="timeline-action-button"
              onClick={addStartSuperFrame}
              title="Start hinzufügen"
            >
              Start hinzufügen
            </button>
          )}
          <button
            className="timeline-action-button"
            onClick={handleDefaultDurationChange}
            title="Set Default Duration"
          >
            {defaultFrameDuration}ms
          </button>
          
          <button
            className="timeline-action-button add-frame-button"
            onClick={addFrame}
            title="Add Frame"
          >
            <Plus size={16} />
          </button>
          
          <button
            className="timeline-action-button"
            onClick={handleAddMultipleFrames}
            title="Add Multiple Frames"
          >
            <Plus size={16} className="stacked-icon" />
          </button>
          
          <button
            className="timeline-action-button"
            onClick={handleCreateSuperFrame}
            title="Create Superframe"
          >
            <FilmStrip size={16} />
          </button>
        </div>
      </div>
      
      <div className="timeline-content">
        <div className="timeline-frames">
          {groupedFrames.map((group) => {
            // Find the original index of the first frame in the group
            const firstFrameIndex = frames.findIndex(f => f.id === group.frames[0].id);
            if (firstFrameIndex === -1) return null; // Should not happen
            
            const firstFrame = group.frames[0];
            const isGroupSelected = group.frames.every(f => selectedFrameIds.includes(f.id));
            const isActive = currentFrameIndex >= firstFrameIndex && currentFrameIndex < firstFrameIndex + group.frames.length;

            if (group.isSuper) {
              // Render Superframe Group
              return (
                <div
                  key={group.superFrameId || firstFrame.id} // Use superFrameId as key
                  className={`timeline-frame superframe-group ${isActive ? 'active' : ''} ${isGroupSelected ? 'selected' : ''} ${dropTarget?.index === firstFrameIndex && dropTarget?.isSuperframe ? 'drop-target' : ''} ${firstFrame.section === 'main' ? 'main-section-frame' : 'startup-section-frame'}`}
                  // Use handleFrameClick for selection, pass true for isGroupClick
                  onClick={(e) => handleFrameClick(firstFrameIndex, e, true, group.frames)}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, firstFrameIndex, true)}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, firstFrameIndex, true)}
                  onDragLeave={(e) => handleDragLeave(e)}
                  onDrop={(e) => handleDrop(e, firstFrameIndex, true)}
                  onDragEnd={(e) => handleDragEnd(e)}
                >
                  <div className="drag-handle">
                    <DotsSixVertical size={14} />
                  </div>
                  <span className="superframe-badge">SF ({group.frames.length})</span>
                  <div className="frame-preview">
                    <FramePreview 
                      frame={firstFrame} // Show preview of the first frame
                      canvasSize={{ 
                        width: 40, 
                        height: 40, 
                        originalWidth: 40, 
                        originalHeight: 40,
                        viewportX: 0,
                        viewportY: 0
                      }} 
                      layers={layers} 
                      frames={frames} // Pass all frames for context
                      animationObjects={animationObjects} 
                      tempAnimationObject={tempAnimationObject} 
                    />
                  </div>
                  <div className="frame-number">{firstFrameIndex + 1}..{firstFrameIndex + group.frames.length}</div>
                  <div className="frame-info">
                    <span className="frame-duration">{firstFrame.duration}ms (each)</span>
                    <button
                      className={`frame-section-toggle-button superframe-section-toggle ${firstFrame.section === 'main' ? 'is-main' : 'is-startup'}`}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent frame selection click
                        toggleFrameSection(firstFrame.id); // Toggle based on the first frame, store logic handles all members
                      }}
                      title={`Toggle Superframe to ${firstFrame.section === 'main' ? 'Startup' : 'Main'}`}
                    >
                      {firstFrame.section === 'main' ? 'M' : 'S'}
                    </button>
                    <button
                      className="superframe-edit-button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent frame selection click
                        openSuperframeConfigModal(group);
                      }}
                      title="Configure Superframe"
                    >
                      <PencilSimple size={14} />
                    </button>
                    <button
                      className="superframe-duplicate-button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent frame selection click
                        openSuperframeDuplicateModal(group.superFrameId || '');
                      }}
                      title="Duplicate Superframe"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="superframe-delete-button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent frame selection click
                        if (window.confirm('Möchtest du diesen Superframe wirklich löschen?')) {
                          removeSuperFrame(firstFrame.superFrameId || "");
                        }
                      }}
                      title="Delete Superframe"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              );
            } else {
              // Render Normal Frame
              return (
                <div
                  key={firstFrame.id}
                  className={`timeline-frame ${isActive ? 'active' : ''} ${selectedFrameIds.includes(firstFrame.id) ? 'selected' : ''} ${dropTarget?.index === firstFrameIndex && !dropTarget?.isSuperframe ? 'drop-target' : ''} ${firstFrame.section === 'main' ? 'main-section-frame' : 'startup-section-frame'}`}
                  onClick={(e) => handleFrameClick(firstFrameIndex, e)}
                  // Context menu removed, will add button later
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, firstFrameIndex, false)}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, firstFrameIndex, false)}
                  onDragLeave={(e) => handleDragLeave(e)}
                  onDrop={(e) => handleDrop(e, firstFrameIndex, false)}
                  onDragEnd={(e) => handleDragEnd(e)}
                >
                  <div className="drag-handle">
                    <DotsSixVertical size={14} />
                  </div>
                  <div className="frame-preview">
                    <FramePreview
                      frame={firstFrame}
                      canvasSize={{
                        width: 40,
                        height: 40,
                        originalWidth: 40,
                        originalHeight: 40,
                        viewportX: 0,
                        viewportY: 0
                      }}
                      layers={layers}
                      frames={frames} // Pass all frames for context
                      animationObjects={animationObjects}
                      tempAnimationObject={tempAnimationObject}
                    />
                    <div className="frame-number">{firstFrameIndex + 1}</div>
                  </div>
                  <div className="frame-info">
                    <div className="frame-duration" onClick={(e) => openFrameDurationModal(firstFrame.duration, e)}>
                      {firstFrame.duration}ms
                    </div>
                    <button
                      className={`frame-section-toggle-button ${firstFrame.section === 'main' ? 'is-main' : 'is-startup'}`}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent frame selection click
                        toggleFrameSection(firstFrame.id);
                      }}
                      title={`Toggle to ${firstFrame.section === 'main' ? 'Startup' : 'Main'}`}
                    >
                      {firstFrame.section === 'main' ? 'M' : 'S'}
                    </button>
                  </div>
                  <div className="frame-actions">
                    <button
                      className="frame-action-button"
                      onClick={(e) => handleDuplicateFrame(e)}
                      title="Duplicate Frame"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="frame-action-button"
                      onClick={(e) => handleDuplicateMultipleFrames(e)}
                      title="Duplicate Multiple Frames"
                    >
                      <Copy size={14} className="stacked-icon" />
                    </button>
                    <button
                      className="frame-action-button"
                      onClick={(e) => handleRemoveFrame(e)}
                      disabled={frames.length <= 1} // Disable might need adjustment for superframes
                      title="Delete Frame"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              );
            }
          })}
        </div>
        
        <div className="frame-controls">
          <button
            className="frame-control-button"
            onClick={() => addFrame()}
            title="Add Frame"
          >
            <Plus size={20} />
          </button>
          
          <button
            className="frame-control-button"
            onClick={handleAddMultipleFrames}
            title="Add Multiple Frames"
          >
            <Plus size={16} className="stacked-icon" />
          </button>
        </div>
      </div>
      
      {/* Frame Duration Modal */}
      {frameDurationModal.isOpen && (
        <FrameDurationModal
          currentDuration={frameDurationModal.currentDuration}
          onUpdate={handleUpdateFrameDuration}
          onClose={() => setFrameDurationModal({ ...frameDurationModal, isOpen: false })}
        />
      )}
      
      {/* Count Input Modal */}
      {countInputModal.isOpen && (
        <CountInputModal
          title={countInputModal.title}
          defaultValue={countInputModal.defaultValue}
          onSubmit={countInputModal.onSubmit}
          onClose={() => setCountInputModal({ ...countInputModal, isOpen: false })}
        />
      )}
      
      {/* Superframe Config Modal */}
      {superframeModalData && (
        <SuperframeConfigModal 
          isOpen={!!superframeModalData}
          onClose={closeSuperframeConfigModal}
          initialFrames={superframeModalData.frames}
          superFrameId={superframeModalData.superFrameId}
        />
      )}
      
      {/* Superframe Duplicate Modal */}
      {superframeDuplicateModal.isOpen && (
        <SuperframeDuplicateModal
          onDuplicate={handleDuplicateSuperFrame}
          onClose={closeSuperframeDuplicateModal}
        />
      )}
    </div>
  );
};

export default Timeline;
