/**
 * PresentationMode - Mode présentation pour les rapports
 * Transforme le rapport en slides interactives
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Grid,
  List,
  Settings,
  Timer,
  Eye,
  X,
  Download,
  Share2,
  Edit3,
  Plus,
  Trash2,
  GripVertical,
  Monitor,
  Smartphone,
  Image,
  FileText,
  BarChart3,
  Table2,
  Type,
  Clock,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react';

export interface SlideContent {
  id: string;
  type: 'title' | 'text' | 'chart' | 'table' | 'image' | 'kpi' | 'mixed';
  title?: string;
  subtitle?: string;
  content?: React.ReactNode;
  notes?: string;
  transition?: 'fade' | 'slide' | 'zoom' | 'none';
  duration?: number; // in seconds for auto-advance
  background?: string;
}

export interface Slide {
  id: string;
  order: number;
  layout: 'full' | 'split' | 'grid' | 'comparison';
  contents: SlideContent[];
  sectionTitle?: string;
  isHidden?: boolean;
}

interface PresentationModeProps {
  slides: Slide[];
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  onClose?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onSlideChange?: (slideIndex: number) => void;
  className?: string;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  slides: initialSlides,
  title,
  subtitle,
  author,
  date,
  onClose,
  onExport,
  onShare,
  onSlideChange,
  className,
}) => {
  const [slides, setSlides] = useState(initialSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoAdvanceTime, setAutoAdvanceTime] = useState(30); // seconds
  const [elapsedTime, setElapsedTime] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isMuted, setIsMuted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const visibleSlides = slides.filter(s => !s.isHidden);
  const totalSlides = visibleSlides.length;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          goToPrevious();
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          goToSlide(totalSlides - 1);
          break;
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          } else if (showOverview) {
            setShowOverview(false);
          } else {
            onClose?.();
          }
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'g':
        case 'G':
          setShowOverview(prev => !prev);
          break;
        case 'n':
        case 'N':
          setShowNotes(prev => !prev);
          break;
        case 'p':
        case 'P':
          setIsPlaying(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, showOverview, totalSlides]);

  // Auto-advance timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          if (prev >= autoAdvanceTime) {
            goToNext();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, autoAdvanceTime]);

  // Reset timer on slide change
  useEffect(() => {
    setElapsedTime(0);
    onSlideChange?.(currentSlide);
  }, [currentSlide]);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
      setShowOverview(false);
    }
  }, [totalSlides]);

  const goToNext = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    } else if (isPlaying) {
      setIsPlaying(false);
    }
  }, [currentSlide, totalSlides, isPlaying]);

  const goToPrevious = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSlideIcon = (slide: Slide) => {
    const mainContent = slide.contents[0];
    if (!mainContent) return <FileText className="w-4 h-4" />;

    switch (mainContent.type) {
      case 'title': return <Type className="w-4 h-4" />;
      case 'chart': return <BarChart3 className="w-4 h-4" />;
      case 'table': return <Table2 className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'kpi': return <TrendingUp className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const TrendingUp = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );

  const renderSlideContent = (slide: Slide) => {
    const transition = slide.contents[0]?.transition || 'fade';

    const transitionClass = {
      fade: 'animate-fadeIn',
      slide: 'animate-slideIn',
      zoom: 'animate-zoomIn',
      none: '',
    }[transition];

    return (
      <div className={cn('w-full h-full p-8', transitionClass)}>
        {slide.layout === 'full' && slide.contents[0] && (
          <div className="h-full flex flex-col items-center justify-center">
            {slide.contents[0].type === 'title' ? (
              <div className="text-center">
                <h1 className="text-5xl font-bold text-gray-900 mb-4">
                  {slide.contents[0].title}
                </h1>
                {slide.contents[0].subtitle && (
                  <p className="text-2xl text-gray-600">
                    {slide.contents[0].subtitle}
                  </p>
                )}
              </div>
            ) : (
              <>
                {slide.contents[0].title && (
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">
                    {slide.contents[0].title}
                  </h2>
                )}
                <div className="flex-1 w-full">
                  {slide.contents[0].content}
                </div>
              </>
            )}
          </div>
        )}

        {slide.layout === 'split' && (
          <div className="h-full grid grid-cols-2 gap-8">
            {slide.contents.slice(0, 2).map((content, i) => (
              <div key={content.id} className="flex flex-col">
                {content.title && (
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {content.title}
                  </h3>
                )}
                <div className="flex-1">{content.content}</div>
              </div>
            ))}
          </div>
        )}

        {slide.layout === 'grid' && (
          <div className="h-full">
            {slide.sectionTitle && (
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {slide.sectionTitle}
              </h2>
            )}
            <div className="grid grid-cols-2 gap-6 h-[calc(100%-4rem)]">
              {slide.contents.slice(0, 4).map(content => (
                <div key={content.id} className="bg-gray-50 rounded-xl p-4">
                  {content.title && (
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">
                      {content.title}
                    </h4>
                  )}
                  <div className="flex-1">{content.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {slide.layout === 'comparison' && slide.contents.length >= 2 && (
          <div className="h-full flex flex-col">
            {slide.sectionTitle && (
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {slide.sectionTitle}
              </h2>
            )}
            <div className="flex-1 grid grid-cols-2 gap-8">
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4">
                  {slide.contents[0].title}
                </h3>
                {slide.contents[0].content}
              </div>
              <div className="bg-green-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-green-900 mb-4">
                  {slide.contents[1].title}
                </h3>
                {slide.contents[1].content}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const currentSlideData = visibleSlides[currentSlide];

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col bg-white',
        isFullscreen ? 'fixed inset-0 z-50' : 'h-full',
        className
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold">{title}</h1>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('desktop')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'desktop' ? 'bg-gray-700' : 'hover:bg-gray-700'
              )}
              title="Vue desktop"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'mobile' ? 'bg-gray-700' : 'hover:bg-gray-700'
              )}
              title="Vue mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowOverview(!showOverview)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              showOverview ? 'bg-gray-700' : 'hover:bg-gray-700'
            )}
            title="Vue d'ensemble (G)"
          >
            <Grid className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowNotes(!showNotes)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              showNotes ? 'bg-gray-700' : 'hover:bg-gray-700'
            )}
            title="Notes du présentateur (N)"
          >
            <FileText className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
            title="Paramètres"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-gray-700 mx-1" />

          {onShare && (
            <button
              onClick={onShare}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
              title="Partager"
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
              title="Exporter"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
            title="Plein écran (F)"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Slide area */}
        <div className={cn(
          'flex-1 flex flex-col',
          showNotes && 'max-w-[70%]'
        )}>
          {/* Slide display */}
          <div className="flex-1 flex items-center justify-center p-4 bg-gray-100">
            {showOverview ? (
              /* Grid overview */
              <div className="w-full h-full overflow-auto p-4">
                <div className="grid grid-cols-4 gap-4">
                  {visibleSlides.map((slide, index) => (
                    <button
                      key={slide.id}
                      onClick={() => goToSlide(index)}
                      className={cn(
                        'aspect-video bg-white rounded-lg border-2 overflow-hidden transition-all hover:shadow-lg',
                        currentSlide === index
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-gray-200'
                      )}
                    >
                      <div className="w-full h-full p-2 flex flex-col">
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          {getSlideIcon(slide)}
                          <span>{index + 1}</span>
                        </div>
                        <div className="flex-1 text-xs text-left overflow-hidden">
                          {slide.contents[0]?.title || 'Sans titre'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Current slide */
              <div className={cn(
                'bg-white rounded-lg shadow-xl overflow-hidden transition-all',
                viewMode === 'desktop'
                  ? 'w-full max-w-5xl aspect-video'
                  : 'w-80 aspect-[9/16]'
              )}
                style={{
                  backgroundColor: currentSlideData?.contents[0]?.background || 'white'
                }}
              >
                {currentSlideData && renderSlideContent(currentSlideData)}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevious}
                disabled={currentSlide === 0}
                className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isPlaying ? 'bg-primary hover:bg-primary-dark' : 'hover:bg-gray-700'
                )}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              <button
                onClick={goToNext}
                disabled={currentSlide === totalSlides - 1}
                className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Progress indicator */}
              {isPlaying && (
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-24 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000"
                      style={{ width: `${(elapsedTime / autoAdvanceTime) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTime(autoAdvanceTime - elapsedTime)}
                  </span>
                </div>
              )}
            </div>

            {/* Slide counter */}
            <div className="flex items-center gap-4">
              <span className="text-sm">
                <span className="font-medium">{currentSlide + 1}</span>
                <span className="text-gray-500"> / {totalSlides}</span>
              </span>

              {/* Slide navigation dots */}
              <div className="flex items-center gap-1">
                {visibleSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all',
                      currentSlide === index
                        ? 'bg-white w-4'
                        : 'bg-gray-600 hover:bg-gray-500'
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 hover:bg-gray-700 rounded-lg"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <button
                onClick={() => goToSlide(0)}
                className="p-2 hover:bg-gray-700 rounded-lg"
                title="Recommencer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{formatTime(currentSlide * 30)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes panel */}
        {showNotes && (
          <div className="w-[30%] border-l border-gray-200 bg-white flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Notes du présentateur</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {currentSlideData?.contents[0]?.notes ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {currentSlideData.contents[0].notes}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Aucune note pour cette slide
                </p>
              )}
            </div>

            {/* Next slide preview */}
            <div className="p-4 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Slide suivante</p>
              {currentSlide < totalSlides - 1 ? (
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <div className="w-full h-full p-2 text-xs">
                    {visibleSlides[currentSlide + 1]?.contents[0]?.title || 'Sans titre'}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Fin de la présentation</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Paramètres de présentation</h3>
              <button onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée par slide (lecture auto)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={autoAdvanceTime}
                    onChange={(e) => setAutoAdvanceTime(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-16 text-right">
                    {autoAdvanceTime}s
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Raccourcis clavier</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Slide suivante</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 rounded">→ / Espace</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Slide précédente</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 rounded">←</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Plein écran</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 rounded">F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Vue d'ensemble</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 rounded">G</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Notes</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 rounded">N</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Lecture/Pause</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 rounded">P</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Quitter</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 rounded">Échap</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-primary text-white rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
        .animate-zoomIn { animation: zoomIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default PresentationMode;
