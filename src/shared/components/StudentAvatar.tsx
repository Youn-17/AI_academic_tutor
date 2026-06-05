import React from 'react';
import { avatarIcon, avatarIllusSrc, bubbleBg } from '@/lib/chatPrefs';

interface StudentAvatarProps {
  avatarId?: string;      // glyph id (user/cat/…) or MBTI id (enfj-f/…)
  bubbleTheme?: string;   // colours the circle behind a glyph avatar
  size?: number;          // px (default 40)
}

// The student's own chat avatar. Two kinds, one shape (a circle):
//  • glyph  → an IconPark icon, white on the student's chosen bubble colour
//  • MBTI   → an illustrated portrait, clipped to a circle and zoomed onto the face (it carries its
//             own background, so we ignore the bubble colour) — same framing as the AI tutor avatar.
const StudentAvatar: React.FC<StudentAvatarProps> = ({ avatarId, bubbleTheme, size = 40 }) => {
  const illus = avatarIllusSrc(avatarId);
  if (illus) {
    return (
      <div
        className="relative rounded-full overflow-hidden ring-1 ring-black/5 shadow-sm flex-shrink-0 bg-white"
        style={{ width: size, height: size }}
      >
        <img
          src={illus}
          alt="我的头像"
          loading="lazy"
          style={{ position: 'absolute', width: '133%', height: '133%', left: '-17%', top: '-11%', maxWidth: 'none', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }
  const A = avatarIcon(avatarId);
  return (
    <div
      className="rounded-full flex items-center justify-center shadow-sm ring-1 ring-white/10 flex-shrink-0 text-white"
      style={{ width: size, height: size, background: bubbleBg(bubbleTheme) }}
    >
      <A theme="outline" size={Math.round(size * 0.5)} fill="#fff" />
    </div>
  );
};

export default StudentAvatar;
