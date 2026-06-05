// AI-usage monitor — fire-and-forget logging of per-turn token usage into `model_usage`.
// Token counts come from the edge function (the only place the provider `usage` is reachable),
// surfaced as a _usage / usage SSE frame and forwarded here by RealAIService.onUsage.
// Mirrors logResearchEvent's trust model (student inserts own row; admin reads via RPC). Never throws.
import { supabase } from '@/lib/supabase';

export interface ModelUsageInput {
  conversation_id?: string | null;
  message_id?: string | null;
  provider?: string | null;
  model?: string | null;
  active_role?: string | null;
  mode?: string | null;            // 'agent' | 'team' | 'direct'
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  provider_calls?: number;
  tools?: string[];
  safety_blocked?: boolean;
  duration_ms?: number | null;
}

export function logModelUsage(u: ModelUsageInput): void {
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return;
      await supabase.from('model_usage').insert({
        participant_id: uid,
        conversation_id: u.conversation_id ?? null,
        message_id: u.message_id ?? null,
        provider: u.provider ?? null,
        model: u.model ?? null,
        active_role: u.active_role ?? null,
        mode: u.mode ?? null,
        prompt_tokens: u.prompt_tokens ?? 0,
        completion_tokens: u.completion_tokens ?? 0,
        total_tokens: u.total_tokens ?? 0,
        provider_calls: u.provider_calls ?? 1,
        tools: u.tools ?? [],
        safety_blocked: u.safety_blocked ?? false,
        duration_ms: u.duration_ms ?? null,
      });
    } catch { /* swallow — monitoring must never disrupt the chat */ }
  })();
}
