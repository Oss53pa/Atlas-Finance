/**
 * Hook pour rendre un élément déplaçable
 * Permet de déplacer Paloma n'importe où sur l'écran
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  bounds?: 'parent' | 'window' | 'body';
  handle?: string; // Sélecteur CSS pour la poignée de drag
  onDragStart?: (position: Position) => void;
  onDrag?: (position: Position) => void;
  onDragEnd?: (position: Position) => void;
}

export function useDraggable(options: UseDraggableOptions = {}) {
  const {
    initialPosition = { x: window.innerWidth - 380, y: window.innerHeight - 520 },
    bounds = 'window',
    handle,
    onDragStart,
    onDrag,
    onDragEnd,
  } = options;

  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const elementStartPos = useRef<Position>({ x: 0, y: 0 });

  // Sauvegarder la position dans le localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('paloma-position');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        setPosition(parsed);
      } catch (e) {
        console.error('Erreur lors de la lecture de la position sauvegardée:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem('paloma-position', JSON.stringify(position));
    }
  }, [position, isDragging]);

  const getBounds = useCallback(() => {
    if (!dragRef.current) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    const rect = dragRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (bounds === 'window') {
      return {
        minX: 0,
        minY: 0,
        maxX: window.innerWidth - width,
        maxY: window.innerHeight - height,
      };
    } else if (bounds === 'body') {
      return {
        minX: 0,
        minY: 0,
        maxX: document.body.clientWidth - width,
        maxY: document.body.clientHeight - height,
      };
    } else if (bounds === 'parent' && dragRef.current.parentElement) {
      const parentRect = dragRef.current.parentElement.getBoundingClientRect();
      return {
        minX: 0,
        minY: 0,
        maxX: parentRect.width - width,
        maxY: parentRect.height - height,
      };
    }

    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }, [bounds]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Si un handle est spécifié, vérifier que le clic est sur le handle
    if (handle && dragRef.current) {
      const handleElement = dragRef.current.querySelector(handle);
      if (!handleElement || !handleElement.contains(e.target as Node)) {
        return;
      }
    }

    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    elementStartPos.current = { ...position };

    if (onDragStart) {
      onDragStart(position);
    }

    // Empêcher la sélection de texte pendant le drag
    e.preventDefault();
  }, [handle, position, onDragStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;

    let newX = elementStartPos.current.x + deltaX;
    let newY = elementStartPos.current.y + deltaY;

    // Appliquer les limites
    const bounds = getBounds();
    newX = Math.max(bounds.minX, Math.min(newX, bounds.maxX));
    newY = Math.max(bounds.minY, Math.min(newY, bounds.maxY));

    const newPosition = { x: newX, y: newY };
    setPosition(newPosition);

    if (onDrag) {
      onDrag(newPosition);
    }
  }, [isDragging, getBounds, onDrag]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    if (onDragEnd) {
      onDragEnd(position);
    }
  }, [isDragging, position, onDragEnd]);

  // Gérer le touch pour mobile
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (handle && dragRef.current) {
      const handleElement = dragRef.current.querySelector(handle);
      if (!handleElement || !handleElement.contains(e.target as Node)) {
        return;
      }
    }

    const touch = e.touches[0];
    setIsDragging(true);
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    elementStartPos.current = { ...position };

    if (onDragStart) {
      onDragStart(position);
    }
  }, [handle, position, onDragStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartPos.current.x;
    const deltaY = touch.clientY - dragStartPos.current.y;

    let newX = elementStartPos.current.x + deltaX;
    let newY = elementStartPos.current.y + deltaY;

    const bounds = getBounds();
    newX = Math.max(bounds.minX, Math.min(newX, bounds.maxX));
    newY = Math.max(bounds.minY, Math.min(newY, bounds.maxY));

    const newPosition = { x: newX, y: newY };
    setPosition(newPosition);

    if (onDrag) {
      onDrag(newPosition);
    }
  }, [isDragging, getBounds, onDrag]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    if (onDragEnd) {
      onDragEnd(position);
    }
  }, [isDragging, position, onDragEnd]);

  // Attacher les event listeners
  useEffect(() => {
    const element = dragRef.current;
    if (!element) return;

    // Mouse events
    element.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Touch events
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      element.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ]);

  // Réajuster la position si la fenêtre est redimensionnée
  useEffect(() => {
    const handleResize = () => {
      const bounds = getBounds();
      setPosition(prev => ({
        x: Math.min(prev.x, bounds.maxX),
        y: Math.min(prev.y, bounds.maxY),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getBounds]);

  return {
    position,
    isDragging,
    dragRef,
    setPosition,
    resetPosition: () => setPosition(initialPosition),
  };
}