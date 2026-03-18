import React from 'react';

interface AITutorAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
  animate?: boolean;
}

const AITutorAvatar: React.FC<AITutorAvatarProps> = ({
  size = 'md',
  theme = 'dark',
  animate = true
}) => {
  const sizeMap = {
    sm: { width: 24, height: 24, strokeWidth: 1.5 },
    md: { width: 32, height: 32, strokeWidth: 1.5 },
    lg: { width: 40, height: 40, strokeWidth: 1.5 },
    xl: { width: 48, height: 48, strokeWidth: 2 },
  };

  const { width, height, strokeWidth } = sizeMap[size];
  const isDark = theme === 'dark';

  // Animated version for when AI is "thinking"
  if (animate) {
    return (
      <div className="relative" style={{ width, height }}>
        <svg
          width={width}
          height={height}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={animate ? 'animate-pulse-slow' : ''}
        >
          {/* Background Circle - Natural Emerald Gradient */}
          <defs>
            <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="aiGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Outer Ring */}
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke={isDark ? 'url(#aiGradient)' : 'url(#aiGradientLight)'}
            strokeWidth="1.5"
            opacity="0.3"
          />

          {/* Inner Circle */}
          <circle
            cx="24"
            cy="24"
            r="18"
            fill={isDark ? 'url(#aiGradient)' : 'url(#aiGradientLight)'}
          />

          {/* Academic Cap/Mortarboard */}
          <path
            d="M14 18 L24 13 L34 18 L24 23 Z"
            fill="white"
            opacity="0.95"
          />
          <path
            d="M14 18 L14 24 C14 26 18 28 24 28 C30 28 34 26 34 24 L34 18"
            fill="white"
            opacity="0.8"
          />
          <rect
            x="23"
            y="20"
            width="2"
            height="8"
            fill="#fbbf24"
            rx="0.5"
          />

          {/* Tassel */}
          {animate && (
            <g className="animate-swing">
              <circle cx="25" cy="29" r="2" fill="#fbbf24" />
            </g>
          )}

          {/* Knowledge Sparkles */}
          <g opacity={animate ? 0.8 : 0.6}>
            <circle cx="12" cy="12" r="1" fill="white" className={animate ? 'animate-twinkle' : ''} />
            <circle cx="36" cy="12" r="1" fill="white" className={animate ? 'animate-twinkle delay-100' : ''} />
            <circle cx="38" cy="24" r="1" fill="white" className={animate ? 'animate-twinkle delay-200' : ''} />
          </g>
        </svg>

        {/* CSS for custom animations */}
        <style>{`
          @keyframes swing {
            0%, 100% { transform: rotate(-5deg); }
            50% { transform: rotate(5deg); }
          }
          @keyframes twinkle {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          @keyframes pulse-slow {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .animate-swing {
            transform-origin: top center;
            animation: swing 2s ease-in-out infinite;
          }
          .animate-twinkle {
            animation: twinkle 1.5s ease-in-out infinite;
          }
          .delay-100 {
            animation-delay: 0.3s;
          }
          .delay-200 {
            animation-delay: 0.6s;
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // Static version
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="aiGradientStatic" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      <circle
        cx="24"
        cy="24"
        r="18"
        fill={isDark ? '#059669' : '#10b981'}
      />

      <path
        d="M14 18 L24 13 L34 18 L24 23 Z"
        fill="white"
        opacity="0.95"
      />
      <path
        d="M14 18 L14 24 C14 26 18 28 24 28 C30 28 34 26 34 24 L34 18"
        fill="white"
        opacity="0.8"
      />
      <rect
        x="23"
        y="20"
        width="2"
        height="8"
        fill="#fbbf24"
        rx="0.5"
      />
    </svg>
  );
};

export default AITutorAvatar;
