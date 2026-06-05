// Generative UI (Level 2 / "Controlled"): the AI embeds lightweight markup in its reply
// (<compare-card>, <steps-card>, <metric-card>, <key-idea>) and the frontend renders real
// cards instead of a wall of text. The AI decides WHICH UI to show; we own the components.
// Parsing is defensive — malformed markup falls back to plain markdown.

export type Segment =
  | { type: 'md'; text: string }
  | { type: 'compare'; left: { title: string; body: string }; right: { title: string; body: string } }
  | { type: 'steps'; steps: { done: boolean; text: string }[] }
  | { type: 'metric'; title?: string; metrics: { label: string; value: string }[] }
  | { type: 'keyidea'; body: string }
  | { type: 'tasklist'; tasks: { done: boolean; text: string }[] }
  | { type: 'htmlviz'; html: string; height: number };

const CARD_RE = /<(compare-card|steps-card|metric-card|key-idea|task-list|html-viz)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g;

function attr(s: string | undefined, name: string): string | undefined {
  if (!s) return undefined;
  const m = s.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m?.[1];
}

export function hasCards(text: string): boolean {
  CARD_RE.lastIndex = 0;
  return CARD_RE.test(text || '');
}

// Strip just the card tags (keep the inner text) — used to keep the live streaming view clean
// before the final message renders the real cards.
export function stripCardTags(text: string): string {
  return (text || '')
    .replace(/<html-viz[\s\S]*?<\/html-viz>/gi, '［可视化生成中…］')
    .replace(/<follow-ups[\s\S]*?<\/follow-ups>/gi, '')
    .replace(/<\/?(compare-card|steps-card|metric-card|key-idea|task-list|left|right|step|metric|task)((?:\s[^>]*)?)\/?>/gi, '');
}

// Pull a trailing <follow-ups> block out so it renders as clickable suggestion chips below the answer.
export function extractFollowUps(text: string): { text: string; questions: string[] } {
  const m = (text || '').match(/<follow-ups((?:\s[^>]*)?)>([\s\S]*?)<\/follow-ups>/i);
  if (!m) return { text: text || '', questions: [] };
  const questions = [...m[2].matchAll(/<q((?:\s[^>]*)?)>([\s\S]*?)<\/q>/gi)]
    .map((q) => (q[2] || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 4);
  const cleaned = ((text.slice(0, m.index) + text.slice((m.index || 0) + m[0].length))).trim();
  return { text: cleaned, questions };
}

export function parseGenerative(text: string): Segment[] {
  const segs: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  CARD_RE.lastIndex = 0;
  while ((m = CARD_RE.exec(text))) {
    if (m.index > last) segs.push({ type: 'md', text: text.slice(last, m.index) });
    const kind = m[1];
    const attrs = m[2] || '';
    const inner = m[3] || '';
    try {
      if (kind === 'compare-card') {
        const l = inner.match(/<left((?:\s[^>]*)?)>([\s\S]*?)<\/left>/i);
        const r = inner.match(/<right((?:\s[^>]*)?)>([\s\S]*?)<\/right>/i);
        segs.push({
          type: 'compare',
          left: { title: attr(l?.[1], 'title') || '方案 A', body: (l?.[2] || '').trim() },
          right: { title: attr(r?.[1], 'title') || '方案 B', body: (r?.[2] || '').trim() },
        });
      } else if (kind === 'steps-card') {
        const steps = [...inner.matchAll(/<step((?:\s[^>]*)?)>([\s\S]*?)<\/step>/gi)].map((s) => ({
          done: /true|done|完成|✓/i.test(attr(s[1], 'done') || ''),
          text: (s[2] || '').replace(/\s+/g, ' ').trim(),
        }));
        if (steps.length) segs.push({ type: 'steps', steps });
      } else if (kind === 'metric-card') {
        const metrics = [...inner.matchAll(/<metric((?:\s[^>]*)?)\s*\/?>/gi)]
          .map((s) => ({ label: attr(s[1], 'label') || '', value: attr(s[1], 'value') || '' }))
          .filter((x) => x.label || x.value);
        if (metrics.length) segs.push({ type: 'metric', title: attr(attrs, 'title'), metrics });
      } else if (kind === 'key-idea') {
        segs.push({ type: 'keyidea', body: inner.trim() });
      } else if (kind === 'task-list') {
        const tasks = [...inner.matchAll(/<task((?:\s[^>]*)?)>([\s\S]*?)<\/task>/gi)].map((s) => ({
          done: /true|done|完成|✓/i.test(attr(s[1], 'done') || ''),
          text: (s[2] || '').replace(/\s+/g, ' ').trim(),
        })).filter((t) => t.text);
        if (tasks.length) segs.push({ type: 'tasklist', tasks });
      } else if (kind === 'html-viz') {
        const h = parseInt(attr(attrs, 'height') || '320', 10);
        segs.push({ type: 'htmlviz', html: inner.trim(), height: isNaN(h) ? 320 : Math.min(Math.max(h, 120), 600) });
      }
    } catch {
      segs.push({ type: 'md', text: m[0] }); // malformed → show as raw text
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ type: 'md', text: text.slice(last) });
  return segs;
}
