// GlassIcons — glassmorphism icon tiles (React Bits style): a colored gradient
// back panel that tilts on hover behind a frosted-glass front holding the icon.
import React from 'react';

export interface GlassItem {
  icon: React.ReactNode;
  label: string;
  color?: string;
}

export default function GlassIcons({ items, className = '' }: { items: GlassItem[]; className?: string }) {
  return (
    <div className={`gi-grid ${className}`}>
      <style>{`
        .gi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; color:inherit; }
        .gi-tile { display:flex; flex-direction:column; align-items:center; gap:9px; background:none; border:none; cursor:pointer; padding:0; color:inherit; }
        .gi-sq { position:relative; width:100%; aspect-ratio:1/1; border-radius:18px; }
        .gi-back { position:absolute; inset:0; border-radius:18px; background:linear-gradient(135deg, var(--gi,#2563EB), #38BDF8); box-shadow:0 10px 24px rgba(8,20,48,0.28); transition:transform .45s cubic-bezier(.2,.7,.2,1); }
        .gi-tile:hover .gi-back { transform:rotate(13deg) scale(1.06); }
        .gi-front { position:absolute; inset:0; border-radius:18px; display:flex; align-items:center; justify-content:center; color:#fff; background:rgba(255,255,255,0.14); backdrop-filter:blur(7px); -webkit-backdrop-filter:blur(7px); border:1px solid rgba(255,255,255,0.30); transition:transform .45s cubic-bezier(.2,.7,.2,1); }
        .gi-tile:hover .gi-front { transform:translateY(-3px); }
        .gi-label { font-size:11px; font-weight:600; text-align:center; line-height:1.2; opacity:.85; }
        @media (prefers-reduced-motion: reduce){ .gi-back,.gi-front { transition:none; } }
      `}</style>
      {items.map((it, i) => (
        <button key={i} type="button" className="gi-tile" style={{ ['--gi' as any]: it.color || '#2563EB' }}>
          <span className="gi-sq"><span className="gi-back" /><span className="gi-front">{it.icon}</span></span>
          <span className="gi-label">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
