import { useId } from 'react';

/**
 * Vexo logo mark: a speech bubble whose tail sharpens into a "V".
 * `size` controls the rendered box; `radius` scales with it.
 */
export function LogoMark({ size = 44, className = '', glow = true }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className={`logo-svg ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Vexo"
      style={glow ? { filter: 'drop-shadow(0 10px 22px hsl(226 92% 63% / 0.35))' } : undefined}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b8cff" />
          <stop offset="0.55" stopColor="#5d6bff" />
          <stop offset="1" stopColor="#8a5cff" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="19" fill={`url(#${id}-bg)`} />
      <rect x="1" y="1" width="62" height="31" rx="18" fill={`url(#${id}-shine)`} />
      {/* bubble body + V-shaped tail */}
      <path
        d="M20 15h24c5.5 0 10 4.5 10 10v4c0 5.5-4.5 10-10 10h-3.2L32 51.5 23.2 39H20c-5.5 0-10-4.5-10-10v-4c0-5.5 4.5-10 10-10Z"
        fill="#fff"
        fillOpacity="0.16"
      />
      <path
        d="M17.5 21 32 43.5 46.5 21"
        fill="none"
        stroke="#fff"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="47" cy="45" r="4.2" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ className = '' }) {
  return (
    <span className={`wordmark ${className}`} dir="ltr">
      vexo
    </span>
  );
}

export default function Logo({ size = 40, withText = true, className = '' }) {
  return (
    <span className={`logo ${className}`}>
      <LogoMark size={size} />
      {withText && <Wordmark />}
    </span>
  );
}
