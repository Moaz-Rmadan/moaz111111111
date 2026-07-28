import React, { useState, useMemo, useRef } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const { startIndex, endIndex, translateY } = useMemo(() => {
    // We add buffer of 2 items on top and bottom to prevent blank spacing during fast scroll
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
    const end = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + 2);
    const offset = start * itemHeight;
    return { startIndex: start, endIndex: end, translateY: offset };
  }, [scrollTop, items.length, itemHeight, containerHeight]);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const totalHeight = items.length * itemHeight;

  return (
    <div
      id="virtual-list-container"
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto relative ${className}`}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${translateY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => renderItem(item, startIndex + index))}
        </div>
      </div>
    </div>
  );
}
