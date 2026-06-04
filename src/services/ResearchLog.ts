// Research instrumentation — fire-and-forget event logging into `research_events`.
// Captures the human–AI interaction stream (turns, tool use, agency actions) in a form
// ready for sequence/ENA/discourse analysis at export. NEVER throws or blocks the UX.
import { supabase } from '@/lib/supabase';

export interface ResearchEventInput {
  session_id?: string | null;        // conversation id
  condition?: string | null;         // A/B condition snapshot
  active_role?: string | null;       // agent role active
  model?: string | null;             // model selected
  event_type: string;                // student_query | ai_response | tool_invoked | student_action | role_switched | model_switched
  event_subtype?: string | null;
  message_id?: string | null;        // link to messages
  payload?: Record<string, unknown>; // extra (chars, tool, reason, plan, ...)
}

export function logResearchEvent(ev: ResearchEventInput): void {
  // run detached; callers never await
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return;
      await supabase.from('research_events').insert({
        participant_id: uid,
        session_id: ev.session_id ?? null,
        condition: ev.condition ?? null,
        active_role: ev.active_role ?? null,
        model: ev.model ?? null,
        event_type: ev.event_type,
        event_subtype: ev.event_subtype ?? null,
        message_id: ev.message_id ?? null,
        payload: ev.payload ?? {},
      });
    } catch { /* swallow — instrumentation must never disrupt the app */ }
  })();
}
