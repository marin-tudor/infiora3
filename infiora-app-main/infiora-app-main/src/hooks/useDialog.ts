import { useState, useCallback } from "react";

interface Content<T = any> {
  title?: string;
  message?: string;
  data?: T;
}

export interface DialogReturnType<T = any> {
  isOpen: boolean;
  content: Content<T> | null;
  open: (content?: Content<T> | null) => void;
  close: () => void;
  setContent: React.Dispatch<React.SetStateAction<Content<T> | null>>;
}

/**
 * useDialog - A custom hook for handling the open/close state and content of a dialog.
 *
 * @return {Object} An object containing 'isOpen', 'content', 'open', 'close', and 'setContent' properties.
 */
function useDialog<T>(): DialogReturnType<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<Content<T> | null>(null);

  // Open the dialog
  const open = useCallback((dialogContent: Content<T> | null = null) => {
    setContent(dialogContent);
    setIsOpen(true);
  }, []);

  // Close the dialog
  const close = useCallback(() => {
    setIsOpen(false);

    // Optionally reset the dialog content
    setContent(null);
  }, []);

  return {
    isOpen,
    content,
    open,
    close,
    setContent,
  };
}

export default useDialog;
