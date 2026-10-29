interface Props {
  size?: number;
  className?: string;
  /** Accessible label; omit when the surrounding text already says "winner" */
  label?: string;
}

/**
 * Gold first-place medal on a striped ribbon, drawn as SVG so it scales and
 * sits cleanly on any card. Gradient ids are shared: every instance defines
 * identical gradients, so duplicate ids resolve to the same paint.
 */
export default function Medal({ size = 40, className, label }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size * 1.25}
      viewBox="0 0 64 80"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id="bia-medal-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbe08a" />
          <stop offset="0.45" stopColor="#e9b93a" />
          <stop offset="1" stopColor="#b9821a" />
        </linearGradient>
        <linearGradient id="bia-medal-inner" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7d36b" />
          <stop offset="1" stopColor="#d49a26" />
        </linearGradient>
      </defs>
      {/* Ribbon: navy/white strap behind, orange strap in front */}
      <path d="M14 0h14l10 30H24z" fill="#ffffff" />
      <path d="M16 0h3l11 30h-3zM23 0h3l11 30h-3z" fill="#4a5878" />
      <path d="M36 0h14L40 30H26z" fill="#ee8a2a" />
      <path d="M44 0h3L37 30h-3z" fill="#f7b267" />
      {/* Ring */}
      <circle cx="32" cy="31" r="4" fill="none" stroke="#c9922b" strokeWidth="2.5" />
      {/* Disc */}
      <circle cx="32" cy="54" r="22" fill="url(#bia-medal-gold)" />
      <circle cx="32" cy="54" r="17.5" fill="url(#bia-medal-inner)" stroke="#c48a1f" strokeWidth="1" />
      {/* Laurel hint */}
      <path
        d="M19.5 56c1.5 6 6 10 11 11M44.5 56c-1.5 6-6 10-11 11"
        fill="none"
        stroke="#a8741a"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2.2 2.4"
      />
      <text
        x="32"
        y="61.5"
        textAnchor="middle"
        fontFamily="var(--font-display), Georgia, serif"
        fontWeight="800"
        fontSize="20"
        fill="#9a6a12"
      >
        1
      </text>
      <circle cx="25" cy="45" r="3" fill="#fff6d6" opacity="0.55" />
    </svg>
  );
}
