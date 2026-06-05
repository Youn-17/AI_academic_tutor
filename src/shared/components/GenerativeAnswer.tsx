import React from 'react';
import MarkdownView from './MarkdownView';
import { parseGenerative, hasCards } from '@/lib/generativeContent';
import GenerativeCard from './GenerativeCard';
import StructuredAnswer from './StructuredAnswer';

// AI answer renderer. If the reply embeds generative-UI cards, render the interleaved
// markdown + cards in order; otherwise fall back to the existing StructuredAnswer (the
// 概要 + collapsible-section treatment for long plain answers).
const GenerativeAnswer: React.FC<{ content: string; proseClass: string }> = ({ content, proseClass }) => {
  if (!hasCards(content)) {
    return <StructuredAnswer content={content} proseClass={proseClass} />;
  }
  const segments = parseGenerative(content);
  return (
    <div>
      {segments.map((s, i) =>
        s.type === 'md'
          ? (s.text.trim()
              ? <MarkdownView key={i} className={proseClass}>{s.text}</MarkdownView>
              : null)
          : <GenerativeCard key={i} seg={s} />
      )}
    </div>
  );
};

export default GenerativeAnswer;
