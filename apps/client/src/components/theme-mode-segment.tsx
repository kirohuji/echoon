import { useState } from 'react';

export function ThemeModeSegment({ className = '' }: { className?: string }) {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  const setThemeMode = (mode: 'light' | 'dark') => {
    setColorMode(mode);
    localStorage.setItem('echoon-theme', mode);
    document.documentElement.classList.toggle('dark', mode === 'dark');
  };

  return (
    <div className={className}>
      <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
        <button
          type="button"
          className={`flex-1 rounded-md py-2 text-xs font-medium ${
            colorMode === 'light'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400'
          }`}
          onClick={() => setThemeMode('light')}
        >
          浅色
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md py-2 text-xs font-medium ${
            colorMode === 'dark'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400'
          }`}
          onClick={() => setThemeMode('dark')}
        >
          深色
        </button>
      </div>
    </div>
  );
}
