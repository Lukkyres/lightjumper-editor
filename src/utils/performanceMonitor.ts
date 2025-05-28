// Performance monitoring utility for animation calculations
interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean = import.meta.env.DEV;

  start(name: string): void {
    if (!this.enabled) return;
    
    this.metrics.set(name, {
      name,
      startTime: performance.now()
    });
  }

  end(name: string): number | null {
    if (!this.enabled) return null;
    
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric '${name}' not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;

    // Log slow operations
    if (duration > 16) { // More than one frame at 60fps
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  measure<T>(name: string, fn: () => T): T {
    if (!this.enabled) return fn();
    
    this.start(name);
    try {
      const result = fn();
      return result;
    } finally {
      this.end(name);
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();
    
    this.start(name);
    try {
      const result = await fn();
      return result;
    } finally {
      this.end(name);
    }
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
  }

  getAverageTime(name: string): number | null {
    const metrics = this.getMetrics().filter(m => m.name === name);
    if (metrics.length === 0) return null;
    
    const total = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / metrics.length;
  }

  clear(): void {
    this.metrics.clear();
  }

  logSummary(): void {
    if (!this.enabled) return;
    
    const metrics = this.getMetrics();
    if (metrics.length === 0) return;

    console.group('Performance Summary');
    
    // Group by name and calculate averages
    const grouped = new Map<string, number[]>();
    metrics.forEach(m => {
      if (!grouped.has(m.name)) {
        grouped.set(m.name, []);
      }
      grouped.get(m.name)!.push(m.duration!);
    });

    grouped.forEach((durations, name) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      
      console.log(`${name}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms, count=${durations.length}`);
    });
    
    console.groupEnd();
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const measurePerformance = <T>(name: string, fn: () => T): T => {
  return performanceMonitor.measure(name, fn);
};

export const measurePerformanceAsync = <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  return performanceMonitor.measureAsync(name, fn);
};

// Animation-specific performance tracking
export const trackAnimationPerformance = {
  countdownGeneration: (fn: () => any) => measurePerformance('countdown-generation', fn),
  rectangleGeneration: (fn: () => any) => measurePerformance('rectangle-generation', fn),
  xGeneration: (fn: () => any) => measurePerformance('x-generation', fn),
  framePreviewRender: (fn: () => any) => measurePerformance('frame-preview-render', fn),
  animationCacheHit: () => performanceMonitor.start('animation-cache-hit'),
  animationCacheMiss: () => performanceMonitor.start('animation-cache-miss'),
  timelinePlayback: (fn: () => any) => measurePerformance('timeline-playback', fn),
}; 