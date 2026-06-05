import React from 'react';
import { roleIconSrc } from '@/services/AgentRoles';

interface AITutorAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
  animate?: boolean;
  roleId?: string;   // selected agent role → its illustrated icon (/SVG/roles/role-<id>.svg)
}

// AI tutor avatar — a circular portrait of the CURRENTLY-SELECTED agent, so picking a different
// agent swaps the chat avatar automatically. The role SVGs are square "character cards" (a figure
// on its own background); we zoom into the face and clip to a circle so they read as proper chat
// avatars and sit naturally beside the message bubbles. Gently pulses while the tutor is thinking.
const AITutorAvatar: React.FC<AITutorAvatarProps> = ({ size = 'md', animate = false, roleId }) => {
  const sizeMap = { sm: 24, md: 32, lg: 40, xl: 48 };
  const d = sizeMap[size];
  const src = roleIconSrc(roleId);

  return (
    <div
      className={`relative rounded-full overflow-hidden ring-1 ring-blue-200/70 shadow-sm flex-shrink-0 bg-white${animate ? ' ai-tutor-pulse' : ''}`}
      style={{ width: d, height: d }}
    >
      <img
        src={src}
        alt="AI 导师"
        style={{ position: 'absolute', width: '133%', height: '133%', left: '-17%', top: '-11%', maxWidth: 'none', objectFit: 'cover', display: 'block' }}
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
