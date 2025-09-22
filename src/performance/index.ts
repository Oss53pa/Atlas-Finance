/**
 * WiseBook Performance Optimization System
 * Comprehensive performance monitoring and optimization
 */

export * from './hooks/usePerformance';
export * from './hooks/useVirtualization';
export * from './hooks/useImageOptimization';
export * from './hooks/useDataOptimization';
export * from './components/LazyLoad';
export * from './components/VirtualizedList';
export * from './components/ImageOptimizer';
export * from './utils/performanceMonitor';
export * from './utils/bundleAnalyzer';
export * from './utils/memoryOptimizer';
export * from './providers/PerformanceProvider';
export * from './types';

// Quick setup for global performance optimization
export { setupGlobalPerformance } from './setup';