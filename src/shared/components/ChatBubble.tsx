import React, { useState } from 'react';
import { Message, Role } from '@/types';
import { User, Bot, ShieldAlert, Copy, ThumbsUp, ThumbsDown, Book, ExternalLink, Activity, Edit2, X, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RiRobot2Line } from '@remixicon/react';
import { cn } from '@/lib/utils';
import GeneratedChart from '@/features/student/components/GeneratedChart';
import StructuredAnswer from '@/shared/components/StructuredAnswer';
import AITutorAvatar from '@/shared/components/AITutorAvatar';
import { bubbleBg, avatarIcon } from '@/lib/chatPrefs';
import { RefreshCw } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
  onEdit?: (newContent: string) => void;
  studentName?: string;   // teacher view: label the student's own messages with their name, not "我"
  bubbleTheme?: string;   // student-chosen bubble colour (chatPrefs)
  userAvatarId?: string;  // student-chosen avatar (chatPrefs)
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onEdit, studentName, bubbleTheme, userAvatarId }) => {
  const isStudent = message.sender === Role.STUDENT;
  const isSupervisor = message.sender === Role.SUPERVISOR;
  const isAI = message.sender === Role.AI;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  // Defensive: strip any leaked <thinking>…</thinking> from display. streamChat
  // already strips at the source; this also cleans messages stored earlier.
  const cleanedContent = (message.content || '')
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '').trim() || message.content;

  // Shared markdown typography — a comfortable CJK reading rhythm + a real heading hierarchy so
  // sections read as groups (the old prose-p:my-1.5 / prose-headings:my-2 collapsed everything into
  // a flat wall). The readable measure (line length) is capped on the wrapper below, not here.
  const proseClass = cn(
    "prose prose-sm max-w-none break-words",
    isStudent ? "prose-invert" : "prose-slate",
    // rhythm
    "prose-p:my-3 prose-p:leading-[1.85] prose-li:my-1 prose-li:leading-[1.8] prose-ul:my-3 prose-ol:my-3",
    // hierarchy: headings get size + top margin (grouping); CJK looks bad italic → not-italic quotes
    "prose-headings:font-semibold prose-headings:tracking-tight",
    "prose-h1:text-[1.15rem] prose-h1:mt-6 prose-h1:mb-3",
    "prose-h2:text-[1.05rem] prose-h2:mt-5 prose-h2:mb-2.5",
    "prose-h3:text-[0.95rem] prose-h3:mt-4 prose-h3:mb-1.5",
    !isStudent && "prose-headings:text-primary-dark",
    "prose-strong:font-semibold",
    "prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:rounded-lg prose-pre:p-3 prose-pre:font-mono prose-pre:text-xs",
    "prose-blockquote:border-l-accent prose-blockquote:bg-accent/5 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r prose-blockquote:not-italic",
    "prose-table:my-3 prose-table:block prose-table:overflow-x-auto prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:px-3 prose-th:py-1.5 prose-th:font-semibold prose-th:text-left prose-td:border prose-td:border-slate-200 prose-td:px-3 prose-td:py-1.5",
    "prose-code:before:content-none prose-code:after:content-none prose-code:bg-slate-100 prose-code:text-pink-600 prose-code:text-[0.85em] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal",
    "[&_pre]:!bg-slate-900 [&_pre]:!text-slate-100 [&_pre]:!p-3.5 [&_pre]:!rounded-xl [&_pre]:!overflow-x-auto [&_pre_code]:!bg-transparent [&_pre_code]:!text-slate-100 [&_pre_code]:!p-0 [&_pre_code]:!font-normal [&_pre_code]:!text-[0.8rem] [&_pre_code]:!leading-relaxed"
  );

  const handleSave = () => {
    // "Save & Retry" always re-runs (even if the text is unchanged) so the button
    // never silently no-ops; the parent regenerates the AI reply from this point.
    if (onEdit && editValue.trim()) {
      onEdit(editValue.trim());
    }
    setIsEditing(false);
  };

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(cleanedContent)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })
      .catch(() => { /* ignore */ });
  };

  return (
    <div className={cn(
      "flex w-full mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300",
      isStudent ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex gap-4",
        isStudent ? "max-w-[90%] md:max-w-[80%] flex-row-reverse" : "max-w-[95%] md:max-w-[96%] flex-row"
      )}>

        {/* Avatar */}
        {isAI ? (
          <div className="flex-shrink-0"><AITutorAvatar size="lg" animate={false} /></div>
        ) : (
          <div
            style={isStudent ? { background: bubbleBg(bubbleTheme) } : undefined}
            className={cn(
              "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-sm ring-1 ring-white/10",
              isStudent ? "text-white" : "bg-amber-100 text-amber-700"
            )}
          >
            {isStudent
              ? (() => { const A = avatarIcon(userAvatarId); return <A theme="outline" size={20} fill="#fff" />; })()
              : <ShieldAlert size={18} />}
          </div>
        )}

        {/* Bubble Content */}
        <div className={cn("group flex flex-col min-w-[200px]", isStudent ? "items-end" : "items-start")}>

          {/* Sender Name Label */}
          <div className="flex items-center gap-2 mb-1.5 px-0.5">
            <span className="text-xs font-semibold text-secondary-DEFAULT">
              {isStudent ? (studentName || '我') : isSupervisor ? '教师介入' : 'AI 导师'}
            </span>
            <span className="text-[10px] text-secondary-light opacity-50">
              {message.timestamp}
            </span>
          </div>

          <div
            style={isStudent ? { background: bubbleBg(bubbleTheme) } : undefined}
            className={cn(
              "p-5 rounded-2xl text-sm leading-relaxed shadow-sm relative transition-all font-sans",
              isStudent
                ? "text-primary-foreground rounded-tr-sm"
                : isSupervisor
                  ? "bg-amber-50/50 border border-amber-200/50 text-amber-900 rounded-tl-sm ring-1 ring-amber-100"
                  : "bg-white border border-border text-foreground rounded-tl-sm shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]"
            )}
          >
            {/* Render Content Based on Type */}
            {message.contentType === 'chart' && message.chartData ? (
              // Chart Renderer
              <div className="w-full min-w-[300px] md:min-w-[400px]">
                <div className="mb-3 flex items-center gap-2 text-primary font-medium">
                  <Activity size={16} />
                  <span>Analysis Result Generated:</span>
                </div>
                <GeneratedChart
                  data={message.chartData}
                  title={message.content || "Data Analysis"}
                  type="area"
                />
              </div>
            ) : isEditing ? (
              // Edit Mode
              <div className="min-w-[300px]">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-lg p-3 text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 mb-3"
                  rows={4}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1 text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
                  >
                    <X size={12} /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 text-xs bg-white text-indigo-600 font-bold px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors shadow-sm"
                  >
                    <Check size={12} /> Save & Retry
                  </button>
                </div>
              </div>
            ) : (
              // Text Renderer — measure capped to a readable column (~44rem ≈ 44 CJK chars/line);
              // the bubble can still go wide for tables/code/charts (they scroll inside). AI answers
              // get the structured 概要 + collapsible-section treatment; others render straight.
              <div className="relative max-w-[44rem]">
                {isAI ? (
                  <StructuredAnswer content={cleanedContent} proseClass={proseClass} />
                ) : (
                  <div className={proseClass}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanedContent}</ReactMarkdown>
                  </div>
                )}

              </div>
            )}

            {/* Citations (RAG) */}
            {!isEditing && message.citations && message.citations.length > 0 && (
              <div className="mt-5 pt-4 border-t border-dashed border-gray-200/50">
                <div className="flex items-center gap-2 mb-3">
                  <Book size={14} className={isStudent ? "text-primary-foreground/50" : "text-primary"} />
                  <span className={cn("text-[10px] font-bold font-heading uppercase tracking-widest", isStudent ? "text-primary-foreground/50" : "text-secondary-light")}>Sources (RAG)</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {message.citations.map(citation => (
                    <div key={citation.id} className={cn(
                      "px-3 py-2 rounded-md text-xs flex flex-col gap-1 transition-colors cursor-pointer group/citation border",
                      isStudent
                        ? "bg-white/5 border-white/5 hover:bg-white/10 text-primary-foreground/80"
                        : "bg-secondary/20 border-transparent hover:bg-secondary/40 text-secondary-DEFAULT hover:text-primary"
                    )}>
                      <div className="flex justify-between items-start">
                        <span className={cn("font-medium font-heading", isStudent ? "text-primary-foreground" : "text-primary-dark")}>{citation.title}</span>
                        {citation.url && <ExternalLink size={10} className={isStudent ? "text-white/50" : "text-secondary-light group-hover/citation:text-accent"} />}
                      </div>
                      <span className={cn("font-mono opacity-70", isStudent ? "text-white/50" : "text-secondary-light")}>{citation.author} · {citation.year}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* run_python artifacts: charts (base64 PNG) + downloadable files */}
            {!isEditing && message.artifacts && (((message.artifacts.charts?.length ?? 0) > 0) || ((message.artifacts.files?.length ?? 0) > 0)) && (
              <div className="mt-4 space-y-3">
                {message.artifacts.charts?.map((c, i) => (
                  <img key={`ch${i}`} src={`data:image/png;base64,${c}`} alt={`图表 ${i + 1}`} className="max-w-full rounded-lg border border-border" />
                ))}
                {(message.artifacts.files?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {message.artifacts.files!.map((f, i) => (
                      <a key={`f${i}`} href={f.url ? f.url : `data:application/octet-stream;base64,${f.b64}`} download={f.name}
                        target={f.url ? '_blank' : undefined} rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200 hover:bg-blue-100 transition-colors">
                        ⬇ {f.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Hover toolbar — sits just under the bubble, aligned to its side, fitting the message */}
          {!isEditing && (
            <div className={cn(
              "flex items-center gap-0.5 mt-1.5 px-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
              isStudent && "flex-row-reverse"
            )}>
              <button onClick={handleCopy} title={copied ? '已复制' : '复制'} className="p-1.5 rounded-md text-secondary-light hover:text-primary hover:bg-secondary/40 transition-colors">
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
              {isStudent && onEdit && (
                <button onClick={() => setIsEditing(true)} title="编辑并重新发送" className="p-1.5 rounded-md text-secondary-light hover:text-primary hover:bg-secondary/40 transition-colors">
                  <RefreshCw size={13} />
                </button>
              )}
              {isAI && (
                <>
                  <button title="有帮助" className="p-1.5 rounded-md text-secondary-light hover:text-primary hover:bg-secondary/40 transition-colors"><ThumbsUp size={13} /></button>
                  <button title="待改进" className="p-1.5 rounded-md text-secondary-light hover:text-rose-500 hover:bg-secondary/40 transition-colors"><ThumbsDown size={13} /></button>
                  {message.citations && message.citations.length > 0 && (
                    <span className="ml-1 text-[10px] text-secondary-light font-mono flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />RAG · {message.citations.length}</span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
