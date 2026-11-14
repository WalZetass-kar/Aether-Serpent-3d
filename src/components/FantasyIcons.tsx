import React, { useState } from 'react';

export const AETHER_SERPENT_LOGO_URL =
  '/assets/aistudio/Aether_Serpent_3D__Fantasy_Game_Emblem_92116c8b.png';

interface EmblemProps {
  className?: string;
}

/**
 * Official Aether Serpent 3D Crest Emblem for header, modals, and branding,
 * with a resilient inline SVG fallback.
 */
export const SerpentCrestEmblem: React.FC<EmblemProps> = ({ className = 'w-6 h-6' }) => {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <img
        src={AETHER_SERPENT_LOGO_URL}
        alt="Logo Aether Serpent 3D"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`object-contain select-none drop-shadow-[0_2px_6px_rgba(245,158,11,0.35)] ${className}`}
      />
    );
  }

  return (
    <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="aetherGoldGrad" x1="4" y1="3" x2="32" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="aetherEmeraldGrad" x1="10" y1="8" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <path
        d="M18 2.5L29.5 7.5L33.5 18L29.5 28.5L18 33.5L6.5 28.5L2.5 18L6.5 7.5L18 2.5Z"
        fill="#0F172A"
        stroke="url(#aetherGoldGrad)"
        strokeWidth="1.8"
      />
      <circle cx="18" cy="18" r="10.2" stroke="#F59E0B" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 2" />
      <path
        d="M23.5 11.5C21.8 9.2 17.5 8.8 14.4 10.6C11.2 12.4 10.8 16.4 13.7 18.2C16.8 20.1 21.8 19.3 22.8 22.4C23.7 25.1 20.8 27.6 16.5 27.2C13.6 26.9 11.3 25.3 10.5 23.2"
        stroke="url(#aetherEmeraldGrad)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path d="M21.8 10.2L26.2 9.4L24.8 13.6L21.8 10.2Z" fill="url(#aetherGoldGrad)" />
      <circle cx="24.2" cy="11.1" r="0.9" fill="#0F172A" />
      <path d="M18 5.2L19.6 7.4L18 9.1L16.4 7.4L18 5.2Z" fill="#FDE047" />
    </svg>
  );
};

/**
 * Faceted 3D Fantasy Die SVG icon for Roll CTA and dice status.
 */
export const FacetedDiceIcon: React.FC<EmblemProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M12 2.2L20.5 7.1V16.9L12 21.8L3.5 16.9V7.1L12 2.2Z"
      fill="currentColor"
      fillOpacity="0.16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M12 2.2V12M12 12L20.5 7.1M12 12L3.5 7.1" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.7" />
    <path d="M12 12V21.8" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
    <circle cx="12" cy="7.2" r="1.35" fill="currentColor" />
    <circle cx="7.7" cy="12.5" r="1.1" fill="currentColor" />
    <circle cx="7.7" cy="15.8" r="1.1" fill="currentColor" />
    <circle cx="16.3" cy="14.2" r="1.25" fill="currentColor" />
  </svg>
);

/**
 * Royal Crown Trophy emblem for Leaderboard & Victory celebrations.
 */
export const CrownVictoryEmblem: React.FC<EmblemProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="crownGold" x1="4" y1="5" x2="24" y2="23" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="55%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>
    <path
      d="M4.5 20.5L3.2 9.5L9.2 13.8L14 6.2L18.8 13.8L24.8 9.5L23.5 20.5H4.5Z"
      fill="url(#crownGold)"
      stroke="#FEF3C7"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <rect x="4.5" y="21.5" width="19" height="2.4" rx="1.2" fill="#FDE047" />
    <circle cx="14" cy="5.2" r="1.5" fill="#FEF08A" />
    <circle cx="3.2" cy="8.6" r="1.2" fill="#FBBF24" />
    <circle cx="24.8" cy="8.6" r="1.2" fill="#FBBF24" />
    <path d="M14 13.4L15.6 15.8L14 18.2L12.4 15.8L14 13.4Z" fill="#E11D48" />
  </svg>
);

/**
 * Distinct Fantasy Hero Class Insignia per archetypeIndex (0..3).
 */
export const ArchetypeEmblem: React.FC<{ archetypeIndex: number; className?: string }> = ({
  archetypeIndex,
  className = 'w-5 h-5',
}) => {
  const idx = ((archetypeIndex % 4) + 4) % 4;

  // 0: Ksatria Ruby (Shield + Crest Blade)
  if (idx === 0) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M12 2.4L19.5 5.4V11.6C19.5 16.3 16.3 19.9 12 21.6C7.7 19.9 4.5 16.3 4.5 11.6V5.4L12 2.4Z"
          fill="#E11D48"
          fillOpacity="0.22"
          stroke="#FB7185"
          strokeWidth="1.6"
        />
        <path d="M12 6.2V16.8M9 10.2H15" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  // 1: Penyihir Safir (Arcane Star + Orbit Ring)
  if (idx === 1) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="8.8" fill="#2563EB" fillOpacity="0.22" stroke="#60A5FA" strokeWidth="1.5" />
        <path
          d="M12 4.8L14 9.8L19.2 12L14 14.2L12 19.2L10 14.2L4.8 12L10 9.8L12 4.8Z"
          fill="#93C5FD"
          stroke="#EFF6FF"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // 2: Penjelajah Zamrud (Emerald Compass Wing)
  if (idx === 2) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M12 2.5L20 12L12 21.5L4 12L12 2.5Z"
          fill="#059669"
          fillOpacity="0.24"
          stroke="#34D399"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M12 6.5L14.5 12L12 17.5L9.5 12L12 6.5Z" fill="#6EE7B7" />
        <circle cx="12" cy="12" r="1.4" fill="#064E3B" />
      </svg>
    );
  }

  // 3: Alkemis Amber (Solar Astrolabe)
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="#D97706" fillOpacity="0.22" stroke="#FBBF24" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4.5" stroke="#FDE68A" strokeWidth="1.3" strokeDasharray="2 1.5" />
      <path d="M12 2.5V5.2M12 18.8V21.5M2.5 12H5.2M18.8 12H21.5" stroke="#FBBF24" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="#FEF08A" />
    </svg>
  );
};

/**
 * Isometric 3D Custom Dice Skin Preview Emblem.
 */
export const DiceSkinCubePreview: React.FC<{
  coreBg: string;
  plateBg: string;
  borderHex: string;
  pipHex: string;
  pipOneHex: string;
  glowHex: string;
  className?: string;
}> = ({ coreBg, plateBg, borderHex, pipHex, pipOneHex, glowHex, className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 44 44" fill="none" className={className} aria-hidden="true">
    {/* Subtle outer aura */}
    <circle cx="22" cy="22" r="19" fill={glowHex} fillOpacity="0.14" />
    {/* Top face (1 pip) */}
    <polygon
      points="22,4 38,13 22,22 6,13"
      fill={plateBg}
      stroke={borderHex}
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    {/* Left face (2 pips) */}
    <polygon
      points="6,13 22,22 22,40 6,31"
      fill={coreBg}
      stroke={borderHex}
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    {/* Right face (3 pips) */}
    <polygon
      points="22,22 38,13 38,31 22,40"
      fill={plateBg}
      fillOpacity="0.92"
      stroke={borderHex}
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    {/* Top face center pip (1) */}
    <circle cx="22" cy="13" r="2.7" fill={pipOneHex} stroke={borderHex} strokeWidth="0.8" />
    {/* Left face pips (2) */}
    <circle cx="11.5" cy="21.5" r="1.8" fill={pipHex} />
    <circle cx="16.5" cy="30.5" r="1.8" fill={pipHex} />
    {/* Right face pips (3) */}
    <circle cx="33" cy="20" r="1.65" fill={pipHex} />
    <circle cx="30" cy="26" r="1.65" fill={pipHex} />
    <circle cx="27" cy="32" r="1.65" fill={pipHex} />
    {/* Corner crystal studs */}
    <circle cx="22" cy="4" r="1.5" fill={glowHex} />
    <circle cx="38" cy="13" r="1.5" fill={glowHex} />
    <circle cx="6" cy="13" r="1.5" fill={glowHex} />
    <circle cx="22" cy="22" r="1.6" fill={glowHex} />
    <circle cx="22" cy="40" r="1.5" fill={glowHex} />
  </svg>
);

