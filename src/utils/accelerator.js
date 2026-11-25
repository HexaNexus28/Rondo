const NAMED_KEYS = {
  ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
  Space: "Space", Enter: "Return", Backspace: "Backspace", Delete: "Delete",
  Home: "Home", End: "End", PageUp: "PageUp", PageDown: "PageDown", Insert: "Insert",
};

/** Key part of an Electron accelerator for a KeyboardEvent.code, or null if unsupported. */
function keyName(code) {
  if (NAMED_KEYS[code]) return NAMED_KEYS[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F\d{1,2}$/.test(code)) return code;
  return null;
}

/**
 * Builds an Electron accelerator ("Ctrl+Alt+G") from a keydown event.
 * Returns null while only modifiers are held, or when no Ctrl/Alt/Win modifier is present
 * (a bare letter as a global shortcut would hijack normal typing everywhere).
 */
export function acceleratorFromEvent(e) {
  const key = keyName(e.code);
  if (!key || !(e.ctrlKey || e.altKey || e.metaKey)) return null;
  return [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", e.metaKey && "Super", key]
    .filter(Boolean)
    .join("+");
}
