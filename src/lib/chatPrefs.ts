import type { ComponentType } from 'react';
import { User, EmotionHappy, Star, Cat, Dog, Rabbit, Rocket, Ghost } from '@icon-park/react';
import { StudentCap } from '@/shared/components/SvgGlyphs';

// Student-personalizable chat preferences (bubble colour + avatar), stored in localStorage so each
// student can make the chat feel like theirs. Pure data + tiny get/set helpers — no React.

type IPIcon = ComponentType<{ theme?: string; size?: number | string; fill?: string | string[]; className?: string }>;

export type BubbleThemeId = 'blue' | 'sky' | 'violet' | 'emerald' | 'rose' | 'amber' | 'slate';
export const BUBBLE_THEMES: { id: BubbleThemeId; label: string; bg: string }[] = [
  { id: 'blue',    label: '海蓝', bg: '#2563EB' },
  { id: 'sky',     label: '天蓝', bg: '#0EA5E9' },
  { id: 'violet',  label: '紫罗兰', bg: '#7C3AED' },
  { id: 'emerald', label: '翠绿', bg: '#059669' },
  { id: 'rose',    label: '玫红', bg: '#E11D48' },
  { id: 'amber',   label: '琥珀', bg: '#D97706' },
  { id: 'slate',   label: '石墨', bg: '#475569' },
];

export type AvatarId = 'user' | 'student' | 'smile' | 'star' | 'cat' | 'dog' | 'rabbit' | 'rocket' | 'ghost';
export const USER_AVATARS: { id: AvatarId; label: string; icon: IPIcon }[] = [
  { id: 'user',    label: '默认', icon: User },
  { id: 'student', label: '学生', icon: StudentCap },
  { id: 'smile',  label: '笑脸', icon: EmotionHappy },
  { id: 'star',   label: '星星', icon: Star },
  { id: 'cat',    label: '猫', icon: Cat },
  { id: 'dog',    label: '狗', icon: Dog },
  { id: 'rabbit', label: '兔子', icon: Rabbit },
  { id: 'rocket', label: '火箭', icon: Rocket },
  { id: 'ghost',  label: '幽灵', icon: Ghost },
];

// MBTI personality avatars (16 types × ♀/♂ = 32): illustrated portraits students can pick to
// represent themselves. Each renders as a circular, face-focused crop (the illustration carries its
// own background), served as a tiny ~5KB WebP thumbnail from /public/avatars/<type>-<f|m>.webp.
const MBTI_TYPES = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
export const MBTI_AVATARS: { id: string; label: string; src: string }[] = MBTI_TYPES.flatMap((t) => {
  const k = t.toLowerCase();
  return [
    { id: `${k}-f`, label: `${t} ♀`, src: `/avatars/${k}-f.webp` },
    { id: `${k}-m`, label: `${t} ♂`, src: `/avatars/${k}-m.webp` },
  ];
});
const MBTI_SRC = new Map(MBTI_AVATARS.map((a) => [a.id, a.src] as const));
// Returns the illustration thumbnail src if this id is an MBTI avatar, else undefined (it's a glyph).
export const avatarIllusSrc = (id?: string): string | undefined => (id ? MBTI_SRC.get(id) : undefined);

export const bubbleBg = (id?: string): string =>
  BUBBLE_THEMES.find((t) => t.id === id)?.bg || BUBBLE_THEMES[0].bg;
export const avatarIcon = (id?: string): IPIcon =>
  (USER_AVATARS.find((a) => a.id === id) || USER_AVATARS[0]).icon;

export function getBubbleTheme(): BubbleThemeId {
  return (localStorage.getItem('hak_bubble') as BubbleThemeId) || 'blue';
}
export function setBubbleTheme(id: BubbleThemeId): void {
  try { localStorage.setItem('hak_bubble', id); } catch { /* ignore */ }
}
export function getUserAvatar(): string {
  return localStorage.getItem('hak_avatar') || 'user';
}
export function setUserAvatar(id: string): void {
  try { localStorage.setItem('hak_avatar', id); } catch { /* ignore */ }
}
