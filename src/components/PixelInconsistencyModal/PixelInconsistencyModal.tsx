import React, { useState, useSyncExternalStore, useCallback, useRef } from 'react'; // Import useRef
import editorStoreInstance, { EditorState } from '../../store/editorStore';
import { shallow } from 'zustand/shallow';
import type { PixelInconsistency } from '../../types';
import './PixelInconsistencyModal.css';

// Define an interface for the selected part of the state
interface SelectedPixelInfoState { // Renamed for clarity
  pixelInconsistencies: PixelInconsistency[];
  showPixelInconsistencyModal: boolean;
  projectPixelNumbers: number[];
  projectUniquePixelNumbersCount: number;
  // Actions are not directly selected here anymore, but obtained from store instance
}

const PixelInconsistencyModal: React.FC = () => {
  // Define the selector function with explicit input and output types
  const selectPixelInfo = (state: EditorState): SelectedPixelInfoState => ({ // Renamed selector
    pixelInconsistencies: state.pixelInconsistencies,
    showPixelInconsistencyModal: state.showPixelInconsistencyModal,
    projectPixelNumbers: state.projectPixelNumbers,
    projectUniquePixelNumbersCount: state.projectUniquePixelNumbersCount,
  });

  // Actions are stable and can be destructured directly from the store instance.
  const { setPixelInconsistencyModalVisibility, resolvePixelNumberInconsistency, resolveAllPixelNumberInconsistencies, checkForPixelNumberInconsistencies } = editorStoreInstance.getState();

  // Subscribe to only the necessary data parts for rendering, applying shallow comparison.
  const selectedDataRef = useRef<ReturnType<typeof selectPixelInfo> | null>(null); // Use new selector type

  const pixelInfo = useSyncExternalStore( // Renamed for clarity
    editorStoreInstance.subscribe,
    useCallback(() => {
      const newStateSlice = selectPixelInfo(editorStoreInstance.getState()); // Use new selector
      if (selectedDataRef.current && shallow(selectedDataRef.current, newStateSlice)) {
        return selectedDataRef.current;
      }
      selectedDataRef.current = newStateSlice;
      return newStateSlice;
    }, []),
    useCallback(() => selectPixelInfo(editorStoreInstance.getState()), []) // Use new selector
  );
  
  // Local state to manage the target number for a specific inconsistency
  const [targetNumbers, setTargetNumbers] = useState<Record<string, string>>({}); // Key: "superFrameId-x-y", Value: target number as string

  // Trigger inconsistency check and stats calculation when modal is shown
  React.useEffect(() => {
    if (pixelInfo.showPixelInconsistencyModal) {
      checkForPixelNumberInconsistencies();
    }
  }, [pixelInfo.showPixelInconsistencyModal, checkForPixelNumberInconsistencies]);


  if (!pixelInfo.showPixelInconsistencyModal) { // Only hide if modal visibility is false
    return null;
  }

  const handleResolveSingle = (inconsistency: PixelInconsistency, targetNumStr: string | undefined) => {
    const targetNumber = targetNumStr === undefined || targetNumStr === '' ? undefined : parseInt(targetNumStr, 10);
    if (targetNumStr !== undefined && targetNumStr !== '' && isNaN(targetNumber!)) {
        alert("Bitte geben Sie eine gültige Zahl ein oder lassen Sie das Feld leer, um die Nummer zu entfernen.");
        return;
    }
    resolvePixelNumberInconsistency(inconsistency.superFrameId, inconsistency.x, inconsistency.y, targetNumber);
    // Clear the input for this specific inconsistency
    setTargetNumbers(prev => {
        const newTargets = {...prev};
        delete newTargets[`${inconsistency.superFrameId}-${inconsistency.x}-${inconsistency.y}`];
        return newTargets;
    });
  };

  const handleTargetNumberChange = (inconsistency: PixelInconsistency, value: string) => {
    setTargetNumbers(prev => ({
      ...prev,
      [`${inconsistency.superFrameId}-${inconsistency.x}-${inconsistency.y}`]: value,
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Pixelnummern-Überprüfung</h2>

        <div className="pixel-stats-section">
          <h4>Projektweite Pixelnummern-Statistik:</h4>
          <p>Anzahl eindeutiger Pixelnummern: {pixelInfo.projectUniquePixelNumbersCount}</p>
          <p>Alle vergebenen Nummern (sortiert):</p>
          <div className="pixel-number-list">
            {pixelInfo.projectPixelNumbers.length > 0 ? pixelInfo.projectPixelNumbers.join(', ') : 'Keine Nummern vergeben.'}
          </div>
        </div>
        
        {pixelInfo.pixelInconsistencies.length > 0 && (
          <>
            <h3>Pixelnummern-Inkonsistenzen gefunden</h3>
            <p>Einige Pixel haben unterschiedliche Nummern über Frames desselben Superframes hinweg.</p>
            {pixelInfo.pixelInconsistencies.length > 1 && (
              <div className="resolve-all-section">
                  <h4>Alle Inkonsistenzen beheben:</h4>
                  <button onClick={() => resolveAllPixelNumberInconsistencies('keepFirst')}>
                      Erste gefundene Nummer für jedes Pixel behalten
                  </button>
                  <button onClick={() => resolveAllPixelNumberInconsistencies('keepMostFrequent')}>
                      Häufigste Nummer für jedes Pixel behalten
                  </button>
                  <button onClick={() => resolveAllPixelNumberInconsistencies('clearAll')}>
                      Alle inkonsistenten Nummern entfernen
                  </button>
              </div>
            )}

            <div className="inconsistency-list">
              {pixelInfo.pixelInconsistencies.map((inc, index) => (
                <div key={index} className="inconsistency-item">
                  <p>
                    Superframe ID: {inc.superFrameId}, Pixel: ({inc.x}, {inc.y})
                  </p>
                  <p>
                    Gefundene Nummern: {inc.pixelNumbers.map(n => n === undefined ? 'Keine' : n).join(', ')}
                  </p>
                  <p>
                    In Frames: {inc.frameIds.join(', ')}
                  </p>
                  <div className="resolve-single-section">
                    <input
                      type="number"
                      placeholder="Zielnummer (leer für keine)"
                      value={targetNumbers[`${inc.superFrameId}-${inc.x}-${inc.y}`] || ''}
                      onChange={(e) => handleTargetNumberChange(inc, e.target.value)}
                    />
                    <button onClick={() => handleResolveSingle(inc, targetNumbers[`${inc.superFrameId}-${inc.x}-${inc.y}`])}>
                      Diese Inkonsistenz beheben
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {pixelInfo.pixelInconsistencies.length === 0 && (
          <p>Keine Inkonsistenzen bei Pixelnummern gefunden.</p>
        )}

        <button onClick={() => setPixelInconsistencyModalVisibility(false)} className="close-button">
          Schließen
        </button>
      </div>
    </div>
  );
};

// Helper selector, renamed and updated
const selectPixelInfo = (state: EditorState): SelectedPixelInfoState => ({
  pixelInconsistencies: state.pixelInconsistencies,
  showPixelInconsistencyModal: state.showPixelInconsistencyModal,
  projectPixelNumbers: state.projectPixelNumbers,
  projectUniquePixelNumbersCount: state.projectUniquePixelNumbersCount,
});

export default PixelInconsistencyModal;