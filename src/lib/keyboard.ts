import type { KeyboardEvent } from 'react';

// True when an Enter keypress should submit: it's Enter, not Shift+Enter (which inserts a newline),
// and NOT while an IME composition is active (Chinese / Japanese / Korean input). Without the
// composition guard, pressing Enter to PICK a candidate word fires submit with half-typed text — a
// constant hazard on a Chinese-first platform. Pure + testable (the interface is the test surface).
export function isSubmitEnter(e: KeyboardEvent): boolean {
  if (e.key !== 'Enter' || e.shiftKey) return false;
  // React's nativeEvent.isComposing covers modern browsers; keyCode 229 is the legacy IME signal.
  const native = e.nativeEvent as unknown as { isComposing?: boolean; keyCode?: number };
  if (native?.isComposing || native?.keyCode === 229) return false;
  return true;
}
