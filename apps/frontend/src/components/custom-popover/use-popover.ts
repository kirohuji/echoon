import { useCallback, useState } from 'react';

// ----------------------------------------------------------------------

export default function usePopover() {
  const [open, setOpen] = useState(null);

  const onOpen = useCallback((event: any) => {
    setOpen(event.currentTarget);
  }, []);

  const onClose = useCallback(() => {
    setOpen(null);
  }, []);

  return {
    open,
    onOpen,
    onClose,
    setOpen,
  };
}
