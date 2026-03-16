/**
 * Admin Service - 管理员专用操作
 * 仅供 role='admin' 的用户调用，Supabase RLS 会在服务端做二次校验
 */

import { supabase } from '@/lib/supabase';
import { buildCsv, triggerDownload } from '@/lib/csvUtils';

export interface PendingTeacher {
    id: string;
    email: string;
    full_name: string | null;
    title: string | null;
    school: string | null;
    created_at: string;
}

export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    title: string | null;
    school: string | null;
    nickname: string | null;
    student_identity: string | null;
    created_at: string;
}

export interface ClassOverview {
    class_id: string;
    class_name: string;
    teacher_id: string;
    teacher_name: string | null;
    teacher_school: string | null;
    teacher_title: string | null;
    student_count: number;
}

export interface ConsentRequest {
    id: string;
    admin_id: string;
    teacher_id: string;
    student_id: string;
    class_id: string;
    status: 'pending' | 'both_approved' | 'teacher_rejected' | 'student_rejected' | 'expired';
    teacher_consent: boolean | null;
    student_consent: boolean | null;
    reason: string;
    expires_at: string;
    created_at: string;
    teacher: { full_name: string | null; email: string } | null;
    student: { nickname: string | null; email: string } | null;
    class: { name: string } | null;
}

// ── Teacher Applications ──────────────────────────────────────

export async function getPendingTeachers(): Promise<PendingTeacher[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, title, school, created_at')
        .eq('role', 'pending_supervisor')
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function approveTeacher(userId: string): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({ role: 'supervisor' })
        .eq('id', userId)
        .eq('role', 'pending_supervisor');
    if (error) throw error;
}

export async function rejectTeacher(userId: string): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({ role: 'student' })
        .eq('id', userId)
        .eq('role', 'pending_supervisor');
    if (error) throw error;
}

// ── User Management ──────────────────────────────────────────

export async function getAllUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, title, school, nickname, student_identity, created_at')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function revokeTeacher(userId: string): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({ role: 'student' })
        .eq('id', userId)
        .eq('role', 'supervisor');
    if (error) throw error;
}

// ── Class Overview ───────────────────────────────────────────

export async function getClassOverview(): Promise<ClassOverview[]> {
    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, teacher_id')
        .order('created_at', { ascending: false });
    if (error) throw error;
    if (!classes?.length) return [];

    const teacherIds = [...new Set(classes.map(c => c.teacher_id))];
    const { data: teachers } = await supabase
        .from('profiles')
        .select('id, full_name, school, title')
        .in('id', teacherIds);

    const { data: members } = await supabase
        .from('class_members')
        .select('class_id');

    const teacherMap = new Map((teachers || []).map(t => [t.id, t]));
    const countMap = new Map<string, number>();
    for (const m of members || []) {
        countMap.set(m.class_id, (countMap.get(m.class_id) || 0) + 1);
    }

    return classes.map(c => {
        const t = teacherMap.get(c.teacher_id);
        return {
            class_id: c.id,
            class_name: c.name,
            teacher_id: c.teacher_id,
            teacher_name: t?.full_name || null,
            teacher_school: t?.school || null,
            teacher_title: t?.title || null,
            student_count: countMap.get(c.id) || 0,
        };
    });
}

// ── Consent Requests ─────────────────────────────────────────

export async function sendConsentRequest(params: {
    teacher_id: string;
    student_id: string;
    class_id: string;
    reason: string;
}): Promise<{ request_id: string }> {
    const { data, error } = await supabase.functions.invoke('send-consent-email', {
        body: params,
    });
    if (error) throw error;
    return data;
}

export async function getMyConsentRequests(): Promise<ConsentRequest[]> {
    const { data, error } = await supabase
        .from('consent_requests')
        .select(`
            *,
            teacher:teacher_id ( full_name, email ),
            student:student_id ( nickname, email ),
            class:class_id ( name )
        `)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ConsentRequest[];
}

// ── Data Download (only after both_approved) ─────────────────

export async function downloadConsentedData(studentId: string, studentDisplay: string): Promise<void> {
    const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select('id, title, status, created_at')
        .eq('user_id', studentId)
        .order('created_at');
    if (convErr) throw convErr;
    if (!convs?.length) {
        triggerDownload('无对话记录', `student_${studentDisplay}_interactions.csv`);
        return;
    }

    const convIds = convs.map(c => c.id);
    const { data: msgs, error: msgErr } = await supabase
        .from('messages')
        .select('id, conversation_id, sender, content, model_used, created_at')
        .in('conversation_id', convIds)
        .order('created_at');
    if (msgErr) throw msgErr;

    const convTitleMap = new Map(convs.map(c => [c.id, c.title]));
    const rows = (msgs || []).map(m => ({
        对话标题: convTitleMap.get(m.conversation_id) || '',
        消息ID: m.id,
        发送方: m.sender,
        内容: m.content,
        模型: m.model_used || '',
        时间: m.created_at,
    }));

    triggerDownload(buildCsv(rows), `student_${studentDisplay}_interactions.csv`);
}
