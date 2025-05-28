# Human Interface Guidlines: Animation Type Picker Panel

## Zweck

Das Animation Type Picker Panel dient der Auswahl und Vorschau von Animationsarten für Objekte. Es soll intuitiv, modern und zugänglich gestaltet sein.

---

## Layout & Struktur

- **Zentriertes Modal:** Das Panel erscheint mittig im Viewport mit abgedunkeltem Backdrop (Overlay).
- **Abgerundete Ecken:** Der Hauptcontainer hat einen Border-Radius von 18px.
- **Padding:** Ausreichender Innenabstand (mind. 28px unten, 36px oben).
- **Maximale Breite:** 95vw, Mindestbreite 340px.
- **Flexbox:** Vertikale Ausrichtung, zentrierte Elemente.

---

## Farben & Kontraste

- **Hintergrund:** `var(--background-primary)` für das Panel, `rgba(20, 30, 50, 0.55)` für das Overlay.
- **Text:** `var(--text-primary)` für Überschriften, `var(--text-secondary)` für Labels.
- **Buttons:** Animationsoptionen mit 3D-Effekt, abgesetzte Schatten.
- **Toggle:** Dezente, leicht helle Umrandung (`border: 1px solid rgba(255,255,255,0.11)`), Hintergrund `var(--background-elevated)`, im aktiven Zustand `var(--accent-primary)`.
- **Hover States:** Sichtbare, aber nicht aufdringliche Hervorhebung (z.B. verstärkte Schatten, leichte Skalierung, Rotation).

---

## Interaktionen & Animationen

- **Modal-Einblendung:** Weiche Slide-Up-Animation (0.25s, cubic-bezier).
- **Button-Hover:** 3D-Effekt mit Rotation und Skalierung, abhängig von Mausposition.
- **GIFs:** Immer zentriert im Button, keine Überlappung mit Text.
- **Close-Button:** Ohne permanente Border, nur beim Hover sichtbar.
- **Toggle:** Fließender Übergang des Sliders, sichtbare Umrandung bleibt stets erhalten.

---

## Barrierefreiheit (Accessibility)

- **Fokus-Stile:** Deutliche Fokus-Indikatoren für alle interaktiven Elemente.
- **Kontraste:** Mindestens AA-konforme Farbkontraste.
- **Keyboard-Navigation:** Alle Optionen, Toggle und Schließen mit Tab erreichbar.
- **ARIA-Rollen:** Modal als Dialog, Schließen-Button mit `aria-label`.

---

## Typografie

- **Überschriften:** 1.5em, klar lesbar.
- **Labels:** 0.9em, dezenter Farbton.

---

## Responsive Design

- **Skalierung:** Panel und Inhalte passen sich an verschiedene Bildschirmgrößen an.
- **Abstände:** Genügend Abstand zu Bildschirmrändern (mind. 5vw).

---

## Beispielhafte CSS-Variablen

```css
:root {
  --background-primary: #22252b;
  --background-elevated: #292d34;
  --text-primary: #fff;
  --text-secondary: #b0b4be;
  --accent-primary: #6ec1e4;
}
```

---

## Hinweise zur Weiterentwicklung

- Animationen sollten stets performant (GPU-accelerated) umgesetzt werden.
- Neue Animationstypen müssen als eigenständige Option mit GIF und Text hinzugefügt werden.
- Änderungen an Farben oder Effekten stets auf Kontrast und Barrierefreiheit prüfen.

---

*Stand: 29.04.2025*
