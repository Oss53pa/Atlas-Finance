/**
 * Virtualization Hook
 * Optimizes rendering performance for large lists
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  scrollElement?: HTMLElement;
}

interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}

interface VirtualizationResult {
  virtualItems: VirtualItem[];
  totalSize: number;
  scrollElement: React.RefObject<HTMLElement>;
  setScrollElement: (element: HTMLElement | null) => void;
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  isScrolling: boolean;
}

export function useVirtualization(
  itemCount: number,
  options: VirtualizationOptions
): VirtualizationResult {
  const { itemHeight, containerHeight, overscan = 5 } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollElementRef = useRef<HTMLElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(itemCount - 1, endIndex + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];

    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
        size: itemHeight,
      });
    }

    return items;
  }, [visibleRange, itemHeight]);

  // Total size for scrollbar
  const totalSize = itemCount * itemHeight;

  // Handle scroll events
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    if (target) {
      setScrollTop(target.scrollTop);
      setIsScrolling(true);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set scrolling to false after scroll ends
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    }
  }, []);

  // Set scroll element
  const setScrollElement = useCallback((element: HTMLElement | null) => {
    if (scrollElementRef.current) {
      scrollElementRef.current.removeEventListener('scroll', handleScroll);
    }

    scrollElementRef.current = element;

    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
    }
  }, [handleScroll]);

  // Scroll to specific index
  const scrollToIndex = useCallback((
    index: number,
    align: 'start' | 'center' | 'end' = 'start'
  ) => {
    if (!scrollElementRef.current) return;

    const targetIndex = Math.max(0, Math.min(index, itemCount - 1));
    let scrollTop = targetIndex * itemHeight;

    if (align === 'center') {
      scrollTop -= containerHeight / 2 - itemHeight / 2;
    } else if (align === 'end') {
      scrollTop -= containerHeight - itemHeight;
    }

    scrollElementRef.current.scrollTop = Math.max(0, scrollTop);
  }, [itemCount, itemHeight, containerHeight]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollElementRef.current) {
        scrollElementRef.current.removeEventListener('scroll', handleScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  return {
    virtualItems,
    totalSize,
    scrollElement: scrollElementRef,
    setScrollElement,
    scrollToIndex,
    isScrolling,
  };
}

// Hook for dynamic item heights
export function useDynamicVirtualization(
  itemCount: number,
  estimateItemHeight: (index: number) => number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemSizes, setItemSizes] = useState<number[]>([]);
  const scrollElementRef = useRef<HTMLElement | null>(null);

  // Measure item size
  const measureItem = useCallback((index: number, size: number) => {
    setItemSizes(prev => {
      const newSizes = [...prev];
      newSizes[index] = size;
      return newSizes;
    });
  }, []);

  // Calculate positions
  const { virtualItems, totalSize } = useMemo(() => {
    const items: VirtualItem[] = [];
    let start = 0;

    for (let i = 0; i < itemCount; i++) {
      const size = itemSizes[i] ?? estimateItemHeight(i);

      if (start + size >= scrollTop - overscan * 50 &&
          start <= scrollTop + containerHeight + overscan * 50) {
        items.push({
          index: i,
          start,
          end: start + size,
          size,
        });
      }

      start += size;
    }

    return { virtualItems: items, totalSize: start };
  }, [itemCount, itemSizes, estimateItemHeight, scrollTop, containerHeight, overscan]);

  return {
    virtualItems,
    totalSize,
    scrollElement: scrollElementRef,
    measureItem,
  };
}