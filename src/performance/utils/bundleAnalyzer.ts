/**
 * Bundle Analyzer
 * Analyzes and optimizes JavaScript bundle size and loading performance
 */

interface BundleMetrics {
  totalSize: number;
  gzippedSize: number;
  modules: ModuleInfo[];
  duplicates: DuplicateModule[];
  unusedExports: string[];
  loadTime: number;
  parseTime: number;
}

interface ModuleInfo {
  name: string;
  size: number;
  gzippedSize: number;
  chunks: string[];
  reasons: string[];
  isEntry: boolean;
  isVendor: boolean;
}

interface DuplicateModule {
  name: string;
  count: number;
  totalSize: number;
  instances: string[];
}

interface BundleOptimization {
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
  savings: number;
  implementation: string;
}

export class BundleAnalyzer {
  private performanceObserver: PerformanceObserver | null = null;
  private metrics: BundleMetrics = {
    totalSize: 0,
    gzippedSize: 0,
    modules: [],
    duplicates: [],
    unusedExports: [],
    loadTime: 0,
    parseTime: 0,
  };

  constructor() {
    this.initializeAnalysis();
  }

  private initializeAnalysis(): void {
    if (typeof window === 'undefined') return;

    this.analyzeResourceTiming();
    this.detectDuplicateModules();
    this.measureBundleSize();
  }

  private analyzeResourceTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      entries.forEach((entry: any) => {
        if (entry.name.includes('.js') || entry.name.includes('.css')) {
          this.metrics.totalSize += entry.transferSize || 0;
          this.metrics.loadTime += entry.duration || 0;
        }
      });
    });

    try {
      this.performanceObserver.observe({
        type: 'resource',
        buffered: true
      });
    } catch (error) {
      console.warn('Resource timing observer not supported:', error);
    }
  }

  private detectDuplicateModules(): void {
    // Analyze webpack module dependencies if available
    if ((window as any).__webpack_require__) {
      const webpackRequire = (window as any).__webpack_require__;
      const modules = webpackRequire.cache || {};
      const moduleNames: { [key: string]: number } = {};

      Object.keys(modules).forEach(moduleId => {
        const module = modules[moduleId];
        if (module && module.exports) {
          const moduleName = this.extractModuleName(moduleId);
          moduleNames[moduleName] = (moduleNames[moduleName] || 0) + 1;
        }
      });

      // Find duplicates
      Object.entries(moduleNames).forEach(([name, count]) => {
        if (count > 1) {
          this.metrics.duplicates.push({
            name,
            count,
            totalSize: count * this.estimateModuleSize(name),
            instances: [],
          });
        }
      });
    }
  }

  private measureBundleSize(): void {
    // Estimate bundle size from script tags
    const scripts = document.querySelectorAll('script[src]');
    let totalEstimatedSize = 0;

    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && (src.includes('chunk') || src.includes('bundle'))) {
        // Rough estimation based on common patterns
        totalEstimatedSize += this.estimateScriptSize(src);
      }
    });

    this.metrics.totalSize = Math.max(this.metrics.totalSize, totalEstimatedSize);
  }

  private extractModuleName(moduleId: string): string {
    // Extract readable module name from webpack module ID
    if (moduleId.includes('node_modules')) {
      const match = moduleId.match(/node_modules\/([^\/]+)/);
      return match ? match[1] : 'unknown';
    }
    return moduleId.split('/').pop() || 'unknown';
  }

  private estimateModuleSize(moduleName: string): number {
    // Rough size estimates for common modules
    const sizeMap: { [key: string]: number } = {
      'react': 45000,
      'react-dom': 120000,
      'lodash': 70000,
      'moment': 67000,
      'axios': 13000,
      'typescript': 8000,
    };

    return sizeMap[moduleName] || 5000; // Default 5KB
  }

  private estimateScriptSize(src: string): number {
    // Estimate based on script naming patterns
    if (src.includes('vendor')) return 200000; // 200KB for vendor chunks
    if (src.includes('main')) return 100000;   // 100KB for main bundle
    if (src.includes('chunk')) return 50000;   // 50KB for code-split chunks
    return 20000; // Default 20KB
  }

  public analyzeBundleOptimizations(): BundleOptimization[] {
    const optimizations: BundleOptimization[] = [];

    // Check bundle size
    if (this.metrics.totalSize > 500000) { // > 500KB
      optimizations.push({
        recommendation: 'Bundle size is too large',
        impact: 'high',
        savings: Math.round(this.metrics.totalSize * 0.3),
        implementation: 'Implement code splitting with React.lazy() and dynamic imports',
      });
    }

    // Check for duplicate modules
    if (this.metrics.duplicates.length > 0) {
      const totalDuplicateSize = this.metrics.duplicates.reduce(
        (sum, dup) => sum + dup.totalSize, 0
      );

      optimizations.push({
        recommendation: `Remove ${this.metrics.duplicates.length} duplicate modules`,
        impact: 'medium',
        savings: totalDuplicateSize,
        implementation: 'Configure webpack to deduplicate modules or use webpack-bundle-analyzer',
      });
    }

    // Check load time
    if (this.metrics.loadTime > 3000) { // > 3 seconds
      optimizations.push({
        recommendation: 'Bundle load time is too slow',
        impact: 'high',
        savings: Math.round(this.metrics.loadTime * 0.5),
        implementation: 'Enable compression (gzip/brotli), use CDN, implement preloading',
      });
    }

    // Check for large individual modules
    const largeModules = this.metrics.modules.filter(module => module.size > 100000);
    if (largeModules.length > 0) {
      optimizations.push({
        recommendation: `Optimize ${largeModules.length} large modules`,
        impact: 'medium',
        savings: largeModules.reduce((sum, module) => sum + module.size * 0.2, 0),
        implementation: 'Use tree shaking, remove unused code, consider alternative libraries',
      });
    }

    return optimizations;
  }

  public generateOptimizationReport(): {
    metrics: BundleMetrics;
    optimizations: BundleOptimization[];
    score: number;
    recommendations: string[];
  } {
    const optimizations = this.analyzeBundleOptimizations();
    const score = this.calculateBundleScore();
    const recommendations = this.generateRecommendations(optimizations);

    return {
      metrics: { ...this.metrics },
      optimizations,
      score,
      recommendations,
    };
  }

  private calculateBundleScore(): number {
    let score = 100;

    // Penalize large bundle size
    if (this.metrics.totalSize > 1000000) score -= 30; // > 1MB
    else if (this.metrics.totalSize > 500000) score -= 20; // > 500KB
    else if (this.metrics.totalSize > 250000) score -= 10; // > 250KB

    // Penalize slow load time
    if (this.metrics.loadTime > 5000) score -= 25; // > 5s
    else if (this.metrics.loadTime > 3000) score -= 15; // > 3s
    else if (this.metrics.loadTime > 1500) score -= 5; // > 1.5s

    // Penalize duplicates
    score -= Math.min(20, this.metrics.duplicates.length * 5);

    return Math.max(0, score);
  }

  private generateRecommendations(optimizations: BundleOptimization[]): string[] {
    const recommendations: string[] = [];

    // High impact optimizations first
    const highImpact = optimizations.filter(opt => opt.impact === 'high');
    if (highImpact.length > 0) {
      recommendations.push('Prioritize high-impact optimizations for immediate performance gains');
      recommendations.push('Implement code splitting to reduce initial bundle size');
      recommendations.push('Enable compression and use a CDN for faster delivery');
    }

    // Bundle-specific recommendations
    if (this.metrics.totalSize > 500000) {
      recommendations.push('Consider lazy loading non-critical components');
      recommendations.push('Audit dependencies and remove unused packages');
    }

    if (this.metrics.duplicates.length > 0) {
      recommendations.push('Configure module deduplication in your bundler');
      recommendations.push('Use peer dependencies to avoid duplicates');
    }

    // Performance recommendations
    recommendations.push('Monitor bundle size in CI/CD pipeline');
    recommendations.push('Use webpack-bundle-analyzer for detailed analysis');
    recommendations.push('Implement preloading for critical resources');

    return recommendations;
  }

  public trackChunkLoading(): void {
    // Track dynamic import performance
    const originalImport = window.__webpack_require__;
    if (originalImport) {
      (window as any).__webpack_require__ = function(...args: any[]) {
        const start = performance.now();
        const result = originalImport.apply(this, args);

        if (result && typeof result.then === 'function') {
          result.then(() => {
            const loadTime = performance.now() - start;
            console.debug(`Chunk loaded in ${loadTime.toFixed(2)}ms`);
          });
        }

        return result;
      };
    }
  }

  public getMetrics(): BundleMetrics {
    return { ...this.metrics };
  }

  public destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }
}

// Singleton instance
export const bundleAnalyzer = new BundleAnalyzer();

// React hook for bundle analysis
export function useBundleAnalysis() {
  const [report, setReport] = React.useState<any>(null);

  React.useEffect(() => {
    const generateReport = () => {
      const analysisReport = bundleAnalyzer.generateOptimizationReport();
      setReport(analysisReport);
    };

    generateReport();

    // Update report every 10 seconds
    const interval = setInterval(generateReport, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    report,
    analyzer: bundleAnalyzer,
  };
}