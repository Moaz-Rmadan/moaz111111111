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
        className="w-full flex items-center justify-between px-4 py-2 border border-slate-200 rounded-xl text-sm font-black bg-white text-slate-800 transition-all duration-200 hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 h-11 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
      >
        <span className={selectedOption ? "text-slate-800 truncate" : "text-slate-400 font-medium truncate"}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              <span>{selectedOption.name}</span>
              {selectedOption.subtext && (
                <span className="text-xs text-slate-400 font-normal">({selectedOption.subtext})</span>
              )}
            </span>
          ) : placeholder}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {selectedValue && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500 transition-all"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-[9999] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl shadow-slate-200/50 max-h-80 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 sticky top-0 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm font-bold focus:outline-none text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400 font-bold italic">
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
                  className={`w-full text-right px-4 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-between group ${selectedValue === opt.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="truncate">{opt.name}</span>
                    {opt.subtext && <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-500">{opt.subtext}</span>}
                  </div>
                  {selectedValue === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
