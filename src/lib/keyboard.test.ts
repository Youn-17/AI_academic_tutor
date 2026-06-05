import { describe, it, expect } from 'vitest';
import type { KeyboardEvent } from 'react';
import { isSubmitEnter } from './keyboard';

const ev = (over: Partial<{ key: string; shiftKey: boolean; nativeEvent: unknown }>): KeyboardEvent =>
  ({ key: 'Enter', shiftKey: false, nativeEvent: {}, ...over }) as unknown as KeyboardEvent;

describe('isSubmitEnter', () => {
  it('plain Enter submits', () => expect(isSubmitEnter(ev({}))).toBe(true));
  it('Shift+Enter does not submit (newline)', () => expect(isSubmitEnter(ev({ shiftKey: true }))).toBe(false));
  it('a non-Enter key does not submit', () => expect(isSubmitEnter(ev({ key: 'a' }))).toBe(false));
  it('IME composing (isComposing) does not submit', () =>
    expect(isSubmitEnter(ev({ nativeEvent: { isComposing: true } }))).toBe(false));
  it('IME composing (legacy keyCode 229) does not submit', () =>
    expect(isSubmitEnter(ev({ nativeEvent: { keyCode: 229 } }))).toBe(false));
});
