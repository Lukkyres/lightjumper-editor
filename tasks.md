# Feature: Viewport Sub-Rectangles

Dieses Feature ermöglicht das Zeichnen und Benennen von benannten Unterrechtecken (Sub-Rectangles) innerhalb des Viewport-Tools.

## Aufgabenliste

- [X] **1. State Management einrichten:**
  - [X] Neuen State `isDrawingSubRectangle` (boolean) im `useEditorStore` hinzufügen, um den Zeichnen-Modus zu verfolgen.
  - [X] Neuen State `subRectangles` (Array von `{ id: string, name: string, x: number, y: number, width: number, height: number }`) im `useEditorStore` hinzufügen, um die gezeichneten Rechtecke zu speichern.
  - [X] Entsprechende Aktionen (`toggleSubRectangleDrawing`, `addSubRectangle`, `updateSubRectangleName`, `deleteSubRectangle`) im Store definieren.
- [X] **2. UI-Button im Viewport Panel:**
  - [X] Einen neuen Button "Unter-Rechteck zeichnen" (o.ä.) zum `Viewport-Presets-Panel` in `App.tsx` hinzufügen.
  - [X] Dieser Button soll die `toggleSubRectangleDrawing`-Aktion aus dem Store aufrufen.
  - [X] Den Button-Zustand visuell hervorheben, wenn `isDrawingSubRectangle` aktiv ist.
- [X] **3. Canvas-Zeichenlogik:**
  - [X] Die `Canvas`-Komponente (`Canvas.tsx`) erweitern, um `isDrawingSubRectangle` als Prop zu erhalten.
  - [X] Event-Handler (`handleMouseDown`, `handleMouseMove`, `handleMouseUp`) anpassen:
    - Wenn `isDrawingSubRectangle` aktiv ist, das Zeichnen eines neuen Rechtecks starten/verfolgen/beenden.
    - Ein temporäres Rechteck während des Ziehens visuell darstellen.
    - Nach `handleMouseUp` die `addSubRectangle`-Aktion mit den Koordinaten und einem Standardnamen (z.B. "Neues Rechteck") aufrufen.
- [X] **4. Sub-Rechtecke auf Canvas anzeigen:**
  - [X] Die `Canvas`-Komponente erweitern, um die `subRectangles`-Liste als Prop zu erhalten.
  - [X] Innerhalb der `drawCanvas`-Funktion (oder einer separaten Zeichenfunktion) alle Rechtecke aus `subRectangles` auf dem Canvas visualisieren (z.B. mit einem dünnen, farbigen Rahmen und dem Namen).
- [X] **5. Liste der Sub-Rechtecke im Viewport Panel:**
  - [X] Eine neue Komponente `SubRectangleList` (oder ähnlich) erstellen.
  - [X] Diese Komponente in das `Viewport-Presets-Panel` in `App.tsx` integrieren.
  - [X] Die Liste soll die `subRectangles` aus dem Store anzeigen.
  - [X] Jedes Listenelement soll Folgendes enthalten:
    - Ein Inline-Textfeld (`<input type="text">`), um den Namen des Rechtecks anzuzeigen und zu bearbeiten. Bei Änderung soll `updateSubRectangleName` aufgerufen werden.
    - Einen Löschen-Button, der `deleteSubRectangle` für das entsprechende Rechteck aufruft.
- [X] **6. Styling und Feinschliff:**
  - [X] CSS-Stile für den neuen Button, die Liste und die Canvas-Darstellung der Rechtecke hinzufügen/anpassen (`App.css`, `Canvas.css`).
  - [X] Sicherstellen, dass die Funktionalität nur im Viewport-Modus verfügbar ist.
- [X] **7. Testing:**
  - [X] Alle Schritte gründlich testen: Zeichnen, Benennen, Löschen, Anzeige auf Canvas, Verhalten bei Moduswechsel.

# Feature: Viewport Preset Preview

Dieses Feature zeigt eine visuelle Vorschau für gespeicherte Viewport-Presets.

## Aufgabenliste

- [X] **1. Datenstruktur anpassen:**
  - [X] Feld `previewDataUrl: string` zum `ViewportPreset`-Typ im `useEditorStore` hinzufügen.
- [X] **2. Vorschau-Generierung implementieren:**
  - [X] Logik in `addViewportPreset` (`editorStore.ts`) hinzufügen, um beim Speichern ein Vorschaubild auf einem temporären Canvas zu erzeugen.
  - [X] Viewport, Sub-Rectangles und Blocked Pixels proportional auf das Vorschau-Canvas zeichnen.
  - [X] Canvas-Inhalt als Data-URL in `previewDataUrl` speichern.
- [X] **3. Vorschau in UI anzeigen:**
  - [X] `ViewportPresetTile`-Komponente anpassen.
  - [X] Einen Container (`.preset-preview-area`) für die Vorschau hinzufügen.
  - [X] `<img>`-Element hinzufügen, das `previewDataUrl` als Quelle nutzt.
  - [X] Platzhaltertext anzeigen, wenn keine Vorschau vorhanden ist.
- [X] **4. Styling hinzufügen:**
  - [X] CSS-Regeln für `.preset-preview-area` und `.preset-preview-image` in `ViewportPresetTile.css` definieren.
- [ ] **5. Debugging & Fertigstellung:**
  - [ ] Problem beheben, dass aktuell keine Vorschauen angezeigt werden (vermutlich Caching/Build-Problem).
  - [ ] Funktionalität gründlich testen.

# Feature: Export-Überarbeitung

Verbesserungen und Änderungen an den PNG-, MP4- und GIF-Exportfunktionen.

## Aufgabenliste


[ ] **1. PNG-Export: Vollständig blockierte Zeilen/Spalten entfernen**

- [X] Analyse-Logik entwickeln: Vor dem Export identifizieren, welche Zeilen und Spalten *ausschließlich* blockierte Pixel enthalten.
- [X] Mapping erstellen: Eine Zuordnung von ursprünglichen Koordinaten zu neuen Zielkoordinaten für die *nicht* blockierten Zeilen/Spalten berechnen.
- [X] PNG-Generierung anpassen: Ein neues Bild mit den reduzierten Dimensionen erstellen. Pixel von den *nicht* blockierten Zeilen/Spalten des Originals an die entsprechenden *neuen* Positionen im Zielbild kopieren, basierend auf dem Mapping.
- [X] Sicherstellen, dass die resultierende PNG-Datei die korrekten (kleineren) Dimensionen hat und die Pixel korrekt "zusammengerückt" sind.
- [X] **2. MP4/GIF-Export: Transparenz für blockierte Pixel**

  - [X] Export-Logik identifizieren (wahrscheinlich die Stelle, an der Frames auf einen Canvas gezeichnet oder an eine Encoding-Bibliothek übergeben werden).
  - [X] Rendering anpassen: Blockierte Pixel-Positionen beim Zeichnen der Frames überspringen oder explizit transparent machen (z.B. `clearRect` oder Alpha-Wert 0 setzen).
  - [X] Testen, ob der Video-/GIF-Hintergrund durch die Lücken sichtbar ist.
- [ ] **3. MP4-Export: 4:3 Seitenverhältnis Option**

  - [ ] UI-Element hinzufügen: Eine Checkbox oder Auswahlmöglichkeit für "4:3 Export" in den MP4-Exporteinstellungen implementieren.
  - [ ] Seitenverhältnis-Berechnung: Logik hinzufügen, um die Zieldimensionen und nötige Ränder (Padding) für 4:3 zu berechnen.
  - [ ] Exportprozess anpassen: Entweder den Frame-Canvas mit Rändern (z.B. schwarz) auf 4:3 erweitern oder entsprechende Optionen/Filter für die verwendete Video-Encoding-Bibliothek (z.B. `ffmpeg`) setzen.
  - [ ] Standard-Seitenverhältnis beibehalten, wenn die Option nicht gewählt ist.
- [ ] **4. Code-Refactoring & Testing:**

  - [ ] Bestehenden Export-Code überprüfen und ggf. refaktorisieren für bessere Wartbarkeit.
  - [ ] Alle Exportvarianten (PNG, GIF, MP4 normal, MP4 4:3) mit verschiedenen Szenarien (keine blockierten Pixel, blockierte Ränder, blockierte Pixel innen, blockierte Zeilen/Spalten) gründlich testen.
- [ ] LJP Überarbeitung

  - [ ] Viewport Einstellungen (Sub Rects, Blockpixel) sollen auch in der LJP Datei gespeichert werden

# Feature: Project Variations

This feature allows users to create and manage multiple variations of their project. Each variation is a separate, editable copy of the project state. Users can switch between these variations. Variations are saved as part of the project file.

## Aufgabenliste

- [X] **1. State Management (`editorStore.ts` & `src/types/index.ts`):**
  - [X] **1.1. Define `Variation` Type:**
    - [X] In `src/types/index.ts`, define a `Variation` interface. It should include:
      - [X] `id: string` (unique identifier)
      - [X] `name: string` (user-editable name)
      - [X] A snapshot of the core project state elements that should be unique per variation, e.g.:
        - [X] `frames: Frame[]`
        - [X] `layers: Layer[]`
        - [X] `canvasSize: CanvasSize` (evaluate if all aspects of `canvasSize`, like viewport, are per variation or global)
        - [X] `animationObjects: AnimationObject[]`
        - [X] `currentFrameIndex: number`
        - [X] `currentLayerIndex: number`
        - [X] Potentially other settings like `gridSettings`, `selection`, `lockedPixels` if they should be variation-specific. (Note: `blockedPixels` and `selection` included, `gridSettings` omitted for now)
  - [X] **1.2. Update `EditorState` (`editorStore.ts`):**
    - [X] Add `variations: Variation[]` to store an array of all defined variations for the current project.
    - [X] Add `currentVariationId: string | null` to track the ID of the currently active variation. If `null`, the main (base) project state is active.
  - [X] **1.3. Implement Core Variation Actions (`editorStore.ts`):**
    - [X] `createVariation(name: string)`:
      - [X] Gathers the current active project state (from main state if `currentVariationId` is null, or from the currently active variation).
      - [X] Creates a deep copy of this state.
      - [X] Assigns a new unique ID and the given name to form a new `Variation` object.
      - [X] Adds this new variation to the `variations` array.
      - [X] Calls `switchToVariation` to make the newly created variation active.
    - [X] `switchToVariation(targetVariationId: string | null)`:
      - [X] **Save current state**: If `currentVariationId` is not null (meaning a variation was active), update the corresponding entry in the `variations` array with the current working state from the store (e.g., `frames`, `layers`).
      - [X] **Load new state**:
        - [X] If `targetVariationId` is `null`, load the main project's original state into the working state fields of the store (e.g., `frames`, `layers`). This might involve restoring from a snapshot if the main project was previously modified and then a variation was activated, or it implies the main project state is always the "base" and variations are branched from it. This needs careful state management design. *Alternative for main state*: The main project's data always lives in the primary state fields; when no variation is active, these fields are the source. When a variation becomes active, its data is loaded into these fields. (Implemented with simplification: `null` means current state is main, no separate base restored).
        - [X] If `targetVariationId` points to an existing variation, deep copy its data from the `variations` array into the store's active working state fields.
      - [X] Update `currentVariationId` to `targetVariationId`.
      - [X] Consider implications for the undo/redo stack (e.g., clear it or manage separate stacks). (Placeholder added)
    - [X] `updateVariationName(variationId: string, newName: string)`:
      - [X] Finds the variation by `variationId` in the `variations` array and updates its `name`.
    - [X] `deleteVariation(variationId: string)`:
      - [X] Removes the variation from the `variations` array.
      - [X] If the deleted variation was the `currentVariationId`, switch to the main project state (`switchToVariation(null)`).
      - [ ] Handle the case where the last variation is deleted. (Partially addressed: switches to main project state, further specific handling TBD if needed)

- [X] **2. UI for Variation Management:**
  - [X] **2.1. Integrate Variation Management into existing Version Management Panel/Popup:**
    - [X] Identify the existing UI component for Version Management.
    - [X] Design and implement the UI for managing variations *within* this existing panel/popup. This UI will likely be contextual to the currently selected/viewed project version.
  - [X] **2.2. "Create New Variation" Functionality (within Version Management Panel/Popup):**
    - [X] Add a button (e.g., "+ New Variation for this Version") within the Version Management panel/popup, associated with the active/selected version.
    - [X] On click, prompt the user for a name for the new variation.
    - [X] Call the `createVariation` action from the store.
  - [X] **2.3. Display and Manage List of Variations (within Version Management Panel/Popup):**
    - [X] Show a list of all variations for the active/selected version.
    - [X] Provide UI to rename variations (e.g., inline edit field).
    - [X] Provide UI to delete variations.
    - [X] Provide UI to switch between variations (clicking on a variation in the list).
  - [X] **2.4. UI Indicators and Navigation for Variations:**
    - [X] Show the current active variation name in the editor UI (possibly in the top toolbar/header).
    - [X] Add navigation controls to switch between variations quickly.
    - [X] Add UI to update current variation with current state.
    - [X] Add UI to update main state with current variation state.
    - [X] Add UI to add new variations quickly.

- [X] **3. Project Save/Load Integration (`.ljp` format):**
  - [X] **3.1. Update `.ljp` File Structure:**
    - [X] Modify the project saving logic (likely in `editorStore.ts` or related export/project utilities) to include the `variations: Variation[]` array and the `currentVariationId: string | null` in the saved `.ljp` JSON file. The main project data would be at the root or as a "base" entry, with variations stored alongside.
  - [X] **3.2. Update Project Loading Logic:**
    - [X] Modify the project loading logic to:
      - [X] Read the `variations` array from the `.ljp` file and populate the `editorStore.variations` state.
      - [X] Read `currentVariationId` from the file and set it in the store.
      - [X] Ensure the editor correctly loads and displays either the main project data or the data of the `currentVariationId` when a project is opened.
  - [X] **3.3. Handle Legacy Projects:**
    - [X] Ensure projects saved before this feature (without variations data) load correctly, initializing with an empty `variations` array and `currentVariationId` as `null`.

- [X] **4. Core Logic Adjustments & Considerations:**
  - [X] **4.1. Deep Copying:**
    - [X] Ensure that robust deep copying methods are used for project state when creating variations or switching, to prevent unintended shared references between the main state and variations, or between different variations.
  - [X] **4.2. Impact on Existing Features:**
    - [X] **Export (PNG, GIF, MP4, etc.):** Exports should operate on the currently active state (main project or the active variation). This should happen naturally if export functions use the store's primary working state fields.
    - [X] **Undo/Redo:** Determine and implement a strategy. Options:
        - [X] Clear undo/redo history when switching variations (simplest).
        - [ ] Maintain separate undo/redo stacks for the main project and each variation (more complex).
    - [X] **New Project Creation:** A newly created project should start with an empty `variations` array and `currentVariationId` set to `null`.

- [ ] **5. Styling and UI/UX Refinements:**
  - [ ] Apply CSS styles to the `VariationsPanel` and its elements to match the existing editor's look and feel.
  - [ ] Ensure intuitive user interaction for creating, switching, renaming, and deleting variations.
  - [ ] Provide clear visual feedback for all variation-related actions.

- [ ] **6. Testing:**
  - [ ] **Functionality:**
    - [ ] Create variations from the main project.
    - [ ] Create variations from an existing variation.
    - [ ] Switch between main project and different variations.
    - [ ] Edit a variation and confirm changes are isolated to that variation.
    - [ ] Rename variations.
    - [ ] Delete variations (including the currently active one, and the last remaining one).
  - [ ] **Persistence:**
    - [ ] Save a project with multiple variations.
    - [ ] Close and reload the project, verifying variations and the active variation are restored correctly.
    - [ ] Load an older project file (without variations data) and ensure it opens correctly.
  - [ ] **Interactions:**
    - [ ] Test export functionality when a variation is active.
    - [ ] Test undo/redo behavior based on the implemented strategy.
    - [ ] Test behavior when creating a new project after working with variations.

# Feature: Undo/Redo for Animation Objects

This feature ensures that animation objects are properly included in the undo/redo system, allowing users to undo and redo animation object creation, updates, and deletion.

## Attempted Fixes (In Progress)

- [X] **1. Update animation object related functions:**
  - [X] Modified `pushToHistory` to create proper deep copies of state patches using `JSON.parse(JSON.stringify())`.
  - [X] Updated `addAnimationObject` to call `pushToHistory` before making changes.
  - [X] Updated `removeAnimationObject` to call `pushToHistory` before making changes.
  - [X] Updated `updateAnimationObject` to call `pushToHistory` before making changes.

- [X] **2. Extended undo/redo to handle temporary animation objects:**
  - [X] Updated `setTempAnimationObject` to use the history mechanism:
    - [X] Save current state before setting a new temporary animation object
    - [X] Save state when clearing a temporary animation object
  - [X] Updated `updateTempAnimationObject` to track changes in history.
  - [X] Updated `createTempAnimationLayer` to push state changes to history.
  - [X] Updated `removeTempAnimationLayer` to push state changes to history.

- [ ] **3. Issues to resolve:**
  - [ ] Undo/redo still doesn't properly revert animation object changes in all scenarios.
  - [ ] Investigate if animation objects are correctly restored when undoing after multiple animation operations.
  - [ ] Review history state structure to ensure animation objects are fully captured.
  - [ ] Check if any animation-related state is outside the standard EditorState type.
  - [ ] Consider refactoring to use a more comprehensive state management approach for animations.
