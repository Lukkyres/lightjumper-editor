# Lightjumper Editor - Kontext für LLM

Dieses Dokument bietet die wichtigsten Informationen über den Lightjumper Editor, die ein LLM benötigt, um bei der Weiterentwicklung und Fehlerbehebung zu unterstützen.

## Projektüberblick

Der Lightjumper Editor ist ein pixelbasierter Animations-Editor für Level-Design im "Der Boden ist Lava"-Spiel-Stil. Er ermöglicht das Erstellen von Frame-basierten Pixel-Animationen mit mehreren Ebenen, spezialisierten Werkzeugen und Exportfunktionen.

## Technologie-Stack

- **Frontend**: React mit TypeScript
- **Build-Tool**: Vite
- **State Management**: Zustand (für globalen Store)
- **UI-Komponenten**: Eigene React-Komponenten
- **Exporte**: GIF (mit gif.js), MP4 (mit FFmpeg-wasm), PNG/ZIP

## Projektstruktur

```
lightjumper-editor/
├── src/
│   ├── components/
│   │   ├── Canvas/
│   │   ├── ContextBar/       # Kontextabhängige Tool-Einstellungen
│   │   ├── ExportProgress/   # Modale Export-Fortschrittsanzeige
│   │   ├── Layers/           # Ebenen-Management
│   │   ├── MenuBar/          # Hauptmenü (Export, Import, Canvas-Größe)
│   │   ├── Timeline/         # Animations-Timeline
│   │   └── Toolbar/          # Werkzeugleiste
│   ├── store/
│   │   └── editorStore.ts    # Zentraler Zustand-Store
│   ├── types/
│   │   └── index.ts          # Zentrale Typdefinitionen
│   ├── utils/                # Hilfsfunktionen für Export, etc.
│   ├── App.tsx               # Hauptkomponente
│   └── main.tsx              # Entry-Point
└── ANIMATION_OBJECT_GUIDE.md # Wichtige Hinweise für Animationsobjekte
```

## Wichtigste Komponenten

### Canvas

Die Canvas-Komponente ist das Herzstück des Editors und verwaltet:
- Das Zeichnen auf dem Canvas
- Maus-Interaktionen für alle Werkzeuge
- Vorschau-Rendering während des Zeichnens
- Viewport-Management und Zoom

### ContextBar

Die ContextBar zeigt kontextabhängige Steuerungen für das aktive Werkzeug:
- Farbauswahl mit 5 Farbfeldern (4 vordefinierte, 1 benutzerdefiniert)
- Pinselgrößen-Slider
- Tool-spezifische Optionen wie Fülloptionen für Rechteck/Ellipse
- Animierte Übergänge zwischen Tool-Kontexten

### Toolbar

Die Toolbar enthält alle verfügbaren Werkzeuge:
- BRUSH: Pinsel zum Zeichnen
- ERASER: Radiergummi
- BUCKET: Fülleimer (Flood-Fill)
- LINE: Linienwerkzeug
- RECTANGLE: Rechteckwerkzeug
- ELLIPSE: Ellipsenwerkzeug
- NUMBER: Nummerierungswerkzeug
- SELECT: Auswahlwerkzeug
- MOVE: Verschiebewerkzeug
- CROP: Zuschneidewerkzeug

### Layers

Das Ebenenmanagement ermöglicht:
- Erstellen/Löschen/Umbenennen von Ebenen
- Sichtbarkeit und Sperrung von Ebenen
- Drag & Drop zum Neuanordnen

### Timeline

Die Timeline zeigt alle Frames der Animation und ermöglicht:
- Hinzufügen/Löschen/Duplizieren von Frames
- Steuerung der Animationsvorschau
- Ändern der Frame-Dauer

## Zentraler Store (editorStore.ts)

Der EditorStore verwendet Zustand für das State Management und enthält:
- Canvas-Größe und Pixelgröße
- Frames- und Ebenen-Daten
- Werkzeug- und Farb-Auswahl
- Aktionen für alle Zeichenoperationen

Wichtige Store-Eigenschaften:
```typescript
interface EditorState {
  // Canvas-Eigenschaften
  canvasSize: {
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
    viewportX: number;
    viewportY: number;
  };
  pixelSize: number;
  
  // Frames und Ebenen
  frames: Frame[];
  currentFrameIndex: number;
  layers: Layer[];
  currentLayerIndex: number;
  
  // Werkzeuge und Einstellungen
  currentTool: Tool;
  brushSize: number;
  isRectFilled: boolean;
  isEllipseFilled: boolean;
  currentPixelNumber: number;
  autoNumbering: boolean;
  
  // Farben
  predefinedColors: Record<PredefinedColor, string>;
  currentColor: string;
  customColor: string;
  
  // Aktionen
  setPixel: (x: number, y: number, color: string) => void;
  fillArea: (x: number, y: number, targetColor: string, replacementColor: string) => void;
  // ... weitere Aktionen
}
```

## Tool-Implementierungen

### Zeichenwerkzeuge

1. **Brush**: Zeichnet Pixel mit variabler Größe
2. **Eraser**: Löscht Pixel mit variabler Größe
3. **Bucket**: Verwendet Flood-Fill-Algorithmus, um verbundene Bereiche zu füllen
4. **Line**: Implementiert mit Bresenham-Algorithmus für genaue Linien
5. **Rectangle**: Zeichnet Rechtecke mit Umriss oder gefüllt (isRectFilled)
6. **Ellipse**: Zeichnet Ellipsen/Kreise mit Umriss oder gefüllt (isEllipseFilled)
7. **Number**: Zeichnet Zahlen mit automatischer Inkrementierung

### Algorithmen

- **Flood-Fill**: Stack-basiert statt rekursiv für bessere Performance mit Boundary-Checks
- **Bresenham**: Für präzise Linienzeichnung ohne Lücken
- **Midpoint Circle**: Für kontinuierliche Kreise/Ellipsen

## Farben und ihre Bedeutung

Der Editor verwendet vier vordefinierte Farben mit besonderer Bedeutung:
1. **Rot (#FF0000)**: "Miss" - Verliert Leben im Spiel
2. **Blau (#0000FF)**: "Hit" - Einzusammelnde Objekte
3. **Grün (#00FF00)**: "Safe" - Sichere Bereiche
4. **Violett (#9932CC)**: "Double Hit" - Doppelte Punkte
5. **Custom Color**: Frei konfigurierbar (Default: gelb)

## Animationsobjekte

Der Editor unterstützt spezielle Animationsobjekte:
- **Linien**: Bewegende Linien mit verschiedenen Mustern
- **X-Shapes**: Rotierende X-Formen
- **Zig-Zag**: Zickzack-Bewegungsmuster

**WICHTIG**: Bestehende Animationsobjekte dürfen nicht verändert werden! Neue Animationsobjekte müssen gemäß der ANIMATION_OBJECT_GUIDE.md implementiert werden.

## Export-Formate

Der Editor bietet folgende Export-Optionen:
- **PNG**: Einzelne Frame-Exporte
- **ZIP**: Sammlung aller Frames als PNG-Dateien
- **GIF**: Animierte GIF mit Editor-Look
- **MP4**: Video-Export mit FFmpeg-wasm

## Bekannte Probleme und Einschränkungen

- Leistungsprobleme bei großen Canvas-Größen oder vielen Frames
- Einige ungenutzte Variablen im Code (brushSize, moveViewport, etc.)
- Viewport-Management hat noch nicht alle erforderlichen Funktionen implementiert

## Letzte Änderungen

- Implementierung der Fülloptionen für Rechteck und Ellipse
- Verbesserte Flood-Fill-Implementierung für das Bucket-Tool
- Boundary-Checks in allen Zeichenfunktionen
- Modernisierte ContextBar mit animierten Übergängen
- Konsolidierung der Tool-Namen in allen Komponenten
