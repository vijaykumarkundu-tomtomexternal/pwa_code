import { useEffect, useState } from "react";

const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);

    return () => clearTimeout(handler); // cancel timeout 
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
