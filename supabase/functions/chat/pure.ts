// Pure, dependency-free helpers extracted from the chat edge function so its logic-bearing
// bits (model routing, JSON extraction, thinking-strip, text/image probing) are unit-testable
// without Deno (CLAUDE.md: the interface is the test surface). See pure.test.ts.
// NO Deno globals here — imported by index.ts (Deno, `./pure.ts`) AND pure.test.ts (vitest, `./pure`).

export function hasImage(messages: any[]): boolean {
  return messages.some((m) => Array.isArray(m?.content) && m.content.some((p: any) => p?.type === 'image_url'));
}

export function lastUserText(messages: any[]): string {
  const u = [...messages].reverse().find((m: any) => m.role === 'user');
  if (!u) return '';
  if (typeof u.content === 'string') return u.content;
  if (Array.isArray(u.content)) return u.content.filter((p: any) => p?.type === 'text').map((p: any) => p.text || '').join(' ');
  return '';
}

// Task-based model router: model='auto' → the best DMXAPI-served model per task (one key for all).
const ROUTER = {
  balanced: 'claude-sonnet-4-6',  // default general tutoring
  hard:     'claude-opus-4-6',    // deep reasoning / proofs / math
  code:     'gpt-5.2',            // coding / debugging
  long:     'gemini-2.5-flash',   // long input / summarize (cheap long-context)
  fast:     'gpt-5-mini',         // very short quick factual
  vision:   'claude-sonnet-4-6',  // multimodal (Claude is multimodal via DMXAPI)
};
export function pickModel(messages: any[], opts: { hasImage?: boolean; reasoning_effort?: string }): string {
  if (opts.hasImage) return ROUTER.vision;
  const t = lastUserText(messages).toLowerCase();
  const len = t.length;
  if (opts.reasoning_effort || /证明|推导|严格|逐步|为什么|反例|定理|复杂度|prove|derive|theorem|rigorous|step.by.step/.test(t)) return ROUTER.hard;
  if (/代码|函数|报错|调试|编译|正则|算法实现|stack ?trace|\bbug\b|\bdebug\b|python|javascript|typescript|\bsql\b|```/.test(t)) return ROUTER.code;
  if (len > 4000 || /总结|概括|归纳|全文|这篇|summari[sz]e/.test(t)) return ROUTER.long;
  if (len > 0 && len < 30) return ROUTER.fast;
  return ROUTER.balanced;
}

// strip leaked <thinking>/<think> blocks from a complete string (agent path).
export function stripThinking(s: string): string {
  return (s || '')
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '')
    .replace(/^[\s\S]*?<\/think(?:ing)?>/i, (m) => (/<think/i.test(m) ? '' : m)) // dangling close
    .trim();
}

// Robustly pull a JSON object out of an LLM reply: strip ```json fences, take the outermost
// {...}, parse. Returns null if none/malformed (callers fall back). Replaces 3 inline copies.
export function extractJSON(raw: string): any | null {
  let s = String(raw || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (_) { return null; }
}

// strip a ```python fence to get runnable code (orchestrator analyst).
export function extractCode(s: string): string {
  let t = String(s || '');
  const m = t.match(/```(?:python)?\s*([\s\S]*?)```/i);
  if (m) t = m[1];
  return t.trim();
}
