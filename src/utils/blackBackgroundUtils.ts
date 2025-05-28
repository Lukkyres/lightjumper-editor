import { PixelData } from '../types';

// Helper function to fill viewport with black pixels but spare existing pixels
export function fillViewportWithBlackExceptExistingPixels(
  viewportX: number,
  viewportY: number,
  viewportWidth: number, 
  viewportHeight: number,
  blackColor: string,
  existingPixels: Set<string>,
  animationId: string
): PixelData[] {
  const blackPixels: PixelData[] = [];
  
  // Performance optimization: Pre-allocate array size if possible
  const maxPixels = viewportWidth * viewportHeight;
  const estimatedBlackPixels = maxPixels - existingPixels.size;
  if (estimatedBlackPixels > 0) {
    // Reserve space to avoid array resizing
    blackPixels.length = 0;
  }
  
  // Performance optimization: Use more efficient loop structure
  const endY = viewportY + viewportHeight;
  const endX = viewportX + viewportWidth;
  
  for (let y = viewportY; y < endY; y++) {
    for (let x = viewportX; x < endX; x++) {
      // Performance optimization: Use template literal only when necessary
      if (!existingPixels.has(`${x},${y}`)) {
        blackPixels.push({ x, y, color: blackColor, animationId });
      }
    }
  }
  
  return blackPixels;
}

// Generate particles for disintegration effect (Thanos effect)
export function generateDisintegrationParticles(
  viewportX: number,
  viewportY: number, 
  viewportWidth: number,
  viewportHeight: number,
  blackPixels: PixelData[],
  progress: number,
  particleSize: number,
  animationId: string
): PixelData[] {
  // Calculate the center of the viewport
  const centerX = viewportX + Math.floor(viewportWidth / 2);
  const centerY = viewportY + Math.floor(viewportHeight / 2);
  
  const remainingPixels: PixelData[] = [];
  
  // Helper function to return the gold-white sparkle color
  const generateSparkleColor = (_baseColor: string): string => {
    // Ignore base color and always return the exact same gold-white color
    // Perfect gold-white color: #FFE890
    return '#FFE890';
  };
  
  // For each black pixel, determine if it should be removed based on progress and distance from center
  blackPixels.forEach(pixel => {
    // Calculate distance from center (normalized to 0-1 range)
    const dx = pixel.x - centerX;
    const dy = pixel.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = Math.sqrt(viewportWidth * viewportWidth / 4 + viewportHeight * viewportHeight / 4);
    const normalizedDistance = distance / maxDistance;
    
    // Add randomness to make the effect more natural
    const randomOffset = Math.random() * 0.3; // Random factor for natural look
    
    // Pixel disappears if progress exceeds a threshold based on distance
    // Pixels closer to the center disappear first
    const disappearThreshold = normalizedDistance * 0.8 + randomOffset;
    
    if (progress < disappearThreshold) {
      // Calculate how close this pixel is to disappearing
      // As progress gets closer to the disappear threshold, the pixel starts to sparkle
      const disappearRatio = progress / disappearThreshold;
      
      // If the pixel is close to disappearing (>75% of the way there), add chance of sparkle
      // Larger particle size increases sparkle chance
      const sparkleChance = 0.3 * (particleSize / 2);
      if (disappearRatio > 0.75 && Math.random() < sparkleChance) {
        // Create a glittering/sparkling pixel by changing its color
        const sparklePixel = { 
          ...pixel, 
          color: generateSparkleColor(pixel.color),
          animationId // Ensure the animationId is properly assigned 
        };
        remainingPixels.push(sparklePixel);
      } else {
        remainingPixels.push(pixel);
      }
    }
  });
  
  return remainingPixels;
}

// Generate Matrix-style falling code transition effect
export function generateMatrixTransitionParticles(
  _viewportX: number, // Prefixed with underscore to indicate not directly used
  viewportY: number, 
  _viewportWidth: number, // Prefixed with underscore to indicate not directly used
  viewportHeight: number,
  blackPixels: PixelData[],
  progress: number,
  _particleSize: number, // Prefixed with underscore to indicate not directly used
  animationId: string,
  matrixColor: string = '#00FF41' // Default Matrix green color, now customizable
): PixelData[] {
  const remainingPixels: PixelData[] = [];
  
  // Create columns for the Matrix effect
  const columns: Record<number, number[]> = {};
  
  // Group pixels by their x-coordinate (column)
  blackPixels.forEach(pixel => {
    if (!columns[pixel.x]) {
      columns[pixel.x] = [];
    }
    columns[pixel.x].push(pixel.y);
  });
  
  // For each column, determine which pixels should remain based on the progress
  Object.entries(columns).forEach(([xStr, yValues]) => {
    const x = parseInt(xStr);
    
    // Sort y-values in ascending order (top to bottom)
    yValues.sort((a, b) => a - b);
    
    // Calculate how many pixels from top should remain
    // The matrix effect makes pixels disappear from bottom to top as progress increases
    const pixelsToKeep = Math.ceil(yValues.length * (1 - progress));
    
    // Keep only the top pixels based on progress
    for (let i = 0; i < pixelsToKeep; i++) {
      if (i < yValues.length) {
        // For the bottom few pixels of each column that are about to disappear,
        // add the Matrix color effect
        const isNearBottom = i > pixelsToKeep - 3 && Math.random() < 0.7;
        
        if (isNearBottom) {
          // Create a colored trailing pixel
          remainingPixels.push({
            x,
            y: yValues[i],
            color: matrixColor,
            animationId
          });
        } else {
          // Keep the original black pixel
          remainingPixels.push({
            x,
            y: yValues[i],
            color: '#000000',
            animationId
          });
        }
      }
    }
    
    // Add additional Matrix code trail/rain effect
    if (progress > 0.3 && Math.random() < 0.2) {
      // Occasionally add a falling code character below the column
      const lowestKeptPixel = yValues[pixelsToKeep - 1] || viewportY;
      const trailLength = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 1; j <= trailLength; j++) {
        const trailY = lowestKeptPixel + j;
        // Only add the trail if it's within the viewport
        if (trailY < viewportY + viewportHeight) {
          remainingPixels.push({
            x,
            y: trailY,
            color: matrixColor,
            animationId
          });
        }
      }
    }
  });
  
  return remainingPixels;
}

// Generate Spiral transition effect
export function generateSpiralTransitionParticles(
  viewportX: number,
  viewportY: number, 
  viewportWidth: number,
  viewportHeight: number,
  blackPixels: PixelData[],
  progress: number,
  _particleSize: number, // Prefixed with underscore to indicate not directly used
  animationId: string
): PixelData[] {
  const remainingPixels: PixelData[] = [];
  
  // Calculate center of viewport
  const centerX = viewportX + Math.floor(viewportWidth / 2);
  const centerY = viewportY + Math.floor(viewportHeight / 2);
  
  // Helper function to get angle of a point relative to center (in radians)
  const getAngle = (x: number, y: number): number => {
    return Math.atan2(y - centerY, x - centerX);
  };
  
  // Helper function to get distance of a point from center
  const getDistance = (x: number, y: number): number => {
    const dx = x - centerX;
    const dy = y - centerY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Sort pixels by their angle and distance to create spiral effect
  const pixelsWithMetadata = blackPixels.map(pixel => {
    const angle = getAngle(pixel.x, pixel.y);
    const distance = getDistance(pixel.x, pixel.y);
    return {
      ...pixel,
      angle, // Angle in radians
      distance
    };
  });
  
  // Create a true spiral effect by calculating a spiral function for each pixel
  // The formula combines angle and distance in a way that creates a smooth spiral
  
  // Sort by distance from center to ensure proper layering for spiral effect
  pixelsWithMetadata.sort((a, b) => a.distance - b.distance);
  
  // Calculate how much of the spiral should be gone based on progress
  const spiralProgress = progress * 5; // More revolutions for smoother effect
  
  pixelsWithMetadata.forEach(pixel => {
    // Normalize angle to 0-2π
    let normalizedAngle = pixel.angle;
    if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
    
    // Create a smoother spiral formula that combines angle and distance
    // This formula creates a true logarithmic spiral effect
    const maxDist = Math.sqrt(Math.pow(viewportWidth/2, 2) + Math.pow(viewportHeight/2, 2));
    const normalizedDist = pixel.distance / maxDist;
    
    // The key to a true spiral: combine angle with logarithm of distance
    // This creates the classic spiral equation r = a*e^(b*θ) in a discretized form
    const spiralValue = normalizedAngle / (2 * Math.PI) + Math.log(1 + normalizedDist * 8) / 2;
    
    // Keep the pixel if it's not time to remove it yet based on the spiral progress
    if (spiralValue > spiralProgress) {
      // Calculate how close we are to the spiral edge for coloring effects
      const distToEdge = spiralValue - spiralProgress;
      
      if (distToEdge < 0.05) {
        // Create rainbow effect at the leading edge of the spiral
        // Use both angle and distance to create a truly colorful spiral
        const hue = (normalizedAngle * 180 / Math.PI + (normalizedDist * 180)) % 360;
        const saturation = 100;
        const lightness = 60 - (distToEdge * 800); // Brighter at the very edge
        const edgeColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        remainingPixels.push({
          x: pixel.x,
          y: pixel.y,
          color: edgeColor,
          animationId
        });
      } else {
        // Standard pixel color varies slightly by distance from edge
        const hue = (normalizedAngle * 180 / Math.PI) % 360;
        const saturation = 70;
        const lightness = 30 + (normalizedDist * 20); // Slight variation based on distance
        const baseColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        remainingPixels.push({
          x: pixel.x,
          y: pixel.y,
          color: baseColor,
          animationId
        });
      }
    }
  });
  
  return remainingPixels;
}
