-- ─────────────────────────────────────────────────────────────────────────────
-- Role effectiveness — RLHF-style preference / engagement signals per agent role.
--
-- Ch11 的「Evaluation（奖励信号）」半步：不需要 PPO / GPU，现在就能从已采集的
-- research_events（src/services/ResearchLog.ts 记录）算出「哪个角色越用越有用」。
--
-- 信号解读
--   follow_up_rate   隐式偏好（+）：学生在该角色回答后继续「追问」的比例。
--                    高 = 回答有用、想深入；低（且开场多）= 一次没解决、prompt 可优化。
--   helpful_rate     显式偏好：👍 /（👍+👎），来自 ChatBubble 反馈 → event_type='preference'。
--   avg_turns        对话平均轮数。长对话 = 高投入（预期「情感支持」最长）。
--   helpful/improve  显式 👍 / 待改进 计数。
--
-- 用法：在 Supabase SQL Editor 运行本文件建视图，再 `select * from role_effectiveness;`
-- RLS：research_events 受 RLS 保护，请以研究者 / service_role 身份查询。
-- 注：student_query 的 event_subtype = 'first_question'（开场）| 'follow_up'（追问）。
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.role_effectiveness as
with ev as (
  select * from public.research_events where active_role is not null
)
select
  active_role,
  count(distinct session_id)                                                   as sessions,
  count(*) filter (where event_type = 'ai_response')                           as ai_responses,
  count(*) filter (where event_type = 'student_query'
                     and event_subtype = 'follow_up')                          as follow_ups,
  round(
    count(*) filter (where event_type='student_query' and event_subtype='follow_up')::numeric
    / nullif(count(*) filter (where event_type='ai_response'), 0), 3)          as follow_up_rate,
  count(*) filter (where event_type='preference' and event_subtype='helpful')  as helpful,
  count(*) filter (where event_type='preference' and event_subtype='improve')  as improve,
  round(
    count(*) filter (where event_type='preference' and event_subtype='helpful')::numeric
    / nullif(count(*) filter (where event_type='preference'), 0), 3)           as helpful_rate,
  round(
    count(*) filter (where event_type='ai_response')::numeric
    / nullif(count(distinct session_id), 0), 2)                               as avg_turns_per_session
from ev
group by active_role
order by ai_responses desc;

-- 读取：
--   select * from public.role_effectiveness;
-- 典型结论示例：
--   论辩伙伴 follow_up_rate 最高 → 苏格拉底式引导有效；
--   概念讲解 follow_up_rate 低但 first_question 多 → 一次没讲清，prompt 需优化；
--   情感支持 avg_turns_per_session 最长 → 学生确实需要它。

-- ── 攒够 ≥500 条 'helpful' 后：导出 RLHF 训练对（(query, chosen_response)）──
--   微调 GLM-4-Flash（智谱 API，成本约几十元，推理成本降到 ~1/20，适合高频基础题）。
-- select
--   sq.content   as query,             -- 触发该回复的学生问题（同会话、紧邻其前）
--   ar.content   as chosen_response,    -- 被 👍 的 AI 回复
--   pref.active_role, pref.model
-- from public.research_events pref
-- join public.messages ar on ar.id = pref.message_id
-- join lateral (
--   select m.content from public.messages m
--   where m.conversation_id = pref.session_id and m.created_at < ar.created_at
--     and m.sender = 'student'                                   -- 调整为你库里的发送者枚举
--   order by m.created_at desc limit 1
-- ) sq on true
-- where pref.event_type = 'preference' and pref.event_subtype = 'helpful'
-- order by pref.created_at;

-- ── Ch10 安全自检拦截监控（可选）──
--   若把 edge fn 的 _safety SSE 也落库为 event_type='safety_block'，即可统计每角色拦截次数：
-- select active_role, count(*) as blocks
-- from public.research_events where event_type = 'safety_block' group by active_role order by blocks desc;
