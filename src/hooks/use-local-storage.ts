import { useState } from 'react';

/**
 * A hook that works similarly to React.useState, but persists the value using browser's localStorage.
 * The value is automatically retrieved from localStorage on mount and updated on state change.
 * 
 * @param key - The key under which to store the value in localStorage.
 * @param initialValue - The initial value to use if no stored value is found.
 * @returns An array containing the current value and a setter function.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      if (item) {
        return JSON.parse(item);
      }
      // If no item found, persist the initialValue to localStorage
      try {
        window.localStorage.setItem(key, JSON.stringify(initialValue));
      } catch (setError) {
        console.warn(`Error persisting initial value to localStorage key "${key}":`, setError);
      }
      return initialValue;
    } catch (error) {
      // If error reading from localStorage, return initialValue
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = typeof value === 'function' ? (value as (val: T) => T)(storedValue) : value;
      // Save to local storage first
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      // Only update state if localStorage save succeeded
      setStoredValue(valueToStore);
    } catch (error) {
      // If localStorage fails, don't update state to keep them in sync
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
