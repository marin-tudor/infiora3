import { useState } from 'react';

export const useLocalStorage = () => {
  const [value, setValue] = useState<string | null>(null);

  const setItem = (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
    setValue(value);
  };

  const getItem = (key: string) => {
    if (typeof localStorage !== 'undefined') {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        setValue(JSON.parse(storedValue));
        return JSON.parse(storedValue);
      }
    }
    return null; // Handle non-browser environment gracefully
  };

  const removeItem = (key: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
    setValue(null);
  };

  return { value, setItem, getItem, removeItem };
};
