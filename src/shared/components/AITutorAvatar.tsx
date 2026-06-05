import React from 'react';

interface AITutorAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
  animate?: boolean;
}

// AI tutor avatar — the platform's teacher mark (public/SVG/teacher-dashboard.svg, a navy figure)
// on a soft blue rounded tile. Gently pulses while the tutor is thinking.
const AITutorAvatar: React.FC<AITutorAvatarProps> = ({ size = 'md', animate = false }) => {
  const sizeMap = { sm: 24, md: 32, lg: 40, xl: 48 };
  const d = sizeMap[size];
  const inner = Math.round(d * 0.66);

  return (
    <div
      className="relative flex items-center justify-center rounded-xl ring-1 ring-blue-200/60 shadow-sm overflow-hidden flex-shrink-0"
      style={{ width: d, height: d, background: 'linear-gradient(135deg,#EFF6FF,#E0F2FE)' }}
    >
      <img
        src="/SVG/teacher-dashboard.svg"
        alt="AI 导师"
        className={animate ? 'ai-tutor-pulse' : ''}
        style={{ width: inner, height: inner }}
      />
      {animate && (
        <style>{`
          @keyframes aiTutorPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.08) } }
          .ai-tutor-pulse { animation: aiTutorPulse 2.4s ease-in-out infinite }
          @media (prefers-reduced-motion: reduce){ .ai-tutor-pulse { animation: none } }
        `}</style>
      )}
    </div>
  );
};

export default AITutorAvatar;
