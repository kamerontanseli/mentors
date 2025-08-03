export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving to localStorage (${key}):`, err);
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error(`Error loading from localStorage (${key}):`, err);
  }
  return defaultValue;
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Error removing from localStorage (${key}):`, err);
  }
}