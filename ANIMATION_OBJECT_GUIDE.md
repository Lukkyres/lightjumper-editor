# Guide: Adding New Animation Object Types (Pixel Art Editor)

## Principle: Separation of Animation Logic

When adding new animation object types (e.g. new animated shapes or effects), **never modify or refactor the logic of existing animation objects** (such as LINE, X, SNAKE, etc.).

- Each animation type must have its own isolated logic for state, rendering, and configuration.
- Shared code should only be extracted if it does not affect the behavior of existing types.
- The integration in the UI (Type-Auswahl, Config-Panel, Vorschau) muss modular und klar getrennt erfolgen.

## Animation Objects and Layers

**Important**: All animation objects automatically create and are linked to a dedicated layer with the same name. This creates a 1:1 relationship between animation objects and their layers:

- When an animation object is created, a corresponding layer is automatically created.
- When an animation object is deleted, its corresponding layer is also deleted.
- When a layer associated with an animation object is deleted, the animation object is also deleted.
- During creation in the "New Animation Object" panel, the layer is created temporarily and will be deleted if you click "Cancel", or kept if you click "Create Animation".

This behavior is consistent across all animation object types (LINE, X, SNAKE, RECTANGLE, etc.).

## Step-by-Step: How to Add a New Animation Object Type

1. **Type Definition**
   - Extend the `AnimationObject` type in `src/types/index.ts` to include your new type and its specific properties.
   - Example: Add `type: 'CIRCLE' | ...` and `circleRadius?: number` etc.

2. **Animation Logic**
   - Implement a new function in `src/utils/animationUtils.ts`, e.g. `generateCircleAnimation`.
   - This function must be self-contained and must NOT affect the logic of other types.

3. **Integration in applyAnimationsToFrames**
   - Add a new branch for your type in `applyAnimationsToFrames` (do not touch existing branches).
   - Example:
     ```ts
     if (animation.type === 'CIRCLE') {
       animationPixels = generateCircleAnimation(...);
     }
     ```

4. **UI Integration**
   - Add your type to the type selection dropdown and config panel in `App.tsx` (or relevant component).
   - Provide a live preview using the temporary layer system.
   - Remember that your animation type will automatically create and be linked to a dedicated layer.

5. **Testing**
   - Ensure that your new type works as expected and does NOT break or alter the behavior of existing animation types.
   - Test with multiple animation objects active simultaneously.
   - Verify that layer creation/deletion works correctly when creating and deleting animation objects.

6. **Documentation**
   - Update the README and this guide with your new type and its configuration options.

---

## Musterprompt für KI-gestützte Erweiterungen

> Füge ein neues Animationsobjekt vom Typ "[DEIN_TYP]" hinzu. Die Implementierung muss vollständig separiert von bestehenden Animationstools erfolgen und darf deren Logik nicht verändern. Die neue Animation soll folgende Eigenschaften besitzen: [Eigenschaften beschreiben]. Dokumentiere den Typ und die Konfiguration in der README.

---

## Vorschlagsliste: Weitere Animationsobjekte

- **CIRCLE**: Ein Kreis, der sich ausdehnt, zusammenzieht oder bewegt
- **RECTANGLE**: Ein animiertes Rechteck (z.B. pulsierend, wandernd)
- **WAVE**: Eine Sinuskurve, die sich durch das Bild bewegt
- **SPIRAL**: Eine Spirale, die sich dreht oder wächst
- **PARTICLE**: Ein Partikelsystem mit zufälligen Bewegungen
- **ARROW**: Ein animierter Pfeil, der einer Bahn folgt
- **HEARTBEAT**: Ein Herz, das pulsiert
- **BOUNCE**: Ein Objekt, das an den Rändern abprallt
- **TEXT**: Animierter Text (z.B. Buchstaben erscheinen nacheinander)
- **CUSTOM_PATH**: Ein Objekt, das einer benutzerdefinierten Pfad-Animation folgt

---

**WICHTIG:**
- Jede neue Animation muss modular und isoliert sein.
- Niemals bestehende Animationstypen verändern!
