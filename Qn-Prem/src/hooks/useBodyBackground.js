import { useEffect } from 'react';

const useBodyBackground = (color) => {
  useEffect(() => {
    const previousColor = document.body.style.backgroundColor;
    document.body.style.backgroundColor = color;

    return () => {
      document.body.style.backgroundColor = previousColor;
    };
  }, [color]);
};

export default useBodyBackground;
