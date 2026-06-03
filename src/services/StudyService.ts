import { supabase } from '@/lib/supabase';

/**
 * Study Service — A/B 实验条件读取
 *
 * 条件:
 *   A_direct   = 对照组(普通答题 AI,无引用)
 *   B_socratic = 实验组(苏格拉底式 + RAG 引用)
 *
 * 只有"已入组且已同意"的参与者才会被分配条件;其余返回 null,
 * 走平台默认行为(不影响非研究用户)。表不存在/查询出错时也安全返回 null。
 */
export type StudyCondition = 'A_direct' | 'B_socratic';

export async function getMyCondition(): Promise<StudyCondition | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return null;

    const { data, error } = await supabase
      .from('study_participants')
      .select('condition, consent_status')
      .eq('user_id', uid)
      .maybeSingle();

    if (error || !data) return null;
    if (data.consent_status !== 'granted') return null;   // 未同意 → 不进实验
    return data.condition as StudyCondition;
  } catch {
    return null;   // 例如 migration 尚未应用、表不存在 → 安全回退
  }
}
