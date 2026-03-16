import { supabase } from '@/lib/supabase';

export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    role: 'student' | 'supervisor' | 'pending_supervisor' | 'admin';
    avatar_url: string | null;
    nickname: string | null;
    title: string | null;
    school: string | null;
    student_identity: 'undergraduate' | 'master' | 'phd' | 'other' | null;
}

export interface StudentInsight {
    id: string;
    content: string;
    type: 'strength' | 'weakness' | 'suggestion' | 'milestone';
    created_by: 'ai' | 'supervisor';
    created_at: string;
}

export interface UserStats {
    total_conversations: number;
    total_messages: number;
    ai_interactions: number;
    last_active_time: string | null;
}

/**
 * Get current user profile
 */
export async function getProfile(): Promise<UserProfile | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, avatar_url, nickname, title, school, student_identity')
        .eq('id', session.user.id)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update user profile
 */
export async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get student insights
 */
export async function getInsights(): Promise<StudentInsight[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return [];

    const { data, error } = await supabase
        .from('student_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        // If table doesn't exist yet (migration pending), returns empty
        console.warn('Failed to fetch insights - table might be missing', error);
        return [];
    }
    return data;
}

/**
 * Get basic stats
 */
export async function getStats(): Promise<UserStats> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { total_conversations: 0, total_messages: 0, ai_interactions: 0, last_active_time: null };

    const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    return {
        total_conversations: count || 0,
        total_messages: 0, // Placeholder
        ai_interactions: 0, // Placeholder
        last_active_time: new Date().toISOString()
    };
}
