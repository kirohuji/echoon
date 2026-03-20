import { createPortal } from 'react-dom';

type Props = {
  portal?: boolean;
};

export function SplashScreen({ portal = true }: Props) {
  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="h-2 w-64 animate-pulse rounded bg-black/10" />
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    </div>
  );

  if (!portal) return content;
  return createPortal(content, document.body);
}

