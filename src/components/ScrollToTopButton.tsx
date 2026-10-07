import React, { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ArrowUp } from 'lucide-react';

interface ScrollToTopButtonProps {
  /** Target container ID, defaults to 'main-scroll-container' */
  containerId?: string;
  /** Scroll distance threshold in px to show the button, defaults to 80 */
  threshold?: number;
  /** Primary label in Arabic */
  label?: string;
  /** Optional secondary subtitle */
  sublabel?: string;
  /** Whether to show a circular scroll progress ring */
  showProgress?: boolean;
  /** Additional custom classes */
  className?: string;
  /** Optional click callback */
  onClick?: () => void;
  /** Variant: 'floating' | 'inline' */
  variant?: 'floating' | 'inline';
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
  containerId = 'main-scroll-container',
  threshold = 80,
  label = 'العودة للأعلى',
  sublabel,
  showProgress = true,
  className = '',
  onClick,
  variant = 'floating'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const calculateProgress = useCallback(() => {
    const mainElem = document.getElementById(containerId) || document.querySelector('main');
    let scrollTop = 0;
    let scrollHeight = 0;
    let clientHeight = 0;

    if (mainElem && mainElem.scrollHeight > mainElem.clientHeight) {
      scrollTop = mainElem.scrollTop;
      scrollHeight = mainElem.scrollHeight;
      clientHeight = mainElem.clientHeight;
    } else {
      scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
      clientHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    }

    // Also check other active scrollable containers if any has deep scroll
    const allScrollables = document.querySelectorAll('.overflow-y-auto, .overflow-auto');
    allScrollables.forEach(el => {
      if (el.scrollTop > scrollTop) {
        scrollTop = el.scrollTop;
        scrollHeight = el.scrollHeight;
        clientHeight = el.clientHeight;
      }
    });

    const maxScroll = Math.max(scrollHeight - clientHeight, 1);
    const progress = Math.min(Math.max(Math.round((scrollTop / maxScroll) * 100), 0), 100);

    setScrollProgress(progress);
    setIsVisible(scrollTop > threshold);
  }, [containerId, threshold]);

  useEffect(() => {
    calculateProgress();

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          calculateProgress();
          ticking = false;
        });
        ticking = true;
      }
    };

    const mainElem = document.getElementById(containerId) || document.querySelector('main');
    if (mainElem) {
      mainElem.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    // Periodic check for dynamic content expansion (e.g. employee list loading or tabs switching)
    const interval = setInterval(calculateProgress, 400);

    return () => {
      clearInterval(interval);
      if (mainElem) {
        mainElem.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [calculateProgress, containerId]);

  const scrollToTop = useCallback(() => {
    // 1. Scroll main container
    const mainElem = document.getElementById(containerId) || document.querySelector('main');
    if (mainElem) {
      mainElem.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 2. Scroll window & document
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });

    // 3. Scroll all internal overflow containers (tables, cards) both vertically and horizontally
    const scrollables = document.querySelectorAll('.overflow-y-auto, .overflow-auto, .overflow-x-auto');
    scrollables.forEach(el => {
      try {
        el.scrollTo({ top: 0, behavior: 'smooth' });
        // In RTL, 0 is the rightmost origin for horizontal scroll
        el.scrollLeft = 0;
      } catch {
        // fallback
        el.scrollTop = 0;
      }
    });

    if (onClick) {
      onClick();
    }
  }, [containerId, onClick]);

  // Inline Button Variant (for table footers or action bars)
  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={scrollToTop}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 select-none cursor-pointer active:scale-95 no-print bg-slate-900 hover:bg-blue-600 text-white shadow-sm hover:shadow-md hover:shadow-blue-600/20 group ${className}`}
        aria-label={label}
        title={label}
      >
        <div className="w-5 h-5 rounded-lg bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors shrink-0">
          <ArrowUp size={13} className="stroke-[3] group-hover:-translate-y-0.5 transition-transform" />
        </div>
        <span>{label}</span>
        {sublabel && (
          <span className="text-[11px] font-bold text-slate-300 group-hover:text-blue-100 hidden sm:inline">
            ({sublabel})
          </span>
        )}
      </button>
    );
  }

  // Floating Variant
  return (
    <div
      className={`fixed bottom-20 left-4 sm:left-6 md:bottom-8 md:left-8 z-40 no-print transition-all duration-300 ease-out select-none ${
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto scale-100'
          : 'translate-y-8 opacity-0 pointer-events-none scale-75'
      } ${className}`}
    >
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={label}
        title={`${label}${sublabel ? ` - ${sublabel}` : ''}`}
        className="group relative flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl shadow-xl shadow-blue-900/30 border border-white/20 backdrop-blur-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-blue-500/15"
      >
        {/* Circular Progress Ring or Icon Container */}
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-white/15 group-hover:bg-white/25 transition-colors shrink-0">
          {showProgress && (
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-0.5"
              viewBox="0 0 36 36"
            >
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-white/20"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="94.25"
                strokeDashoffset={94.25 - (94.25 * scrollProgress) / 100}
                strokeLinecap="round"
                className="text-amber-300 transition-all duration-150"
              />
            </svg>
          )}
          <ChevronUp
            size={20}
            className="stroke-[3] text-white group-hover:-translate-y-1 transition-transform relative z-10"
          />
        </div>

        {/* Text Content */}
        <div className="flex flex-col text-right">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-xs sm:text-sm text-white drop-shadow-sm whitespace-nowrap">
              {label}
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-300 bg-black/20 px-1.5 py-0.2 rounded-md">
              {scrollProgress}%
            </span>
          </div>
          {sublabel && (
            <span className="text-[10px] font-bold text-blue-100 hidden sm:block whitespace-nowrap opacity-90">
              {sublabel}
            </span>
          )}
        </div>
      </button>
    </div>
  );
};

export default ScrollToTopButton;
