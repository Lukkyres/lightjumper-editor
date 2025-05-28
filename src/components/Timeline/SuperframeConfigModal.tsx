import React, { useState, useEffect, useCallback } from 'react';
import useEditorStore from '../../store/editorStore';
import { Frame } from '../../types';
import './Timeline.css'; // Reuse timeline dialog styles

interface SuperframeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFrames: Frame[];
  superFrameId?: string;
}

const SuperframeConfigModal: React.FC<SuperframeConfigModalProps> = ({
  isOpen,
  onClose,
  initialFrames,
  superFrameId,
}) => {
  const { setSuperFrameDuration, resizeSuperFrame } = useEditorStore();

  // Calculate initial values from the first frame
  const initialDuration = initialFrames[0]?.duration || 100;
  const initialFrameCount = initialFrames.length;
  const initialFps = initialDuration > 0 ? 1000 / initialDuration : 30; // Default to 30 FPS if duration is 0
  const initialTotalLength = initialFrameCount * initialDuration / 1000;

  // State for the configurable parameters
  const [totalLengthSeconds, setTotalLengthSeconds] = useState<number>(initialTotalLength);
  const [fps, setFps] = useState<number>(initialFps);
  const [frameCount, setFrameCount] = useState<number>(initialFrameCount);

  // Derived state (read-only display)
  const [durationPerFrame, setDurationPerFrame] = useState<number>(initialDuration);

  // Recalculate when initialFrames change (e.g., opening modal for different superframe)
  useEffect(() => {
    const newInitialDuration = initialFrames[0]?.duration || 100;
    const newInitialFrameCount = initialFrames.length;
    const newInitialFps = newInitialDuration > 0 ? 1000 / newInitialDuration : 30;
    const newInitialTotalLength = newInitialFrameCount * newInitialDuration / 1000;

    setTotalLengthSeconds(newInitialTotalLength);
    setFps(newInitialFps);
    setFrameCount(newInitialFrameCount);
    setDurationPerFrame(newInitialDuration);
  }, [initialFrames]);

  // --- Input Handlers and Recalculation Logic --- 

  const handleTotalLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = Math.max(0.1, parseFloat(e.target.value) || 0.1);
    setTotalLengthSeconds(newLength);
    // Recalculate Frame Count and Duration
    const newFrameCount = Math.max(1, Math.round(newLength * fps));
    const newDuration = fps > 0 ? Math.max(20, Math.round(1000 / fps)) : 100; // Keep duration based on FPS
    setFrameCount(newFrameCount);
    setDurationPerFrame(newDuration);
  };

  const handleFpsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFps = Math.max(1, parseFloat(e.target.value) || 1);
    setFps(newFps);
    // Recalculate Frame Count and Duration
    const newFrameCount = Math.max(1, Math.round(totalLengthSeconds * newFps));
    const newDuration = newFps > 0 ? Math.max(20, Math.round(1000 / newFps)) : 100;
    setFrameCount(newFrameCount);
    setDurationPerFrame(newDuration);
  };

  const handleFrameCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrameCount = Math.max(1, parseInt(e.target.value) || 1);
    setFrameCount(newFrameCount);
    // Recalculate Total Length and Duration
    const newLength = fps > 0 ? Math.max(0.1, newFrameCount / fps) : 0.1;
    const newDuration = fps > 0 ? Math.max(20, Math.round(1000 / fps)) : 100; // Keep duration based on FPS
    setTotalLengthSeconds(newLength);
    setDurationPerFrame(newDuration);
  };


  // --- Save Handler --- 
  const handleSave = () => {
    if (superFrameId) {
      // 1. Resize the superframe (add/remove frames)
      resizeSuperFrame(superFrameId, frameCount);
      // 2. Update the duration for all frames in the superframe
      //    (Need to get potentially new frame IDs after resize)
      //    We'll update the duration based on the *current* modal state.
      setSuperFrameDuration(superFrameId, durationPerFrame); 
    }
    onClose();
  };

  if (!isOpen || !superFrameId) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog count-dialog slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">Superframe Config (ID: ...{superFrameId.slice(-4)})</h2>
        </div>
        
        <div className="dialog-content">
          {/* Total Length Input */}
          <div className="form-group">
            <label htmlFor="superframe-length">Total Length (s)</label>
            <input
              id="superframe-length"
              type="number"
              min="0.1"
              step="0.1"
              value={totalLengthSeconds.toFixed(2)}
              onChange={handleTotalLengthChange}
              autoFocus
            />
          </div>

          {/* FPS Input */}
          <div className="form-group">
            <label htmlFor="superframe-fps">FPS (Frames Per Second)</label>
            <input
              id="superframe-fps"
              type="number"
              min="1"
              step="1"
              value={fps.toFixed(1)}
              onChange={handleFpsChange}
            />
          </div>

          {/* Frame Count Input */}
          <div className="form-group">
            <label htmlFor="superframe-frames">Number of Frames</label>
            <input
              id="superframe-frames"
              type="number"
              min="1"
              step="1"
              value={frameCount}
              onChange={handleFrameCountChange}
            />
          </div>

          {/* Display Calculated Duration */}
          <div className="info-group">
            <span>Calculated Duration per Frame:</span>
            <span>{durationPerFrame}ms</span>
          </div>
         
        </div>
        
        <div className="dialog-footer">
          <button onClick={onClose}>Cancel</button>
          {/* Updated Save Button Text */}
          <button className="primary-button" onClick={handleSave}>Apply Changes</button>
        </div>
      </div>
    </div>
  );
};

export default SuperframeConfigModal; 