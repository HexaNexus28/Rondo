import { useEffect, useState } from "react";

const PREFIX = "rondo:";

export function usePersistedState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw !== null) return JSON.parse(raw);
    } catch {
      // unreadable value: fall through to the default
    }
    return typeof initial === "function" ? initial() : initial;
  });

  useEffect(() => {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
