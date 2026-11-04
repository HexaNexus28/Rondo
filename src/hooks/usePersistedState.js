import { useEffect, useState } from "react";

const PREFIX = "rondo:";

export function usePersistedState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
