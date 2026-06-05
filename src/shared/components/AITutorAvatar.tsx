import React from 'react';
import { roleIconSrc } from '@/services/AgentRoles';

interface AITutorAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
  animate?: boolean;
  roleId?: string;   // selected agent role → its illustrated icon (/SVG/roles/role-<id>.svg)
}

// AI tutor avatar — shows the CURRENTLY-SELECTED agent's illustrated icon, so picking a different
// agent swaps the chat avatar automatically. Each role SVG already carries its own background, so we
// fill the whole rounded tile with it (rather than centring a figure on a gradient). Gently pulses
// while the tutor is thinking.
const AITutorAvatar: React.FC<AITutorAvatarProps> = ({ size = 'md', animate = false, roleId }) => {
  const sizeMap = { sm: 24, md: 32, lg: 40, xl: 48 };
  const d = sizeMap[size];
  const src = roleIconSrc(roleId);

  return (
    <div
      className="relative rounded-xl ring-1 ring-blue-200/60 shadow-sm overflow-hidden flex-shrink-0 bg-white"
      style={{ width: d, height: d }}
    >
      <img
        src={src}
        alt="AI 导师"
        className={animate ? 'ai-tutor-pulse' : ''}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {animate && (
        <style>{`
          @keyframes aiTutorPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
          .ai-tutor-pulse { animation: aiTutorPulse 2.4s ease-in-out infinite }
          @media (prefers-reduced-motion: reduce){ .ai-tutor-pulse { animation: none } }
        `}</style>
      )}
    </div>
  );
};

export default AITutorAvatar;
