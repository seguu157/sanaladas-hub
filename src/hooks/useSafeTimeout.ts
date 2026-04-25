import { useEffect, useRef } from 'react';

export const useSafeTimeout = () => {
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const setSafeTimeout = (callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      callback();
      timeoutsRef.current.delete(timeout);
    }, delay);

    timeoutsRef.current.add(timeout);
    return timeout;
  };

  const clearSafeTimeout = (timeout: NodeJS.Timeout) => {
    clearTimeout(timeout);
    timeoutsRef.current.delete(timeout);
  };

  useEffect(() => {
    return () => {
      // Clear all timeouts on unmount
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current.clear();
    };
  }, []);

  return { setSafeTimeout, clearSafeTimeout };
};
