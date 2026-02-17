/**
 * Main Performance Hook
 * Provides comprehensive performance monitoring and optimization
 */

import { useState, useEffect, useCallback } from 'react';
import { performanceMonitor } from '../utils/performanceMonitor';

interface PerformanceState {
  score: number;
  metrics: any;
  issues: any[];
  recommendations: string[];
  isMonitoring: boolean;
  loading: boolean;
}

interface PerformanceActions {
  startMonitoring: () => void;
  stopMonitoring: () => void;
  generateReport: () => void;
  trackComponent: (name: string, renderTime: number) => void;
  exportReport: () => string;
  optimizeBundle: () => Promise<void>;
  analyzeMemoryLeaks: () => void;
}

export function usePerformance(): PerformanceState & PerformanceActions {
  const [state, setState] = useState<PerformanceState>({
    score: 0,
    metrics: {},
    issues: [],
    recommendations: [],
    isMonitoring: false,
    loading: true,
  });

  // Initialize performance monitoring
  useEffect(() => {
    const initializePerformance = async () => {
      try {
        performanceMonitor.startMonitoring();

        // Generate initial report
        const report = performanceMonitor.generateReport();
        setState(prev => ({
          ...prev,
          score: report.score,
          metrics: report.metrics,
          issues: report.issues,
          recommendations: report.recommendations,
          isMonitoring: true,
          loading: false,
        }));

        // Update report every 5 seconds
        const interval = setInterval(() => {
          const updatedReport = performanceMonitor.generateReport();
          setState(prev => ({
            ...prev,
            score: updatedReport.score,
            metrics: updatedReport.metrics,
            issues: updatedReport.issues,
            recommendations: updatedReport.recommendations,
          }));
        }, 5000);

        return () => {
          clearInterval(interval);
          performanceMonitor.stopMonitoring();
        };
      } catch (error) {
        console.error('Failed to initialize performance monitoring:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    initializePerformance();
  }, []);

  const startMonitoring = useCallback(() => {
    performanceMonitor.startMonitoring();
    setState(prev => ({ ...prev, isMonitoring: true }));
  }, []);

  const stopMonitoring = useCallback(() => {
    performanceMonitor.stopMonitoring();
    setState(prev => ({ ...prev, isMonitoring: false }));
  }, []);

  const generateReport = useCallback(() => {
    const report = performanceMonitor.generateReport();
    setState(prev => ({
      ...prev,
      score: report.score,
      metrics: report.metrics,
      issues: report.issues,
      recommendations: report.recommendations,
    }));
  }, []);

  const trackComponent = useCallback((name: string, renderTime: number) => {
    performanceMonitor.trackComponentRender(name, renderTime);
  }, []);

  const exportReport = useCallback(() => {
    return performanceMonitor.exportReport();
  }, []);

  const optimizeBundle = useCallback(async () => {
    // Implement bundle optimization strategies
    if ('serviceWorker' in navigator) {
      // Implement service worker for caching
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    }

    // Preload critical resources
    const criticalResources = document.querySelectorAll('link[rel="preload"]');
    if (criticalResources.length === 0) {
      // Add preload hints for critical resources
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = '/static/css/main.css';
      document.head.appendChild(link);
    }
  }, []);

  const analyzeMemoryLeaks = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

      if (memoryUsage > 0.8) {
        console.warn('High memory usage detected:', {
          used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
          percentage: `${(memoryUsage * 100).toFixed(1)}%`,
        });
      }
    }
  }, []);

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    generateReport,
    trackComponent,
    exportReport,
    optimizeBundle,
    analyzeMemoryLeaks,
  };
}