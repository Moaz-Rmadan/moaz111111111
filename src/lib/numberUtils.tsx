import React from 'react';

// Global hook/patch to automatically apply the preferred number system to ALL .toLocaleString() calls in the entire app!
if (typeof Number !== 'undefined' && Number.prototype) {
  const originalToLocaleString = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (locales, options) {
    // Force Western Arabic numerals (English digits) for all formatting
    return originalToLocaleString.call(this, 'en-US', options);
  };
}

/**
 * Converts any Eastern Arabic digits (٠-٩) found in a string back to Western Arabic (English) digits (0-9).
 * Use this to ensure English digits are used even when using Arabic locales in libraries like date-fns.
 */
export function forceEnglishDigits(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  const numStr = String(str);
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return numStr.replace(/[٠-٩]/g, (w) => String(arabicDigits.indexOf(w)));
}

/**
 * Converts Western Arabic digits (0-9) to Eastern Arabic-Indic digits (٠-٩).
 * STUB: Always returns Western digits as per user request.
 */
export function toArabicDigits(num: string | number): string {
  return String(num);
}

/**
 * Formats a raw number with thousands grouping and custom decimal places.
 */
export function formatNumber(
  value: number | string | undefined | null,
  decimals: number = 0,
  _system: 'western' | 'eastern' = 'western'
): string {
  if (value === undefined || value === null) return '0';
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(parsed)) return '0';

  // Format with standard thousands groupings and custom decimal places - ALWAYS WESTERN
  return parsed.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Abbreviates large numbers professionally (e.g., 12.5K, 1.2M, etc.)
 */
export function abbreviateNumber(value: number, _system: 'western' | 'eastern' = 'western'): string {
  const absValue = Math.abs(value);
  let result = '';
  if (absValue >= 1e6) {
    result = (value / 1e6).toFixed(1) + 'M';
  } else if (absValue >= 1e3) {
    result = (value / 1e3).toFixed(1) + 'K';
  } else {
    result = value.toFixed(0);
  }

  return result;
}

/**
 * Hook or helper to get standard display parameters for currency values.
 */
export function formatCurrencyParts(
  value: number,
  _system: 'western' | 'eastern' = 'western',
  style: 'standard' | 'badge' | 'abbreviated' = 'standard'
): { formattedValue: string; unit: string; isNegative: boolean } {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  let formattedValue = '';
  if (style === 'abbreviated') {
    formattedValue = abbreviateNumber(absValue, 'western');
  } else {
    // Show 2 decimal places if it has fractional parts, otherwise clean rounded integer
    const decimals = absValue % 1 === 0 ? 0 : 2;
    formattedValue = formatNumber(absValue, decimals, 'western');
  }

  const unit = 'ج.م';

  return {
    formattedValue: (isNegative ? '-' : '') + formattedValue,
    unit,
    isNegative,
  };
}

interface NumberDisplayProps {
  value: number | string | undefined | null;
  decimals?: number;
  system?: 'western' | 'eastern';
  style?: 'standard' | 'badge' | 'abbreviated';
  unit?: string; // e.g. "ج.م", "قطعة", "يوم"
  className?: string;
  colored?: boolean; // Green for positive, red for negative
  coloredInverse?: boolean; // Red for positive (e.g. costs/wastes), green for negative
  showSign?: boolean;
  animate?: boolean;
}

/**
 * A highly polished, visually stunning component to render numbers and currencies across the dashboard.
 * It uses JetBrains Mono for monospaced numerical tabular layouts, aligning decimals beautifully.
 * It automatically reads its default settings from localStorage for a truly cohesive and dynamic experience.
 */
export const NumberDisplay: React.FC<NumberDisplayProps> = ({
  value,
  decimals,
  system: propSystem,
  style: propStyle,
  unit,
  className = '',
  colored = false,
  coloredInverse = false,
  showSign = false,
}) => {
  // Read system, style and currencySymbol from localStorage with fallback
  const [localSettings, setLocalSettings] = React.useState<{ system: 'western' | 'eastern'; style: 'standard' | 'badge' | 'abbreviated'; currencySymbol: string }>(() => {
    try {
      const saved = localStorage.getItem('company_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          system: parsed.numberSystem || 'western',
          style: parsed.currencyStyle || 'standard',
          currencySymbol: parsed.currencySymbol || 'ج.م',
        };
      }
    } catch (e) {
      // Ignored
    }
    return { system: 'western', style: 'standard', currencySymbol: 'ج.م' };
  });

  React.useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('company_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setLocalSettings({
            system: parsed.numberSystem || 'western',
            style: parsed.currencyStyle || 'standard',
            currencySymbol: parsed.currencySymbol || 'ج.م',
          });
        }
      } catch (e) {
        // Ignored
      }
    };

    // Listen to local changes
    window.addEventListener('storage', handleStorageChange);
    // Listen to standard custom events for same-window updates
    window.addEventListener('company-settings-updated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('company-settings-updated', handleStorageChange);
    };
  }, []);

  const system = propSystem !== undefined ? propSystem : localSettings.system;
  const style = propStyle !== undefined ? propStyle : localSettings.style;

  if (value === undefined || value === null) {
    return <span className={`font-mono text-slate-400 ${className}`}>-</span>;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return <span className={`font-mono text-slate-400 ${className}`}>{String(value)}</span>;
  }

  const isNegative = numValue < 0;
  const absValue = Math.abs(numValue);
  
  // Decide decimals
  const finalDecimals = decimals !== undefined ? decimals : (absValue % 1 === 0 ? 0 : 2);
  
  let formatted = '';
  if (style === 'abbreviated') {
    formatted = abbreviateNumber(numValue, system);
  } else {
    formatted = formatNumber(absValue, finalDecimals, system);
  }

  // Determine Sign
  let signStr = '';
  if (numValue > 0 && showSign) {
    signStr = '+';
  } else if (isNegative) {
    signStr = '-';
  }

  // Determine Colors
  let colorClass = 'text-slate-900 dark:text-slate-100';
  if (colored) {
    if (numValue > 0) {
      colorClass = 'text-emerald-600 dark:text-emerald-400 font-extrabold';
    } else if (numValue < 0) {
      colorClass = 'text-rose-600 dark:text-rose-400 font-extrabold';
    } else {
      colorClass = 'text-slate-500 dark:text-slate-400';
    }
  } else if (coloredInverse) {
    if (numValue > 0) {
      colorClass = 'text-rose-600 dark:text-rose-400 font-extrabold';
    } else if (numValue < 0) {
      colorClass = 'text-emerald-600 dark:text-emerald-400 font-extrabold';
    } else {
      colorClass = 'text-slate-500 dark:text-slate-400';
    }
  }

  // If the unit is a currency symbol (default "ج.م"), let's use the user's custom currency symbol
  const resolvedUnit = unit === 'ج.م' ? localSettings.currencySymbol : unit;

  const renderedUnit = resolvedUnit ? (
    <span className="text-[10px] font-sans font-medium text-slate-400 mr-1 select-none">
      {resolvedUnit}
    </span>
  ) : null;

  // Let's format standard Arabic style
  // Force Western numbers in JetBrains Mono as per user request.
  const fontClass = 'font-mono tracking-tight tabular-nums';

  if (style === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-slate-50 border border-slate-100 shadow-sm ${colorClass} ${className}`}
      >
        <span className={fontClass}>
          {signStr}
          {formatted}
        </span>
        {renderedUnit}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-baseline gap-0.5 ${colorClass} ${className}`}>
      <span className={`${fontClass}`}>
        {signStr}
        {formatted}
      </span>
      {renderedUnit}
    </span>
  );
};
