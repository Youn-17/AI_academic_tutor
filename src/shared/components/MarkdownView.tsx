import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import 'katex/dist/katex.min.css';

// The single markdown renderer for the whole chat: GFW Markdown + KaTeX math ($…$ / $$…$$)
// + fenced code blocks with syntax highlighting and a one-click copy button. react-markdown v10
// dropped the `inline` prop, so block-vs-inline is detected by language class / newline.

const CodeBlock: React.FC<any> = ({ className, children }) => {
  const [copied, setCopied] = useState(false);
  const raw = String(children ?? '');
  const isBlock = /language-/.test(className || '') || raw.includes('\n');
  if (!isBlock) return <code className={className}>{children}</code>;
  const lang = /language-(\w+)/.exec(className || '')?.[1] || 'text';
  const text = raw.replace(/\n$/, '');
  const copy = () => navigator.clipboard?.writeText(text)
    .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => { /* ignore */ });
  return (
    <div className="not-prose relative my-3 rounded-xl overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between px-3 py-1 bg-slate-50 border-b border-slate-200">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">{lang}</span>
        <button onClick={copy} className="text-[11px] flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors">
          {copied ? <><Check size={11} className="text-emerald-500" />已复制</> : <><Copy size={11} />复制</>}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={oneLight}
        PreTag="div"
        customStyle={{ margin: 0, fontSize: '0.8rem', background: '#fafafa', padding: '0.7rem 0.9rem' }}
        codeTagProps={{ style: { fontFamily: 'JetBrains Mono, monospace' } }}
      >{text}</SyntaxHighlighter>
    </div>
  );
};

const MarkdownView: React.FC<{ children: string; className?: string }> = ({ children, className }) => (
  <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{ code: CodeBlock, pre: ({ children: c }: any) => <>{c}</> }}
    >{children}</ReactMarkdown>
  </div>
);

export default MarkdownView;
