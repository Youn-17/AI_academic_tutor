import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseAnswer } from '@/lib/answerStructure';

// Renders an AI answer as a scannable document: a 概要 lead card + (for long, multi-section
// answers) collapsible sections, so the reader sees the gist + outline first and drills in on
// demand — instead of a wall of text. Short / unstructured answers render straight through, just
// with the upgraded typography. The structure comes from parseAnswer (pure + tested).

const Md: React.FC<{ children: string; className?: string }> = ({ children, className }) => (
  <div className={className}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
  </div>
);

const SummaryCard: React.FC<{ text: string }> = ({ text }) => (
  <div className="mb-4 flex gap-2.5 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
    <Sparkles size={15} className="mt-0.5 flex-shrink-0 text-primary/80" />
    <p className="m-0 text-[0.92rem] font-medium leading-[1.7] text-foreground/90">{text}</p>
  </div>
);

interface Props {
  content: string;
  proseClass: string;
}

// Collapse only when it actually helps: several sections AND enough length to feel like a wall.
const COLLAPSE_MIN_CHARS = 600;

const StructuredAnswer: React.FC<Props> = ({ content, proseClass }) => {
  const { summary, lead, sections } = useMemo(() => parseAnswer(content), [content]);
  const collapsible = sections.length >= 2 && content.length > COLLAPSE_MIN_CHARS;
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true }); // first section open

  if (!collapsible) {
    const merged = [lead, ...sections.map((s) => `## ${s.title}\n\n${s.body}`)]
      .filter(Boolean)
      .join('\n\n');
    return (
      <div>
        {summary && <SummaryCard text={summary} />}
        <Md className={proseClass}>{merged}</Md>
      </div>
    );
  }

  const allOpen = sections.every((_, i) => open[i]);
  const toggleAll = () =>
    setOpen(allOpen ? {} : Object.fromEntries(sections.map((_, i) => [i, true])));

  return (
    <div>
      {summary && <SummaryCard text={summary} />}
      {lead && <Md className={cn(proseClass, 'mb-3')}>{lead}</Md>}

      <div className="mb-2 flex justify-end">
        <button
          onClick={toggleAll}
          className="text-xs font-medium text-secondary-light transition-colors hover:text-primary"
        >
          {allOpen ? '收起全部' : '展开全部'}
        </button>
      </div>

      <div className="space-y-2">
        {sections.map((s, i) => {
          const isOpen = !!open[i];
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-border/70">
              <button
                onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
                className="flex w-full items-center justify-between gap-3 bg-secondary/10 px-4 py-2.5 text-left transition-colors hover:bg-secondary/20"
              >
                <span className="text-[0.95rem] font-semibold text-primary-dark">{s.title}</span>
                <ChevronDown
                  size={16}
                  className={cn(
                    'flex-shrink-0 text-secondary-light transition-transform',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
              {isOpen && <Md className={cn(proseClass, 'px-4 pb-3 pt-1')}>{s.body}</Md>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StructuredAnswer;
