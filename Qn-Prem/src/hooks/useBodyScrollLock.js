
import { useEffect } from 'react';

export const useBodyScrollLock = (lock = true) => {
  useEffect(() => {
    if (lock) {
      document.body.style.overflowY = 'hidden';
    }

    return () => {
      document.body.style.overflowY = 'auto';
    };
  }, [lock]);
};


