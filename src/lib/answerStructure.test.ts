import { describe, it, expect } from 'vitest';
import { parseAnswer } from './answerStructure';

describe('parseAnswer', () => {
  it('extracts a leading 概要 and ## sections', () => {
    const md = '概要：两者互补。\n\n## 核心差异\nCLT 强调减负。\n\n## 启示\n先示范后渐隐。';
    const p = parseAnswer(md);
    expect(p.summary).toBe('两者互补。');
    expect(p.sections.map((s) => s.title)).toEqual(['核心差异', '启示']);
    expect(p.sections[0].body).toContain('CLT');
  });

  it('treats bold CJK-ordinal lines as section headings', () => {
    const md = '**一、核心差异**\n内容A\n**二、启示**\n内容B';
    const p = parseAnswer(md);
    expect(p.sections.map((s) => s.title)).toEqual(['一、核心差异', '二、启示']);
    expect(p.sections[1].body).toBe('内容B');
  });

  it('does NOT split on numbered list items', () => {
    const md = '## 启示\n1. 第一点\n2. 第二点';
    const p = parseAnswer(md);
    expect(p.sections).toHaveLength(1);
    expect(p.sections[0].body).toContain('1. 第一点');
  });

  it('plain prose with no headings → all lead, no sections', () => {
    const p = parseAnswer('这是一段普通回答，没有小标题。');
    expect(p.summary).toBeNull();
    expect(p.sections).toHaveLength(0);
    expect(p.lead).toContain('普通回答');
  });

  it('keeps prose before the first heading as lead', () => {
    const md = '先说点引子。\n## 第一节\n正文';
    const p = parseAnswer(md);
    expect(p.lead).toBe('先说点引子。');
    expect(p.sections).toHaveLength(1);
  });

  it('supports the 摘要 / TL;DR synonyms and full-width colon', () => {
    expect(parseAnswer('摘要：要点。\n## A\nx').summary).toBe('要点。');
    expect(parseAnswer('TL;DR: gist.\n## A\nx').summary).toBe('gist.');
  });

  it('empty / whitespace input is safe', () => {
    expect(parseAnswer('')).toEqual({ summary: null, lead: '', sections: [] });
    expect(parseAnswer('   \n  ')).toEqual({ summary: null, lead: '', sections: [] });
  });
});
