import { useState, useEffect } from "react";
import { saveToStorage, loadFromStorage } from "../utils/storage";

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    return loadFromStorage(key, defaultValue);
  });

  const setStoredValue = (newValue: T) => {
    setValue(newValue);
    saveToStorage(key, newValue);
  };

  useEffect(() => {
    // Sync with localStorage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setValue(JSON.parse(e.newValue));
        } catch (err) {
          console.error(`Error parsing storage change for ${key}:`, err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [value, setStoredValue];
}