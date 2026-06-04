import { describe, it, expect } from 'vitest';
import { makeThinkingStripper } from './thinking';

describe('makeThinkingStripper', () => {
    it('passes normal text through unchanged', () => {
        const s = makeThinkingStripper();
        expect(s.push('Hello world') + s.flush()).toBe('Hello world');
    });

    it('strips a whole <thinking> block', () => {
        const s = makeThinkingStripper();
        expect(s.push('A<thinking>secret</thinking>B') + s.flush()).toBe('AB');
    });

    it('strips a tag split across chunks (the hard case)', () => {
        const s = makeThinkingStripper();
        let out = s.push('A<thin');
        out += s.push('king>secret</thi');
        out += s.push('nking>B');
        out += s.flush();
        expect(out).toBe('AB');
    });

    it('holds a partial open tag instead of leaking it', () => {
        const s = makeThinkingStripper();
        expect(s.push('keep<thi')).toBe('keep');                 // partial held
        expect(s.push('nking>x</thinking>more') + s.flush()).toBe('more');
    });

    it('handles the <think> short form', () => {
        const s = makeThinkingStripper();
        expect(s.push('a<think>z</think>b') + s.flush()).toBe('ab');
    });

    it('flush emits a held lone "<" that was never a tag', () => {
        const s = makeThinkingStripper();
        let out = s.push('text<');   // '<' held as a possible tag prefix
        out += s.flush();             // flush must release it
        expect(out).toBe('text<');
    });

    it('handles multiple blocks in one chunk', () => {
        const s = makeThinkingStripper();
        expect(s.push('a<think>1</think>b<think>2</think>c') + s.flush()).toBe('abc');
    });
});
