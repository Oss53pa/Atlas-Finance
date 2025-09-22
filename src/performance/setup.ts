/**
 * Performance Setup
 * Global performance optimization configuration
 */

import { performanceMonitor } from './utils/performanceMonitor';
import { bundleAnalyzer } from './utils/bundleAnalyzer';
import { memoryOptimizer } from './utils/memoryOptimizer';

interface PerformanceConfig {
  monitoring: {
    enabled: boolean;
    interval: number;
    reportingEnabled: boolean;
  };
  bundleAnalysis: {
    enabled: boolean;
    trackChunkLoading: boolean;
  };
  memoryOptimization: {
    enabled: boolean;
    autoCleanup: boolean;
    memoryPressureThreshold: number;
  };
  webVitals: {
    enabled: boolean;
    reportToAnalytics: boolean;
  };
}

const defaultConfig: PerformanceConfig = {
  monitoring: {
    enabled: true,
    interval: 5000,
    reportingEnabled: process.env.NODE_ENV === 'production',
  },
  bundleAnalysis: {
    enabled: process.env.NODE_ENV === 'development',
    trackChunkLoading: true,
  },
  memoryOptimization: {
    enabled: true,
    autoCleanup: true,
    memoryPressureThreshold: 80,
  },
  webVitals: {
    enabled: true,
    reportToAnalytics: process.env.NODE_ENV === 'production',
  },
};

export function setupGlobalPerformance(config: Partial<PerformanceConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  // Initialize performance monitoring
  if (finalConfig.monitoring.enabled) {
    performanceMonitor.startMonitoring();
    console.debug('Performance monitoring initialized');
  }

  // Initialize bundle analysis
  if (finalConfig.bundleAnalysis.enabled) {
    if (finalConfig.bundleAnalysis.trackChunkLoading) {
      bundleAnalyzer.trackChunkLoading();
    }
    console.debug('Bundle analysis initialized');
  }

  // Initialize memory optimization
  if (finalConfig.memoryOptimization.enabled) {
    // Memory optimization is initialized automatically
    console.debug('Memory optimization initialized');
  }

  // Setup Web Vitals reporting
  if (finalConfig.webVitals.enabled) {
    setupWebVitalsReporting(finalConfig.webVitals.reportToAnalytics);
  }

  // Setup performance budget monitoring
  setupPerformanceBudget();

  // Setup automatic optimization
  if (finalConfig.memoryOptimization.autoCleanup) {
    setupAutoCleanup(finalConfig.memoryOptimization.memoryPressureThreshold);
  }

  // Setup development helpers
  if (process.env.NODE_ENV === 'development') {
    setupDevelopmentHelpers();
  }

  return {
    performanceMonitor,
    bundleAnalyzer,
    memoryOptimizer,
    config: finalConfig,
  };
}

function setupWebVitalsReporting(reportToAnalytics: boolean) {
  // Import and setup web-vitals library if available
  try {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      const reportMetric = (metric: any) => {
        console.debug('Web Vital:', metric);

        if (reportToAnalytics && (window as any).gtag) {
          (window as any).gtag('event', metric.name, {
            event_category: 'Web Vitals',
            event_label: metric.id,
            value: Math.round(metric.value),
            non_interaction: true,
          });
        }
      };

      getCLS(reportMetric);
      getFID(reportMetric);
      getFCP(reportMetric);
      getLCP(reportMetric);
      getTTFB(reportMetric);
    });
  } catch (error) {
    console.warn('web-vitals library not available:', error);
  }
}

function setupPerformanceBudget() {
  const budget = {
    fcp: 1800,    // First Contentful Paint: 1.8s
    lcp: 2500,    // Largest Contentful Paint: 2.5s
    fid: 100,     // First Input Delay: 100ms
    cls: 0.1,     // Cumulative Layout Shift: 0.1
    ttfb: 600,    // Time to First Byte: 600ms
  };

  // Monitor budget violations
  setInterval(() => {
    const metrics = performanceMonitor.getMetrics();
    const violations: string[] = [];

    if (metrics.fcp && metrics.fcp > budget.fcp) {
      violations.push(`FCP exceeded budget: ${metrics.fcp}ms > ${budget.fcp}ms`);
    }

    if (metrics.lcp && metrics.lcp > budget.lcp) {
      violations.push(`LCP exceeded budget: ${metrics.lcp}ms > ${budget.lcp}ms`);
    }

    if (metrics.fid && metrics.fid > budget.fid) {
      violations.push(`FID exceeded budget: ${metrics.fid}ms > ${budget.fid}ms`);
    }

    if (metrics.cls && metrics.cls > budget.cls) {
      violations.push(`CLS exceeded budget: ${metrics.cls} > ${budget.cls}`);
    }

    if (violations.length > 0) {
      console.warn('Performance budget violations:', violations);
    }
  }, 10000);
}

function setupAutoCleanup(threshold: number) {
  // Automatic memory cleanup when threshold is exceeded
  setInterval(() => {
    const memoryMetrics = memoryOptimizer.getCurrentMemoryMetrics();

    if (memoryMetrics && memoryMetrics.usagePercentage > threshold) {
      console.debug('Auto cleanup triggered:', memoryMetrics.usagePercentage);
      memoryOptimizer.optimizeMemoryUsage();
    }
  }, 30000); // Check every 30 seconds
}

function setupDevelopmentHelpers() {
  // Add performance helpers to window for debugging
  (window as any).__WISEBOOK_PERFORMANCE__ = {
    monitor: performanceMonitor,
    bundleAnalyzer,
    memoryOptimizer,
    generateReport: () => {
      return {
        performance: performanceMonitor.generateReport(),
        bundle: bundleAnalyzer.generateOptimizationReport(),
        memory: memoryOptimizer.generateMemoryReport(),
      };
    },
    measureComponent: (name: string, fn: () => void) => {
      const start = performance.now();
      fn();
      const end = performance.now();
      const renderTime = end - start;
      performanceMonitor.trackComponentRender(name, renderTime);
      console.debug(`Component ${name} rendered in ${renderTime.toFixed(2)}ms`);
    },
  };

  console.debug('Performance helpers available at window.__WISEBOOK_PERFORMANCE__');

  // Setup React DevTools profiler integration
  if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;

    devtools.onCommitFiberRoot = (id: any, root: any, priorityLevel: any) => {
      // Track React commits for performance analysis
      console.debug('React commit:', { id, priorityLevel });
    };
  }

  // Add performance observer for long tasks
  if ('PerformanceObserver' in window) {
    const longTaskObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        console.warn('Long task detected:', {
          duration: entry.duration,
          startTime: entry.startTime,
          name: entry.name,
        });
      });
    });

    try {
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch (error) {
      console.warn('Long task observer not supported:', error);
    }
  }
}

// React HOC for performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name;

  const PerformanceTrackedComponent = React.forwardRef<any, P>((props, ref) => {
    const renderStartTime = React.useRef<number>();

    // Track component mount/unmount
    React.useEffect(() => {
      memoryOptimizer.registerComponent(displayName);

      return () => {
        memoryOptimizer.unregisterComponent(displayName);
      };
    }, []);

    // Track render time
    React.useLayoutEffect(() => {
      if (renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;
        performanceMonitor.trackComponentRender(displayName, renderTime);
      }
    });

    renderStartTime.current = performance.now();

    return React.createElement(WrappedComponent, { ...props, ref });
  });

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${displayName})`;

  return PerformanceTrackedComponent;
}

// Hook for performance tracking in functional components
export function usePerformanceTracking(componentName: string) {
  const renderStartTime = React.useRef<number>();
  const renderCount = React.useRef(0);

  React.useEffect(() => {
    memoryOptimizer.registerComponent(componentName);

    return () => {
      memoryOptimizer.unregisterComponent(componentName);
    };
  }, [componentName]);

  React.useLayoutEffect(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      performanceMonitor.trackComponentRender(componentName, renderTime);
      renderCount.current++;
    }
  });

  renderStartTime.current = performance.now();

  return {
    renderCount: renderCount.current,
    trackEvent: (eventName: string, duration: number) => {
      console.debug(`${componentName} - ${eventName}: ${duration}ms`);
    },
  };
}