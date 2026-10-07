import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface TouchStepperProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export const TouchStepper: React.FC<TouchStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  unit = '',
  size = 'md',
  className = '',
  disabled = false,
}) => {
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
  };

  const handleIncrement = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (disabled || value >= max) return;
    triggerHaptic();
    onChange(Math.min(max, Number((value + step).toFixed(2))));
  };

  const handleDecrement = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (disabled || value <= min) return;
    triggerHaptic();
    onChange(Math.max(min, Number((value - step).toFixed(2))));
  };

  const buttonDimensions = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm';

  return (
    <div
      className={`inline-flex items-center bg-slate-100/90 border border-slate-200/80 rounded-2xl p-1 gap-1 select-none ${className}`}
      dir="ltr"
    >
      {/* Minus Button */}
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={handleDecrement}
        className={`${buttonDimensions} flex items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs hover:bg-slate-50 active:scale-90 active:bg-slate-200 transition-all disabled:opacity-30 disabled:pointer-events-none touch-manipulation`}
        aria-label="إنقاص"
      >
        <Minus size={iconSize} strokeWidth={2.5} />
      </button>

      {/* Value Display */}
      <div className={`px-2 min-w-[50px] text-center font-mono font-black text-slate-900 ${textSize}`}>
        <span>{value}</span>
        {unit && <span className="text-[10px] font-sans font-bold text-slate-400 mr-1">{unit}</span>}
      </div>

      {/* Plus Button */}
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={handleIncrement}
        className={`${buttonDimensions} flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-90 active:bg-blue-800 transition-all disabled:opacity-30 disabled:pointer-events-none touch-manipulation`}
        aria-label="زيادة"
      >
        <Plus size={iconSize} strokeWidth={2.5} />
      </button>
    </div>
  );
};
