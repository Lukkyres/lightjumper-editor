# Pixel Art Editor mit Animationstimeline

Ein moderner Pixel Art Editor mit Animationstimeline für Level-Design im "Der Boden ist Lava"-Spiel-Stil.

## Projektstruktur und Architektur

Das Projekt ist in React mit TypeScript geschrieben und verwendet Vite als Build-Tool. Die wichtigsten Verzeichnisse unter `src/` sind:
- `components/`: Enthält alle React-Komponenten, unterteilt in spezifische UI-Bereiche (z.B. `Canvas`, `Toolbar`, `Timeline`, `Layers`, `ContextBar`).
- `store/`: Beinhaltet den globalen Zustand-Store.
  - `editorStore.ts`: Der zentrale Zustand-Store (basierend auf Zustand), der alle wichtigen Daten des Editors verwaltet (Canvas-Größe, Frames, Ebenen, aktuelles Werkzeug, Farben etc.).
- `types/`: Enthält alle TypeScript-Typdefinitionen.
  - `index.ts`: Definiert zentrale Typen wie `Frame`, `Layer`, `AnimationObject`, `CanvasSize`, `EditorState` etc.
- `utils/`: Beherbergt Hilfsfunktionen, z.B. für Export-Formate oder Animationsberechnungen.
  - `animationUtils.ts`: Verantwortlich für die Generierung der Pixeldaten von Animationsobjekten.
- `App.tsx`: Die Hauptkomponente der Anwendung, die alle UI-Teile zusammenfügt.
- `main.tsx`: Der Haupteinstiegspunkt der React-Anwendung.

Weitere wichtige Dateien im Stammverzeichnis des `lightjumper-editor`-Projekts:
- `ANIMATION_OBJECT_GUIDE.md`: Essentielle Richtlinien für die Implementierung neuer Animationsobjekte.

## Wichtige Konzepte und Dateien für die Entwicklung (LLM-Kontext)

Für eine effiziente Weiterentwicklung oder Fehlerbehebung, insbesondere mit LLM-Unterstützung, sind folgende Bereiche und Dateien von zentraler Bedeutung:

1.  **Zentraler Zustand (`src/store/editorStore.ts`):**
    *   Hier wird der gesamte Anwendungszustand mit **Zustand** verwaltet.
    *   Die Struktur des States (z.B. `canvasSize`, `frames`, `layers`, `currentTool`, `animationObjects`) und die zugehörigen Aktionen (Setter, Logik-Funktionen) sind hier definiert. Änderungen an Kerndaten des Editors beginnen oft hier.

2.  **Canvas Interaktion & Rendering (`src/components/Canvas/Canvas.tsx`):**
    *   Diese Komponente ist das Herzstück für die visuelle Darstellung und Interaktion.
    *   Sie behandelt:
        *   Das Zeichnen von Pixeln, Ebenen und Animationen.
        *   Maus-Events (Klicken, Ziehen) für alle Werkzeuge (Pinsel, Radierer, Auswahl, Formen etc.).
        *   Viewport-Management (Zoom, Verschieben) und den speziellen Viewport-Modus.
        *   Live-Vorschau-Rendering während Zeichenoperationen.
    *   Die meiste Logik für Werkzeugverhalten auf dem Canvas ist direkt in dieser Datei implementiert.

3.  **Animationslogik (`src/utils/animationUtils.ts`):**
    *   Die Funktion `applyAnimationsToFrames` und die von ihr aufgerufenen `generate<Type>Animation`-Funktionen (z.B. `generateLineAnimation`, `generateXAnimation`) sind hier zu finden.
    *   Diese Datei ist verantwortlich für die Berechnung der konkreten Pixeldaten (`PixelData[]`) für jeden Frame eines Animationsobjekts basierend auf dessen Eigenschaften (Typ, Geschwindigkeit, Position etc.).
    *   Modifikationen am Verhalten oder an der Darstellung von animierten Objekten (Linie, X-Form, Schlange, Rechteck, Pfad) erfordern Anpassungen in dieser Datei.

4.  **Werkzeug-Implementierung:**
    *   Die `src/components/Toolbar/Toolbar.tsx` stellt die Werkzeugauswahl bereit.
    *   Die `src/components/ContextBar/ContextBar.tsx` zeigt kontextabhängige Einstellungen für das aktive Werkzeug.
    *   Das eigentliche Verhalten der Werkzeuge auf dem Canvas (was beim Klicken/Ziehen passiert) ist in `src/components/Canvas/Canvas.tsx` implementiert.

5.  **Typdefinitionen (`src/types/index.ts`):**
    *   Alle wichtigen Datenstrukturen und Typen sind hier definiert. Konsultiere diese Datei, um die Form von Objekten wie `AnimationObject`, `Frame`, `Layer`, `CanvasSize` etc. zu verstehen.

6.  **Export-Logik (`src/utils/exportUtils.ts`):**
    *   Enthält Funktionen zum Exportieren der Animationen in verschiedene Formate (PNG, ZIP, GIF, MP4).
    *   Nutzt `applyAnimationsToFrames` für die Erzeugung der Animationsdaten für Exporte.

7.  **Animations-Objekt-Richtlinien (`ANIMATION_OBJECT_GUIDE.md`):**
    *   Unbedingt beachten beim Hinzufügen oder Modifizieren von Animationsobjekttypen, um Konsistenz und Kompatibilität zu wahren.

## Was bereits implementiert wurde:

1.  **Grundlegende Struktur und Architektur**
    *   Vollständiger Vite+React+TypeScript Projekt-Setup.
    *   Zustand Store (`editorStore.ts`) für zentrales State Management.
    *   Umfassende Typdefinitionen (`types/index.ts`) für alle Komponenten und Funktionen.

2.  **UI-Komponenten**
    *   `MenuBar`: Enthält Export/Import/Canvas-Größe/Zoom-Steuerungen.
    *   `Toolbar`: Werkzeuge wie Pinsel, Radierer, Auswahlwerkzeug, Linien, Formen etc.
    *   `ContextBar`: Kontextabhängige Einstellungen für ausgewählte Werkzeuge (Farbe, Pinselgröße, Fülloptionen).
    *   `Canvas`: Anzeige und Interaktion mit dem Pixel-Canvas, inklusive Zoom und Viewport-Modus.
    *   `Layers`: Ebenenmanagement mit Sichtbarkeit, Sperrfunktionen und Umbenennen.
    *   `Timeline`: Animation Timeline mit Frame-Steuerung (Hinzufügen, Löschen, Duplizieren, Dauer ändern).
    *   `ColorPalette`: Farbauswahl mit vordefinierten und benutzerdefinierten Farben.
    *   `ExportProgress`: Modale Fortschrittsanzeige für Export-Vorgänge.

3.  **Projektmanagement**
    *   Bearbeitbarer Projektname (Standard: "Level 1").
    *   Speichern und Laden von Projekten im `.ljp`-Format (JSON).
    *   Automatische Zustandswiederherstellung beim Projektimport.

4.  **Core-Funktionalitäten**
    *   Zeichnen mit verschiedenen Pinselgrößen und Farben.
    *   Radiergummi.
    *   Farbauswahl über Farbpalette und Pipette.
    *   Ebenenmanagement (Erstellen, Löschen, Umschalten, Sichtbarkeit, Sperren).
    *   Frame-basierte Animationen.
    *   Animationsobjekte (Linie, X-Form, Schlange, Rechteck, Pfad) mit spezifischen Eigenschaften.
    *   Auswahlfunktion für Pixelbereiche und Verschieben der Auswahl.
    *   Viewport-Management (Verschieben und Größe ändern des sichtbaren Canvas-Ausschnitts).
    *   Pixel blockieren/freigeben.

5.  **Zeichenwerkzeuge**
    *   Pinsel- und Radierwerkzeug mit variabler Größe.
    *   Paint Bucket (Fülleimer) mit robustem Flood-Fill-Algorithmus.
    *   Linien-Werkzeug mit Bresenham-Algorithmus und Live-Vorschau.
    *   Rechteck-Werkzeug mit Option für Umriss oder Füllung und Live-Vorschau.
    *   Ellipsen-/Kreis-Werkzeug mit Option für Umriss oder Füllung und Live-Vorschau.
    *   Number-Tool für sequentielles Nummerieren von Pixeln.

6.  **Animationswerkzeuge und -objekte**
    *   **Linie**: Bewegt sich horizontal/vertikal, Wraparound/Bounce-Verhalten.
    *   **X-Form**: Rotiert um einen Mittelpunkt, kann sich bis zu den Canvas-Rändern erstrecken, variable Liniendicke.
    *   **Schlange**: Bewegt sich zufällig oder in bestimmten Mustern, variable Länge und Geschwindigkeit.
    *   **Rechteck**: Animiert zwischen verschiedenen Zuständen (Position, Größe) mit Easing-Funktionen und Verzögerungen.
    *   **Pfad**: Objekt bewegt sich entlang eines benutzerdefinierten Pfades mit Optionen für Geschwindigkeit, Trail etc.
    *   Spezifische Konfigurations-Panels für jedes Animationsobjekt.

7.  **Export-Funktionen (`src/utils/exportUtils.ts`)**
    *   Exportieren als PNG (einzelner Frame).
    *   Exportieren als ZIP mit allen Frames als PNGs (mit Zeitstempel-basierten Dateinamen und reduzierten PNGs zur Optimierung).
    *   HD-GIF-Export mit Editor-Look (Hintergrund, Texteinblendungen) und Fortschrittsanzeige.
    *   HD-MP4-Export mit FFmpeg im Browser (Hintergrund, Texteinblendungen) und Fortschrittsanzeige.
    *   Sichtbare Canvas-Begrenzung (Viewport-Rahmen) in Video/GIF-Exporten.
    *   Alle Exporte mit Meta-Informationen (Projektname, Frame-Nummer, Zeit).

8.  **UI/UX-Verbesserungen**
    *   Moderne, animierte `ContextBar` für kontextabhängige Werkzeugeinstellungen.
    *   Farbauswahl mit vordefinierten Farben (mit Tooltip-Labels) und benutzerdefinierter Farbe.
    *   Toggle-Steuerung für Fülloptionen bei Rechtecken und Ellipsen.
    *   Responsives Layout mit animierten Übergängen für UI-Elemente.
    *   SuperFrames in der Timeline zur Gruppierung von Frames.

## Was noch implementiert werden muss:

1.  **Erweiterte Funktionen**
    *   Abbrechen-Funktion für Export-Prozesse.
    *   Weitere Performance-Optimierungen für sehr große Projekte (viele Frames/Ebenen/Animationen).
    *   Zusätzliche Export-Formate (z.B. WebM, APNG).
    *   Undo/Redo Funktionalität für mehr Aktionen.

2.  **Animationsobjekte erweitern**
    *   Interaktiveres Erstellen und Editieren von Animationsobjekten direkt auf dem Canvas.
    *   Weitere Animationstypen (z.B. Partikeleffekte, komplexere Bewegungsmuster).

3.  **Accessibility & Responsiveness**
    *   ARIA-Labels für alle interaktiven Elemente zur Verbesserung der Zugänglichkeit.
    *   Umfassende Tastaturnavigation für alle Funktionen.
    *   Weitere UI-Anpassungen für verschiedene Bildschirmgrößen und Touch-Geräte.

## Hinweise für Entwickler

-   **Bestehende Animationswerkzeuge und deren Logik in `src/utils/animationUtils.ts` (z.B. Linie, X) dürfen nicht verändert werden, wenn neue Animationstypen hinzugefügt werden, um die Kompatibilität mit alten Projekten sicherzustellen!**
-   Neue Animationstypen sollten immer modular und isoliert implementiert werden, idealerweise mit eigenen `generate<NeuerTyp>Animation`-Funktionen in `animationUtils.ts`.
-   Beim Hinzufügen neuer Animationsobjekte die Hinweise in `lightjumper-editor/ANIMATION_OBJECT_GUIDE.md` befolgen.
-   Der State wird über `src/store/editorStore.ts` verwaltet. Änderungen an der Datenstruktur oder neue Aktionen sollten hier beginnen.

## Starten der Anwendung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten (läuft standardmäßig auf http://localhost:5173)
npm run dev
```

## Farbzuordnungen für Level-Design

Der Editor verwendet spezifische Farben für das Level-Design, die im Spiel eine Bedeutung haben:
-   **Rot (`#FF0000`)**: "Miss" - Spieler verliert Leben.
-   **Blau (`#0000FF`)**: "Hit" - Einzusammelnde Objekte.
-   **Grün (`#00FF00`)**: "Safe" - Sichere Bereiche, auf denen der Spieler stehen kann.
-   **Violett (`#9932CC` oder `#FF00FF` je nach Kontext):** "Double Hit" - Objekte, die doppelte Punkte geben.
-   **Benutzerdefinierte Farbe**: Frei konfigurierbar für andere Elemente (Standard: Gelb).

Diese Farbdefinitionen sind auch in der `settings.json` relevant, die beim ZIP-Export generiert wird.
