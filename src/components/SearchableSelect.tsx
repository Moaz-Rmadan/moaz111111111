import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SearchableSelectOption {
  id: string;
  name: string;
  subtext?: string;
  [key: string]: any;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  noOptionsMessage?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  selectedValue,
  onChange,
  placeholder = "ابحث واختر...",
  className = "",
  noOptionsMessage = "لا توجد نتائج مطابقة",
  searchPlaceholder = "ابحث بالاسم أو التفاصيل...",
  disabled = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(opt => opt.id === selectedValue);

  const filteredOptions = options.filter(opt => {
    const nameMatch = (opt.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const subtextMatch = opt.subtext ? (opt.subtext || '').toLowerCase().includes(searchTerm.toLowerCase()) : false;
    return nameMatch || subtextMatch;
  });

  return (
    <div className={`relative ${className}`} ref={dropdownRef} dir="rtl">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-xl text-xs font-black bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
      >
        <span className={selectedOption ? "text-slate-800 truncate" : "text-slate-400 truncate"}>
          {selectedOption ? (
            <span className="flex items-center gap-1.5">
              <span>{selectedOption.name}</span>
              {selectedOption.subtext && (
                <span className="text-[10px] text-slate-400 font-normal">({selectedOption.subtext})</span>
              )}
            </span>
          ) : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedValue && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={14} className="text-slate-500" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0 flex items-center gap-1">
            <Search size={12} className="text-slate-400 shrink-0 ml-1.5" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 bg-transparent text-xs font-bold focus:outline-none text-slate-800"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 max-h-44">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-[11px] text-slate-400 font-bold">
                {noOptionsMessage}
              </div>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-right px-3 py-2 text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center justify-between ${selectedValue === opt.id ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700'}`}
                >
                  <span className="truncate">{opt.name}</span>
                  {opt.subtext && <span className="text-[10px] font-mono text-slate-400">{opt.subtext}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
