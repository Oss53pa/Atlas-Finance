/**
 * Performance Monitoring System
 * Real-time performance tracking and optimization recommendations
 */

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte

  // Custom Metrics
  domContentLoaded: number | null;
  loadComplete: number | null;
  memoryUsage: number | null;
  networkSpeed: string | null;
  deviceType: string;

  // React Specific
  componentRenderTime: Map<string, number>;
  rerenderCount: Map<string, number>;
  bundleSize: number | null;
}

interface PerformanceIssue {
  type: 'critical' | 'warning' | 'info';
  category: 'loading' | 'rendering' | 'memory' | 'network' | 'bundle';
  message: string;
  impact: number; // 1-10 scale
  fix: string;
  priority: 'high' | 'medium' | 'low';
}

interface PerformanceReport {
  score: number; // 0-100
  metrics: PerformanceMetrics;
  issues: PerformanceIssue[];
  recommendations: string[];
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    domContentLoaded: null,
    loadComplete: null,
    memoryUsage: null,
    networkSpeed: null,
    deviceType: this.detectDeviceType(),
    componentRenderTime: new Map(),
    rerenderCount: new Map(),
    bundleSize: null,
  };

  private observers: Map<string, PerformanceObserver> = new Map();
  private isMonitoring = false;

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    this.setupWebVitalsObserver();
    this.setupNavigationObserver();
    this.setupResourceObserver();
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();

    this.isMonitoring = true;
  }

  private setupWebVitalsObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    // LCP Observer
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
    });

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.set('lcp', lcpObserver);
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // FID Observer
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEventTiming;
        this.metrics.fid = fidEntry.processingStart - fidEntry.startTime;
      });
    });

    try {
      fidObserver.observe({ type: 'first-input', buffered: true });
      this.observers.set('fid', fidObserver);
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // CLS Observer
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const layoutEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!layoutEntry.hadRecentInput) {
          clsValue += layoutEntry.value ?? 0;
          this.metrics.cls = clsValue;
        }
      });
    });

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      this.observers.set('cls', clsObserver);
    } catch (e) {
      console.warn('CLS observer not supported');
    }

    // FCP Observer
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
        }
      });
    });

    try {
      fcpObserver.observe({ type: 'paint', buffered: true });
      this.observers.set('fcp', fcpObserver);
    } catch (e) {
      console.warn('FCP observer not supported');
    }
  }

  private setupNavigationObserver(): void {
    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const navEntry = entry as PerformanceNavigationTiming;
        this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
        this.metrics.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.startTime;
        this.metrics.loadComplete = navEntry.loadEventEnd - navEntry.startTime;
      });
    });

    try {
      navigationObserver.observe({ type: 'navigation', buffered: true });
      this.observers.set('navigation', navigationObserver);
    } catch (e) {
      console.warn('Navigation observer not supported');
    }
  }

  private setupResourceObserver(): void {
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      let totalSize = 0;

      entries.forEach((entry) => {
        const resourceEntry = entry as PerformanceResourceTiming;
        if (resourceEntry.transferSize) {
          totalSize += resourceEntry.transferSize;
        }
      });

      this.metrics.bundleSize = totalSize;
    });

    try {
      resourceObserver.observe({ type: 'resource', buffered: true });
      this.observers.set('resource', resourceObserver);
    } catch (e) {
      console.warn('Resource observer not supported');
    }
  }

  private setupMemoryMonitoring(): void {
    if ('memory' in performance) {
      const updateMemory = () => {
        const memory = (performance as Performance & { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      };

      updateMemory();
      setInterval(updateMemory, 5000); // Update every 5 seconds
    }
  }

  private setupNetworkMonitoring(): void {
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection: { effectiveType: string; addEventListener: (event: string, handler: () => void) => void } }).connection;
      this.metrics.networkSpeed = connection.effectiveType;

      connection.addEventListener('change', () => {
        this.metrics.networkSpeed = connection.effectiveType;
      });
    }
  }

  private detectDeviceType(): string {
    const userAgent = navigator.userAgent;

    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  public trackComponentRender(componentName: string, renderTime: number): void {
    this.metrics.componentRenderTime.set(componentName, renderTime);

    // Track rerender count
    const currentCount = this.metrics.rerenderCount.get(componentName) || 0;
    this.metrics.rerenderCount.set(componentName, currentCount + 1);
  }

  public generateReport(): PerformanceReport {
    const issues = this.analyzePerformance();
    const score = this.calculatePerformanceScore();
    const recommendations = this.generateRecommendations(issues);

    return {
      score,
      metrics: { ...this.metrics },
      issues,
      recommendations,
      timestamp: Date.now(),
    };
  }

  private analyzePerformance(): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // LCP Analysis
    if (this.metrics.lcp && this.metrics.lcp > 4000) {
      issues.push({
        type: 'critical',
        category: 'loading',
        message: `LCP is too slow: ${Math.round(this.metrics.lcp)}ms`,
        impact: 9,
        fix: 'Optimize images, remove unused CSS, use CDN',
        priority: 'high',
      });
    } else if (this.metrics.lcp && this.metrics.lcp > 2500) {
      issues.push({
        type: 'warning',
        category: 'loading',
        message: `LCP needs improvement: ${Math.round(this.metrics.lcp)}ms`,
        impact: 6,
        fix: 'Preload critical resources, optimize server response',
        priority: 'medium',
      });
    }

    // FID Analysis
    if (this.metrics.fid && this.metrics.fid > 300) {
      issues.push({
        type: 'critical',
        category: 'rendering',
        message: `FID is too slow: ${Math.round(this.metrics.fid)}ms`,
        impact: 8,
        fix: 'Reduce JavaScript execution time, use code splitting',
        priority: 'high',
      });
    }

    // CLS Analysis
    if (this.metrics.cls && this.metrics.cls > 0.25) {
      issues.push({
        type: 'critical',
        category: 'rendering',
        message: `CLS is too high: ${this.metrics.cls.toFixed(3)}`,
        impact: 7,
        fix: 'Set image dimensions, avoid dynamic content insertion',
        priority: 'high',
      });
    }

    // Memory Analysis
    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 0.8) {
      issues.push({
        type: 'warning',
        category: 'memory',
        message: `High memory usage: ${Math.round(this.metrics.memoryUsage * 100)}%`,
        impact: 6,
        fix: 'Implement virtualization, clean up event listeners',
        priority: 'medium',
      });
    }

    // Bundle Size Analysis
    if (this.metrics.bundleSize && this.metrics.bundleSize > 1000000) { // > 1MB
      issues.push({
        type: 'warning',
        category: 'bundle',
        message: `Large bundle size: ${Math.round(this.metrics.bundleSize / 1000)}KB`,
        impact: 5,
        fix: 'Implement code splitting, remove unused dependencies',
        priority: 'medium',
      });
    }

    // Component Rerender Analysis
    this.metrics.rerenderCount.forEach((count, component) => {
      if (count > 10) {
        issues.push({
          type: 'warning',
          category: 'rendering',
          message: `${component} rerenders too frequently: ${count} times`,
          impact: 4,
          fix: 'Use React.memo, useMemo, or useCallback',
          priority: 'low',
        });
      }
    });

    return issues;
  }

  private calculatePerformanceScore(): number {
    let score = 100;

    // LCP scoring (25% weight)
    if (this.metrics.lcp) {
      if (this.metrics.lcp > 4000) score -= 25;
      else if (this.metrics.lcp > 2500) score -= 15;
      else if (this.metrics.lcp > 1500) score -= 5;
    }

    // FID scoring (25% weight)
    if (this.metrics.fid) {
      if (this.metrics.fid > 300) score -= 25;
      else if (this.metrics.fid > 100) score -= 15;
      else if (this.metrics.fid > 50) score -= 5;
    }

    // CLS scoring (25% weight)
    if (this.metrics.cls) {
      if (this.metrics.cls > 0.25) score -= 25;
      else if (this.metrics.cls > 0.1) score -= 15;
      else if (this.metrics.cls > 0.05) score -= 5;
    }

    // Additional metrics (25% weight)
    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 0.8) score -= 10;
    if (this.metrics.bundleSize && this.metrics.bundleSize > 1000000) score -= 10;
    if (this.metrics.ttfb && this.metrics.ttfb > 600) score -= 5;

    return Math.max(0, score);
  }

  private generateRecommendations(issues: PerformanceIssue[]): string[] {
    const recommendations: string[] = [];
    const categories = new Set(issues.map(i => i.category));

    if (categories.has('loading')) {
      recommendations.push('Implement lazy loading for images and components');
      recommendations.push('Use a Content Delivery Network (CDN)');
      recommendations.push('Enable compression (gzip/brotli)');
    }

    if (categories.has('rendering')) {
      recommendations.push('Use React.memo for component optimization');
      recommendations.push('Implement virtualization for large lists');
      recommendations.push('Avoid layout thrashing');
    }

    if (categories.has('memory')) {
      recommendations.push('Implement proper cleanup in useEffect');
      recommendations.push('Use weak references where appropriate');
      recommendations.push('Monitor memory leaks with DevTools');
    }

    if (categories.has('bundle')) {
      recommendations.push('Implement code splitting with React.lazy');
      recommendations.push('Use tree shaking to remove unused code');
      recommendations.push('Analyze bundle with webpack-bundle-analyzer');
    }

    if (categories.has('network')) {
      recommendations.push('Implement service worker for caching');
      recommendations.push('Use HTTP/2 server push');
      recommendations.push('Optimize API response sizes');
    }

    return recommendations;
  }

  public startMonitoring(): void {
    if (!this.isMonitoring) {
      this.initializeMonitoring();
    }
  }

  public stopMonitoring(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.isMonitoring = false;
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public exportReport(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React Hook for easy integration
export function usePerformanceMonitor() {
  const [report, setReport] = React.useState<PerformanceReport | null>(null);
  const [isMonitoring, setIsMonitoring] = React.useState(false);

  React.useEffect(() => {
    performanceMonitor.startMonitoring();
    setIsMonitoring(true);

    const interval = setInterval(() => {
      setReport(performanceMonitor.generateReport());
    }, 5000);

    return () => {
      clearInterval(interval);
      performanceMonitor.stopMonitoring();
      setIsMonitoring(false);
    };
  }, []);

  return {
    report,
    isMonitoring,
    metrics: performanceMonitor.getMetrics(),
    exportReport: performanceMonitor.exportReport.bind(performanceMonitor),
  };
}