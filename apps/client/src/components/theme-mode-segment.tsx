import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

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
      <Tabs value={colorMode} onValueChange={(v) => setThemeMode(v as 'light' | 'dark')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="light">浅色</TabsTrigger>
          <TabsTrigger value="dark">深色</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
