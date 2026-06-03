// InfiniteScroll — vertical, seamless auto-scrolling column (React Bits style).
// Pure CSS (duplicated track + translateY loop), pauses on hover, edge-masked.
import React from 'react';

interface Props {
  items: React.ReactNode[];
  speed?: number;       // seconds for one full loop
  className?: string;
}

export default function InfiniteScroll({ items, speed = 28, className = '' }: Props) {
  return (
    <div className={`infs-wrap ${className}`}>
      <style>{`
        .infs-wrap { position:relative; overflow:hidden;
          -webkit-mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent);
          mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent); }
        .infs-track { display:flex; flex-direction:column; gap:14px; animation: infs-roll linear infinite; will-change:transform; }
        .infs-wrap:hover .infs-track { animation-play-state: paused; }
        @keyframes infs-roll { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        @media (prefers-reduced-motion: reduce){ .infs-track { animation: none; } }
      `}</style>
      <div className="infs-track" style={{ animationDuration: `${speed}s` }} aria-hidden>
        {items.map((it, i) => <div key={`a${i}`}>{it}</div>)}
        {items.map((it, i) => <div key={`b${i}`}>{it}</div>)}
      </div>
    </div>
  );
}
