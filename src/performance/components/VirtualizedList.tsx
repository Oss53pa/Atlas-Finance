/**
 * Virtualized List Component
 * High-performance list rendering for large datasets
 */

import React, { forwardRef, useImperativeHandle } from 'react';
import { useVirtualization } from '../hooks/useVirtualization';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
}

interface VirtualizedListRef {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

export const VirtualizedList = forwardRef<VirtualizedListRef, VirtualizedListProps<any>>(
  ({ items, itemHeight, height, renderItem, className, style, overscan, onScroll }, ref) => {
    const {
      virtualItems,
      totalSize,
      setScrollElement,
      scrollToIndex,
      isScrolling,
    } = useVirtualization(items.length, {
      itemHeight,
      containerHeight: height,
      overscan,
    });

    useImperativeHandle(ref, () => ({
      scrollToIndex,
      scrollToTop: () => scrollToIndex(0),
      scrollToBottom: () => scrollToIndex(items.length - 1),
    }));

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
      onScroll?.(event.currentTarget.scrollTop);
    };

    return (
      <div
        ref={setScrollElement}
        className={`virtualized-list ${className || ''} ${isScrolling ? 'scrolling' : ''}`}
        style={{
          height,
          overflow: 'auto',
          ...style,
        }}
        onScroll={handleScroll}
      >
        <div
          style={{
            height: totalSize,
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => (
            <div
              key={virtualItem.index}
              style={{
                position: 'absolute',
                top: virtualItem.start,
                height: virtualItem.size,
                width: '100%',
              }}
            >
              {renderItem(items[virtualItem.index], virtualItem.index)}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

VirtualizedList.displayName = 'VirtualizedList';

// Grid virtualization component
interface VirtualizedGridProps<T> {
  items: T[];
  itemHeight: number;
  itemWidth: number;
  height: number;
  width: number;
  columnsCount: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  className?: string;
}

export function VirtualizedGrid<T>({
  items,
  itemHeight,
  itemWidth,
  height,
  width,
  columnsCount,
  renderItem,
  gap = 0,
  className,
}: VirtualizedGridProps<T>) {
  const rowCount = Math.ceil(items.length / columnsCount);
  const rowHeight = itemHeight + gap;

  const {
    virtualItems,
    totalSize,
    setScrollElement,
    isScrolling,
  } = useVirtualization(rowCount, {
    itemHeight: rowHeight,
    containerHeight: height,
  });

  return (
    <div
      ref={setScrollElement}
      className={`virtualized-grid ${className || ''} ${isScrolling ? 'scrolling' : ''}`}
      style={{
        height,
        width,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          height: totalSize,
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const startIndex = virtualRow.index * columnsCount;
          const endIndex = Math.min(startIndex + columnsCount, items.length);

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: virtualRow.start,
                height: itemHeight,
                width: '100%',
                display: 'flex',
                gap: `${gap}px`,
              }}
            >
              {Array.from({ length: endIndex - startIndex }, (_, colIndex) => {
                const itemIndex = startIndex + colIndex;
                const item = items[itemIndex];

                return (
                  <div
                    key={colIndex}
                    style={{
                      width: itemWidth,
                      height: itemHeight,
                      flexShrink: 0,
                    }}
                  >
                    {item && renderItem(item, itemIndex)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Masonry layout with virtualization
interface VirtualizedMasonryProps<T> {
  items: T[];
  height: number;
  getItemHeight: (item: T, index: number) => number;
  columnsCount: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  className?: string;
}

export function VirtualizedMasonry<T>({
  items,
  height,
  getItemHeight,
  columnsCount,
  renderItem,
  gap = 10,
  className,
}: VirtualizedMasonryProps<T>) {
  const [columnHeights, setColumnHeights] = React.useState<number[]>(
    new Array(columnsCount).fill(0)
  );
  const [itemPositions, setItemPositions] = React.useState<
    Array<{ x: number; y: number; height: number }>
  >([]);

  // Calculate item positions
  React.useEffect(() => {
    const positions: Array<{ x: number; y: number; height: number }> = [];
    const heights = new Array(columnsCount).fill(0);

    items.forEach((item, index) => {
      const itemHeight = getItemHeight(item, index);
      const shortestColumnIndex = heights.indexOf(Math.min(...heights));
      const x = shortestColumnIndex * (100 / columnsCount);
      const y = heights[shortestColumnIndex];

      positions.push({ x, y, height: itemHeight });
      heights[shortestColumnIndex] += itemHeight + gap;
    });

    setItemPositions(positions);
    setColumnHeights(heights);
  }, [items, getItemHeight, columnsCount, gap]);

  return (
    <div
      className={`virtualized-masonry ${className || ''}`}
      style={{
        height,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div
        style={{
          height: Math.max(...columnHeights),
          position: 'relative',
        }}
      >
        {items.map((item, index) => {
          const position = itemPositions[index];
          if (!position) return null;

          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${position.x}%`,
                top: position.y,
                width: `${100 / columnsCount - gap / 10}%`,
                height: position.height,
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}