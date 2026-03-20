import { createPortal } from 'react-dom';

type Props = {
  portal?: boolean;
};

export function LoadingScreen({ portal = true }: Props) {
  const content = (
    <div className="flex w-full flex-col items-center justify-center gap-2 p-4">
      <div className="h-2 w-64 animate-pulse rounded bg-black/10" />
      <div className="text-sm text-gray-500">Loading...</div>
    </div>
  );

  if (!portal) return content;
  return createPortal(content, document.body);
}

