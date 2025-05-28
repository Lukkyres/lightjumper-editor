import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { Frame, PixelData, CanvasSize, AnimationObject, Layer, Variation, SubRectangle, Selection } from '../types';
import gifshot from 'gifshot';
import { createFFmpeg } from '@ffmpeg/ffmpeg';
import { applyAnimationsToFrames } from './animationUtils';
import videoBgPath from '../assets/VideoBG.png'; // Import the background image
import { ProjectWithHistory, createProjectWithHistory, addVersionToHistory } from './versionHistoryUtils';

export interface ExportOptions {
  HD?: boolean;
  blackBackground?: boolean;
  pixelBackgroundColor?: string;
  gridLineColor?: string;
  updateProgress?: (progress: number, status: string) => void;
}

// Function to create a high-resolution PNG from the canvas
export const exportToPNG = async (
  frame: Frame,
  layers: Layer[],
  canvasSize: CanvasSize,
  blockedPixels: { [key: string]: boolean },
  filename = 'pixel-art-export.png',
  options: { blackBackground?: boolean } = {}
): Promise<void> => {
  try {
    const { width, height, viewportX, viewportY } = canvasSize;
    let allPixels: PixelData[] = [];
    const visibleLayers = layers.filter(l => l.visible).map(l => l.id);
    visibleLayers.forEach(layerId => {
      if (frame.layerData[layerId]) {
        allPixels = [...allPixels, ...(frame.layerData[layerId] || [])];
      }
    });

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context for exportToPNG');
    }

    // 1. Fill with opaque black
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(0, 0, width, height);

    // 2. Get ImageData
    let canvasImageData = ctx.getImageData(0, 0, width, height);
    let dataArr = canvasImageData.data;

    // 3. Draw pixels by modifying ImageData
    allPixels.forEach(pixel => {
      const drawX = pixel.x - viewportX; // Assuming pixel.x, pixel.y are global
      const drawY = pixel.y - viewportY;

      if (drawX >= 0 && drawX < width && drawY >= 0 && drawY < height) {
        const { r, g, b, a: alphaByte } = getPixelRGBA(pixel);
        const index = (drawY * width + drawX) * 4;
        
        dataArr[index]     = r;
        dataArr[index + 1] = g;
        dataArr[index + 2] = b;
        dataArr[index + 3] = alphaByte;
      }
    });

    // 4. Put ImageData back
    ctx.putImageData(canvasImageData, 0, 0);
    
    const dataUrl = exportCanvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting to PNG:', error);
    throw error;
  }
};

// Function to export all frames as individual PNGs
export const exportFramesToPNGs = async (
  frames: Frame[],
  layers: Layer[],
  canvasSize: CanvasSize,
  blockedPixels: { [key: string]: boolean },
  filenamePrefix = 'frame',
  options: { blackBackground?: boolean } = {}
): Promise<void> => {
  try {
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const filename = `${filenamePrefix}-${i + 1}.png`;

      const { width, height, viewportX, viewportY } = canvasSize;
      let allPixels: PixelData[] = [];
      const visibleLayers = layers.filter(l => l.visible).map(l => l.id);
      visibleLayers.forEach(layerId => {
        if (frame.layerData[layerId]) {
          allPixels = [...allPixels, ...(frame.layerData[layerId] || [])];
        }
      });

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width;
      exportCanvas.height = height;
      const ctx = exportCanvas.getContext('2d');

      if (!ctx) {
        throw new Error(`Failed to get canvas context for frame ${i + 1}`);
      }

      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fillRect(0, 0, width, height);
      let canvasImageData = ctx.getImageData(0, 0, width, height);
      let dataArr = canvasImageData.data;

      allPixels.forEach(pixel => {
        const drawX = pixel.x - viewportX;
        const drawY = pixel.y - viewportY;
        if (drawX >= 0 && drawX < width && drawY >= 0 && drawY < height) {
          const { r, g, b, a: alphaByte } = getPixelRGBA(pixel);
          const index = (drawY * width + drawX) * 4;
          dataArr[index]     = r;
          dataArr[index + 1] = g;
          dataArr[index + 2] = b;
          dataArr[index + 3] = alphaByte;
        }
      });
      ctx.putImageData(canvasImageData, 0, 0);

      const dataUrl = exportCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error('Error exporting frames to PNGs:', error);
    throw error;
  }
};

// Function to create a GIF from frame canvases
export const exportToGIF = async (
  frameCanvases: HTMLCanvasElement[],
  frameDurations: number[],
  filename = 'animation.gif'
): Promise<void> => {
  try {
    // Convert canvases to image data URLs
    const images = frameCanvases.map(canvas => canvas.toDataURL('image/png'));
    
    // Calculate the average frame duration (in seconds)
    const averageFrameDuration = frameDurations.reduce((a, b) => a + b, 0) / (frameDurations.length * 1000);
    
    // Create the GIF using gifshot library
    gifshot.createGIF({
      images,
      gifWidth: frameCanvases[0].width,
      gifHeight: frameCanvases[0].height,
      interval: averageFrameDuration,
      numFrames: images.length,
      frameDuration: averageFrameDuration,
      sampleInterval: 10,
      progressCallback: (progress: number) => {
        console.log(`GIF Creation Progress: ${Math.floor(progress * 100)}%`);
      }
    }, (obj) => {
      if (!obj.error) {
        const animatedGIFDataUrl = obj.image || '';
        
        if (animatedGIFDataUrl) {
          // Create a download link
          const link = document.createElement('a');
          link.download = filename;
          link.href = animatedGIFDataUrl;
          
          // Trigger the download
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          throw new Error('Generated GIF data URL is empty');
        }
      } else {
        console.error('Error creating GIF:', obj.error);
        throw new Error('Failed to create GIF');
      }
    });
  } catch (error) {
    console.error('Error exporting to GIF:', error);
    throw error;
  }
};

// Function to create an MP4 video from frames
export const exportToMP4 = async (
  frames: Frame[],
  animations: AnimationObject[],
  canvasSize: CanvasSize,
  projectName: string,
  blockedPixels: { [key: string]: boolean },
  options: ExportOptions = {},
  projectDirectoryHandle?: FileSystemDirectoryHandle,
  stateName?: string
): Promise<void> => {
  try {
    console.log('Starting MP4 export process...');
    options.updateProgress?.(0, 'Initialisiere Export...');

    // Load the background image first
    let backgroundImage: HTMLImageElement | null = null;
    try {
      backgroundImage = new Image();
      backgroundImage.src = videoBgPath;
      await backgroundImage.decode(); // Wait for the image to load
      console.log('Background image loaded successfully.');
      options.updateProgress?.(2, 'Hintergrundbild geladen');
    } catch (imgError) {
      console.error('Failed to load background image:', imgError);
      backgroundImage = null; // Ensure it's null if loading failed
      options.updateProgress?.(2, 'Hintergrundbild Fehler - nutze Farbe');
    }
    
    // Set video dimensions (HD option)
    const videoWidth = options.HD ? 1280 : 640;
    const videoHeight = options.HD ? 720 : 480;
    
    // Pixel size for the grid rendering - increased for HD
    const pixelSize = Math.max(options.HD ? 4 : 2, Math.floor(Math.min(
      (videoWidth * 0.8) / canvasSize.width,
      (videoHeight * 0.7) / canvasSize.height
    )));
    
    // Notify about progress
    options.updateProgress?.(5, 'Initialisiere FFmpeg...');
    
    // Calculate the scaled canvas dimensions with grid
    const scaledWidth = canvasSize.width * pixelSize;
    const scaledHeight = canvasSize.height * pixelSize;
    
    // Calculate position to center the canvas in the video
    const offsetX = Math.floor((videoWidth - scaledWidth) / 2);
    const offsetY = Math.floor((videoHeight - scaledHeight) / 2) - 40; // Move up to make room for text
    
    // Font settings - larger for HD
    const fontSize = options.HD ? 24 : 16;
    const fontFamily = 'Arial';
    const textColor = 'white';
    
    // Pre-calculate all animation pixels for ALL frames
    options.updateProgress?.(10, 'Berechne Animationen...');
    let allAnimationPixels: Record<string, PixelData[]> = {};
    if (animations && animations.length > 0) {
      allAnimationPixels = applyAnimationsToFrames(
        frames,
        animations,
        canvasSize,
        blockedPixels
      );
    }

    try {
      // Initialize FFmpeg
      const ffmpeg = createFFmpeg({
        log: true,
        corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js'
      });
      
      console.log('Lade FFmpeg...');
      options.updateProgress?.(15, 'Lade FFmpeg...');
      await ffmpeg.load();
      console.log('FFmpeg erfolgreich geladen');
      options.updateProgress?.(20, 'FFmpeg geladen');
      
      // Create temporary canvas for rendering
      const canvas = document.createElement('canvas');
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Konnte Canvas-Kontext nicht erstellen');
      }
      
      // Create a separate canvas for drawing the pixel grid
      const pixelCanvas = document.createElement('canvas');
      pixelCanvas.width = scaledWidth;
      pixelCanvas.height = scaledHeight;
      const pixelCtx = pixelCanvas.getContext('2d');
      
      if (!pixelCtx) {
        throw new Error('Konnte Pixel-Canvas-Kontext nicht erstellen');
      }
      
      // Calculate frame rate based on average duration
      const totalDuration = frames.reduce((sum, frame) => sum + frame.duration, 0);
      const averageFrameDuration = totalDuration / frames.length;
      const frameRate = Math.round(1000 / averageFrameDuration);
      console.log(`Berechnete Framerate: ${frameRate} FPS`);
      
      options.updateProgress?.(25, 'Rendere Frames...');
      
      // Get ordered layers from editor store
      const editorStore = (window as any).__EDITOR_STORE__;
      let orderedLayers: Layer[] = [];
      
      if (editorStore && typeof editorStore.getState === 'function') {
        // Wir implementieren eine exakte Zuordnung zur Panel-Anzeige
        const panelLayers = editorStore.getState().layers || [];
        
        // Im Panel: Index 0 = oberste Ebene (Vordergrund), letztes Element = unterste Ebene (Hintergrund)
        // Wir drehen daher um für die Render-Reihenfolge: unterste Ebene zuerst, oberste zuletzt
        orderedLayers = [...panelLayers].reverse();
        
        console.log("[EXPORT][DEBUG] Layer in Render-Reihenfolge (von unten nach oben):");
        orderedLayers.forEach((layer, idx) => {
          console.log(`  Render[${idx}]: ID: ${layer.id}, Name: ${layer.name}`);
        });
      } else {
        // Fallback: Use layer IDs from the first frame
        const firstFrame = frames[0];
        if (firstFrame) {
          const layerIds = Object.keys(firstFrame.layerData);
          orderedLayers = layerIds.map(id => ({ id, name: id, visible: true, locked: false }));
        }
      }
      
      // DEBUG: Log all animations and their assigned layer
      if (frames.length > 0) {
        console.log('[EXPORT][DEBUG] Alle Animationsobjekte:');
        animations.forEach(anim => {
          let assignedLayer = orderedLayers.find(l => l.id === anim.layerId);
          console.log(`  Animation: ${anim.id} (${anim.type}), layerId: ${anim.layerId}, Layer: ${assignedLayer?.name || 'nicht gefunden'}`);
        });
      }
      
      // Process each frame and write to FFmpeg
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const frameProgress = Math.floor(25 + (i / frames.length) * 50);
        options.updateProgress?.(frameProgress, `Rendere Frame ${i + 1}/${frames.length}`);
        
        // --- Background Rendering --- 
        if (backgroundImage) {
          ctx.drawImage(backgroundImage, 0, 0, videoWidth, videoHeight); // Draw the loaded image
        } else {
          ctx.fillStyle = '#282828'; // Fallback dark gray
          ctx.fillRect(0, 0, videoWidth, videoHeight);
        }
        // --- End Background Rendering ---
        
        // --- Pixel Grid Rendering --- 
        // Collect all pixels for drawing with grid
        const frameAnimationPixels = allAnimationPixels && frame.id in allAnimationPixels 
          ? allAnimationPixels[frame.id] 
          : [];
        const pixelMap = new Map<string, PixelData>();

        // Gruppiere Animationspixel nach ihrer Ebenen-Renderposition
        const foregroundAnimationPixels: PixelData[] = [];
        const backgroundAnimationPixels: PixelData[] = [];
        const layerSpecificAnimationPixels: Record<string, PixelData[]> = {};
        
        // Kategorisiere die Animationspixel basierend auf den Animationsobjekt-Eigenschaften
        frameAnimationPixels.forEach(pixel => {
          if (!pixel.animationId) {
            foregroundAnimationPixels.push(pixel); // Default, falls keine Animation-ID
            return;
          }
          
          const animation = animations.find(anim => anim.id === pixel.animationId);
          if (!animation) {
            foregroundAnimationPixels.push(pixel); // Default, falls Animation nicht gefunden
            return;
          }
          
          // Standardmäßig im Vordergrund rendern, wenn nicht anders angegeben
          const renderPosition = animation.renderPosition || 'FOREGROUND';
          
          if (renderPosition === 'FOREGROUND') {
            foregroundAnimationPixels.push(pixel);
          } else if (renderPosition === 'BACKGROUND') {
            backgroundAnimationPixels.push(pixel);
          } else if (renderPosition === 'ON_LAYER' && animation.layerId) {
            // Initialisiere das Array für diese Ebene, falls noch nicht vorhanden
            if (!layerSpecificAnimationPixels[animation.layerId]) {
              layerSpecificAnimationPixels[animation.layerId] = [];
            }
            layerSpecificAnimationPixels[animation.layerId].push(pixel);
          } else {
            // Fallback: Wenn kein gültiger renderPosition oder layerId, zum Vordergrund hinzufügen
            foregroundAnimationPixels.push(pixel);
          }
        });
        
        // Hilfsfunktion zum Prüfen, ob ein Pixel blockiert ist
        const isPixelVisible = (pixel: PixelData): boolean => {
          const key = `${pixel.x},${pixel.y}`;
          return !(blockedPixels && blockedPixels[key]);
        };
        
        // Render layers in correct order (bottom to top)
        for (const layer of orderedLayers) {
          if (!layer.visible) continue;

          // Layer pixels
          const layerPixels = frame.layerData[layer.id] || [];
          for (const pixel of layerPixels) {
            if (isPixelVisible(pixel)) {
              pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
            }
          }

          // Animation pixels for this layer
          const layerAnimPixels = layerSpecificAnimationPixels[layer.id] || [];
          for (const pixel of layerAnimPixels) {
            if (isPixelVisible(pixel)) {
              pixelMap.set(`${pixel.x},${pixel.y}`, pixel); // Overwrite layer pixels if needed
            }
          }
        }
        
        // 1. Zuerst Hintergrund-Animationen (aber nur nicht-blockierte)
        for (const pixel of backgroundAnimationPixels) {
          if (isPixelVisible(pixel)) {
            pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
          }
        }
        
        // 2. Dann die regulären Pixel jeder Ebene mit ebenenspezifischen Animationen
        for (const layer of orderedLayers) {
          if (!layer.visible) continue;

          // Reguläre Ebenen-Pixel (nur sichtbare)
          const layerPixels = frame.layerData[layer.id] || [];
          for (const pixel of layerPixels) {
            if (isPixelVisible(pixel)) {
              pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
            }
          }

          // Ebenenspezifische Animations-Pixel (nur sichtbare)
          const layerAnimPixels = layerSpecificAnimationPixels[layer.id] || [];
          for (const pixel of layerAnimPixels) {
            if (isPixelVisible(pixel)) {
              pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
            }
          }
        }
        
        // 3. Zuletzt Vordergrund-Animationen (nur sichtbare)
        for (const pixel of foregroundAnimationPixels) {
          if (isPixelVisible(pixel)) {
            pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
          }
        }
        
        // const pixelsToDraw = Array.from(pixelMap.values()); // This is no longer directly used for drawing all at once

        // Draw the pixels with grid, border, and configurable/darker background onto pixelCanvas
        pixelCtx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height); // Start with a transparent canvas

        const defaultPixelBgColor = options.pixelBackgroundColor || '#1a1a2e';

        for (let vy = 0; vy < canvasSize.height; vy++) { // iterate through viewport rows
          for (let vx = 0; vx < canvasSize.width; vx++) { // iterate through viewport columns
            const globalX = vx + canvasSize.viewportX;
            const globalY = vy + canvasSize.viewportY;
            const blockKey = `${globalX},${globalY}`;
            const pixelKey = `${globalX},${globalY}`; // For pixelMap lookup

            const drawX = vx * pixelSize;
            const drawY = vy * pixelSize;

            if (blockedPixels && blockedPixels[blockKey]) {
              // Blocked pixel: ensure it's transparent by clearing the specific cell
              pixelCtx.clearRect(drawX, drawY, pixelSize, pixelSize);
            } else {
              // Not blocked: check if it's painted or unpainted
              const paintedPixel = pixelMap.get(pixelKey);
              if (paintedPixel) {
                // Unblocked and painted
                pixelCtx.fillStyle = paintedPixel.color;
                pixelCtx.fillRect(drawX, drawY, pixelSize, pixelSize);
              } else {
                // Unblocked and unpainted (empty cell)
                pixelCtx.fillStyle = defaultPixelBgColor;
                pixelCtx.fillRect(drawX, drawY, pixelSize, pixelSize);
              }
            }
          }
        }
        
        // Draw grid lines (they should appear on top of colored cells and be visible over transparent (blocked) cells if strokeStyle is opaque)
        pixelCtx.strokeStyle = options.gridLineColor || 'rgba(60, 60, 60, 0.7)';
        pixelCtx.lineWidth = 1;

        // Draw vertical grid lines segment by segment
        for (let vx = 0; vx <= canvasSize.width; vx++) { // Iterate through potential vertical grid line positions
          for (let vy = 0; vy < canvasSize.height; vy++) { // Iterate through cells along the vertical line
            const currentGlobalX = vx + canvasSize.viewportX;
            const currentGlobalY = vy + canvasSize.viewportY;
            
            const leftCellBlocked = vx > 0 && (blockedPixels && blockedPixels[`${currentGlobalX - 1},${currentGlobalY}`]);
            const rightCellBlocked = vx < canvasSize.width && (blockedPixels && blockedPixels[`${currentGlobalX},${currentGlobalY}`]);

            // Draw line segment if it's an edge or between two non-blocked cells
            if (vx === 0 || vx === canvasSize.width || (!leftCellBlocked && !rightCellBlocked)) {
              pixelCtx.beginPath();
              pixelCtx.moveTo(vx * pixelSize, vy * pixelSize);
              pixelCtx.lineTo(vx * pixelSize, (vy + 1) * pixelSize);
              pixelCtx.stroke();
            }
          }
        }

        // Draw horizontal grid lines segment by segment
        for (let vy = 0; vy <= canvasSize.height; vy++) { // Iterate through potential horizontal grid line positions
          for (let vx = 0; vx < canvasSize.width; vx++) { // Iterate through cells along the horizontal line
            const currentGlobalX = vx + canvasSize.viewportX;
            const currentGlobalY = vy + canvasSize.viewportY;

            const topCellBlocked = vy > 0 && (blockedPixels && blockedPixels[`${currentGlobalX},${currentGlobalY - 1}`]);
            const bottomCellBlocked = vy < canvasSize.height && (blockedPixels && blockedPixels[`${currentGlobalX},${currentGlobalY}`]);
            
            // Draw line segment if it's an edge or between two non-blocked cells
            if (vy === 0 || vy === canvasSize.height || (!topCellBlocked && !bottomCellBlocked)) {
              pixelCtx.beginPath();
              pixelCtx.moveTo(vx * pixelSize, vy * pixelSize);
              pixelCtx.lineTo((vx + 1) * pixelSize, vy * pixelSize);
              pixelCtx.stroke();
            }
          }
        }
        
        pixelCtx.strokeStyle = 'rgba(180, 180, 180, 0.9)';
        pixelCtx.lineWidth = Math.max(2, pixelSize / 4);
        const offset = pixelCtx.lineWidth / 2;
        pixelCtx.beginPath();
        pixelCtx.rect(
          offset,
          offset,
          canvasSize.width * pixelSize - pixelCtx.lineWidth,
          canvasSize.height * pixelSize - pixelCtx.lineWidth
        );
        pixelCtx.stroke();
        // --- End Pixel Grid Rendering ---

        // --- Draw pixelCanvas onto main canvas with shadow ---
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'; // Shadow color
        ctx.shadowBlur = 15;                   // Blur radius
        ctx.shadowOffsetX = 5;                 // Horizontal offset
        ctx.shadowOffsetY = 5;                 // Vertical offset
        
        ctx.drawImage(pixelCanvas, offsetX, offsetY);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        // --- End Drawing with Shadow ---
        
        // --- Text Rendering ---
        const baseFont = `'Arial', sans-serif`; // Reverted font stack
        ctx.fillStyle = textColor;
        
        // 1. Project Name (Above Grid)
        const titleFontSize = Math.max(18, fontSize * 1.1);
        ctx.font = `bold ${titleFontSize}px ${baseFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom'; 
        ctx.fillText(projectName, offsetX + scaledWidth / 2, offsetY - 15);
        
        // 2. Frame Counter (Bottom Left)
        ctx.font = `normal ${fontSize}px ${baseFont}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`Frame: ${i + 1}/${frames.length}`, 15, videoHeight - 10);
        
        // 3. Timestamp (Bottom Right)
        const currentTime = frames.slice(0, i).reduce((sum, f) => sum + f.duration, 0);
        const minutes = Math.floor(currentTime / 60000);
        const seconds = Math.floor((currentTime % 60000) / 1000);
        const milliseconds = currentTime % 1000;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
        ctx.font = `normal ${fontSize}px ${baseFont}`;
        ctx.textAlign = 'right';
        ctx.fillText(timeString, videoWidth - 15, videoHeight - 10);

        // 4. Editor Title (Bottom Center)
        const editorTitleFontSize = Math.max(16, fontSize); 
        ctx.font = `bold ${editorTitleFontSize}px ${baseFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText("Lightjumper Editor", videoWidth / 2, videoHeight - 35);

        // 5. Subtitle (Below Editor Title)
        const subtitleFontSize = Math.max(12, fontSize * 0.8);
        ctx.font = `normal ${subtitleFontSize}px ${baseFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText("by Interactive Studio", videoWidth / 2, videoHeight - 15);
        // --- End Text Rendering ---
        
        // Convert canvas to jpeg data
        const imageData = canvas.toDataURL('image/jpeg', 0.95);
        const base64Data = imageData.split(',')[1];
        
        // Write frame to FFmpeg - convert base64 to Uint8Array
        const frameName = `frame${i.toString().padStart(5, '0')}.jpg`;
        const binaryData = atob(base64Data);
        const data = new Uint8Array(binaryData.length);
        for (let j = 0; j < binaryData.length; j++) {
          data[j] = binaryData.charCodeAt(j);
        }
        
        // Write the frame to FFmpeg's virtual file system
        ffmpeg.FS('writeFile', frameName, data);
      }
      
      // Compose FFmpeg command for generating video
      options.updateProgress?.(75, 'Erstelle MP4-Video...');
      console.log('Erzeuge MP4-Video...');
      
      // Higher quality settings for HD
      await ffmpeg.run(
        '-framerate', frameRate.toString(),
        '-i', 'frame%05d.jpg',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', options.HD ? 'slow' : 'fast', // Better quality for HD, faster for SD
        '-crf', options.HD ? '18' : '23', // Lower CRF = higher quality (18 for HD, 23 for SD)
        'output.mp4'
      );
      
      options.updateProgress?.(90, 'MP4-Erzeugung abgeschlossen');
      console.log('MP4-Erzeugung abgeschlossen');
      
      // Read the output file back
      const mp4Data = ffmpeg.FS('readFile', 'output.mp4');
      console.log('MP4-Datei aus FFmpeg gelesen, Größe:', mp4Data.length, 'Bytes');
      
      // Clean up temporary files
      options.updateProgress?.(95, 'Räume auf...');
      console.log('Lösche temporäre Dateien...');
      for (let i = 0; i < frames.length; i++) {
        const frameName = `frame${i.toString().padStart(5, '0')}.jpg`;
        ffmpeg.FS('unlink', frameName);
      }
      ffmpeg.FS('unlink', 'output.mp4');
      
      // Create download link for MP4
      options.updateProgress?.(98, 'Erstelle Download...');
      const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(mp4Blob); // Keep this for saveAs fallback if needed

      if (projectDirectoryHandle && stateName && projectName) {
        try {
          options.updateProgress?.(98, `Speichere MP4 in Zustand '${stateName}'...`);
          console.log(`Attempting to save MP4 to project directory for state: ${stateName}`);

          // Basic sanitization for stateName to be a valid directory name
          const validStateName = stateName.replace(/[<>:"/\\|?*]+/g, '_').trim();
          if (!validStateName) {
            // Fallback to a default name if sanitized name is empty, or throw error
            // For now, let's attempt to save with a fallback name or let it fail if truly problematic.
            // A more robust solution might involve prompting user or using a default.
            // However, an empty state name after sanitization is unlikely if original state name was valid.
            console.warn("Sanitized state name is empty. Using original or risking failure.");
          }
          const targetStateName = validStateName || stateName; // Use sanitized if valid, else original

          const stateFolderHandle = await projectDirectoryHandle.getDirectoryHandle(targetStateName, { create: true });
          const mp4FileName = `${projectName}.mp4`;
          const fileHandle = await stateFolderHandle.getFileHandle(mp4FileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(mp4Blob);
          await writable.close();
          console.log(`MP4 gespeichert: ${targetStateName}/${mp4FileName}`);
          options.updateProgress?.(100, 'MP4 im Zustand gespeichert!');
        } catch (e) {
          console.error('Fehler beim Speichern der MP4 im Zustandsordner:', e);
          options.updateProgress?.(98, 'Fehler beim Speichern, starte Download...');
          saveAs(mp4Blob, `${projectName}.mp4`); // Fallback to saveAs
          options.updateProgress?.(100, 'Download abgeschlossen (Fallback)');
        }
      } else {
        options.updateProgress?.(98, 'Erstelle Download (kein Projektordner/Zustand)...');
        saveAs(mp4Blob, `${projectName}.mp4`); // Original saveAs behavior
        options.updateProgress?.(100, 'Download abgeschlossen');
        console.log('MP4-Download gestartet (kein Projektordner/Zustand angegeben)');
      }

      // Clean up URL object for saveAs, if it was used or might be.
      // No, saveAs handles its own blob, direct URL.createObjectURL for link.click() needs revoke.
      // The old code for direct download is now fully replaced or in fallback.
      // If saveAs is used, it doesn't need explicit revoke like the link.click() method did.
      
      // The old explicit download link logic:
      // const link = document.createElement('a');
      // link.href = url;
      // link.download = `${projectName}.mp4`;
      // link.click();
      // console.log('MP4-Download gestartet');
      // setTimeout(() => { URL.revokeObjectURL(url); }, 100);

      console.log('MP4-Export-Prozess abgeschlossen');
      
    } catch (ffmpegError) {
      console.error('FFmpeg-Fehler:', ffmpegError);
      throw new Error(`FFmpeg-Fehler: ${ffmpegError instanceof Error ? ffmpegError.message : 'Unbekannter Fehler'}`);
    }
  } catch (error) {
    console.error('Fehler beim MP4-Export:', error);
    throw error;
  }
};

// Function to create a GIF from frames with a similar look to the editor
export const exportToGifWithEditor = async (
  frames: Frame[],
  animations: AnimationObject[],
  canvasSize: CanvasSize,
  projectName: string,
  blockedPixels: { [key: string]: boolean }, // Hinzugefügt
  options: ExportOptions = {}
): Promise<void> => {
  try {
    console.log('Starting GIF export process...');
    options.updateProgress?.(0, 'Initialisiere Export...');

    // Load the background image first
    let backgroundImage: HTMLImageElement | null = null;
    try {
      backgroundImage = new Image();
      backgroundImage.src = videoBgPath;
      await backgroundImage.decode(); // Wait for the image to load
      console.log('Background image loaded successfully for GIF.');
      options.updateProgress?.(2, 'Hintergrundbild geladen');
    } catch (imgError) {
      console.error('Failed to load background image for GIF:', imgError);
      backgroundImage = null; // Ensure it's null if loading failed
      options.updateProgress?.(2, 'Hintergrundbild Fehler - nutze Farbe');
    }
    
    // Set video dimensions (HD option)
    const videoWidth = options.HD ? 1280 : 640;
    const videoHeight = options.HD ? 720 : 480;
    
    // Pixel size for the grid rendering - increased for HD
    const pixelSize = Math.max(options.HD ? 4 : 2, Math.floor(Math.min(
      (videoWidth * 0.8) / canvasSize.width,
      (videoHeight * 0.7) / canvasSize.height
    )));
    
    // Calculate the scaled canvas dimensions with grid
    const scaledWidth = canvasSize.width * pixelSize;
    const scaledHeight = canvasSize.height * pixelSize;
    
    // Calculate position to center the canvas in the video
    const offsetX = Math.floor((videoWidth - scaledWidth) / 2);
    const offsetY = Math.floor((videoHeight - scaledHeight) / 2) - 40; // Move up to make room for text
    
    // Font settings - larger for HD
    const fontSize = options.HD ? 24 : 16;
    const fontFamily = 'Arial';
    const textColor = 'white';
    
    // Pre-calculate all animation pixels for ALL frames
    options.updateProgress?.(10, 'Berechne Animationen...');
    const allAnimationPixels: Record<string, PixelData[]> = applyAnimationsToFrames(
      frames,
      animations,
      canvasSize,
      blockedPixels
    );
    
    // Create an array to hold all rendered frame images
    const frameImages: string[] = [];
    
    // Calculate the total duration in ms
    const totalDuration = frames.reduce((sum, frame) => sum + frame.duration, 0);
    
    // Create temporary canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Konnte Canvas-Kontext nicht erstellen');
    }
    
    // Create a separate canvas for drawing the pixel grid
    const pixelCanvas = document.createElement('canvas');
    pixelCanvas.width = scaledWidth;
    pixelCanvas.height = scaledHeight;
    const pixelCtx = pixelCanvas.getContext('2d');
    
    if (!pixelCtx) {
      throw new Error('Konnte Pixel-Canvas-Kontext nicht erstellen');
    }
    
    options.updateProgress?.(20, 'Rendere Frames...');
    
    // Get ordered layers from editor store
    const editorStore = (window as any).__EDITOR_STORE__;
    let orderedLayers: Layer[] = [];
    
    if (editorStore && typeof editorStore.getState === 'function') {
      // Wir implementieren eine exakte Zuordnung zur Panel-Anzeige
      const panelLayers = editorStore.getState().layers || [];
      
      // Im Panel: Index 0 = oberste Ebene (Vordergrund), letztes Element = unterste Ebene (Hintergrund)
      // Wir drehen daher um für die Render-Reihenfolge: unterste Ebene zuerst, oberste zuletzt
      orderedLayers = [...panelLayers].reverse();
      
      console.log("[EXPORT][DEBUG] Layer in Render-Reihenfolge (von unten nach oben):");
      orderedLayers.forEach((layer, idx) => {
        console.log(`  Render[${idx}]: ID: ${layer.id}, Name: ${layer.name}`);
      });
    } else {
      // Fallback: Use layer IDs from the first frame
      const firstFrame = frames[0];
      if (firstFrame) {
        const layerIds = Object.keys(firstFrame.layerData);
        orderedLayers = layerIds.map(id => ({ id, name: id, visible: true, locked: false }));
      }
    }
    
    // DEBUG: Log all animations and their assigned layer
    if (frames.length > 0) {
      console.log('[EXPORT][DEBUG] Alle Animationsobjekte:');
      animations.forEach(anim => {
        let assignedLayer = orderedLayers.find(l => l.id === anim.layerId);
        console.log(`  Animation: ${anim.id} (${anim.type}), layerId: ${anim.layerId}, Layer: ${assignedLayer?.name || 'nicht gefunden'}`);
      });
    }
    
    // Process each frame
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const frameProgress = Math.floor(20 + (i / frames.length) * 50);
      options.updateProgress?.(frameProgress, `Rendere Frame ${i + 1}/${frames.length}`);
      
      // --- Background Rendering --- 
      if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, videoWidth, videoHeight); // Draw the loaded image
      } else {
        ctx.fillStyle = '#282828'; // Fallback dark gray
        ctx.fillRect(0, 0, videoWidth, videoHeight);
      }
      // --- End Background Rendering ---
      
      // --- Pixel Grid Rendering --- 
      // Collect all pixels for drawing with grid
      const frameAnimationPixels = allAnimationPixels && frame.id in allAnimationPixels 
        ? allAnimationPixels[frame.id] 
        : [];
      const pixelMap = new Map<string, PixelData>();

      // Gruppiere Animationspixel nach ihrer Ebenen-Renderposition
      const foregroundAnimationPixels: PixelData[] = [];
      const backgroundAnimationPixels: PixelData[] = [];
      const layerSpecificAnimationPixels: Record<string, PixelData[]> = {};
      
      // Kategorisiere die Animationspixel basierend auf den Animationsobjekt-Eigenschaften
      frameAnimationPixels.forEach(pixel => {
        if (!pixel.animationId) {
          foregroundAnimationPixels.push(pixel);
          return;
        }
        
        const animation = animations.find(anim => anim.id === pixel.animationId);
        if (!animation) {
          foregroundAnimationPixels.push(pixel);
          return;
        }
        
        // Standardmäßig im Vordergrund rendern, wenn nicht anders angegeben
        const renderPosition = animation.renderPosition || 'FOREGROUND';
        
        if (renderPosition === 'FOREGROUND') {
          foregroundAnimationPixels.push(pixel);
        } else if (renderPosition === 'BACKGROUND') {
          backgroundAnimationPixels.push(pixel);
        } else if (renderPosition === 'ON_LAYER' && animation.layerId) {
          if (!layerSpecificAnimationPixels[animation.layerId]) {
            layerSpecificAnimationPixels[animation.layerId] = [];
          }
          layerSpecificAnimationPixels[animation.layerId].push(pixel);
        } else {
          foregroundAnimationPixels.push(pixel);
        }
      });
      
      // Hilfsfunktion zum Prüfen, ob ein Pixel blockiert ist
      const isPixelVisible = (pixel: PixelData): boolean => {
        const key = `${pixel.x},${pixel.y}`;
        return !(blockedPixels && blockedPixels[key]);
      };
      
      // Render layers in correct order (bottom to top)
      for (const layer of orderedLayers) {
        if (!layer.visible) continue;

        // Layer pixels
        const layerPixels = frame.layerData[layer.id] || [];
        for (const pixel of layerPixels) {
          if (isPixelVisible(pixel)) {
            pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
          }
        }

        // Animation pixels for this layer
        const layerAnimPixels = layerSpecificAnimationPixels[layer.id] || [];
        for (const pixel of layerAnimPixels) {
          if (isPixelVisible(pixel)) {
            pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
          }
        }
      }
      
      // 1. Zuerst Hintergrund-Animationen (aber nur nicht-blockierte)
      for (const pixel of backgroundAnimationPixels) {
        if (isPixelVisible(pixel)) {
          pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
        }
      }
      
      // 2. Dann die regulären Pixel jeder Ebene mit ebenenspezifischen Animationen
      for (const layer of orderedLayers) {
        if (!layer.visible) continue;

        // Reguläre Ebenen-Pixel (nur sichtbare)
        const layerPixels = frame.layerData[layer.id] || [];
        for (const pixel of layerPixels) {
          if (isPixelVisible(pixel)) {
            pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
          }
        }

        // Ebenenspezifische Animations-Pixel (nur sichtbare)
        const layerAnimPixels = layerSpecificAnimationPixels[layer.id] || [];
        for (const pixel of layerAnimPixels) {
          if (isPixelVisible(pixel)) {
            pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
          }
        }
      }
      
      // 3. Zuletzt Vordergrund-Animationen (nur sichtbare)
      for (const pixel of foregroundAnimationPixels) {
        if (isPixelVisible(pixel)) {
          pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
        }
      }
      
      // const pixelsToDraw = Array.from(pixelMap.values()); // This is no longer directly used for drawing all at once

      // Draw the pixels with grid, border, and configurable/darker background onto pixelCanvas
      pixelCtx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height); // Start with a transparent canvas

      const defaultPixelBgColor = options.pixelBackgroundColor || '#1a1a2e';

      for (let vy = 0; vy < canvasSize.height; vy++) { // iterate through viewport rows
        for (let vx = 0; vx < canvasSize.width; vx++) { // iterate through viewport columns
          const globalX = vx + canvasSize.viewportX;
          const globalY = vy + canvasSize.viewportY;
          const blockKey = `${globalX},${globalY}`;
          const pixelKey = `${globalX},${globalY}`; // For pixelMap lookup

          const drawX = vx * pixelSize;
          const drawY = vy * pixelSize;

          if (blockedPixels && blockedPixels[blockKey]) {
            // Blocked pixel: ensure it's transparent by clearing the specific cell
            pixelCtx.clearRect(drawX, drawY, pixelSize, pixelSize);
          } else {
            // Not blocked: check if it's painted or unpainted
            const paintedPixel = pixelMap.get(pixelKey);
            if (paintedPixel) {
              // Unblocked and painted
              pixelCtx.fillStyle = paintedPixel.color;
              pixelCtx.fillRect(drawX, drawY, pixelSize, pixelSize);
            } else {
              // Unblocked and unpainted (empty cell)
              pixelCtx.fillStyle = defaultPixelBgColor;
              pixelCtx.fillRect(drawX, drawY, pixelSize, pixelSize);
            }
          }
        }
      }
      
      // Draw grid lines (they should appear on top of colored cells and be visible over transparent (blocked) cells if strokeStyle is opaque)
      pixelCtx.strokeStyle = options.gridLineColor || 'rgba(60, 60, 60, 0.7)';
      pixelCtx.lineWidth = 1;

      // Draw vertical grid lines segment by segment
      for (let vx = 0; vx <= canvasSize.width; vx++) { // Iterate through potential vertical grid line positions
        for (let vy = 0; vy < canvasSize.height; vy++) { // Iterate through cells along the vertical line
          const currentGlobalX = vx + canvasSize.viewportX;
          const currentGlobalY = vy + canvasSize.viewportY;
          
          const leftCellBlocked = vx > 0 && (blockedPixels && blockedPixels[`${currentGlobalX - 1},${currentGlobalY}`]);
          const rightCellBlocked = vx < canvasSize.width && (blockedPixels && blockedPixels[`${currentGlobalX},${currentGlobalY}`]);

          // Draw line segment if it's an edge or between two non-blocked cells
          if (vx === 0 || vx === canvasSize.width || (!leftCellBlocked && !rightCellBlocked)) {
            pixelCtx.beginPath();
            pixelCtx.moveTo(vx * pixelSize, vy * pixelSize);
            pixelCtx.lineTo(vx * pixelSize, (vy + 1) * pixelSize);
            pixelCtx.stroke();
          }
        }
      }

      // Draw horizontal grid lines segment by segment
      for (let vy = 0; vy <= canvasSize.height; vy++) { // Iterate through potential horizontal grid line positions
        for (let vx = 0; vx < canvasSize.width; vx++) { // Iterate through cells along the horizontal line
          const currentGlobalX = vx + canvasSize.viewportX;
          const currentGlobalY = vy + canvasSize.viewportY;

          const topCellBlocked = vy > 0 && (blockedPixels && blockedPixels[`${currentGlobalX},${currentGlobalY - 1}`]);
          const bottomCellBlocked = vy < canvasSize.height && (blockedPixels && blockedPixels[`${currentGlobalX},${currentGlobalY}`]);
          
          // Draw line segment if it's an edge or between two non-blocked cells
          if (vy === 0 || vy === canvasSize.height || (!topCellBlocked && !bottomCellBlocked)) {
            pixelCtx.beginPath();
            pixelCtx.moveTo(vx * pixelSize, vy * pixelSize);
            pixelCtx.lineTo((vx + 1) * pixelSize, vy * pixelSize);
            pixelCtx.stroke();
          }
        }
      }
      
      pixelCtx.strokeStyle = 'rgba(180, 180, 180, 0.9)';
      pixelCtx.lineWidth = Math.max(2, pixelSize / 4);
      const offset = pixelCtx.lineWidth / 2;
      pixelCtx.beginPath();
      pixelCtx.rect(
        offset,
        offset,
        canvasSize.width * pixelSize - pixelCtx.lineWidth,
        canvasSize.height * pixelSize - pixelCtx.lineWidth
      );
      pixelCtx.stroke();
      // --- End Pixel Grid Rendering ---

      // --- Draw pixelCanvas onto main canvas with shadow ---
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'; // Shadow color
      ctx.shadowBlur = 15;                   // Blur radius
      ctx.shadowOffsetX = 5;                 // Horizontal offset
      ctx.shadowOffsetY = 5;                 // Vertical offset
      
      ctx.drawImage(pixelCanvas, offsetX, offsetY);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      // --- End Drawing with Shadow ---
      
      // --- Text Rendering ---
      const baseFont = `'Arial', sans-serif`; // Reverted font stack
      ctx.fillStyle = textColor;
      
      // 1. Project Name (Above Grid)
      const titleFontSize = Math.max(18, fontSize * 1.1);
      ctx.font = `bold ${titleFontSize}px ${baseFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(projectName, offsetX + scaledWidth / 2, offsetY - 15);
      
      // 2. Frame Counter (Bottom Left)
      ctx.font = `normal ${fontSize}px ${baseFont}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Frame: ${i + 1}/${frames.length}`, 15, videoHeight - 10);
      
      // 3. Timestamp (Bottom Right)
      const currentTime = frames.slice(0, i).reduce((sum, f) => sum + f.duration, 0);
      const minutes = Math.floor(currentTime / 60000);
      const seconds = Math.floor((currentTime % 60000) / 1000);
      const milliseconds = currentTime % 1000;
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
      ctx.font = `normal ${fontSize}px ${baseFont}`;
      ctx.textAlign = 'right';
      ctx.fillText(timeString, videoWidth - 15, videoHeight - 10);

      // 4. Editor Title (Bottom Center)
      const editorTitleFontSize = Math.max(16, fontSize);
      ctx.font = `bold ${editorTitleFontSize}px ${baseFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText("Lightjumper Editor", videoWidth / 2, videoHeight - 35);

      // 5. Subtitle (Below Editor Title)
      const subtitleFontSize = Math.max(12, fontSize * 0.8);
      ctx.font = `normal ${subtitleFontSize}px ${baseFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText("by Interactive Studio", videoWidth / 2, videoHeight - 15);
      // --- End Text Rendering ---
      
      // Add the frame to our collection
      frameImages.push(canvas.toDataURL('image/jpeg', 0.95));
    }
    
    options.updateProgress?.(75, 'Erstelle GIF...');
    
    // Calculate the average frame duration in seconds
    const averageFrameDuration = totalDuration / frames.length / 1000; // in seconds
    
    // Use gifshot to create the GIF
    gifshot.createGIF({
      images: frameImages,
      gifWidth: videoWidth,
      gifHeight: videoHeight,
      interval: averageFrameDuration,
      numFrames: frameImages.length,
      progressCallback: (progress) => {
        const gifProgress = Math.floor(75 + progress * 25); // 75% - 100% of progress
        options.updateProgress?.(gifProgress, `GIF-Erzeugung: ${Math.round(progress * 100)}%`);
        console.log(`GIF export progress: ${Math.round(progress * 100)}%`);
      }
    }, function(obj) {
      if (!obj.error) {
        options.updateProgress?.(100, 'Export abgeschlossen');
        const link = document.createElement('a');
        link.href = obj.image as string;
        link.download = `${projectName}.gif`;
        link.click();
        console.log('GIF export completed successfully');
      } else {
        console.error('Error creating GIF:', obj.error);
        throw new Error('Failed to create GIF: ' + (obj.error ? obj.error.toString() : 'Unknown error'));
      }
    });
  } catch (error) {
    console.error('Error exporting to GIF:', error);
    throw error;
  }
};

// Function to create a spritesheet from all frames
export const exportToSpritesheet = async (
  frameCanvases: HTMLCanvasElement[],
  filename = 'spritesheet.png'
): Promise<void> => {
  try {
    const frameWidth = frameCanvases[0].width;
    const frameHeight = frameCanvases[0].height;
    
    // Calculate the best grid configuration for the spritesheet
    const frameCount = frameCanvases.length;
    const columns = Math.ceil(Math.sqrt(frameCount));
    const rows = Math.ceil(frameCount / columns);
    
    // Create a new canvas for the spritesheet
    const spritesheet = document.createElement('canvas');
    spritesheet.width = frameWidth * columns;
    spritesheet.height = frameHeight * rows;
    
    const ctx = spritesheet.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Draw each frame onto the spritesheet
    frameCanvases.forEach((canvas, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      
      ctx.drawImage(
        canvas,
        col * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight
      );
    });
    
    // Get the data URL of the spritesheet
    const dataUrl = spritesheet.toDataURL('image/png');
    
    // Create a download link
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting to spritesheet:', error);
    throw error;
  }
};

// Function to export frames as a ZIP with PNGs using timestamped filenames
export const exportFramesToZIP = async (
  frames: Frame[],
  animations: AnimationObject[],
  canvasSize: CanvasSize,
  projectName: string,
  blockedPixels: { [key: string]: boolean },
  layers: Layer[],
  rotate180: boolean = false,
  enableLooping: boolean = false,
  loopMinDuration: number = 10, // in minutes
  loopStartFrameIndex: number = 0, // 0-based index within main section frames where to start looking for loops
  minMeaningfulLoopSegmentFrames: number = 3 // Minimum number of frames in a non-static loop segment
): Promise<{ zipBlob: Blob; previewDataUrls: string[] } | null> => {
  try {
    const fullSequenceDataUrlsForZip: string[] = []; // For the actual ZIP content
    const previewDataUrls: string[] = []; // Limited for client-side preview
    const MAX_PREVIEW_LOOP_ITERATIONS = 1000; // Show the loop segment many times in preview
    const MAX_PREVIEW_FRAMES = 5000; // Maximum total frames to show in preview
    let previewLoopIterationsDone = 0;
 
    // Create a new ZIP file
    const zip = new JSZip();
    
    // Create a folder for the frames
    const framesFolder = zip.folder(projectName);
    if (!framesFolder) {
      throw new Error('Failed to create folder in ZIP');
    }
    
    // Calculate the cumulative duration for filename generation
    let cumulativeDuration = 0;
    
    // Für Frame-Export ohne Animation lieber einen direkteren Weg gehen
    const hasAnimations = animations && animations.length > 0;
    
    // For looping functionality: Store frame fingerprints and their corresponding data URLs
    const frameOutputs: { fingerprint: string | null; dataUrl: string | null; originalIndex: number }[] = [];
    let bestLoopStartIndex = -1; // Index in frameOutputs for the chosen loop
    let bestLoopEndIndex = -1;   // Index in frameOutputs for the chosen loop
    let maxLoopSegmentLength = 0; // To prioritize longer valid loops
    
    // Pre-calculate all animation pixels for ALL frames at once, wenn Animationen vorhanden sind
    let allAnimationPixels: Record<string, PixelData[]> = {};
    if (hasAnimations) {
      allAnimationPixels = applyAnimationsToFrames(
        frames,
        animations,
        canvasSize,
        blockedPixels
      );
    }
    
    // Erstelle eine settings.json-Datei mit den spezifischen Werten
    const settings = {
      value0: {
        panelToHitColor: "#0000ff",
        panelToMissColor: "#ff0000",
        panelToDoubleHitColor: "#ff00ff",
        safeColor: "#00ff00"
      }
    };
    
    // Füge die settings.json zum ZIP hinzu
    framesFolder.file('settings.json', JSON.stringify(settings, null, 2));
    
    // Process each frame
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      
      try {
        // *** NEUE LOGIK: Generiere reduzierte PNG-Daten und Fingerprint ***
        let frameOutput = hasAnimations ?
          generateReducedFrameDataURL(
            frame,
            canvasSize,
            blockedPixels,
            animations,
            layers,
            allAnimationPixels && allAnimationPixels[frame.id] ? allAnimationPixels[frame.id] : []
          ) :
          generateSimpleFrameDataURL(
            frame,
            canvasSize,
            blockedPixels,
            layers
          );

        // Wenn der Frame nach Reduzierung leer ist, überspringen
        if (!frameOutput.dataUrl || !frameOutput.fingerprint) {
          console.warn(`Frame ${i + 1} (ID: ${frame.id}) ist leer nach Reduzierung und wird übersprungen.`);
          cumulativeDuration += frame.duration; // Wichtig: Dauer trotzdem addieren
          // Store even if empty for correct indexing if looping is enabled
          if (enableLooping) {
            frameOutputs.push({ ...frameOutput, originalIndex: i });
          }
          continue;
        }

        let currentDataUrl = frameOutput.dataUrl;

        if (rotate180) {
          const image = new Image();
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = reject;
            image.src = currentDataUrl!;
          });

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = image.width;
          tempCanvas.height = image.height;
          const tempCtx = tempCanvas.getContext('2d');

          if (tempCtx) {
            tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
            tempCtx.rotate(Math.PI); // Rotate 180 degrees
            tempCtx.translate(-tempCanvas.width / 2, -tempCanvas.height / 2);
            tempCtx.drawImage(image, 0, 0);
            currentDataUrl = tempCanvas.toDataURL('image/png');
            // Note: Fingerprint is based on unrotated image. Rotation changes dataUrl only.
          } else {
            console.warn('Failed to get context for rotation on frame ' + (i + 1));
          }
        }
        
        // Store the output for loop detection if looping is enabled
        if (enableLooping) {
          // Push the original fingerprint, but the potentially rotated dataUrl
          frameOutputs.push({ fingerprint: frameOutput.fingerprint, dataUrl: currentDataUrl, originalIndex: i });
        }
        
        // Convert data URL to PNG base64 data
        const pngData = currentDataUrl.split(',')[1];
        fullSequenceDataUrlsForZip.push(currentDataUrl); // Add to list for ZIP
        
        // Add to preview list only if we haven't exceeded the limit
        if (previewDataUrls.length < MAX_PREVIEW_FRAMES) {
          previewDataUrls.push(currentDataUrl); // Add initial frames to preview list
        }
        
        // Format the filename based on cumulative duration
        // Format: 000000.png, 000100.png, 000150.png, etc.
        const filename = `${cumulativeDuration.toString().padStart(6, '0')}.png`;
        
        // Add PNG to ZIP
        framesFolder.file(filename, pngData, { base64: true });
      } catch (error) {
        console.error(`Fehler beim Verarbeiten von Frame ${i + 1} (ID: ${frame.id}):`, error);
        return null; // Indicate failure, consistent with function signature
      }
      
      // Update cumulative duration for next frame
      cumulativeDuration += frame.duration;
    }
    
    // Handle looping if enabled
    if (enableLooping && frames.length > 1 && loopMinDuration && loopMinDuration > 0) {
      // Filter frames to only include main section frames for loop detection
      const mainFrames = frames.filter(frame => frame.section === 'main');
      const mainFrameOutputs = frameOutputs.filter(fo => {
        const originalFrame = frames[fo.originalIndex];
        return originalFrame.section === 'main';
      });
      
      if (mainFrameOutputs.length < 2) {
        console.log('Not enough main section frames for looping (need at least 2).');
      } else {
        // Interpret loopStartFrameIndex as an index within main frames, not all frames
        const effectiveMainFrameStartIndex = loopStartFrameIndex !== undefined ?
          Math.min(Math.max(0, loopStartFrameIndex), mainFrameOutputs.length - 1) : 0;

        // Start searching from the specified main frame index
        let searchStartOutputIndex = effectiveMainFrameStartIndex;
        
        // Ensure the starting frame has a valid fingerprint
        while (searchStartOutputIndex < mainFrameOutputs.length && !mainFrameOutputs[searchStartOutputIndex].fingerprint) {
          searchStartOutputIndex++;
        }
        if (searchStartOutputIndex >= mainFrameOutputs.length) searchStartOutputIndex = 0;

        console.log(`Looking for loops in main section frames starting at main frame index ${effectiveMainFrameStartIndex + 1} (original frame ${mainFrameOutputs[searchStartOutputIndex]?.originalIndex + 1}). Min meaningful segment: ${minMeaningfulLoopSegmentFrames} frames.`);

        // Robust sequence-based loop detection
        // Check if a complete sequence A->B->C repeats as A->B->C->A->B->C with seamless transitions
        for (let loopLength = Math.floor(mainFrameOutputs.length / 2); loopLength >= minMeaningfulLoopSegmentFrames; loopLength--) {
          for (let startPos = searchStartOutputIndex; startPos <= mainFrameOutputs.length - loopLength * 2; startPos++) {
            if (!mainFrameOutputs[startPos].fingerprint) continue;
            
            // Check if we have enough frames for a complete sequence repetition
            if (startPos + loopLength * 2 > mainFrameOutputs.length) continue;
            
            // Validate that the sequence repeats exactly
            let isValidSequenceRepetition = true;
            let hasVariation = false; // Check that it's not just static frames
            
            const firstFrameFingerprint = mainFrameOutputs[startPos].fingerprint;
            
            // Check each position in the sequence
            for (let offset = 0; offset < loopLength; offset++) {
              const firstSeqIndex = startPos + offset;
              const secondSeqIndex = startPos + loopLength + offset;
              
              // Ensure both positions exist and have fingerprints
              if (firstSeqIndex >= mainFrameOutputs.length || 
                  secondSeqIndex >= mainFrameOutputs.length ||
                  !mainFrameOutputs[firstSeqIndex].fingerprint ||
                  !mainFrameOutputs[secondSeqIndex].fingerprint) {
                isValidSequenceRepetition = false;
                break;
              }
              
              // Check if the frames at corresponding positions are identical
              if (mainFrameOutputs[firstSeqIndex].fingerprint !== mainFrameOutputs[secondSeqIndex].fingerprint) {
                isValidSequenceRepetition = false;
                break;
              }
              
              // Check for variation within the sequence (not all frames identical)
              if (offset > 0 && mainFrameOutputs[firstSeqIndex].fingerprint !== firstFrameFingerprint) {
                hasVariation = true;
              }
            }
            
            // Skip if sequence doesn't repeat or is static
            if (!isValidSequenceRepetition || !hasVariation) {
              if (!hasVariation) {
                console.log(`    -> Skipped static sequence at main frame ${startPos + 1} (length: ${loopLength})`);
              }
              continue;
            }
            
            // Additional validation: Check seamless transition from end of first sequence to start of second
            // The last frame of first sequence should naturally lead to the first frame of second sequence
            const lastFirstSeqIndex = startPos + loopLength - 1;
            const firstSecondSeqIndex = startPos + loopLength;
            
            // For a seamless loop, the transition from last frame to first frame should be natural
            // We can validate this by checking if this same transition appears within the sequence
            let hasSeamlessTransition = true;
            
            if (loopLength >= 2) {
              const lastFrameFingerprint = mainFrameOutputs[lastFirstSeqIndex].fingerprint;
              const firstFrameFingerprint = mainFrameOutputs[firstSecondSeqIndex].fingerprint;
              
              // Look for the same transition pattern within the sequence
              let foundTransitionInSequence = false;
              for (let checkPos = startPos; checkPos < startPos + loopLength - 1; checkPos++) {
                if (mainFrameOutputs[checkPos].fingerprint === lastFrameFingerprint &&
                    mainFrameOutputs[checkPos + 1].fingerprint === firstFrameFingerprint) {
                  foundTransitionInSequence = true;
                  break;
                }
              }
              
              // If this transition doesn't appear naturally within the sequence, it might not be seamless
              // But we'll be lenient for single-frame transitions
              if (!foundTransitionInSequence && loopLength > 2) {
                console.log(`    -> Transition not found within sequence for main frame ${startPos + 1} (length: ${loopLength})`);
                hasSeamlessTransition = false;
              }
            }
            
            if (hasSeamlessTransition && loopLength > maxLoopSegmentLength) {
              // Found a valid, seamless sequence repetition
              const loopStartOriginalIndex = mainFrameOutputs[startPos].originalIndex;
              // CRITICAL FIX: The end should be the last frame of the FIRST sequence, not the first frame of the second sequence
              const loopEndOriginalIndex = mainFrameOutputs[startPos + loopLength - 1].originalIndex;
              
              bestLoopStartIndex = frameOutputs.findIndex(fo => fo.originalIndex === loopStartOriginalIndex);
              // Find the index AFTER the last frame of the loop sequence for exclusive end boundary
              const lastLoopFrameIndex = frameOutputs.findIndex(fo => fo.originalIndex === loopEndOriginalIndex);
              bestLoopEndIndex = lastLoopFrameIndex + 1; // Exclusive end boundary
              maxLoopSegmentLength = loopLength;
              
              console.log(`    -> Found perfect sequence repetition: main frame ${startPos + 1} to ${startPos + loopLength} (length: ${loopLength}). Original frames ${loopStartOriginalIndex + 1} to ${loopEndOriginalIndex + 1}.`);
              
              // Since we're searching from longest to shortest, take the first valid one
              break;
            }
          }
          
          // If we found a good loop, stop searching for shorter ones
          if (bestLoopStartIndex !== -1 && bestLoopEndIndex !== -1) {
            break;
          }
        }
      }

      if (bestLoopStartIndex !== -1 && bestLoopEndIndex > bestLoopStartIndex) {
        const firstLoopFrameOutput = frameOutputs[bestLoopStartIndex];
        const firstLoopFrameOriginalIndex = firstLoopFrameOutput.originalIndex;
        
        console.log(`Chosen main section loop: Original frame ${firstLoopFrameOriginalIndex + 1} (processed ${bestLoopStartIndex + 1}) to frame ${frameOutputs[bestLoopEndIndex - 1].originalIndex + 1} (processed ${bestLoopEndIndex}). Loop segment length: ${maxLoopSegmentLength} frames.`);
        
        const loopSequenceOriginalFrames = frames.slice(
            frameOutputs[bestLoopStartIndex].originalIndex,
            frameOutputs[bestLoopEndIndex - 1].originalIndex + 1
        );

        const loopDuration = loopSequenceOriginalFrames.reduce((total, frame) => total + frame.duration, 0);

        if (loopDuration <= 0) {
          console.warn('Chosen main section loop duration is zero or negative, skipping looping.');
        } else {
          const targetDuration = loopMinDuration * 60 * 1000;
          let currentTotalDuration = cumulativeDuration;
          const numLoopsNeeded = Math.max(1, Math.ceil((targetDuration - currentTotalDuration) / loopDuration));
          
          console.log(`Main section loop consists of original frames from index ${firstLoopFrameOriginalIndex + 1} to ${frameOutputs[bestLoopEndIndex - 1].originalIndex + 1}.`);
          console.log(`Loop duration: ${loopDuration}ms, Target total duration: ${targetDuration}ms`);
          console.log(`Current total duration before looping: ${currentTotalDuration}ms, Loops needed: ${numLoopsNeeded}`);
          console.log(`Will loop processed frames from index ${bestLoopStartIndex + 1} to ${bestLoopEndIndex} (${bestLoopEndIndex - bestLoopStartIndex} frames) ${numLoopsNeeded} times`);
          
          for (let loopIteration = 0; loopIteration < numLoopsNeeded; loopIteration++) {
            // CRITICAL FIX: Loop from bestLoopStartIndex to bestLoopEndIndex-1 (exclusive end)
            // The bestLoopEndIndex frame is the same as bestLoopStartIndex frame, so including it would cause a duplicate/jump
            for (let k = bestLoopStartIndex; k < bestLoopEndIndex; k++) {
              const currentFrameOutput = frameOutputs[k];
              const originalFrame = frames[currentFrameOutput.originalIndex];

              if (!currentFrameOutput.dataUrl) {
                cumulativeDuration += originalFrame.duration;
                continue;
              }
              
              try {
                const finalDataUrl = currentFrameOutput.dataUrl;
                const pngData = finalDataUrl.split(',')[1];
                fullSequenceDataUrlsForZip.push(finalDataUrl);

                // Add to preview list only for a limited number of outer loop iterations and within frame limit
                if (loopIteration < MAX_PREVIEW_LOOP_ITERATIONS && previewDataUrls.length < MAX_PREVIEW_FRAMES) {
                  previewDataUrls.push(finalDataUrl);
                }
                const filename = `${cumulativeDuration.toString().padStart(6, '0')}.png`;
                framesFolder.file(filename, pngData, { base64: true });
              } catch (error) {
                console.error(`Fehler beim Verarbeiten von Main Section Loop-Frame (original index ${currentFrameOutput.originalIndex + 1}):`, error);
              }
              cumulativeDuration += originalFrame.duration;
            }

            if (loopIteration < MAX_PREVIEW_LOOP_ITERATIONS) {
              previewLoopIterationsDone++;
            }
          }
        }
      } else {
        console.log('No suitable repeating main section frames found for looping based on the new criteria (min length, non-static, longest).');
      }
    }
    
    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Return the blob and the *limited* preview data URLs
    console.log(`[exportUtils] Attempting to return. Preview URLs count: ${previewDataUrls.length}, zipBlob exists: ${!!zipBlob}`);
    console.log(`[exportUtils] Returning ${previewDataUrls.length} frames for preview. Total frames in sequence for ZIP (approx based on fullSequenceDataUrlsForZip): ${fullSequenceDataUrlsForZip.length}.`);
    return { zipBlob, previewDataUrls };
    
  } catch (error) {
    console.error('Error exporting frames to ZIP:', error);
    // throw error; // Propagate error or return null
    return null;
  }
};

// Function to save the entire project
export const saveProject = async (
  projectData: {
    canvasSize: CanvasSize;
    frames: Frame[];
    layers: Layer[];
    animationObjects: AnimationObject[];
    projectName?: string;
    // Neue Felder für Variations
    variations?: Variation[];
    currentVariationId?: string | null;
    mainProjectState?: {
      frames: Frame[];
      layers: Layer[];
      canvasSize: CanvasSize;
      animationObjects: AnimationObject[];
      currentFrameIndex: number;
      currentLayerIndex: number;
      blockedPixels: { [key: string]: boolean };
      subRectangles: SubRectangle[];
      selection: Selection | null;
    } | null;
    // Viewport-Einstellungen als direkte Eigenschaften
    blockedPixels?: { [key: string]: boolean };
    subRectangles?: SubRectangle[];
    // Neu: FileHandle für direktes Speichern im Verzeichnis
    fileHandle?: FileSystemFileHandle;
    directoryHandle?: FileSystemDirectoryHandle;
  },
  existingProjectHistory?: ProjectWithHistory
): Promise<void> => {
  try {
    let projectWithHistory: ProjectWithHistory;
    
    if (existingProjectHistory) {
      // Add a new version to the existing history
      projectWithHistory = addVersionToHistory(existingProjectHistory, projectData);
    } else {
      // Create a new project with history
      projectWithHistory = createProjectWithHistory(projectData);
    }
    
    // Create a JSON string of the project data with history
    const serializedData = JSON.stringify(projectWithHistory);
    
    // Prüfen, ob wir das FileSystem API nutzen können
    if (projectData.fileHandle) {
      // Prüfen, ob wir Schreibrechte haben
      const permission = await (projectData.fileHandle as any).requestPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        // Direkt in die Datei schreiben
        const writable = await projectData.fileHandle.createWritable();
        await writable.write(serializedData);
        await writable.close();
        console.log('Projekt erfolgreich in Datei gespeichert:', projectData.fileHandle.name);
        return;
      }
    } else if (projectData.directoryHandle) {
      // Prüfen, ob wir Schreibrechte haben
      const permission = await (projectData.directoryHandle as any).requestPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        // Dateiname mit .ljp-Endung
        const filename = `${projectData.projectName || 'lightjumper-project'}.ljp`;
        
        // Datei im Verzeichnis erstellen oder überschreiben
        const fileHandle = await projectData.directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(serializedData);
        await writable.close();
        console.log('Projekt erfolgreich im Verzeichnis gespeichert:', filename);
        return;
      }
    }
    
    // Fallback: Traditionelles Speichern mit saveAs
    const blob = new Blob([serializedData], { type: 'application/json' });
    const filename = `${projectData.projectName || 'lightjumper-project'}.ljp`;
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};

// Function to load a project file
export const loadProject = async (
  file: File | FileSystemFileHandle
): Promise<{
  canvasSize: CanvasSize;
  frames: Frame[];
  layers: Layer[];
  animationObjects: AnimationObject[];
  projectName?: string;
  projectHistory?: ProjectWithHistory;
  // Neue Felder für Variations
  variations?: Variation[];
  currentVariationId?: string | null;
  mainProjectState?: {
    frames: Frame[];
    layers: Layer[];
    canvasSize: CanvasSize;
    animationObjects: AnimationObject[];
    currentFrameIndex: number;
    currentLayerIndex: number;
    blockedPixels: { [key: string]: boolean };
    subRectangles: SubRectangle[];
    selection: Selection | null;
  } | null;
  // Viewport-Einstellungen als direkte Eigenschaften
  blockedPixels?: { [key: string]: boolean };
  subRectangles?: SubRectangle[];
  fileHandle?: FileSystemFileHandle; // Neu: FileHandle für späteres Speichern
}> => {
  return new Promise(async (resolve, reject) => {
    try {
      let fileContent: string;

      // Unterscheiden zwischen File und FileSystemFileHandle
      if (file instanceof File) {
        // Traditionelle Methode mit File-Objekt
        fileContent = await readFileAsText(file);
      } else {
        // FileSystem Access API mit FileSystemFileHandle
        // Prüfen, ob wir die Berechtigung haben
        const permission = await (file as any).requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          throw new Error('Keine Berechtigung zum Lesen der Datei');
        }
        
        // Hole das File-Objekt und lese den Inhalt
        const fileObj = await file.getFile();
        fileContent = await fileObj.text();
      }
      
      // JSON-Daten parsen
      const fileData = JSON.parse(fileContent);
      
      // Check if the file contains version history
      if (fileData.currentVersion && fileData.versions && Array.isArray(fileData.versions)) {
        // This is a project with version history
        const projectWithHistory = fileData as ProjectWithHistory;
        
        // Return the current version's data and the full history
        const result = {
          ...projectWithHistory.currentVersion.data,
          projectHistory: projectWithHistory,
          fileHandle: file instanceof FileSystemFileHandle ? file : undefined
        };
        
        // Legacy-Projekt ohne Variations - leere Werte verwenden
        if (!result.variations) {
          result.variations = [];
        }
        if (result.currentVariationId === undefined) {
          result.currentVariationId = null;
        }
        if (!result.mainProjectState) {
          result.mainProjectState = null;
        }
        
        resolve(result);
      } else {
        // This is a legacy project without version history
        const legacyProject = fileData;
        
        // Legacy-Projekt ohne Variations - leere Werte verwenden
        if (!legacyProject.variations) {
          legacyProject.variations = [];
        }
        if (legacyProject.currentVariationId === undefined) {
          legacyProject.currentVariationId = null;
        }
        if (!legacyProject.mainProjectState) {
          legacyProject.mainProjectState = null;
        }

        // Füge das fileHandle hinzu, wenn es ein FileSystemFileHandle ist
        if (file instanceof FileSystemFileHandle) {
          legacyProject.fileHandle = file;
        }
        
        resolve(legacyProject);
      }
    } catch (error) {
      reject(error);
    }
  });
};

// Hilfsfunktion zum Lesen eines File-Objekts als Text
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target || typeof event.target.result !== 'string') {
        reject(new Error('Failed to read file'));
        return;
      }
      
      resolve(event.target.result);
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading project file'));
    };
    
    reader.readAsText(file);
  });
};

// Function to draw pixels with grid lines similar to the editor view
export const drawPixelsWithGridLines = (
  ctx: CanvasRenderingContext2D,
  pixels: PixelData[],
  canvasWidth: number,
  canvasHeight: number,
  pixelSize: number = 1,
  backgroundColor: string | undefined | null,
  gridLineColor: string | undefined | null, 
  gridLineWidth: number = 1,
  drawCanvasBorder: boolean = true,
  borderColor: string = 'rgba(180, 180, 180, 0.9)',
  viewportOffsetX: number = 0,
  viewportOffsetY: number = 0,
  blockedPixels?: { [key: string]: boolean } // Optional hinzugefügt
) => {
  // Fill with specified background color first
  // This ensures unpainted, non-blocked pixels get the chosen background
  ctx.fillStyle = backgroundColor || '#1a1a2e'; // Use passed color or default dark blue
  ctx.fillRect(0, 0, canvasWidth * pixelSize, canvasHeight * pixelSize);
  
  // Draw grid lines FIRST
  // Drawing them first ensures that clearRect for blocked pixels removes the grid lines too.
  ctx.strokeStyle = gridLineColor || 'rgba(60, 60, 60, 0.7)'; // Use passed color or default darker gray
  ctx.lineWidth = gridLineWidth;
  const scaledWidth = canvasWidth * pixelSize;
  const scaledHeight = canvasHeight * pixelSize;

  // Draw vertical grid lines
  for (let x = 0; x <= canvasWidth; x++) {
    ctx.beginPath();
    const lineX = x * pixelSize;
    ctx.moveTo(lineX, 0);
    ctx.lineTo(lineX, scaledHeight);
    ctx.stroke();
  }

  // Draw horizontal grid lines
  for (let y = 0; y <= canvasHeight; y++) {
    ctx.beginPath();
    const lineY = y * pixelSize;
    ctx.moveTo(0, lineY);
    ctx.lineTo(scaledWidth, lineY);
    ctx.stroke();
  }

  // Create a map for quick pixel lookup using absolute coordinates
  const pixelMap: { [key: string]: PixelData } = {};
  pixels.forEach(p => {
    // Ensure pixel has valid coordinates before adding to map
    if (typeof p.x === 'number' && typeof p.y === 'number') {
      pixelMap[`${p.x},${p.y}`] = p;
    } else {
      console.warn("Skipping pixel with invalid coordinates:", p);
    }
  });

  // Sammle alle blockierten Pixel in einem Set für schnellen Zugriff
  const blockedPixelKeys = new Set<string>();
  if (blockedPixels) {
    Object.keys(blockedPixels).forEach(key => {
      if (blockedPixels[key]) {
        blockedPixelKeys.add(key);
      }
    });
  }

  // Iterate through each cell of the viewport grid
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      // Calculate absolute coordinates within the original canvas
      const absoluteX = x + viewportOffsetX;
      const absoluteY = y + viewportOffsetY;
      const blockKey = `${absoluteX},${absoluteY}`;
      const pixelKey = `${absoluteX},${absoluteY}`; // Use absolute coords for pixel map lookup

      // Calculate drawing coordinates relative to the viewport canvas
      const drawX = x * pixelSize;
      const drawY = y * pixelSize;

      // Check if the absolute coordinate is blocked
      if (blockedPixelKeys.has(blockKey)) {
        // Blocked pixel: clear the area to make it transparent
        ctx.clearRect(drawX, drawY, pixelSize, pixelSize);
      } else {
        // Check if there's a painted pixel at the absolute coordinate
        const paintedPixel = pixelMap[pixelKey];
        if (paintedPixel) {
          // Zurück zur einfachen Methode - direkt mit fillStyle und fillRect zeichnen
          ctx.fillStyle = paintedPixel.color;
          ctx.fillRect(drawX, drawY, pixelSize, pixelSize);
        }
        // Else: The cell is neither blocked nor painted.
        // Do nothing, the background color is already there.
      }
    }
  }

  // Draw canvas border
  if (drawCanvasBorder) {
    const borderWidth = Math.max(2, pixelSize / 4); // Dickere Linie für bessere Sichtbarkeit

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;

    // Das Border wird leicht nach innen versetzt, damit es vollständig sichtbar ist
    const offset = borderWidth / 2;

    ctx.beginPath();
    ctx.rect(
      offset, 
      offset, 
      canvasWidth * pixelSize - borderWidth, 
      canvasHeight * pixelSize - borderWidth
    );
    ctx.stroke();
  }
};

// Helper function to get decomposed RGBA values for a pixel
function getPixelRGBA(pixel: PixelData): { r: number; g: number; b: number; a: number } {
  let r = 0, g = 0, b = 0;
  let alphaByte = 255; // Default alpha is opaque (255) for hex/rgb unless pixelNumber overrides
  const colorStr = pixel.color;
  let colorParsedSuccessfully = false;

  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) { // Expand #RGB to #RRGGBB
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length === 6) {
      const bigint = parseInt(hex, 16);
      if (!isNaN(bigint)) {
        r = (bigint >> 16) & 255;
        g = (bigint >> 8) & 255;
        b = bigint & 255;
        colorParsedSuccessfully = true;
      }
    }
  } else if (colorStr.startsWith('rgb(') && !colorStr.startsWith('rgba(')) {
    const parts = colorStr.substring(4, colorStr.length - 1).split(',').map(s => parseInt(s.trim(), 10));
    if (parts.length === 3 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
      r = parts[0]; g = parts[1]; b = parts[2];
      colorParsedSuccessfully = true;
    }
  } else if (colorStr.startsWith('rgba(')) {
    const partsStr = colorStr.substring(5, colorStr.length - 1).split(',');
    if (partsStr.length === 4) {
        const rVal = parseInt(partsStr[0].trim(), 10);
        const gVal = parseInt(partsStr[1].trim(), 10);
        const bVal = parseInt(partsStr[2].trim(), 10);
        const aVal = parseFloat(partsStr[3].trim());

        if (![rVal, gVal, bVal].some(isNaN) && rVal >=0 && rVal <=255 && gVal >=0 && gVal <=255 && bVal >=0 && bVal <=255 && !isNaN(aVal) && aVal >=0 && aVal <=1) {
            r = rVal; g = gVal; b = bVal;
            alphaByte = Math.round(aVal * 255); // Preserve original alpha from rgba()
            colorParsedSuccessfully = true;
        }
    }
  }

  if (!colorParsedSuccessfully) {
    // If color parsing failed, default to black. Alpha will be 255 unless overridden by pixelNumber.
    r = 0; g = 0; b = 0;
  }

  // If pixelNumber is defined, it overrides any previously determined alpha.
  if (pixel.pixelNumber !== undefined) {
    alphaByte = Math.max(0, Math.min(255, Math.round(pixel.pixelNumber)));
  }

  return { r, g, b, a: alphaByte };
}

// NEUE FUNKTION: Generiert eine Data URL für einen Frame, wobei vollständig blockierte Zeilen/Spalten entfernt werden
export const generateReducedFrameDataURL = (
  frame: Frame,
  canvasSize: CanvasSize,
  blockedPixels: { [key: string]: boolean },
  animationObjects: AnimationObject[],
  layers: Layer[],
  precalculatedAnimationPixels: PixelData[] // Hinzugefügt
): { dataUrl: string | null; fingerprint: string | null } => {
  const { width, height, viewportX, viewportY } = canvasSize;

  // 1. Alle relevanten Pixel für den Frame sammeln und nach Renderposition sortieren
  const animationPixels = precalculatedAnimationPixels;
  
  // Gruppiere Animationspixel nach ihrer Renderposition
  const foregroundAnimationPixels: PixelData[] = [];
  const backgroundAnimationPixels: PixelData[] = [];
  const layerSpecificAnimationPixels: Record<string, PixelData[]> = {};
  
  // Sortiere Animationspixel nach ihrer Renderposition
  animationPixels.forEach(pixel => {
    if (!pixel.animationId) {
      foregroundAnimationPixels.push(pixel);
      return;
    }
    
    const animation = animationObjects.find(anim => anim.id === pixel.animationId);
    if (!animation) {
      foregroundAnimationPixels.push(pixel);
      return;
    }
    
    const renderPosition = animation.renderPosition || 'FOREGROUND';
    
    if (renderPosition === 'FOREGROUND') {
      foregroundAnimationPixels.push(pixel);
    } else if (renderPosition === 'BACKGROUND') {
      backgroundAnimationPixels.push(pixel);
    } else if (renderPosition === 'ON_LAYER' && animation.layerId) {
      if (!layerSpecificAnimationPixels[animation.layerId]) {
        layerSpecificAnimationPixels[animation.layerId] = [];
      }
      layerSpecificAnimationPixels[animation.layerId].push(pixel);
    } else {
      foregroundAnimationPixels.push(pixel);
    }
  });
  
  // Sammle Pixel in der richtigen Renderreihenfolge
  const visibleLayers = layers.filter(l => l.visible).map(l => l.id);
  
  // 1. Zuerst Hintergrund-Animationen
  let allPixels: PixelData[] = [...backgroundAnimationPixels];
  
  // 2. Dann jede Ebene mit ihren zugehörigen Animationen
  visibleLayers.forEach(layerId => {
    // Reguläre Pixel dieser Ebene hinzufügen
    if (frame.layerData[layerId]) {
      allPixels = [...allPixels, ...(frame.layerData[layerId] || [])];
    }
    
    // Animationspixel dieser Ebene hinzufügen
    if (layerSpecificAnimationPixels[layerId]) {
      allPixels = [...allPixels, ...(layerSpecificAnimationPixels[layerId] || [])];
    }
  });
  
  // 3. Schließlich die vorderen und hinteren Animations-Pixel hinzufügen
  allPixels = [...allPixels, ...foregroundAnimationPixels];
  
  // 2. Analysieren, welche Zeilen/Spalten innerhalb des Viewports vollständig blockiert sind
  // (nur blockierte Pixel enthalten, keine sichtbaren)
  const isRowEffectivelyBlocked = Array(height).fill(false); // Standardmäßig NICHT blockiert
  const isColEffectivelyBlocked = Array(width).fill(false);  // Standardmäßig NICHT blockiert
  
  const rowBlockedPixelCount = Array(height).fill(0);
  const colBlockedPixelCount = Array(width).fill(0);
  
  const rowHasVisiblePixel = Array(height).fill(false);
  const colHasVisiblePixel = Array(width).fill(false);
  
  // Filter pixels to only include those within viewport
  const viewportPixels = allPixels.filter(pixel => 
    pixel.x >= viewportX && 
    pixel.x < viewportX + width && 
    pixel.y >= viewportY && 
    pixel.y < viewportY + height
  );
  
  // Zuerst: Zähle sichtbare Pixel pro Zeile/Spalte
  for (const pixel of viewportPixels) {
    const localX = pixel.x - viewportX;
    const localY = pixel.y - viewportY;
    
    if (localX >= 0 && localX < width && localY >= 0 && localY < height) {
      rowHasVisiblePixel[localY] = true;
      colHasVisiblePixel[localX] = true;
    }
  }
  
  // Dann: Zähle blockierte Pixel in jeder Zeile/Spalte
  for (let localY = 0; localY < height; localY++) {
    for (let localX = 0; localX < width; localX++) {
      const globalX = localX + viewportX;
      const globalY = localY + viewportY;
      
      const cellKey = `${globalX},${globalY}`;
      const isBlocked = blockedPixels[cellKey];
      
      if (isBlocked) {
        rowBlockedPixelCount[localY]++;
        colBlockedPixelCount[localX]++;
      }
    }
  }
  
  // Eine Zeile/Spalte ist nur "effektiv blockiert", wenn:
  // 1. ALLE Pixel in der Zeile/Spalte blockiert sind ODER
  // 2. Es KEINE sichtbaren (bemalten) Pixel gibt UND eine Großteil der Pixel blockiert ist (>80%)
  for (let i = 0; i < height; i++) {
    const fullyBlocked = rowBlockedPixelCount[i] === width;
    const mostlyBlocked = rowBlockedPixelCount[i] >= Math.floor(width * 0.8);
    const noVisiblePixels = !rowHasVisiblePixel[i];
    
    isRowEffectivelyBlocked[i] = fullyBlocked || (mostlyBlocked && noVisiblePixels);
  }
  
  for (let i = 0; i < width; i++) {
    const fullyBlocked = colBlockedPixelCount[i] === height;
    const mostlyBlocked = colBlockedPixelCount[i] >= Math.floor(height * 0.8);
    const noVisiblePixels = !colHasVisiblePixel[i];
    
    isColEffectivelyBlocked[i] = fullyBlocked || (mostlyBlocked && noVisiblePixels);
  }
  
  // Prüfen, ob überhaupt etwas übrig bleibt
  const hasVisibleContent = isRowEffectivelyBlocked.some(blocked => !blocked) && 
                            isColEffectivelyBlocked.some(blocked => !blocked);
  if (!hasVisibleContent) {
      console.warn('Frame enthält keine sichtbaren, unblockierten Pixel nach Reduzierung.');
      return { dataUrl: null, fingerprint: null }; // Nichts zu exportieren
  }

  // 3. Neue Dimensionen berechnen
  const newWidth = isColEffectivelyBlocked.filter(blocked => !blocked).length;
  const newHeight = isRowEffectivelyBlocked.filter(blocked => !blocked).length;

  if (newWidth === 0 || newHeight === 0) {
    return { dataUrl: null, fingerprint: null }; // Nichts zu exportieren
  }

  // 4. Koordinaten-Mapping erstellen (von Viewport-Koordinaten zu reduzierten Koordinaten)
  const rowMap: number[] = [];
  let currentRowIndex = 0;
  for (let y = 0; y < height; y++) {
    if (!isRowEffectivelyBlocked[y]) {
      rowMap[y] = currentRowIndex++;
    }
  }

  const colMap: number[] = [];
  let currentColIndex = 0;
  for (let x = 0; x < width; x++) {
    if (!isColEffectivelyBlocked[x]) {
      colMap[x] = currentColIndex++;
    }
  }

  // 5. Neuen Canvas erstellen und Pixel zeichnen
  const newCanvas = document.createElement('canvas');
  newCanvas.width = newWidth;
  newCanvas.height = newHeight;
  const ctx = newCanvas.getContext('2d');

  if (!ctx) {
    console.error('Konnte keinen 2D-Kontext für reduzierten Export-Canvas erhalten.');
    return { dataUrl: null, fingerprint: null };
  }

  // 1. Fill with opaque black
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(0, 0, newWidth, newHeight);

  // 2. Get ImageData
  let canvasImageData = ctx.getImageData(0, 0, newWidth, newHeight);
  let dataArr = canvasImageData.data;

  // 3. Draw viewportPixels by modifying ImageData
  for (const pixel of viewportPixels) {
    const localX = pixel.x - viewportX;
    const localY = pixel.y - viewportY;
    
    if (isRowEffectivelyBlocked[localY] || isColEffectivelyBlocked[localX]) {
      continue;
    }
    
    const newX = colMap[localX]; // Mapped X to reduced canvas
    const newY = rowMap[localY]; // Mapped Y to reduced canvas
    
    if (newX >= 0 && newX < newWidth && newY >= 0 && newY < newHeight) { 
      const { r, g, b, a: alphaByte } = getPixelRGBA(pixel);
      const index = (newY * newWidth + newX) * 4;
      
      dataArr[index]     = r;
      dataArr[index + 1] = g;
      dataArr[index + 2] = b;
      dataArr[index + 3] = alphaByte;
    }
  }
  
  // 4. Put ImageData back
  ctx.putImageData(canvasImageData, 0, 0);

  const dataUrl = newCanvas.toDataURL('image/png');
  const fingerprint = Array.from(dataArr).join(','); // Create fingerprint from raw pixel data

  return { dataUrl, fingerprint };
};

// Vereinfachte Version der generateReducedFrameDataURL-Funktion ohne Animationen
// Diese Funktion wird verwendet, wenn keine Animationsobjekte vorhanden sind
export const generateSimpleFrameDataURL = (
  frame: Frame,
  canvasSize: CanvasSize,
  blockedPixels: { [key: string]: boolean },
  layers: Layer[]
): { dataUrl: string | null; fingerprint: string | null } => {
  const { width, height, viewportX, viewportY } = canvasSize;

  // Sammle alle Pixel von sichtbaren Ebenen
  let allPixels: PixelData[] = [];
  const visibleLayers = layers.filter(l => l.visible).map(l => l.id);
  
  // Pixel von sichtbaren Ebenen hinzufügen
  visibleLayers.forEach(layerId => {
    if (frame.layerData[layerId]) {
      allPixels = [...allPixels, ...(frame.layerData[layerId] || [])];
    }
  });
  
  // Rest der Funktion ist identisch mit generateReducedFrameDataURL, nur ohne Animations-Verarbeitung
  const isRowEffectivelyBlocked = Array(height).fill(false);
  const isColEffectivelyBlocked = Array(width).fill(false);
  
  const rowBlockedPixelCount = Array(height).fill(0);
  const colBlockedPixelCount = Array(width).fill(0);
  
  const rowHasVisiblePixel = Array(height).fill(false);
  const colHasVisiblePixel = Array(width).fill(false);
  
  // Filter pixels to only include those within viewport
  const viewportPixels = allPixels.filter(pixel => 
    pixel.x >= viewportX && 
    pixel.x < viewportX + width && 
    pixel.y >= viewportY && 
    pixel.y < viewportY + height
  );
  
  // Zuerst: Zähle sichtbare Pixel pro Zeile/Spalte
  for (const pixel of viewportPixels) {
    const localX = pixel.x - viewportX;
    const localY = pixel.y - viewportY;
    
    if (localX >= 0 && localX < width && localY >= 0 && localY < height) {
      rowHasVisiblePixel[localY] = true;
      colHasVisiblePixel[localX] = true;
    }
  }
  
  // Dann: Zähle blockierte Pixel in jeder Zeile/Spalte
  for (let localY = 0; localY < height; localY++) {
    for (let localX = 0; localX < width; localX++) {
      const globalX = localX + viewportX;
      const globalY = localY + viewportY;
      
      const cellKey = `${globalX},${globalY}`;
      const isBlocked = blockedPixels[cellKey];
      
      if (isBlocked) {
        rowBlockedPixelCount[localY]++;
        colBlockedPixelCount[localX]++;
      }
    }
  }
  
  // Eine Zeile/Spalte ist nur "effektiv blockiert", wenn:
  // 1. ALLE Pixel in der Zeile/Spalte blockiert sind ODER
  // 2. Es KEINE sichtbaren (bemalten) Pixel gibt UND eine Großteil der Pixel blockiert ist (>80%)
  for (let i = 0; i < height; i++) {
    const fullyBlocked = rowBlockedPixelCount[i] === width;
    const mostlyBlocked = rowBlockedPixelCount[i] >= Math.floor(width * 0.8);
    const noVisiblePixels = !rowHasVisiblePixel[i];
    
    isRowEffectivelyBlocked[i] = fullyBlocked || (mostlyBlocked && noVisiblePixels);
  }
  
  for (let i = 0; i < width; i++) {
    const fullyBlocked = colBlockedPixelCount[i] === height;
    const mostlyBlocked = colBlockedPixelCount[i] >= Math.floor(height * 0.8);
    const noVisiblePixels = !colHasVisiblePixel[i];
    
    isColEffectivelyBlocked[i] = fullyBlocked || (mostlyBlocked && noVisiblePixels);
  }
  
  // Prüfen, ob überhaupt etwas übrig bleibt
  const hasVisibleContent = isRowEffectivelyBlocked.some(blocked => !blocked) && 
                            isColEffectivelyBlocked.some(blocked => !blocked);
  if (!hasVisibleContent) {
    console.warn('Frame enthält keine sichtbaren, unblockierten Pixel nach Reduzierung.');
    return { dataUrl: null, fingerprint: null }; // Nichts zu exportieren
  }
  
  // Neue Dimensionen berechnen
  const newWidth = isColEffectivelyBlocked.filter(blocked => !blocked).length;
  const newHeight = isRowEffectivelyBlocked.filter(blocked => !blocked).length;
  
  if (newWidth === 0 || newHeight === 0) {
    return { dataUrl: null, fingerprint: null }; // Nichts zu exportieren
  }
  
  // Koordinaten-Mapping erstellen
  const rowMap: number[] = [];
  let currentRowIndex = 0;
  for (let y = 0; y < height; y++) {
    if (!isRowEffectivelyBlocked[y]) {
      rowMap[y] = currentRowIndex++;
    }
  }

  const colMap: number[] = [];
  let currentColIndex = 0;
  for (let x = 0; x < width; x++) {
    if (!isColEffectivelyBlocked[x]) {
      colMap[x] = currentColIndex++;
    }
  }

  // Neuen Canvas erstellen und Pixel zeichnen
  const newCanvas = document.createElement('canvas');
  newCanvas.width = newWidth;
  newCanvas.height = newHeight;
  const ctx = newCanvas.getContext('2d');
  
  if (!ctx) {
    console.error('Konnte keinen 2D-Kontext für reduzierten Export-Canvas erhalten.');
    return { dataUrl: null, fingerprint: null };
  }
  
  // 1. Fill with opaque black
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(0, 0, newWidth, newHeight);

  // 2. Get ImageData
  let canvasImageData = ctx.getImageData(0, 0, newWidth, newHeight);
  let dataArr = canvasImageData.data;

  // 3. Draw viewportPixels by modifying ImageData
  for (const pixel of viewportPixels) {
    const localX = pixel.x - viewportX;
    const localY = pixel.y - viewportY;
    
    if (isRowEffectivelyBlocked[localY] || isColEffectivelyBlocked[localX]) {
      continue;
    }
    
    const newX = colMap[localX];
    const newY = rowMap[localY];
    
    if (newX >= 0 && newX < newWidth && newY >= 0 && newY < newHeight) {
      const { r, g, b, a: alphaByte } = getPixelRGBA(pixel);
      const index = (newY * newWidth + newX) * 4;
      
      dataArr[index]     = r;
      dataArr[index + 1] = g;
      dataArr[index + 2] = b;
      dataArr[index + 3] = alphaByte;
    }
  }
  
  // 4. Put ImageData back
  ctx.putImageData(canvasImageData, 0, 0);

  const dataUrl = newCanvas.toDataURL('image/png');
  const fingerprint = Array.from(dataArr).join(','); // Create fingerprint from raw pixel data

  return { dataUrl, fingerprint };
};

// Function to export frames directly to a folder with PNGs using timestamped filenames
export const exportFramesToFolder = async (
  frames: Frame[],
  animations: AnimationObject[],
  canvasSize: CanvasSize,
  projectName: string,
  blockedPixels: { [key: string]: boolean },
  layers: Layer[],
  directoryHandle: FileSystemDirectoryHandle,
  rotate180: boolean = false,
  enableLooping: boolean = false,
  loopMinDuration: number = 10, // in minutes
  loopStartFrameIndex: number = 0, // 0-based index within main section frames where to start looking for loops
  minMeaningfulLoopSegmentFrames: number = 3, // Minimum number of frames in a non-static loop segment
  updateProgress?: (progress: number, status: string) => void
): Promise<boolean> => {
  try {
    updateProgress?.(0, 'Initialisiere Export...');
    
    // Create or get the project folder
    let projectFolder: FileSystemDirectoryHandle;
    try {
      projectFolder = await directoryHandle.getDirectoryHandle(projectName, { create: true });
    } catch (error) {
      console.error('Fehler beim Erstellen des Projektordners:', error);
      return false;
    }

    // Check if folder already exists and clear it if needed
    try {
      // Remove all existing PNG files in the folder
      for await (const [name, handle] of projectFolder.entries()) {
        if (handle.kind === 'file' && name.toLowerCase().endsWith('.png')) {
          await projectFolder.removeEntry(name);
        }
      }
    } catch (error) {
      console.warn('Warnung beim Löschen bestehender Dateien:', error);
    }

    updateProgress?.(5, 'Berechne Animationen...');
    
    // Calculate the cumulative duration for filename generation
    let cumulativeDuration = 0;
    
    // Für Frame-Export ohne Animation lieber einen direkteren Weg gehen
    const hasAnimations = animations && animations.length > 0;
    
    // For looping functionality: Store frame fingerprints and their corresponding data URLs
    const frameOutputs: { fingerprint: string | null; dataUrl: string | null; originalIndex: number }[] = [];
    let bestLoopStartIndex = -1; // Index in frameOutputs for the chosen loop
    let bestLoopEndIndex = -1;   // Index in frameOutputs for the chosen loop
    let maxLoopSegmentLength = 0; // To prioritize longer valid loops
    
    // Pre-calculate all animation pixels for ALL frames at once, wenn Animationen vorhanden sind
    let allAnimationPixels: Record<string, PixelData[]> = {};
    if (hasAnimations) {
      allAnimationPixels = applyAnimationsToFrames(
        frames,
        animations,
        canvasSize,
        blockedPixels
      );
    }
    
    updateProgress?.(10, 'Erstelle settings.json...');
    
    // Erstelle eine settings.json-Datei mit den spezifischen Werten
    const settings = {
      value0: {
        panelToHitColor: "#0000ff",
        panelToMissColor: "#ff0000",
        panelToDoubleHitColor: "#ff00ff",
        safeColor: "#00ff00"
      }
    };
    
    // Füge die settings.json zum Ordner hinzu
    try {
      const settingsFileHandle = await projectFolder.getFileHandle('settings.json', { create: true });
      const writable = await settingsFileHandle.createWritable();
      await writable.write(JSON.stringify(settings, null, 2));
      await writable.close();
    } catch (error) {
      console.warn('Warnung beim Erstellen der settings.json:', error);
    }
    
    updateProgress?.(15, 'Verarbeite Frames...');
    
    // Process each frame
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const frameProgress = 15 + Math.floor((i / frames.length) * 70);
      updateProgress?.(frameProgress, `Verarbeite Frame ${i + 1}/${frames.length}`);
      
      try {
        // *** NEUE LOGIK: Generiere reduzierte PNG-Daten und Fingerprint ***
        let frameOutput = hasAnimations ?
          generateReducedFrameDataURL(
            frame,
            canvasSize,
            blockedPixels,
            animations,
            layers,
            allAnimationPixels && allAnimationPixels[frame.id] ? allAnimationPixels[frame.id] : []
          ) :
          generateSimpleFrameDataURL(
            frame,
            canvasSize,
            blockedPixels,
            layers
          );

        // Wenn der Frame nach Reduzierung leer ist, überspringen
        if (!frameOutput.dataUrl || !frameOutput.fingerprint) {
          console.warn(`Frame ${i + 1} (ID: ${frame.id}) ist leer nach Reduzierung und wird übersprungen.`);
          cumulativeDuration += frame.duration; // Wichtig: Dauer trotzdem addieren
          // Store even if empty for correct indexing if looping is enabled
          if (enableLooping) {
            frameOutputs.push({ ...frameOutput, originalIndex: i });
          }
          continue;
        }

        let currentDataUrl = frameOutput.dataUrl;

        if (rotate180) {
          const image = new Image();
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = reject;
            image.src = currentDataUrl!;
          });

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = image.width;
          tempCanvas.height = image.height;
          const tempCtx = tempCanvas.getContext('2d');

          if (tempCtx) {
            tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
            tempCtx.rotate(Math.PI); // Rotate 180 degrees
            tempCtx.translate(-tempCanvas.width / 2, -tempCanvas.height / 2);
            tempCtx.drawImage(image, 0, 0);
            currentDataUrl = tempCanvas.toDataURL('image/png');
            // Note: Fingerprint is based on unrotated image. Rotation changes dataUrl only.
          } else {
            console.warn('Failed to get context for rotation on frame ' + (i + 1));
          }
        }
        
        // Store the output for loop detection if looping is enabled
        if (enableLooping) {
          // Push the original fingerprint, but the potentially rotated dataUrl
          frameOutputs.push({ fingerprint: frameOutput.fingerprint, dataUrl: currentDataUrl, originalIndex: i });
        }
        
        // Convert data URL to PNG base64 data
        const pngData = currentDataUrl.split(',')[1];
        
        // Format the filename based on cumulative duration
        // Format: 000000.png, 000100.png, 000150.png, etc.
        const filename = `${cumulativeDuration.toString().padStart(6, '0')}.png`;
        
        // Save PNG file to folder
        try {
          const fileHandle = await projectFolder.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          
          // Convert base64 to Uint8Array
          const binaryString = atob(pngData);
          const bytes = new Uint8Array(binaryString.length);
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }
          
          await writable.write(bytes);
          await writable.close();
        } catch (error) {
          console.error(`Fehler beim Speichern von Frame ${i + 1} (${filename}):`, error);
          return false;
        }
      } catch (error) {
        console.error(`Fehler beim Verarbeiten von Frame ${i + 1} (ID: ${frame.id}):`, error);
        return false;
      }
      
      // Update cumulative duration for next frame
      cumulativeDuration += frame.duration;
    }
    
    // Handle looping if enabled (similar to ZIP export but save additional files)
    if (enableLooping && frames.length > 1 && loopMinDuration && loopMinDuration > 0) {
      updateProgress?.(85, 'Verarbeite Loop-Logik...');
      
      // Filter frames to only include main section frames for loop detection
      const mainFrames = frames.filter(frame => frame.section === 'main');
      const mainFrameOutputs = frameOutputs.filter(fo => {
        const originalFrame = frames[fo.originalIndex];
        return originalFrame.section === 'main';
      });
      
      if (mainFrameOutputs.length >= 2) {
        // Interpret loopStartFrameIndex as an index within main frames, not all frames
        const effectiveMainFrameStartIndex = loopStartFrameIndex !== undefined ?
          Math.min(Math.max(0, loopStartFrameIndex), mainFrameOutputs.length - 1) : 0;

        // Start searching from the specified main frame index
        let searchStartOutputIndex = effectiveMainFrameStartIndex;
        
        // Ensure the starting frame has a valid fingerprint
        while (searchStartOutputIndex < mainFrameOutputs.length && !mainFrameOutputs[searchStartOutputIndex].fingerprint) {
          searchStartOutputIndex++;
        }
        if (searchStartOutputIndex >= mainFrameOutputs.length) searchStartOutputIndex = 0;

        console.log(`Looking for loops in main section frames starting at main frame index ${effectiveMainFrameStartIndex + 1} (original frame ${mainFrameOutputs[searchStartOutputIndex]?.originalIndex + 1}). Min meaningful segment: ${minMeaningfulLoopSegmentFrames} frames.`);

        // Robust sequence-based loop detection (simplified for folder export)
        for (let loopLength = Math.floor(mainFrameOutputs.length / 2); loopLength >= minMeaningfulLoopSegmentFrames; loopLength--) {
          for (let startPos = searchStartOutputIndex; startPos <= mainFrameOutputs.length - loopLength * 2; startPos++) {
            if (!mainFrameOutputs[startPos].fingerprint) continue;
            
            // Check if we have enough frames for a complete sequence repetition
            if (startPos + loopLength * 2 > mainFrameOutputs.length) continue;
            
            // Validate that the sequence repeats exactly
            let isValidSequenceRepetition = true;
            let hasVariation = false; // Check that it's not just static frames
            
            const firstFrameFingerprint = mainFrameOutputs[startPos].fingerprint;
            
            // Check sequence repetition
            for (let offset = 0; offset < loopLength; offset++) {
              const firstSeqFrame = mainFrameOutputs[startPos + offset];
              const secondSeqFrame = mainFrameOutputs[startPos + loopLength + offset];
              
              if (!firstSeqFrame.fingerprint || !secondSeqFrame.fingerprint ||
                  firstSeqFrame.fingerprint !== secondSeqFrame.fingerprint) {
                isValidSequenceRepetition = false;
                break;
              }
              
              // Check for variation (not all frames are the same)
              if (firstSeqFrame.fingerprint !== firstFrameFingerprint) {
                hasVariation = true;
              }
            }
            
            if (isValidSequenceRepetition && hasVariation && loopLength > maxLoopSegmentLength) {
              bestLoopStartIndex = startPos;
              bestLoopEndIndex = startPos + loopLength - 1;
              maxLoopSegmentLength = loopLength;
              console.log(`Found valid loop: frames ${bestLoopStartIndex + 1}-${bestLoopEndIndex + 1} (length: ${loopLength})`);
            }
          }
          
          // If we found a good loop, stop searching for shorter ones
          if (bestLoopStartIndex !== -1 && bestLoopEndIndex !== -1) {
            break;
          }
        }

        // Now export the loop frames if we found a valid loop
        if (bestLoopStartIndex !== -1 && bestLoopEndIndex !== -1) {
          const firstLoopFrameOutput = frameOutputs[bestLoopStartIndex];
          const firstLoopFrameOriginalIndex = firstLoopFrameOutput.originalIndex;
          
          console.log(`Chosen main section loop: Original frame ${firstLoopFrameOriginalIndex + 1} (processed ${bestLoopStartIndex + 1}) to frame ${frameOutputs[bestLoopEndIndex].originalIndex + 1} (processed ${bestLoopEndIndex + 1}). Loop segment length: ${maxLoopSegmentLength} frames.`);
          
          const loopSequenceOriginalFrames = frames.slice(
              frameOutputs[bestLoopStartIndex].originalIndex,
              frameOutputs[bestLoopEndIndex].originalIndex + 1
          );

          const loopDuration = loopSequenceOriginalFrames.reduce((total, frame) => total + frame.duration, 0);

          if (loopDuration <= 0) {
            console.warn('Chosen main section loop duration is zero or negative, skipping looping.');
          } else {
            const targetDuration = loopMinDuration * 60 * 1000;
            let currentTotalDuration = cumulativeDuration;
            const numLoopsNeeded = Math.max(1, Math.ceil((targetDuration - currentTotalDuration) / loopDuration));
            
            console.log(`Main section loop consists of original frames from index ${firstLoopFrameOriginalIndex + 1} to ${frameOutputs[bestLoopEndIndex].originalIndex + 1}.`);
            console.log(`Loop duration: ${loopDuration}ms, Target total duration: ${targetDuration}ms`);
            console.log(`Current total duration before looping: ${currentTotalDuration}ms, Loops needed: ${numLoopsNeeded}`);
            console.log(`Will loop processed frames from index ${bestLoopStartIndex + 1} to ${bestLoopEndIndex + 1} (${bestLoopEndIndex - bestLoopStartIndex + 1} frames) ${numLoopsNeeded} times`);
            
            updateProgress?.(90, `Exportiere ${numLoopsNeeded} Loop-Iterationen...`);
            
            let loopFrameCount = 0;
            const totalLoopFrames = numLoopsNeeded * (bestLoopEndIndex - bestLoopStartIndex + 1);
            
            for (let loopIteration = 0; loopIteration < numLoopsNeeded; loopIteration++) {
              console.log(`Exportiere Loop-Iteration ${loopIteration + 1}/${numLoopsNeeded}...`);
              
              // Loop from bestLoopStartIndex to bestLoopEndIndex (inclusive)
              for (let k = bestLoopStartIndex; k <= bestLoopEndIndex; k++) {
                const currentFrameOutput = frameOutputs[k];
                const originalFrame = frames[currentFrameOutput.originalIndex];
                
                loopFrameCount++;
                const loopProgress = 90 + Math.floor((loopFrameCount / totalLoopFrames) * 10);
                updateProgress?.(loopProgress, `Exportiere Loop-Frame ${loopFrameCount}/${totalLoopFrames} (Iteration ${loopIteration + 1}/${numLoopsNeeded})`);

                if (!currentFrameOutput.dataUrl) {
                  console.warn(`Loop-Frame ${k} (original ${currentFrameOutput.originalIndex + 1}) hat keine dataUrl, überspringe...`);
                  cumulativeDuration += originalFrame.duration;
                  continue;
                }
                
                try {
                  const finalDataUrl = currentFrameOutput.dataUrl;
                  const pngData = finalDataUrl.split(',')[1];
                  
                  const filename = `${cumulativeDuration.toString().padStart(6, '0')}.png`;
                  console.log(`Speichere Loop-Frame: ${filename} (original frame ${currentFrameOutput.originalIndex + 1})`);
                  
                  // Save PNG file to folder
                  const fileHandle = await projectFolder.getFileHandle(filename, { create: true });
                  const writable = await fileHandle.createWritable();
                  
                  // Convert base64 to Uint8Array
                  const binaryString = atob(pngData);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let j = 0; j < binaryString.length; j++) {
                    bytes[j] = binaryString.charCodeAt(j);
                  }
                  
                  await writable.write(bytes);
                  await writable.close();
                  
                  console.log(`Loop-Frame ${filename} erfolgreich gespeichert`);
                } catch (error) {
                  console.error(`Fehler beim Verarbeiten von Main Section Loop-Frame (original index ${currentFrameOutput.originalIndex + 1}):`, error);
                  return false; // Stop export on error
                }
                cumulativeDuration += originalFrame.duration;
              }
            }
            
            console.log(`Loop-Export abgeschlossen. Insgesamt ${loopFrameCount} Loop-Frames exportiert.`);
          }
        } else {
          console.log('No suitable repeating main section frames found for looping based on the new criteria (min length, non-static, longest).');
        }
      }
    }
    
    updateProgress?.(100, 'Export abgeschlossen!');
    return true;
  } catch (error) {
    console.error('Fehler beim Exportieren in Ordner:', error);
    return false;
  }
};

// Function to save ZIP file to a specific state directory in project folder
export const saveZipToProjectState = async (
  zipBlob: Blob,
  projectDirectory: FileSystemDirectoryHandle,
  projectName: string,
  stateName: string,
  updateProgress?: (progress: number, status: string) => void
): Promise<boolean> => {
  try {
    updateProgress?.(10, 'Erstelle Zustandsordner...');
    
    // Create or get state folder within project directory
    let stateFolder: FileSystemDirectoryHandle;
    try {
      stateFolder = await projectDirectory.getDirectoryHandle(stateName, { create: true });
    } catch (error) {
      console.error('Fehler beim Erstellen des Zustandsordners:', error);
      return false;
    }
    
    updateProgress?.(50, 'Speichere ZIP-Datei...');
    
    // Save the ZIP file itself in the state folder
    const zipFileName = `${projectName}.zip`;
    try {
      const zipFileHandle = await stateFolder.getFileHandle(zipFileName, { create: true });
      const zipWritable = await zipFileHandle.createWritable();
      await zipWritable.write(zipBlob);
      await zipWritable.close();
      console.log(`ZIP-Datei gespeichert als: ${stateName}/${zipFileName}`);
    } catch (error) {
      console.error('Fehler beim Speichern der ZIP-Datei:', error);
      return false;
    }
    
    updateProgress?.(100, 'ZIP-Datei erfolgreich gespeichert!');
    
    return true;
  } catch (error) {
    console.error('Fehler beim Speichern des ZIP-Zustands:', error);
    return false;
  }
};

// Function to download and automatically extract ZIP file
export const downloadAndExtractZIP = async (
  zipBlob: Blob,
  projectName: string,
  updateProgress?: (progress: number, status: string) => void
): Promise<boolean> => {
  try {
    updateProgress?.(0, 'Wähle Zielordner...');
    
    // Let user select directory where to extract
    const directoryHandle = await (window as any).showDirectoryPicker({
      mode: 'readwrite'
    });
    
    updateProgress?.(10, 'Lade ZIP-Datei...');
    
    // Load JSZip
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipBlob);
    
    updateProgress?.(20, 'Erstelle Projektordner...');
    
    // Create or get project folder
    let projectFolder: FileSystemDirectoryHandle;
    try {
      // Try to get existing folder first
      projectFolder = await directoryHandle.getDirectoryHandle(projectName);
      
      // If folder exists, clear it
      updateProgress?.(25, 'Lösche bestehende Dateien...');
      for await (const [name, handle] of projectFolder.entries()) {
        if (handle.kind === 'file') {
          await projectFolder.removeEntry(name);
        }
      }
    } catch (error) {
      // Folder doesn't exist, create it
      projectFolder = await directoryHandle.getDirectoryHandle(projectName, { create: true });
    }
    
    updateProgress?.(30, 'Entpacke Dateien...');
    
    // Extract all files from the ZIP (optimized for speed)
    const files = Object.keys(zipContent.files).filter(filename => !zipContent.files[filename].dir);
    let processedFiles = 0;
    
    console.log(`ZIP enthält ${files.length} Dateien zum Entpacken`);
    
    // Process files in batches for better performance
    // Adjust batch size based on number of files
    const BATCH_SIZE = files.length > 100 ? 20 : files.length > 50 ? 15 : 10;
    const batches = [];
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      batches.push(files.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Verwende Batch-Größe: ${BATCH_SIZE} für ${files.length} Dateien (${batches.length} Batches)`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Process batch in parallel
      const batchPromises = batch.map(async (filename) => {
        try {
          const file = zipContent.files[filename];
          const content = await file.async('uint8array');
          
          // Handle nested folder structure - extract just the filename without folder path
          const actualFilename = filename.includes('/') ? filename.split('/').pop() : filename;
          
          if (actualFilename) {
            // Create file directly in the project folder (not in a subfolder)
            const fileHandle = await projectFolder.getFileHandle(actualFilename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            
            return actualFilename;
          }
          return null;
        } catch (error) {
          console.error(`Fehler beim Entpacken von ${filename}:`, error);
          return null;
        }
      });
      
      // Wait for batch to complete
      const results = await Promise.all(batchPromises);
      processedFiles += results.filter(r => r !== null).length;
      
      const progress = 30 + Math.floor((processedFiles / files.length) * 60);
      updateProgress?.(progress, `Entpacke Batch ${batchIndex + 1}/${batches.length} (${processedFiles}/${files.length} Dateien)...`);
      
      console.log(`Batch ${batchIndex + 1}/${batches.length} abgeschlossen: ${results.filter(r => r !== null).length} Dateien`);
    }
    
    updateProgress?.(95, 'Fertigstelle...');
    
    // Save the original ZIP file for backup
    try {
      const zipFileHandle = await projectFolder.getFileHandle(`${projectName}.zip`, { create: true });
      const zipWritable = await zipFileHandle.createWritable();
      await zipWritable.write(zipBlob);
      await zipWritable.close();
      console.log('ZIP-Backup erstellt');
    } catch (error) {
      console.warn('Konnte ZIP-Backup nicht erstellen:', error);
    }
    
    updateProgress?.(100, 'Abgeschlossen!');
    
    return true;
  } catch (error) {
    console.error('Fehler beim Herunterladen und Entpacken der ZIP:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled the directory picker
      return false;
    }
    
    // Fallback: Just download the ZIP file normally
    updateProgress?.(0, 'Fallback: Lade ZIP-Datei herunter...');
    saveAs(zipBlob, `${projectName}.zip`);
    return false;
  }
};
