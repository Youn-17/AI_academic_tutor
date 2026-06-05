import { supabase } from '@/lib/supabase';

const EDGE_FN = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string)
  || 'https://oztozjwngekmqtuylypt.supabase.co/functions/v1';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Ask a cheap model for a concise, fitting title for a brand-new conversation, from the student's
// first message. Returns null on any failure so the caller can fall back to a truncated message.
// Called only on the first turn, so a later manual rename is never overwritten.
export async function suggestTitle(firstMessage: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token || !firstMessage.trim()) return null;
    const sys = '你是会话起名助手。根据用户的第一条消息，起一个简洁、贴切、能概括主题的中文标题，6–14 字；'
      + '不要标点、引号或"标题："等前缀，只输出标题本身。';
    const resp = await fetch(`${EDGE_FN}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: ANON },
      body: JSON.stringify({
        messages: [{ role: 'system', content: sys }, { role: 'user', content: firstMessage.slice(0, 600) }],
        provider: 'deepseek', model: 'deepseek-chat', stream: false,
      }),
    });
    if (!resp.ok) return null;
    const d = await resp.json();
    let t: string = d?.choices?.[0]?.message?.content || '';
    t = t.replace(/["'「」『』:：。.]/g, '').replace(/^标题\s*/, '').trim();
    return t ? t.slice(0, 24) : null;
  } catch {
    return null;
  }
}
