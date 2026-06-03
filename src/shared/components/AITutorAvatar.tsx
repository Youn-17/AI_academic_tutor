import React from 'react';

interface AITutorAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
  animate?: boolean;
}

// A polished "AI orb": navy→blue→sky gradient sphere with an inner sheen and a
// 4-point spark glyph; gently pulses + a particle orbits when thinking.
const AITutorAvatar: React.FC<AITutorAvatarProps> = ({ size = 'md', animate = true }) => {
  const sizeMap = { sm: 24, md: 32, lg: 40, xl: 48 };
  const d = sizeMap[size];

  return (
    <div className="relative" style={{ width: d, height: d }}>
      <svg width={d} height={d} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={animate ? 'ai-orb-pulse' : ''}>
        <defs>
          <linearGradient id="aiOrb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B2447" />
            <stop offset="55%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
          <radialGradient id="aiGlow" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#2563EB" stopOpacity="0" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.5" />
          </radialGradient>
        </defs>

        {/* outer glow ring */}
        <circle cx="24" cy="24" r="22.5" fill="none" stroke="url(#aiOrb)" strokeWidth="1.4" opacity="0.3" />
        {/* orb */}
        <circle cx="24" cy="24" r="17.5" fill="url(#aiOrb)" />
        <circle cx="24" cy="24" r="17.5" fill="url(#aiGlow)" />
        {/* top-left sheen */}
        <ellipse cx="19" cy="17" rx="8" ry="5" fill="#fff" opacity="0.16" />
        {/* primary 4-point spark (the "AI" mark) */}
        <path d="M24 12 C24.6 19 25 19.4 32 20 C25 20.6 24.6 21 24 28 C23.4 21 23 20.6 16 20 C23 19.4 23.4 19 24 12 Z" fill="#fff" opacity="0.96" />
        {/* secondary small spark */}
        <path d="M31.5 27 C31.8 30 32 30.2 35 30.5 C32 30.8 31.8 31 31.5 34 C31.2 31 31 30.8 28 30.5 C31 30.2 31.2 30 31.5 27 Z" fill="#fff" opacity="0.7" className={animate ? 'ai-twinkle' : ''} />
        {/* orbiting knowledge particle */}
        {animate && (
          <g className="ai-orbit" style={{ transformOrigin: '24px 24px' }}>
            <circle cx="24" cy="3.5" r="1.6" fill="#BAE6FD" />
          </g>
        )}
      </svg>
      <style>{`
        @keyframes aiOrbPulse { 0%,100%{ transform: scale(1) } 50%{ transform: scale(1.06) } }
        @keyframes aiTwinkle { 0%,100%{ opacity:.4 } 50%{ opacity:.95 } }
        @keyframes aiOrbit { from{ transform: rotate(0deg) } to{ transform: rotate(360deg) } }
        .ai-orb-pulse { animation: aiOrbPulse 3s ease-in-out infinite }
        .ai-twinkle { animation: aiTwinkle 1.6s ease-in-out infinite }
        .ai-orbit { animation: aiOrbit 6s linear infinite }
        @media (prefers-reduced-motion: reduce){ .ai-orb-pulse,.ai-twinkle,.ai-orbit{ animation:none } }
      `}</style>
    </div>
  );
};

export default AITutorAvatar;
