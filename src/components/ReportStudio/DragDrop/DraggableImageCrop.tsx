/**
 * DraggableImageCrop - Allows cropping and positioning background image via drag and drop
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Move, ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ImageCropPosition {
  x: number; // percentage offset from center (-50 to 50)
  y: number; // percentage offset from center (-50 to 50)
  scale: number; // zoom level (1 = fit, higher = zoomed in)
}

interface DraggableImageCropProps {
  imageUrl: string;
  position: ImageCropPosition;
  onChange: (position: ImageCropPosition) => void;
  aspectRatio?: number; // target container aspect ratio
  disabled?: boolean;
}

const DEFAULT_POSITION: ImageCropPosition = {
  x: 0,
  y: 0,
  scale: 1,
};

export const DraggableImageCrop: React.FC<DraggableImageCropProps> = ({
  imageUrl,
  position = DEFAULT_POSITION,
  onChange,
  aspectRatio = 210 / 297, // A4 portrait
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || position.scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [disabled, position.scale]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const sensitivity = 0.5; // Reduce sensitivity for smoother movement

    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100 * sensitivity;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100 * sensitivity;

    // Limit movement based on scale
    const maxOffset = ((position.scale - 1) / position.scale) * 50;

    const newX = Math.max(-maxOffset, Math.min(maxOffset, position.x + deltaX));
    const newY = Math.max(-maxOffset, Math.min(maxOffset, position.y + deltaY));

    onChange({
      ...position,
      x: newX,
      y: newY,
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, position, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleScale = (delta: number) => {
    const newScale = Math.max(1, Math.min(3, position.scale + delta));

    // Reset position if zooming out to fit
    if (newScale <= 1) {
      onChange({ x: 0, y: 0, scale: 1 });
    } else {
      // Adjust position limits when zooming
      const maxOffset = ((newScale - 1) / newScale) * 50;
      onChange({
        x: Math.max(-maxOffset, Math.min(maxOffset, position.x)),
        y: Math.max(-maxOffset, Math.min(maxOffset, position.y)),
        scale: newScale,
      });
    }
  };

  const handleReset = () => {
    onChange(DEFAULT_POSITION);
  };

  const handleFit = () => {
    onChange({ x: 0, y: 0, scale: 1 });
  };

  return (
    <div className="space-y-4">
      {/* Preview container */}
      <div
        ref={containerRef}
        className={cn(
          'relative rounded-lg overflow-hidden border-2 bg-gray-900',
          isDragging ? 'border-primary cursor-grabbing' : 'border-gray-300',
          position.scale > 1 && !disabled && 'cursor-grab'
        )}
        style={{
          aspectRatio,
          minHeight: '200px',
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Background image */}
        <div
          className="absolute inset-0 transition-transform duration-100"
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: position.scale <= 1 ? 'cover' : `${position.scale * 100}%`,
            backgroundPosition: `calc(50% + ${position.x}%) calc(50% + ${position.y}%)`,
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* Loading state */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* Hidden image to detect load */}
        <img
          src={imageUrl}
          alt=""
          className="hidden"
          onLoad={() => setImageLoaded(true)}
        />

        {/* Crop overlay - shows visible area */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner indicators */}
          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-white/50" />
          <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-white/50" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-white/50" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-white/50" />
        </div>

        {/* Drag hint */}
        {position.scale > 1 && !disabled && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Move className="w-3 h-3" />
            Glissez pour ajuster
          </div>
        )}

        {/* Scale indicator */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {Math.round(position.scale * 100)}%
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Zoom:</span>
          <button
            onClick={() => handleScale(-0.25)}
            disabled={disabled || position.scale <= 1}
            className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoomer arrière"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <input
            type="range"
            min="100"
            max="300"
            step="10"
            value={position.scale * 100}
            onChange={(e) => handleScale((parseInt(e.target.value) / 100) - position.scale)}
            disabled={disabled}
            className="w-24 accent-primary"
          />

          <button
            onClick={() => handleScale(0.25)}
            disabled={disabled || position.scale >= 3}
            className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoomer avant"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleFit}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title="Adapter à la page"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="text-sm">Adapter</span>
          </button>

          <button
            onClick={handleReset}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title="Réinitialiser"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm">Reset</span>
          </button>
        </div>
      </div>

      {/* Quick position presets for zoomed image */}
      {position.scale > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Focus rapide
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'tl', label: '↖', x: -25, y: -25 },
              { id: 'tc', label: '↑', x: 0, y: -25 },
              { id: 'tr', label: '↗', x: 25, y: -25 },
              { id: 'ml', label: '←', x: -25, y: 0 },
              { id: 'mc', label: '●', x: 0, y: 0 },
              { id: 'mr', label: '→', x: 25, y: 0 },
              { id: 'bl', label: '↙', x: -25, y: 25 },
              { id: 'bc', label: '↓', x: 0, y: 25 },
              { id: 'br', label: '↘', x: 25, y: 25 },
            ].map((preset) => {
              const maxOffset = ((position.scale - 1) / position.scale) * 50;
              const clampedX = Math.max(-maxOffset, Math.min(maxOffset, preset.x));
              const clampedY = Math.max(-maxOffset, Math.min(maxOffset, preset.y));

              return (
                <button
                  key={preset.id}
                  onClick={() => onChange({ ...position, x: clampedX, y: clampedY })}
                  disabled={disabled}
                  className={cn(
                    'p-2 text-lg rounded-lg border transition-colors',
                    Math.abs(position.x - clampedX) < 5 && Math.abs(position.y - clampedY) < 5
                      ? 'border-primary bg-primary-50'
                      : 'border-gray-300 hover:bg-gray-100'
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DraggableImageCrop;
