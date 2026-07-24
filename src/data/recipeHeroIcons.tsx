/**
 * Recipe hero icons — large (40×40), colorful, flat-design SVG components
 * that represent a recipe's hero ingredient. Used on recipe list cards.
 *
 * getRecipeHeroIcon() inspects a recipe's ingredient names and returns
 * the most visually distinctive icon, falling back to a soap bar.
 */
import type { JSX } from 'react';
import type { Ingredient, Recipe } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Individual hero icon components (40×40 viewBox, full color)
// ─────────────────────────────────────────────────────────────────────────────

const LavenderIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* stem */}
    <line x1="20" y1="38" x2="20" y2="12" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
    {/* side stems */}
    <line x1="20" y1="24" x2="15" y2="20" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="20" y1="24" x2="25" y2="20" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" />
    {/* florets */}
    <ellipse cx="20" cy="10" rx="3" ry="5" fill="#A78BFA" />
    <ellipse cx="15" cy="18" rx="2.5" ry="4.5" fill="#8B5CF6" transform="rotate(-25 15 18)" />
    <ellipse cx="25" cy="18" rx="2.5" ry="4.5" fill="#8B5CF6" transform="rotate(25 25 18)" />
    <ellipse cx="12" cy="23" rx="2" ry="3.5" fill="#7C3AED" transform="rotate(-35 12 23)" />
    <ellipse cx="28" cy="23" rx="2" ry="3.5" fill="#7C3AED" transform="rotate(35 28 23)" />
  </svg>
);

const RoseIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* outer petals */}
    <ellipse cx="20" cy="12" rx="5" ry="7" fill="#FCA5A5" transform="rotate(0 20 20)" />
    <ellipse cx="28" cy="16" rx="5" ry="7" fill="#F87171" transform="rotate(72 20 20)" />
    <ellipse cx="25" cy="27" rx="5" ry="7" fill="#EF4444" transform="rotate(144 20 20)" />
    <ellipse cx="15" cy="27" rx="5" ry="7" fill="#F87171" transform="rotate(216 20 20)" />
    <ellipse cx="12" cy="16" rx="5" ry="7" fill="#FCA5A5" transform="rotate(288 20 20)" />
    {/* inner petals */}
    <ellipse cx="20" cy="15" rx="3.5" ry="5" fill="#FB7185" />
    <ellipse cx="24" cy="18" rx="3.5" ry="5" fill="#F43F5E" transform="rotate(60 20 20)" />
    <ellipse cx="22" cy="24" rx="3.5" ry="5" fill="#E11D48" transform="rotate(120 20 20)" />
    {/* center */}
    <circle cx="20" cy="20" r="4" fill="#BE123C" />
    <circle cx="19" cy="19" r="1.5" fill="#9F1239" opacity="0.6" />
    {/* stem */}
    <line x1="20" y1="33" x2="20" y2="38" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 36 C18 34 15 34 14 36" stroke="#16A34A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

const ChamomileIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* petals */}
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
      const r = (deg * Math.PI) / 180;
      const cx = 20 + 10 * Math.sin(r);
      const cy = 20 - 10 * Math.cos(r);
      return (
        <ellipse
          key={deg}
          cx={cx}
          cy={cy}
          rx="2.5"
          ry="5.5"
          fill="white"
          stroke="#E5E7EB"
          strokeWidth="0.5"
          transform={`rotate(${deg} ${cx} ${cy})`}
        />
      );
    })}
    {/* center disk */}
    <circle cx="20" cy="20" r="6" fill="#FDE047" />
    <circle cx="20" cy="20" r="4" fill="#EAB308" />
    <circle cx="18" cy="19" r="1" fill="#CA8A04" opacity="0.6" />
    <circle cx="21" cy="21" r="0.8" fill="#CA8A04" opacity="0.5" />
    {/* stem */}
    <line x1="20" y1="33" x2="20" y2="38" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CalendulaIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* outer petals */}
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
      const r = (deg * Math.PI) / 180;
      const cx = 20 + 11 * Math.sin(r);
      const cy = 20 - 11 * Math.cos(r);
      return (
        <ellipse
          key={deg}
          cx={cx}
          cy={cy}
          rx="2.8"
          ry="6"
          fill="#FB923C"
          transform={`rotate(${deg + 15} ${cx} ${cy})`}
        />
      );
    })}
    {/* inner petals */}
    {[15, 75, 135, 195, 255, 315].map((deg) => {
      const r = (deg * Math.PI) / 180;
      const cx = 20 + 7 * Math.sin(r);
      const cy = 20 - 7 * Math.cos(r);
      return (
        <ellipse
          key={deg}
          cx={cx}
          cy={cy}
          rx="2"
          ry="4.5"
          fill="#F97316"
          transform={`rotate(${deg} ${cx} ${cy})`}
        />
      );
    })}
    {/* center */}
    <circle cx="20" cy="20" r="5" fill="#EA580C" />
    <circle cx="20" cy="20" r="3" fill="#C2410C" />
  </svg>
);

const AloeIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* aloe leaves */}
    <path d="M20 36 C20 36 14 28 13 18 C12 10 15 6 20 5" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M20 36 C20 36 26 28 27 18 C28 10 25 6 20 5" stroke="#15803D" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M20 30 C20 30 10 26 8 18 C7 12 10 8 14 8" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M20 30 C20 30 30 26 32 18 C33 12 30 8 26 8" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* left leaf filled */}
    <path d="M20 36 C16 30 13 22 13 18 C12 10 15 6 20 5 C20 5 18 12 17 18 C16 24 18 32 20 36Z" fill="#4ADE80" opacity="0.8" />
    {/* right leaf filled */}
    <path d="M20 36 C24 30 27 22 27 18 C28 10 25 6 20 5 C20 5 22 12 23 18 C24 24 22 32 20 36Z" fill="#16A34A" opacity="0.8" />
    {/* spines */}
    <path d="M14 20 L11 18" stroke="#15803D" strokeWidth="1" strokeLinecap="round" />
    <path d="M14 24 L11 23" stroke="#15803D" strokeWidth="1" strokeLinecap="round" />
    <path d="M26 20 L29 18" stroke="#15803D" strokeWidth="1" strokeLinecap="round" />
    <path d="M26 24 L29 23" stroke="#15803D" strokeWidth="1" strokeLinecap="round" />
    {/* gel highlight */}
    <ellipse cx="20" cy="22" rx="3" ry="6" fill="#BBF7D0" opacity="0.5" />
  </svg>
);

const GreenTeaIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* main leaf */}
    <path d="M20 36 C20 36 8 28 7 16 C6 8 12 4 20 4 C28 4 34 8 33 16 C32 28 20 36 20 36Z" fill="#22C55E" />
    <path d="M20 36 C20 36 10 26 10 16 C10 10 14 6 20 4" fill="#16A34A" opacity="0.5" />
    {/* leaf veins */}
    <path d="M20 36 L20 8" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M20 16 L13 11" stroke="#15803D" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.7" />
    <path d="M20 20 L12 16" stroke="#15803D" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
    <path d="M20 24 L13 22" stroke="#15803D" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
    <path d="M20 16 L27 11" stroke="#15803D" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.7" />
    <path d="M20 20 L28 16" stroke="#15803D" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
    <path d="M20 24 L27 22" stroke="#15803D" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
    {/* tip highlight */}
    <ellipse cx="22" cy="10" rx="2" ry="4" fill="#4ADE80" opacity="0.5" transform="rotate(-20 22 10)" />
  </svg>
);

const OatmealIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* stem */}
    <line x1="20" y1="38" x2="20" y2="10" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
    {/* oat grains alternating */}
    <ellipse cx="16" cy="12" rx="4" ry="6" fill="#D97706" transform="rotate(-15 16 12)" />
    <ellipse cx="24" cy="14" rx="4" ry="6" fill="#B45309" transform="rotate(15 24 14)" />
    <ellipse cx="15" cy="19" rx="4" ry="6" fill="#D97706" transform="rotate(-10 15 19)" />
    <ellipse cx="25" cy="21" rx="4" ry="6" fill="#B45309" transform="rotate(10 25 21)" />
    <ellipse cx="16" cy="26" rx="3.5" ry="5.5" fill="#D97706" transform="rotate(-8 16 26)" />
    <ellipse cx="24" cy="28" rx="3.5" ry="5.5" fill="#B45309" transform="rotate(8 24 28)" />
    {/* grain creases */}
    <line x1="14" y1="11" x2="18" y2="13" stroke="#92400E" strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
    <line x1="22" y1="13" x2="26" y2="15" stroke="#92400E" strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
  </svg>
);

const LemonIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* lemon wedge background */}
    <circle cx="20" cy="20" r="16" fill="#FEF08A" />
    <circle cx="20" cy="20" r="14" fill="#FDE047" />
    {/* segments */}
    <path d="M20 6 L20 20" stroke="#EAB308" strokeWidth="1.2" opacity="0.6" />
    <path d="M20 20 L6 20" stroke="#EAB308" strokeWidth="1.2" opacity="0.6" />
    <path d="M20 20 L10 10" stroke="#EAB308" strokeWidth="1.2" opacity="0.6" />
    <path d="M20 20 L30 10" stroke="#EAB308" strokeWidth="1.2" opacity="0.6" />
    <path d="M20 20 L34 20" stroke="#EAB308" strokeWidth="1.2" opacity="0.6" />
    <path d="M20 20 L10 30" stroke="#EAB308" strokeWidth="1.2" opacity="0.6" />
    <path d="M20 20 L30 30" stroke="#EAB308" strokeWidth="1.2" opacity="0.6" />
    <path d="M20 20 L20 34" stroke="#EAB308" strokeWidth="1.2" opacity="0.6" />
    {/* rind */}
    <circle cx="20" cy="20" r="16" fill="none" stroke="#CA8A04" strokeWidth="2" />
    {/* lemon tip */}
    <ellipse cx="20" cy="5" rx="3" ry="2" fill="#FDE047" />
    <ellipse cx="20" cy="35" rx="3" ry="2" fill="#FDE047" />
    {/* highlight */}
    <ellipse cx="15" cy="15" rx="4" ry="3" fill="white" opacity="0.3" transform="rotate(-30 15 15)" />
  </svg>
);

const OrangeIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    <circle cx="20" cy="20" r="16" fill="#FED7AA" />
    <circle cx="20" cy="20" r="14" fill="#FB923C" />
    {/* segments */}
    <path d="M20 6 L20 20" stroke="#EA580C" strokeWidth="1.2" opacity="0.7" />
    <path d="M20 20 L6 20" stroke="#EA580C" strokeWidth="1.2" opacity="0.7" />
    <path d="M20 20 L11.1 11.1" stroke="#EA580C" strokeWidth="1.2" opacity="0.7" />
    <path d="M20 20 L28.9 11.1" stroke="#EA580C" strokeWidth="1.2" opacity="0.7" />
    <path d="M20 20 L34 20" stroke="#EA580C" strokeWidth="1.2" opacity="0.7" />
    <path d="M20 20 L28.9 28.9" stroke="#EA580C" strokeWidth="1.2" opacity="0.7" />
    <path d="M20 20 L11.1 28.9" stroke="#EA580C" strokeWidth="1.2" opacity="0.7" />
    <path d="M20 20 L20 34" stroke="#EA580C" strokeWidth="1.2" opacity="0.7" />
    {/* rind */}
    <circle cx="20" cy="20" r="16" fill="none" stroke="#C2410C" strokeWidth="2" />
    {/* leaf */}
    <path d="M20 5 C18 2 14 2 13 5" fill="#22C55E" stroke="#15803D" strokeWidth="0.8" />
    {/* highlight */}
    <ellipse cx="14" cy="14" rx="4" ry="3" fill="white" opacity="0.25" transform="rotate(-30 14 14)" />
  </svg>
);

const MangoIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* mango body */}
    <path d="M20 34 C14 34 8 28 7 20 C6 12 11 6 18 5 C22 4 27 6 30 11 C33 16 33 24 29 29 C26 33 23 34 20 34Z" fill="#FDE047" />
    <path d="M20 34 C17 34 12 29 10 22 C8 15 11 7 18 5 C15 8 13 14 14 20 C15 26 17 31 20 34Z" fill="#FB923C" opacity="0.7" />
    {/* blush */}
    <ellipse cx="25" cy="14" rx="5" ry="4" fill="#F97316" opacity="0.5" transform="rotate(-20 25 14)" />
    {/* stem */}
    <path d="M18 5 C18 5 18 2 20 2 C22 2 22 5 22 5" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* leaf */}
    <path d="M20 3 C20 3 24 0 26 2 C24 4 20 3 20 3Z" fill="#22C55E" />
    {/* highlight */}
    <ellipse cx="23" cy="16" rx="3" ry="5" fill="white" opacity="0.2" transform="rotate(-20 23 16)" />
  </svg>
);

const PeachIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* peach body */}
    <path d="M20 34 C13 34 7 27 7 20 C7 13 12 6 20 6 C28 6 33 13 33 20 C33 27 27 34 20 34Z" fill="#FDE68A" />
    <path d="M20 34 C15 33 9 27 9 20 C9 14 13 8 19 6 C14 9 12 15 12 20 C12 26 15 32 20 34Z" fill="#FDBA74" opacity="0.7" />
    {/* blush */}
    <ellipse cx="24" cy="16" rx="6" ry="5" fill="#FB923C" opacity="0.4" />
    {/* crease */}
    <path d="M20 34 C20 34 20 20 20 8" stroke="#F97316" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" />
    {/* stem + leaf */}
    <line x1="20" y1="6" x2="20" y2="3" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M20 4 C20 4 24 1 26 3 C24 5 20 4 20 4Z" fill="#22C55E" />
    {/* highlight */}
    <ellipse cx="15" cy="16" rx="3" ry="4" fill="white" opacity="0.3" transform="rotate(15 15 16)" />
  </svg>
);

const CherryIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* stems */}
    <path d="M14 18 C14 18 13 12 18 8 C22 5 26 8 26 8" stroke="#15803D" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M26 18 C26 18 27 12 26 8" stroke="#15803D" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* left cherry */}
    <circle cx="13" cy="25" r="9" fill="#DC2626" />
    <circle cx="13" cy="25" r="9" fill="none" stroke="#991B1B" strokeWidth="1" />
    {/* right cherry */}
    <circle cx="27" cy="25" r="9" fill="#EF4444" />
    <circle cx="27" cy="25" r="9" fill="none" stroke="#DC2626" strokeWidth="1" />
    {/* highlights */}
    <ellipse cx="10" cy="22" rx="2.5" ry="2" fill="white" opacity="0.4" transform="rotate(-20 10 22)" />
    <ellipse cx="24" cy="22" rx="2.5" ry="2" fill="white" opacity="0.35" transform="rotate(-20 24 22)" />
  </svg>
);

const AppleIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* apple body */}
    <path d="M20 33 C13 33 7 27 7 20 C7 13 12 9 17 9 C18.5 9 19 10 20 10 C21 10 21.5 9 23 9 C28 9 33 13 33 20 C33 27 27 33 20 33Z" fill="#EF4444" />
    <path d="M20 33 C14 32 8 27 8 20 C8 14 12 10 17 9 C13 11 11 15 11 20 C11 26 15 32 20 33Z" fill="#DC2626" opacity="0.5" />
    {/* top indent */}
    <path d="M20 9 C20 9 19 7 20 6 C21 7 20 9 20 9Z" fill="#991B1B" opacity="0.3" />
    {/* stem */}
    <line x1="20" y1="9" x2="21" y2="5" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
    {/* leaf */}
    <path d="M21 6 C21 6 25 3 27 5 C25 7 21 6 21 6Z" fill="#22C55E" />
    {/* highlight */}
    <ellipse cx="14" cy="16" rx="3.5" ry="4.5" fill="white" opacity="0.25" transform="rotate(15 14 16)" />
  </svg>
);

const WatermelonIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* rind outer */}
    <path d="M4 20 A16 16 0 0 1 36 20 Z" fill="#22C55E" />
    {/* rind inner light */}
    <path d="M6 20 A14 14 0 0 1 34 20 Z" fill="#BBF7D0" />
    {/* flesh */}
    <path d="M8 20 A12 12 0 0 1 32 20 Z" fill="#F87171" />
    {/* lighter center */}
    <path d="M12 20 A8 8 0 0 1 28 20 Z" fill="#FCA5A5" opacity="0.5" />
    {/* seeds */}
    <ellipse cx="16" cy="17" rx="1.2" ry="2" fill="#1C1917" transform="rotate(10 16 17)" />
    <ellipse cx="20" cy="16" rx="1.2" ry="2" fill="#1C1917" />
    <ellipse cx="24" cy="17" rx="1.2" ry="2" fill="#1C1917" transform="rotate(-10 24 17)" />
    <ellipse cx="22" cy="13" rx="1" ry="1.8" fill="#1C1917" transform="rotate(20 22 13)" />
    <ellipse cx="18" cy="13" rx="1" ry="1.8" fill="#1C1917" transform="rotate(-20 18 13)" />
    {/* flat bottom */}
    <line x1="4" y1="20" x2="36" y2="20" stroke="#15803D" strokeWidth="1.5" />
  </svg>
);

const PassionFruitIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* fruit half cross-section */}
    <circle cx="20" cy="20" r="16" fill="#A855F7" />
    <circle cx="20" cy="20" r="14" fill="#C084FC" />
    {/* inner flesh */}
    <circle cx="20" cy="20" r="11" fill="#FAF5FF" />
    {/* seed sections */}
    {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((deg) => {
      const r = (deg * Math.PI) / 180;
      const cx = 20 + 7 * Math.sin(r);
      const cy = 20 - 7 * Math.cos(r);
      return (
        <g key={deg}>
          <ellipse cx={cx} cy={cy} rx="2" ry="3" fill="#FBBF24" transform={`rotate(${deg} ${cx} ${cy})`} />
          <ellipse cx={cx} cy={cy} rx="1" ry="1.5" fill="#1C1917" opacity="0.7" transform={`rotate(${deg} ${cx} ${cy})`} />
        </g>
      );
    })}
    {/* center */}
    <circle cx="20" cy="20" r="2.5" fill="#D8B4FE" />
    {/* rind */}
    <circle cx="20" cy="20" r="16" fill="none" stroke="#7E22CE" strokeWidth="1.5" />
  </svg>
);

const StrawberryIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* berry body */}
    <path d="M20 35 C14 35 8 28 8 21 C8 14 13 10 20 10 C27 10 32 14 32 21 C32 28 26 35 20 35Z" fill="#EF4444" />
    <path d="M20 35 C14 34 9 28 9 21 C9 15 13 11 20 10 C15 12 12 16 12 21 C12 27 15 33 20 35Z" fill="#DC2626" opacity="0.4" />
    {/* seeds */}
    {[
      [17, 16], [22, 15], [26, 19], [25, 24], [21, 27], [16, 26], [12, 21], [14, 17],
    ].map(([x, y]) => (
      <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="0.9" ry="1.2" fill="#FCA5A5" />
    ))}
    {/* calyx leaves */}
    <path d="M17 10 C16 7 12 6 11 8 C13 9 17 10 17 10Z" fill="#16A34A" />
    <path d="M20 9 C20 6 18 4 16 5 C17 7 20 9 20 9Z" fill="#22C55E" />
    <path d="M20 9 C20 6 22 4 24 5 C23 7 20 9 20 9Z" fill="#22C55E" />
    <path d="M23 10 C24 7 28 6 29 8 C27 9 23 10 23 10Z" fill="#16A34A" />
    <path d="M20 10 L20 8" stroke="#92400E" strokeWidth="1.2" strokeLinecap="round" />
    {/* highlight */}
    <ellipse cx="15" cy="18" rx="2.5" ry="4" fill="white" opacity="0.2" transform="rotate(10 15 18)" />
  </svg>
);

const CoconutIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* coconut half */}
    <path d="M4 22 A16 16 0 0 1 36 22 Z" fill="#78350F" />
    {/* flesh */}
    <path d="M7 22 A13 13 0 0 1 33 22 Z" fill="#FEF3C7" />
    {/* inner meat */}
    <path d="M10 22 A10 10 0 0 1 30 22 Z" fill="#FDE68A" />
    {/* water/center */}
    <ellipse cx="20" cy="20" rx="7" ry="3" fill="#BFDBFE" opacity="0.6" />
    {/* shell texture */}
    <path d="M4 22 A16 16 0 0 1 36 22" stroke="#92400E" strokeWidth="2" fill="none" />
    {/* shell fibers */}
    <path d="M10 22 C12 16 16 12 20 12 C24 12 28 16 30 22" stroke="#D97706" strokeWidth="1" fill="none" opacity="0.4" />
    <path d="M12 22 C14 17 17 14 20 14 C23 14 26 17 28 22" stroke="#D97706" strokeWidth="0.8" fill="none" opacity="0.3" />
    {/* "eyes" on top */}
    <circle cx="14" cy="13" r="2.5" fill="#57210A" />
    <circle cx="20" cy="10" r="2.5" fill="#57210A" />
    <circle cx="26" cy="13" r="2.5" fill="#57210A" />
    <circle cx="14" cy="13" r="1" fill="#1C0A02" />
    <circle cx="20" cy="10" r="1" fill="#1C0A02" />
    <circle cx="26" cy="13" r="1" fill="#1C0A02" />
  </svg>
);

const AvocadoIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* outer skin */}
    <path d="M20 35 C14 35 8 28 8 21 C8 12 14 5 20 5 C26 5 32 12 32 21 C32 28 26 35 20 35Z" fill="#15803D" />
    {/* flesh */}
    <path d="M20 33 C15 33 10 27 10 21 C10 14 15 8 20 8 C25 8 30 14 30 21 C30 27 25 33 20 33Z" fill="#BBF7D0" />
    {/* inner flesh gradient */}
    <path d="M20 31 C16 31 12 26 12 21 C12 16 16 11 20 11 C24 11 28 16 28 21 C28 26 24 31 20 31Z" fill="#86EFAC" />
    {/* pit */}
    <circle cx="20" cy="22" r="7" fill="#B45309" />
    <circle cx="20" cy="22" r="5" fill="#D97706" />
    <circle cx="18" cy="20" r="2" fill="#F59E0B" opacity="0.5" />
  </svg>
);

const CinnamonIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* three cinnamon sticks bundled */}
    {/* back stick */}
    <rect x="13" y="10" width="7" height="22" rx="3.5" fill="#92400E" transform="rotate(-15 16 21)" />
    {/* middle stick */}
    <rect x="17" y="8" width="7" height="24" rx="3.5" fill="#B45309" />
    {/* front stick */}
    <rect x="14" y="11" width="7" height="22" rx="3.5" fill="#D97706" transform="rotate(12 17 22)" />
    {/* rolled texture marks */}
    <line x1="17" y1="13" x2="24" y2="13" stroke="#92400E" strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
    <line x1="17" y1="17" x2="24" y2="17" stroke="#92400E" strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
    <line x1="17" y1="21" x2="24" y2="21" stroke="#92400E" strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
    <line x1="17" y1="25" x2="24" y2="25" stroke="#92400E" strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
    {/* band */}
    <rect x="15" y="20" width="11" height="3" rx="1.5" fill="#78350F" opacity="0.4" />
  </svg>
);

const CoffeeIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* two coffee beans */}
    {/* left bean */}
    <ellipse cx="14" cy="20" rx="8" ry="11" fill="#92400E" transform="rotate(-15 14 20)" />
    <path d="M10 14 C11 18 11 22 10 26" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" transform="rotate(-15 14 20)" />
    <ellipse cx="14" cy="20" rx="5" ry="7" fill="#B45309" opacity="0.5" transform="rotate(-15 14 20)" />
    {/* right bean */}
    <ellipse cx="26" cy="20" rx="8" ry="11" fill="#78350F" transform="rotate(15 26 20)" />
    <path d="M22 14 C23 18 23 22 22 26" stroke="#92400E" strokeWidth="2" strokeLinecap="round" fill="none" transform="rotate(15 26 20)" />
    <ellipse cx="26" cy="20" rx="5" ry="7" fill="#D97706" opacity="0.3" transform="rotate(15 26 20)" />
    {/* steam wisps */}
    <path d="M15 5 Q13 3 15 1" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
    <path d="M20 4 Q18 2 20 0" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
    <path d="M25 5 Q23 3 25 1" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
  </svg>
);

const VanillaIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* vanilla pods */}
    <path d="M16 36 C14 36 12 30 12 20 C12 10 16 5 18 4" stroke="#78350F" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M16 36 C18 36 20 30 20 20 C20 10 16 5 18 4" stroke="#92400E" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* second pod */}
    <path d="M24 36 C22 36 20 30 20 20 C20 10 22 5 24 4" stroke="#B45309" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M24 36 C26 36 28 30 28 20 C28 10 26 5 24 4" stroke="#D97706" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* seeds dots */}
    {[12, 15, 18, 21, 24, 27, 30].map((y) => (
      <circle key={y} cx="18" cy={y} r="0.7" fill="#FDE68A" opacity="0.8" />
    ))}
    {[12, 15, 18, 21, 24, 27, 30].map((y) => (
      <circle key={y} cx="24" cy={y} r="0.7" fill="#FEF3C7" opacity="0.8" />
    ))}
    {/* flower tip */}
    <circle cx="18" cy="4" r="3" fill="#FDE68A" />
    <circle cx="24" cy="4" r="3" fill="#FEF3C7" />
  </svg>
);

const PeppermintIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* stem */}
    <line x1="20" y1="38" x2="20" y2="10" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
    {/* leaves pairs */}
    <path d="M20 28 C20 28 12 24 10 18 C14 18 20 22 20 28Z" fill="#22C55E" />
    <path d="M20 28 C20 28 28 24 30 18 C26 18 20 22 20 28Z" fill="#16A34A" />
    <path d="M20 20 C20 20 12 16 10 10 C14 10 20 14 20 20Z" fill="#4ADE80" />
    <path d="M20 20 C20 20 28 16 30 10 C26 10 20 14 20 20Z" fill="#22C55E" />
    {/* veins */}
    <path d="M20 28 C17 26 13 22 10 18" stroke="#15803D" strokeWidth="0.8" fill="none" opacity="0.5" />
    <path d="M20 28 C23 26 27 22 30 18" stroke="#15803D" strokeWidth="0.8" fill="none" opacity="0.5" />
    {/* top bud */}
    <ellipse cx="20" cy="9" rx="3" ry="4" fill="#86EFAC" />
    <ellipse cx="19" cy="8" rx="1.5" ry="2.5" fill="#4ADE80" opacity="0.6" />
  </svg>
);

const EucalyptusIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* branch */}
    <path d="M20 38 C20 38 18 28 15 20 C12 12 10 8 12 6" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* leaves along branch */}
    <ellipse cx="14" cy="28" rx="7" ry="4" fill="#6EE7B7" transform="rotate(30 14 28)" />
    <ellipse cx="17" cy="22" rx="7" ry="4" fill="#34D399" transform="rotate(20 17 22)" />
    <ellipse cx="14" cy="16" rx="7" ry="3.5" fill="#10B981" transform="rotate(35 14 16)" />
    <ellipse cx="13" cy="10" rx="5.5" ry="3" fill="#059669" transform="rotate(25 13 10)" />
    {/* leaf veins */}
    <path d="M10 29 L18 27" stroke="#059669" strokeWidth="0.8" opacity="0.5" />
    <path d="M12 22 L22 20" stroke="#059669" strokeWidth="0.8" opacity="0.5" />
    {/* buds */}
    <circle cx="26" cy="16" r="3" fill="#A7F3D0" stroke="#34D399" strokeWidth="1" />
    <circle cx="30" cy="20" r="2.5" fill="#6EE7B7" stroke="#10B981" strokeWidth="1" />
    <circle cx="28" cy="25" r="2" fill="#D1FAE5" stroke="#34D399" strokeWidth="1" />
  </svg>
);

const CharcoalIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* irregular charcoal chunks */}
    <path d="M8 28 L12 16 L22 12 L30 18 L28 30 L16 34 Z" fill="#1F2937" />
    <path d="M10 26 L13 17 L22 14 L28 19 L26 29 L17 32 Z" fill="#374151" />
    {/* highlights/cracks */}
    <path d="M14 18 L18 24" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    <path d="M20 15 L22 20 L18 26" stroke="#6B7280" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
    <path d="M22 22 L26 24" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    {/* second smaller chunk */}
    <path d="M28 10 L34 12 L36 20 L32 24 L26 22 L24 14 Z" fill="#111827" />
    <path d="M29 12 L33 13 L34 19 L31 22 L27 21 L26 15 Z" fill="#1F2937" />
    <path d="M30 14 L32 18" stroke="#6B7280" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    {/* glint */}
    <ellipse cx="22" cy="17" rx="2" ry="1" fill="#9CA3AF" opacity="0.3" transform="rotate(-30 22 17)" />
  </svg>
);

const ArganIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* argan fruit */}
    <ellipse cx="20" cy="20" rx="12" ry="15" fill="#D97706" />
    <ellipse cx="20" cy="20" rx="10" ry="13" fill="#F59E0B" />
    {/* texture stripes */}
    <path d="M14 10 C13 14 13 20 14 26 C15 30 17 34 20 35" stroke="#B45309" strokeWidth="1.2" fill="none" opacity="0.5" />
    <path d="M17 8 C16 12 16 20 17 26 C18 30 19 33 20 35" stroke="#B45309" strokeWidth="1.2" fill="none" opacity="0.4" />
    <path d="M26 10 C27 14 27 20 26 26 C25 30 23 34 20 35" stroke="#B45309" strokeWidth="1.2" fill="none" opacity="0.5" />
    {/* inner nut */}
    <ellipse cx="20" cy="22" rx="6" ry="8" fill="#78350F" opacity="0.7" />
    <ellipse cx="20" cy="22" rx="4" ry="6" fill="#92400E" opacity="0.5" />
    {/* tip */}
    <ellipse cx="20" cy="7" rx="3" ry="2" fill="#F59E0B" />
    <line x1="20" y1="7" x2="20" y2="5" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ChiaIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* chia seed pattern */}
    {[
      [10, 12], [16, 10], [22, 11], [28, 13], [8, 18], [14, 17], [20, 16],
      [26, 18], [32, 17], [10, 24], [16, 23], [22, 22], [28, 24], [34, 23],
      [12, 30], [18, 29], [24, 28], [30, 30],
    ].map(([x, y]) => (
      <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="2.2" ry="3" fill="#1C1917"
        transform={`rotate(${((x * 37 + y * 13) % 40) - 20} ${x} ${y})`} />
    ))}
    {/* light seeds */}
    {[
      [13, 14], [19, 13], [25, 15], [11, 21], [17, 20], [23, 19], [29, 21],
      [15, 26], [21, 25], [27, 27],
    ].map(([x, y]) => (
      <ellipse key={`l-${x}-${y}`} cx={x} cy={y} rx="1.8" ry="2.5" fill="#78716C"
        transform={`rotate(${((x * 29 + y * 17) % 36) - 18} ${x} ${y})`} />
    ))}
  </svg>
);

const SheaIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* shea nut */}
    <path d="M20 34 C14 34 9 28 9 21 C9 14 13 8 20 7 C27 8 31 14 31 21 C31 28 26 34 20 34Z" fill="#FEF3C7" />
    <path d="M20 32 C15 32 11 27 11 21 C11 15 14 10 20 9 C26 10 29 15 29 21 C29 27 25 32 20 32Z" fill="#FDE68A" />
    {/* texture */}
    <path d="M15 14 C13 17 13 22 15 26 C17 29 20 31 20 31" stroke="#D97706" strokeWidth="1" fill="none" opacity="0.4" />
    <path d="M18 10 C16 14 16 22 18 27 C19 30 20 32 20 32" stroke="#D97706" strokeWidth="0.8" fill="none" opacity="0.3" />
    <path d="M25 14 C27 17 27 22 25 26 C23 29 20 31 20 31" stroke="#D97706" strokeWidth="1" fill="none" opacity="0.4" />
    {/* stem + leaf */}
    <line x1="20" y1="7" x2="20" y2="4" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 5 C20 5 24 2 26 4 C24 6 20 5 20 5Z" fill="#22C55E" />
    {/* highlight */}
    <ellipse cx="15" cy="17" rx="3" ry="4" fill="white" opacity="0.35" transform="rotate(10 15 17)" />
  </svg>
);

const CocoaIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* cocoa pod */}
    <path d="M20 34 C13 34 7 27 7 20 C7 13 12 7 20 6 C28 7 33 13 33 20 C33 27 27 34 20 34Z" fill="#78350F" />
    <path d="M20 32 C14 32 9 26 9 20 C9 14 13 9 20 8 C27 9 31 14 31 20 C31 26 26 32 20 32Z" fill="#92400E" />
    {/* ridges */}
    {[0, 1, 2, 3, 4].map((i) => (
      <path
        key={i}
        d={`M${12 + i * 2} 10 C${11 + i * 2} 17 ${11 + i * 2} 23 ${12 + i * 2} 30`}
        stroke="#B45309"
        strokeWidth="1.2"
        fill="none"
        opacity="0.5"
      />
    ))}
    {/* stem */}
    <line x1="20" y1="6" x2="20" y2="3" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
    {/* leaf */}
    <path d="M20 4 C20 4 25 1 27 3 C25 5 20 4 20 4Z" fill="#22C55E" />
    {/* highlight */}
    <ellipse cx="14" cy="16" rx="2.5" ry="5" fill="#FEF3C7" opacity="0.15" transform="rotate(5 14 16)" />
  </svg>
);

const CastorIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* castor bean pod */}
    <ellipse cx="20" cy="20" rx="13" ry="10" fill="#92400E" />
    <ellipse cx="20" cy="20" rx="11" ry="8" fill="#B45309" />
    {/* spines on pod */}
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
      const r = (deg * Math.PI) / 180;
      const x1 = 20 + 11 * Math.sin(r);
      const y1 = 20 - 8 * Math.cos(r) * (11 / 13);
      const x2 = 20 + 14 * Math.sin(r);
      const y2 = 20 - 10.5 * Math.cos(r) * (11 / 13);
      return (
        <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" />
      );
    })}
    {/* bean markings */}
    <ellipse cx="17" cy="19" rx="2.5" ry="4" fill="#78350F" opacity="0.5" transform="rotate(-10 17 19)" />
    <ellipse cx="23" cy="19" rx="2.5" ry="4" fill="#78350F" opacity="0.5" transform="rotate(10 23 19)" />
    <ellipse cx="20" cy="18" rx="2" ry="3.5" fill="#D97706" opacity="0.3" />
    {/* stem */}
    <path d="M20 12 L20 8 C20 8 22 5 24 6" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

const JojobaIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* jojoba branch */}
    <path d="M6 32 C10 28 16 24 20 20 C24 16 30 10 34 8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* jojoba berries */}
    <ellipse cx="12" cy="28" rx="5" ry="7" fill="#D97706" />
    <ellipse cx="12" cy="28" rx="3.5" ry="5.5" fill="#F59E0B" />
    <ellipse cx="20" cy="20" rx="5" ry="7" fill="#B45309" />
    <ellipse cx="20" cy="20" rx="3.5" ry="5.5" fill="#D97706" />
    <ellipse cx="28" cy="12" rx="5" ry="7" fill="#92400E" />
    <ellipse cx="28" cy="12" rx="3.5" ry="5.5" fill="#B45309" />
    {/* leaves */}
    <ellipse cx="8" cy="32" rx="4" ry="2.5" fill="#22C55E" transform="rotate(45 8 32)" />
    <ellipse cx="24" cy="16" rx="4" ry="2.5" fill="#16A34A" transform="rotate(45 24 16)" />
    <ellipse cx="32" cy="8" rx="3.5" ry="2" fill="#22C55E" transform="rotate(45 32 8)" />
  </svg>
);

const AlmondIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* almond shell */}
    <path d="M20 5 C14 5 9 10 9 18 C9 26 13 34 20 35 C27 34 31 26 31 18 C31 10 26 5 20 5Z" fill="#D97706" />
    <path d="M20 7 C15 7 11 11 11 18 C11 25 14 32 20 33 C26 32 29 25 29 18 C29 11 25 7 20 7Z" fill="#F59E0B" />
    {/* inner texture */}
    <path d="M15 12 C13 16 13 22 15 27" stroke="#B45309" strokeWidth="1.2" fill="none" opacity="0.5" strokeLinecap="round" />
    <path d="M20 8 C19 12 19 22 20 30" stroke="#B45309" strokeWidth="1" fill="none" opacity="0.4" strokeLinecap="round" />
    <path d="M25 12 C27 16 27 22 25 27" stroke="#B45309" strokeWidth="1.2" fill="none" opacity="0.5" strokeLinecap="round" />
    {/* almond center */}
    <path d="M20 10 C17 10 15 14 15 18 C15 22 17 28 20 30 C23 28 25 22 25 18 C25 14 23 10 20 10Z" fill="#FDE68A" opacity="0.5" />
    {/* split line */}
    <path d="M20 7 C20 14 20 24 20 33" stroke="#92400E" strokeWidth="0.8" fill="none" opacity="0.3" />
    {/* highlight */}
    <ellipse cx="16" cy="14" rx="2" ry="4" fill="white" opacity="0.2" transform="rotate(10 16 14)" />
  </svg>
);

const SoapBarIcon = (): JSX.Element => (
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true">
    {/* soap bar */}
    <rect x="5" y="14" width="30" height="18" rx="6" fill="#E0F2FE" />
    <rect x="6" y="15" width="28" height="16" rx="5" fill="#BAE6FD" />
    {/* label area */}
    <rect x="9" y="18" width="22" height="9" rx="3" fill="white" opacity="0.7" />
    {/* embossed text */}
    <rect x="12" y="21" width="16" height="2" rx="1" fill="#7DD3FC" opacity="0.6" />
    <rect x="14" y="24" width="12" height="1.5" rx="0.75" fill="#7DD3FC" opacity="0.4" />
    {/* foam bubbles */}
    <circle cx="8" cy="12" r="3" fill="white" opacity="0.8" />
    <circle cx="15" cy="9" r="4" fill="white" opacity="0.7" />
    <circle cx="24" cy="10" r="3.5" fill="white" opacity="0.75" />
    <circle cx="32" cy="11" r="2.5" fill="white" opacity="0.7" />
    <circle cx="11" cy="8" r="2" fill="white" opacity="0.6" />
    <circle cx="28" cy="8" r="2.5" fill="white" opacity="0.65" />
    {/* shine */}
    <ellipse cx="12" cy="18" rx="3" ry="1.5" fill="white" opacity="0.4" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Keyword → icon priority map (most specific / distinctive first)
// ─────────────────────────────────────────────────────────────────────────────

type IconEntry = [string, () => JSX.Element];

const PRIORITY_KEYWORDS: IconEntry[] = [
  // Botanicals & florals
  ['lavender',        LavenderIcon],
  ['chamomile',       ChamomileIcon],
  ['calendula',       CalendulaIcon],
  ['aloe vera',       AloeIcon],
  ['aloe',            AloeIcon],
  ['green tea',       GreenTeaIcon],
  ['oatmeal',         OatmealIcon],
  ['oat',             OatmealIcon],
  ['eucalyptus',      EucalyptusIcon],
  ['peppermint',      PeppermintIcon],
  ['mint',            PeppermintIcon],

  // Fruits / citrus
  ['watermelon',      WatermelonIcon],
  ['passion fruit',   PassionFruitIcon],
  ['passionfruit',    PassionFruitIcon],
  ['strawberry',      StrawberryIcon],
  ['cherry',          CherryIcon],
  ['mango',           MangoIcon],
  ['peach',           PeachIcon],
  ['apple',           AppleIcon],
  ['coconut',         CoconutIcon],
  ['avocado',         AvocadoIcon],
  ['lemon',           LemonIcon],
  ['orange',          OrangeIcon],

  // Florals
  ['rose',            RoseIcon],

  // Spices / aromatics
  ['vanilla',         VanillaIcon],
  ['cinnamon',        CinnamonIcon],
  ['coffee',          CoffeeIcon],
  ['charcoal',        CharcoalIcon],
  ['chia',            ChiaIcon],

  // Oils / butters / bases
  ['argan',           ArganIcon],
  ['shea',            SheaIcon],
  ['cocoa butter',    CocoaIcon],
  ['cocoa',           CocoaIcon],
  ['castor',          CastorIcon],
  ['jojoba',          JojobaIcon],
  ['sweet almond',    AlmondIcon],
  ['almond',          AlmondIcon],
];

// ─────────────────────────────────────────────────────────────────────────────
// Exported lookup function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a JSX hero icon for the most visually distinctive ingredient
 * in the given recipe. Falls back to a soap bar SVG.
 */
export function getRecipeHeroIcon(recipe: Recipe, ingredients: Ingredient[]): JSX.Element {
  const recipeIngredients = ingredients.filter((i) => recipe.ingredientIds.includes(i.id));

  // Build a set of lowercased ingredient names for fast substring search
  const names = recipeIngredients.map((i) => i.name.toLowerCase());

  for (const [keyword, IconComponent] of PRIORITY_KEYWORDS) {
    if (names.some((n) => n.includes(keyword))) {
      return <IconComponent />;
    }
  }

  return <SoapBarIcon />;
}

// Export all icons for direct use if needed
export {
  LavenderIcon, RoseIcon, ChamomileIcon, CalendulaIcon, AloeIcon,
  GreenTeaIcon, OatmealIcon, LemonIcon, OrangeIcon, MangoIcon,
  PeachIcon, CherryIcon, AppleIcon, WatermelonIcon, PassionFruitIcon,
  StrawberryIcon, CoconutIcon, AvocadoIcon, CinnamonIcon, CoffeeIcon,
  VanillaIcon, PeppermintIcon, EucalyptusIcon, CharcoalIcon, ArganIcon,
  ChiaIcon, SheaIcon, CocoaIcon, CastorIcon, JojobaIcon, AlmondIcon,
  SoapBarIcon,
};
