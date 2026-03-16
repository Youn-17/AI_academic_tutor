// process-consent Edge Function
// Handles teacher/student clicking approve/reject from email links
// No authentication required — the token IS the credential

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://techedu.icu';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, role, action } = body;

    if (!token || !role || !action) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!['teacher', 'student'].includes(role)) {
      return new Response(JSON.stringify({ error: '无效的角色' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: '无效的操作' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up the consent request by the appropriate token
    const tokenColumn = role === 'teacher' ? 'teacher_token' : 'student_token';
    const { data: request, error: fetchError } = await serviceClient
      .from('consent_requests')
      .select('*')
      .eq(tokenColumn, token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (fetchError || !request) {
      return new Response(JSON.stringify({ error: '链接已失效或不存在' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const approved = action === 'approve';

    // Compute new status
    const newTeacherConsent = role === 'teacher' ? approved : request.teacher_consent;
    const newStudentConsent = role === 'student' ? approved : request.student_consent;

    let newStatus: string;
    if (!approved) {
      newStatus = role === 'teacher' ? 'teacher_rejected' : 'student_rejected';
    } else if (newTeacherConsent === true && newStudentConsent === true) {
      newStatus = 'both_approved';
    } else {
      newStatus = 'pending';
    }

    // Build update object — invalidate the used token to prevent replay
    const updateData: Record<string, unknown> = {
      status: newStatus,
      teacher_consent: newTeacherConsent,
      student_consent: newStudentConsent,
    };

    // Invalidate used token
    if (role === 'teacher') {
      updateData.teacher_token = crypto.randomUUID();
    } else {
      updateData.student_token = crypto.randomUUID();
    }

    const { error: updateError } = await serviceClient
      .from('consent_requests')
      .update(updateData)
      .eq('id', request.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      ok: true,
      status: newStatus,
      action,
      role,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('process-consent error:', err);
    return new Response(JSON.stringify({ error: '服务器内部错误' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
