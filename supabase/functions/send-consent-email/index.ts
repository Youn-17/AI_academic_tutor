// send-consent-email Edge Function
// Creates a consent request and sends emails to both teacher and student via Resend

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') || 'https://techedu.icu';
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
    // 1. Authenticate caller as admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.slice(7);
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '认证失败' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use service role for all DB operations (bypasses RLS safely on server)
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin role
    const { data: adminProfile } = await serviceClient
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: '需要管理员权限' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Parse request body
    const body = await req.json();
    const { teacher_id, student_id, class_id, reason } = body;
    if (!teacher_id || !student_id || !class_id || !reason?.trim()) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Validate teacher owns this class and student is a member
    const { data: classRow } = await serviceClient
      .from('classes')
      .select('id, name, teacher_id')
      .eq('id', class_id)
      .eq('teacher_id', teacher_id)
      .single();

    if (!classRow) {
      return new Response(JSON.stringify({ error: '班级信息不匹配' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: memberRow } = await serviceClient
      .from('class_members')
      .select('id')
      .eq('class_id', class_id)
      .eq('student_id', student_id)
      .single();

    if (!memberRow) {
      return new Response(JSON.stringify({ error: '该学生不在此班级' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Fetch teacher and student profiles
    const { data: teacherProfile } = await serviceClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', teacher_id)
      .single();

    const { data: studentProfile } = await serviceClient
      .from('profiles')
      .select('nickname, email')
      .eq('id', student_id)
      .single();

    if (!teacherProfile || !studentProfile) {
      return new Response(JSON.stringify({ error: '用户不存在' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. Create consent request (upsert to handle re-requests after expiry)
    const { data: existingRequest } = await serviceClient
      .from('consent_requests')
      .select('id, status')
      .eq('admin_id', user.id)
      .eq('teacher_id', teacher_id)
      .eq('student_id', student_id)
      .eq('class_id', class_id)
      .single();

    let consentRequest;
    if (existingRequest && (existingRequest.status === 'expired' || existingRequest.status === 'teacher_rejected' || existingRequest.status === 'student_rejected')) {
      // Re-open with fresh tokens
      const { data, error } = await serviceClient
        .from('consent_requests')
        .update({
          status: 'pending',
          teacher_consent: null,
          student_consent: null,
          teacher_token: crypto.randomUUID(),
          student_token: crypto.randomUUID(),
          reason,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existingRequest.id)
        .select()
        .single();
      if (error) throw error;
      consentRequest = data;
    } else if (existingRequest) {
      return new Response(JSON.stringify({ error: '已存在进行中的授权请求', existing_status: existingRequest.status }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const { data, error } = await serviceClient
        .from('consent_requests')
        .insert({
          admin_id: user.id,
          teacher_id,
          student_id,
          class_id,
          reason,
        })
        .select()
        .single();
      if (error) throw error;
      consentRequest = data;
    }

    // 6. Send emails via Resend
    const adminName = adminProfile.full_name || '管理员';
    const teacherName = teacherProfile.full_name || '老师';
    const studentDisplay = studentProfile.nickname || '该学生';
    const className = classRow.name;

    const teacherApproveLink = `${SITE_URL}/consent?token=${consentRequest.teacher_token}&role=teacher&action=approve`;
    const teacherRejectLink  = `${SITE_URL}/consent?token=${consentRequest.teacher_token}&role=teacher&action=reject`;
    const studentApproveLink = `${SITE_URL}/consent?token=${consentRequest.student_token}&role=student&action=approve`;
    const studentRejectLink  = `${SITE_URL}/consent?token=${consentRequest.student_token}&role=student&action=reject`;

    const emailStyle = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 520px; margin: 40px auto; padding: 0 20px; color: #1e293b;
    `;
    const btnApprove = `
      display: inline-block; padding: 12px 28px; background: #4f46e5;
      color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 12px;
    `;
    const btnReject = `
      display: inline-block; padding: 12px 28px; background: #f1f5f9;
      color: #64748b; text-decoration: none; border-radius: 8px; font-weight: 600;
    `;

    const teacherHtml = `
      <div style="${emailStyle}">
        <h2 style="color:#4f46e5;">数据访问授权请求</h2>
        <p>尊敬的 <strong>${teacherName}</strong> 老师，</p>
        <p>平台管理员 <strong>${adminName}</strong> 申请查看您的班级「<strong>${className}</strong>」中学生「<strong>${studentDisplay}</strong>」与 AI 的对话记录。</p>
        <p><strong>申请原因：</strong>${reason}</p>
        <p>此授权将在 <strong>7天</strong> 后自动失效。只有在您和该学生<strong>同时同意</strong>后，管理员才能查看相关数据。</p>
        <p style="margin-top:32px;">请选择您的决定：</p>
        <p>
          <a href="${teacherApproveLink}" style="${btnApprove}">同意授权</a>
          <a href="${teacherRejectLink}" style="${btnReject}">拒绝授权</a>
        </p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="font-size:12px;color:#94a3b8;">此邮件由 TechEdu 平台自动发送，请勿直接回复。</p>
      </div>
    `;

    const studentHtml = `
      <div style="${emailStyle}">
        <h2 style="color:#4f46e5;">数据查看授权请求</h2>
        <p>您好，</p>
        <p>平台管理员 <strong>${adminName}</strong> 申请查看您在班级「<strong>${className}</strong>」中与 AI 的对话记录。</p>
        <p><strong>申请原因：</strong>${reason}</p>
        <p>此授权将在 <strong>7天</strong> 后自动失效。只有在您和您的老师<strong>同时同意</strong>后，管理员才能查看相关数据。</p>
        <p style="margin-top:32px;">请选择您的决定：</p>
        <p>
          <a href="${studentApproveLink}" style="${btnApprove}">同意授权</a>
          <a href="${studentRejectLink}" style="${btnReject}">拒绝授权</a>
        </p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="font-size:12px;color:#94a3b8;">此邮件由 TechEdu 平台自动发送，请勿直接回复。</p>
      </div>
    `;

    const sendEmail = async (to: string, subject: string, html: string) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'TechEdu平台 <noreply@techedu.icu>',
          to,
          subject,
          html,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error(`Email send failed to ${to}:`, err);
        return false;
      }
      return true;
    };

    await Promise.all([
      sendEmail(teacherProfile.email, '【TechEdu】数据访问授权请求 - 教师确认', teacherHtml),
      sendEmail(studentProfile.email, '【TechEdu】数据查看授权请求 - 学生确认', studentHtml),
    ]);

    return new Response(JSON.stringify({ ok: true, request_id: consentRequest.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('send-consent-email error:', err);
    return new Response(JSON.stringify({ error: '服务器内部错误' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
