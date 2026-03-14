/**
 * DraggableLogoPosition - Allows positioning logo on cover page via drag and drop
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Move, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface LogoPosition {
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
  scale: number; // scale factor (0.5 - 2)
  rotation: number; // degrees (0-360)
}

interface DraggableLogoPositionProps {
  logoUrl: string;
  position: LogoPosition;
  onChange: (position: LogoPosition) => void;
  containerAspectRatio?: number; // width/height ratio
  disabled?: boolean;
}

const DEFAULT_POSITION: LogoPosition = {
  x: 50,
  y: 15,
  scale: 1,
  rotation: 0,
};

export const DraggableLogoPosition: React.FC<DraggableLogoPositionProps> = ({
  logoUrl,
  position = DEFAULT_POSITION,
  onChange,
  containerAspectRatio = 210 / 297, // A4 portrait ratio
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [disabled]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    const newX = Math.max(5, Math.min(95, position.x + deltaX));
    const newY = Math.max(5, Math.min(95, position.y + deltaY));

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
    const newScale = Math.max(0.3, Math.min(2, position.scale + delta));
    onChange({ ...position, scale: newScale });
  };

  const handleRotate = () => {
    const newRotation = (position.rotation + 90) % 360;
    onChange({ ...position, rotation: newRotation });
  };

  // Preset positions
  const presetPositions = [
    { id: 'top-left', label: 'Haut gauche', x: 15, y: 10 },
    { id: 'top-center', label: 'Haut centre', x: 50, y: 10 },
    { id: 'top-right', label: 'Haut droite', x: 85, y: 10 },
    { id: 'center', label: 'Centre', x: 50, y: 50 },
    { id: 'bottom-left', label: 'Bas gauche', x: 15, y: 90 },
    { id: 'bottom-center', label: 'Bas centre', x: 50, y: 90 },
    { id: 'bottom-right', label: 'Bas droite', x: 85, y: 90 },
  ];

  return (
    <div className="space-y-4">
      {/* Preview container */}
      <div
        ref={containerRef}
        className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden border-2 border-gray-300"
        style={{
          aspectRatio: containerAspectRatio,
          minHeight: '300px',
        }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="grid grid-cols-3 grid-rows-3 h-full w-full opacity-20">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="border border-gray-400" />
            ))}
          </div>
        </div>

        {/* Draggable logo */}
        <div
          className={cn(
            'absolute cursor-move transition-shadow',
            isDragging && 'shadow-lg',
            disabled && 'cursor-not-allowed opacity-60'
          )}
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: `translate(-50%, -50%) scale(${position.scale}) rotate(${position.rotation}deg)`,
          }}
          onMouseDown={handleMouseDown}
        >
          <div className={cn(
            'relative p-2 bg-white/80 rounded-lg backdrop-blur-sm border-2 transition-colors',
            isDragging ? 'border-primary shadow-xl' : 'border-transparent hover:border-primary-300'
          )}>
            <img
              src={logoUrl}
              alt="Logo"
              className="max-w-[120px] max-h-[60px] object-contain pointer-events-none"
              draggable={false}
            />

            {/* Resize handles */}
            {!disabled && (
              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                <Move className="w-4 h-4 text-primary" />
              </div>
            )}
          </div>
        </div>

        {/* Position indicator */}
        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          X: {Math.round(position.x)}% | Y: {Math.round(position.y)}%
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Scale controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Taille:</span>
          <button
            onClick={() => handleScale(-0.1)}
            disabled={disabled || position.scale <= 0.3}
            className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium w-12 text-center">
            {Math.round(position.scale * 100)}%
          </span>
          <button
            onClick={() => handleScale(0.1)}
            disabled={disabled || position.scale >= 2}
            className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Rotation control */}
        <button
          onClick={handleRotate}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCw className="w-4 h-4" />
          <span className="text-sm">{position.rotation}°</span>
        </button>
      </div>

      {/* Preset positions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Positions prédéfinies
        </label>
        <div className="grid grid-cols-4 gap-2">
          {presetPositions.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onChange({ ...position, x: preset.x, y: preset.y })}
              disabled={disabled}
              className={cn(
                'px-2 py-1.5 text-xs rounded-lg border transition-colors',
                Math.abs(position.x - preset.x) < 5 && Math.abs(position.y - preset.y) < 5
                  ? 'border-primary bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:bg-gray-100'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DraggableLogoPosition;
