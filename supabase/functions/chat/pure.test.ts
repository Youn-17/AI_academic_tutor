import { describe, it, expect } from 'vitest';
import { hasImage, lastUserText, pickModel, stripThinking, extractJSON, extractCode } from './pure';

const msg = (text: string) => [{ role: 'user', content: text }];

describe('extractJSON', () => {
    it('parses plain JSON', () => expect(extractJSON('{"a":1}')).toEqual({ a: 1 }));
    it('strips a ```json fence + trailing prose with braces (the B2 fix)', () =>
        expect(extractJSON('当然：\n```json\n{"a":1}\n```\n希望有帮助 {note}')).toEqual({ a: 1 }));
    it('returns null on no/malformed JSON instead of throwing', () => {
        expect(extractJSON('no json here')).toBeNull();
        expect(extractJSON('broken {not json')).toBeNull();
    });
});

describe('pickModel', () => {
    it('routes images to the vision model', () => expect(pickModel([], { hasImage: true })).toBe('claude-sonnet-4-6'));
    it('routes proofs/reasoning to the hard model', () => expect(pickModel(msg('请证明这个定理'), {})).toBe('claude-opus-4-6'));
    it('routes code/debug to the code model', () => expect(pickModel(msg('这段 python 函数报错怎么调试'), {})).toBe('gpt-5.2'));
    it('routes summarize/long to the long model', () => expect(pickModel(msg('请总结这篇文章的要点'), {})).toBe('gemini-2.5-flash'));
    it('routes very short queries to the fast model', () => expect(pickModel(msg('什么是熵'), {})).toBe('gpt-5-mini'));
    it('defaults to balanced for a medium neutral query', () => expect(pickModel(msg('x'.repeat(50)), {})).toBe('claude-sonnet-4-6'));
});

describe('lastUserText + hasImage', () => {
    it('gets the most recent user message text', () =>
        expect(lastUserText([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'user', content: 'c' }])).toBe('c'));
    it('extracts text from a multimodal parts array', () =>
        expect(lastUserText([{ role: 'user', content: [{ type: 'text', text: 'hi' }, { type: 'image_url', image_url: { url: 'x' } }] }])).toBe('hi'));
    it('detects an image part', () =>
        expect(hasImage([{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'x' } }] }])).toBe(true));
    it('is false for plain-text messages', () => expect(hasImage([{ role: 'user', content: 'hi' }])).toBe(false));
});

describe('stripThinking + extractCode', () => {
    it('strips a complete <thinking> block', () => expect(stripThinking('a<thinking>x</thinking>b')).toBe('ab'));
    it('strips the <think> short form', () => expect(stripThinking('a<think>y</think>b')).toBe('ab'));
    it('trims surrounding whitespace', () => expect(stripThinking('  hello  ')).toBe('hello'));
    it('pulls python out of a fence', () => expect(extractCode('```python\nprint(1)\n```')).toBe('print(1)'));
    it('returns the trimmed raw when there is no fence', () => expect(extractCode('  print(1)  ')).toBe('print(1)'));
});
