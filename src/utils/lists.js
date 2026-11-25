const PREFIX = "rondo:";
const DEFAULT_NAME = "Ma file";

export const newList = (name) => ({ id: crypto.randomUUID(), name, queue: [], index: 0 });

function readLegacy(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// Before multi-list support the app stored a single `queue` + `index`: keep them as the first list.
export function initialLists() {
  return [{ ...newList(DEFAULT_NAME), queue: readLegacy("queue", []), index: readLegacy("index", 0) }];
}

export const nextListName = (lists) => `Liste ${lists.length + 1}`;
