import { useRef, useCallback, useEffect } from "react";

export function useAutosave(
  saveFn: () => void,
  delay: number = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveFnRef = useRef(saveFn);

  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  const trigger = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      saveFnRef.current();
    }, delay);
  }, [delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      saveFnRef.current();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { trigger, cancel, flush };
}
