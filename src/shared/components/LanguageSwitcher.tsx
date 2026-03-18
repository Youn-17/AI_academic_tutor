import React, { useState, useRef, useEffect } from 'react';
import { Locale } from '@/types';
import { Languages, ChevronDown, Check } from 'lucide-react';

interface LanguageSwitcherProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md';
}

const LANGUAGES = [
  { code: 'zh-CN' as Locale, name: '简体中文', nativeName: '简体中文' },
  { code: 'zh-TW' as Locale, name: '繁體中文', nativeName: '繁體中文' },
  { code: 'en' as Locale, name: 'English', nativeName: 'English' },
];

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  locale,
  onLocaleChange,
  theme = 'dark',
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const currentLanguage = LANGUAGES.find(lang => lang.code === locale);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sizeClasses = size === 'sm'
    ? { button: 'px-2 py-1 text-xs', dropdown: 'w-36 text-xs' }
    : { button: 'px-3 py-1.5 text-sm', dropdown: 'w-40 text-sm' };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg transition-all duration-200
          ${isDark
            ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
            : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }
          ${sizeClasses.button}
        `}
        aria-label="Switch language / 切换语言"
      >
        <Languages size={size === 'sm' ? 14 : 16} />
        <span className="hidden sm:inline">{currentLanguage?.nativeName}</span>
        <ChevronDown
          size={size === 'sm' ? 12 : 14}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute top-full right-0 mt-2 rounded-xl border shadow-xl z-50 overflow-hidden
            ${isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-slate-200'
            }
            ${sizeClasses.dropdown}
            animate-in fade-in zoom-in-95 duration-150
          `}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onLocaleChange(lang.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 transition-colors
                ${locale === lang.code
                  ? isDark
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'bg-indigo-50 text-indigo-600'
                  : isDark
                    ? 'text-slate-300 hover:bg-slate-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }
              `}
            >
              <span>{lang.name}</span>
              {locale === lang.code && (
                <Check size={14} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
