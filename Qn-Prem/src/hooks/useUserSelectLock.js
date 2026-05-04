
import { useEffect } from 'react';

export const useUserSelectLock = (lock = true) => {
  useEffect(() => {
    if (lock) {
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.body.style.overflowY = 'unset';
    };
  }, [lock]);
};

