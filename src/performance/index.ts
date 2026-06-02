/**
 * Atlas FnA Performance Optimization System
 * Comprehensive performance monitoring and optimization
 */

export * from './hooks/usePerformance';
export * from './hooks/useVirtualization';
// @ts-ignore — module not yet implemented
export * from './hooks/useImageOptimization';
// @ts-ignore — module not yet implemented
export * from './hooks/useDataOptimization';
// @ts-ignore — module not yet implemented
export * from './components/LazyLoad';
export * from './components/VirtualizedList';
// @ts-ignore — module not yet implemented
export * from './components/ImageOptimizer';
export * from './utils/performanceMonitor';
export * from './utils/bundleAnalyzer';
export * from './utils/memoryOptimizer';
// @ts-ignore — module not yet implemented
export * from './providers/PerformanceProvider';
// @ts-ignore — module not yet implemented
export * from './types';

// Quick setup for global performance optimization
export { setupGlobalPerformance } from './setup';