/**
 * Memory Optimizer
 * Detects and prevents memory leaks, optimizes memory usage
 */

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface MemoryLeak {
  type: 'event-listener' | 'interval' | 'observer' | 'dom-reference' | 'closure';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  fix: string;
  element?: HTMLElement;
}

interface ComponentMemoryInfo {
  name: string;
  instances: number;
  memoryUsage: number;
  leaks: MemoryLeak[];
}

export class MemoryOptimizer {
  private memoryHistory: MemoryMetrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private observers: Map<string, { disconnect?: () => void }> = new Map();
  private componentRegistry: Map<string, ComponentMemoryInfo> = new Map();
  private eventListeners: Map<HTMLElement, Set<string>> = new Map();

  constructor() {
    this.startMonitoring();
    this.setupMemoryPressureDetection();
  }

  private startMonitoring(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    this.monitoringInterval = setInterval(() => {
      this.collectMemoryMetrics();
      this.detectMemoryLeaks();
    }, 5000);
  }

  private collectMemoryMetrics(): void {
    if (!('memory' in performance)) return;

    const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const metrics: MemoryMetrics = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      trend: this.calculateTrend(),
    };

    this.memoryHistory.push(metrics);

    // Keep only last 20 measurements
    if (this.memoryHistory.length > 20) {
      this.memoryHistory.shift();
    }
  }

  private calculateTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.memoryHistory.length < 3) return 'stable';

    const recent = this.memoryHistory.slice(-3);
    const first = recent[0].usedJSHeapSize;
    const last = recent[recent.length - 1].usedJSHeapSize;
    const difference = last - first;
    const threshold = first * 0.05; // 5% threshold

    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';
    return 'stable';
  }

  private setupMemoryPressureDetection(): void {
    // Modern browsers support memory pressure API
    if ('memory' in navigator) {
      const navMemory = (navigator as Navigator & { memory?: { addEventListener?: (event: string, handler: () => void) => void } }).memory;
      if (navMemory && typeof navMemory.addEventListener === 'function') {
        navMemory.addEventListener('memoryPressure', () => {
          this.handleMemoryPressure();
        });
      }
    }

    // Fallback: monitor memory usage manually
    this.setupMemoryWarning();
  }

  private setupMemoryWarning(): void {
    setInterval(() => {
      const current = this.getCurrentMemoryMetrics();
      if (current && current.usagePercentage > 80) {
        console.warn('High memory usage detected:', current);
        this.handleMemoryPressure();
      }
    }, 10000);
  }

  private handleMemoryPressure(): void {
    // Trigger garbage collection if available
    if (typeof (window as Window & { gc?: () => void }).gc === 'function') {
      (window as Window & { gc?: () => void }).gc!();
    }

    // Clean up component registry
    this.cleanupComponentRegistry();

    // Emit custom event for components to handle cleanup
    window.dispatchEvent(new CustomEvent('memoryPressure', {
      detail: { metrics: this.getCurrentMemoryMetrics() }
    }));
  }

  private detectMemoryLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    // Check for excessive event listeners
    leaks.push(...this.detectEventListenerLeaks());

    // Check for abandoned DOM references
    leaks.push(...this.detectDOMReferenceLeaks());

    // Check for interval/timeout leaks
    leaks.push(...this.detectTimerLeaks());

    // Check for observer leaks
    leaks.push(...this.detectObserverLeaks());

    return leaks;
  }

  private detectEventListenerLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    this.eventListeners.forEach((events, element) => {
      if (!document.contains(element) && events.size > 0) {
        leaks.push({
          type: 'event-listener',
          severity: 'high',
          description: `Event listeners attached to removed DOM element`,
          fix: 'Remove event listeners in cleanup/unmount',
          element,
        });
      }

      if (events.size > 10) {
        leaks.push({
          type: 'event-listener',
          severity: 'medium',
          description: `Excessive event listeners (${events.size}) on single element`,
          fix: 'Use event delegation or optimize listener management',
          element,
        });
      }
    });

    return leaks;
  }

  private detectDOMReferenceLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    // Check for global variables holding DOM references
    const globalVars = Object.keys(window).filter(key => {
      try {
        const value = (window as unknown as Record<string, unknown>)[key];
        return value instanceof HTMLElement;
      } catch {
        return false;
      }
    });

    if (globalVars.length > 0) {
      leaks.push({
        type: 'dom-reference',
        severity: 'medium',
        description: `${globalVars.length} DOM references in global scope`,
        fix: 'Store DOM references in component state or use refs',
      });
    }

    return leaks;
  }

  private detectTimerLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    // This is a simplified check - in real implementation,
    // you'd need to track timer creation/cleanup
    const timers = (window as Window & { __timers?: unknown[] }).__timers || [];
    if (timers.length > 50) {
      leaks.push({
        type: 'interval',
        severity: 'high',
        description: `Excessive active timers (${timers.length})`,
        fix: 'Clear intervals/timeouts in cleanup functions',
      });
    }

    return leaks;
  }

  private detectObserverLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    if (this.observers.size > 20) {
      leaks.push({
        type: 'observer',
        severity: 'medium',
        description: `Many active observers (${this.observers.size})`,
        fix: 'Disconnect observers when no longer needed',
      });
    }

    return leaks;
  }

  private cleanupComponentRegistry(): void {
    // Remove components with 0 instances
    for (const [name, info] of this.componentRegistry.entries()) {
      if (info.instances <= 0) {
        this.componentRegistry.delete(name);
      }
    }
  }

  // Public API for React components
  public registerComponent(name: string): void {
    const current = this.componentRegistry.get(name) || {
      name,
      instances: 0,
      memoryUsage: 0,
      leaks: [],
    };

    current.instances++;
    this.componentRegistry.set(name, current);
  }

  public unregisterComponent(name: string): void {
    const current = this.componentRegistry.get(name);
    if (current) {
      current.instances = Math.max(0, current.instances - 1);
      this.componentRegistry.set(name, current);
    }
  }

  public trackEventListener(element: HTMLElement, event: string): void {
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, new Set());
    }
    this.eventListeners.get(element)!.add(event);
  }

  public untrackEventListener(element: HTMLElement, event: string): void {
    const events = this.eventListeners.get(element);
    if (events) {
      events.delete(event);
      if (events.size === 0) {
        this.eventListeners.delete(element);
      }
    }
  }

  public registerObserver(id: string, observer: { disconnect?: () => void }): void {
    this.observers.set(id, observer);
  }

  public unregisterObserver(id: string): void {
    const observer = this.observers.get(id);
    if (observer && typeof observer.disconnect === 'function') {
      observer.disconnect();
    }
    this.observers.delete(id);
  }

  public getCurrentMemoryMetrics(): MemoryMetrics | null {
    return this.memoryHistory.length > 0
      ? this.memoryHistory[this.memoryHistory.length - 1]
      : null;
  }

  public getMemoryHistory(): MemoryMetrics[] {
    return [...this.memoryHistory];
  }

  public getComponentRegistry(): Map<string, ComponentMemoryInfo> {
    return new Map(this.componentRegistry);
  }

  public generateMemoryReport(): {
    metrics: MemoryMetrics | null;
    leaks: MemoryLeak[];
    components: ComponentMemoryInfo[];
    recommendations: string[];
  } {
    const metrics = this.getCurrentMemoryMetrics();
    const leaks = this.detectMemoryLeaks();
    const components = Array.from(this.componentRegistry.values());
    const recommendations = this.generateRecommendations(metrics, leaks);

    return {
      metrics,
      leaks,
      components,
      recommendations,
    };
  }

  private generateRecommendations(
    metrics: MemoryMetrics | null,
    leaks: MemoryLeak[]
  ): string[] {
    const recommendations: string[] = [];

    if (metrics && metrics.usagePercentage > 80) {
      recommendations.push('Memory usage is high - consider implementing virtualization');
      recommendations.push('Review component lifecycle and cleanup methods');
    }

    if (leaks.length > 0) {
      recommendations.push('Memory leaks detected - prioritize fixing critical issues');

      const eventLeaks = leaks.filter(l => l.type === 'event-listener');
      if (eventLeaks.length > 0) {
        recommendations.push('Remove event listeners in component cleanup');
      }

      const timerLeaks = leaks.filter(l => l.type === 'interval');
      if (timerLeaks.length > 0) {
        recommendations.push('Clear intervals and timeouts in useEffect cleanup');
      }
    }

    if (metrics && metrics.trend === 'increasing') {
      recommendations.push('Memory usage is trending upward - monitor for leaks');
      recommendations.push('Consider implementing periodic garbage collection triggers');
    }

    recommendations.push('Use React.memo and useMemo to reduce re-renders');
    recommendations.push('Implement lazy loading for large components');

    return recommendations;
  }

  public optimizeMemoryUsage(): void {
    // Force garbage collection if available
    if (typeof (window as Window & { gc?: () => void }).gc === 'function') {
      (window as Window & { gc?: () => void }).gc!();
    }

    // Clean up internal data structures
    this.cleanupComponentRegistry();

    // Disconnect unused observers
    this.observers.forEach((observer, id) => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });

    // Clear memory history to free up space
    if (this.memoryHistory.length > 10) {
      this.memoryHistory = this.memoryHistory.slice(-5);
    }
  }

  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.observers.forEach(observer => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });

    this.observers.clear();
    this.componentRegistry.clear();
    this.eventListeners.clear();
    this.memoryHistory = [];
  }
}

// Singleton instance
export const memoryOptimizer = new MemoryOptimizer();

// React hook for memory monitoring
export function useMemoryOptimization(componentName: string) {
  React.useEffect(() => {
    memoryOptimizer.registerComponent(componentName);

    return () => {
      memoryOptimizer.unregisterComponent(componentName);
    };
  }, [componentName]);

  // Memory-conscious event listener hook
  const useOptimizedEventListener = React.useCallback((
    element: HTMLElement | null,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) => {
    React.useEffect(() => {
      if (!element) return;

      element.addEventListener(event, handler, options);
      memoryOptimizer.trackEventListener(element, event);

      return () => {
        element.removeEventListener(event, handler, options);
        memoryOptimizer.untrackEventListener(element, event);
      };
    }, [element, event, handler, options]);
  }, []);

  return {
    useOptimizedEventListener,
    memoryMetrics: memoryOptimizer.getCurrentMemoryMetrics(),
    optimizeMemory: memoryOptimizer.optimizeMemoryUsage.bind(memoryOptimizer),
  };
}