import React, { useId } from 'react';

export type FloralSealVariant = 'mark' | 'emblem';

export interface FloralSealProps {
  variant?: FloralSealVariant;
  size?: number;
  petalColor?: string;
  centerColor?: string;
  label?: string;
  className?: string;
}

const MARK_PETALS: ReadonlyArray<[number, number]> = [
  [100, 38],
  [144, 56],
  [162, 100],
  [144, 144],
  [100, 162],
  [56, 144],
  [38, 100],
  [56, 56],
];

const EMBLEM_PETALS: ReadonlyArray<[number, number]> = [
  [100, 42],
  [141, 59],
  [158, 100],
  [141, 141],
  [100, 158],
  [59, 141],
  [42, 100],
  [59, 59],
];

const DEFAULT_COLORS: Record<FloralSealVariant, { petal: string; center: string }> = {
  mark: { petal: '#F2D661', center: '#5E5827' },
  emblem: { petal: '#F7F0E2', center: '#5E5827' },
};

const FloralSeal: React.FC<FloralSealProps> = ({
  variant = 'mark',
  size = 34,
  petalColor,
  centerColor,
  label,
  className,
}) => {
  const idBase = useId().replace(/:/g, '');
  const petal = petalColor ?? DEFAULT_COLORS[variant].petal;
  const center = centerColor ?? DEFAULT_COLORS[variant].center;

  const a11yProps = label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': true as const, focusable: 'false' as const };

  if (variant === 'emblem') {
    const arcTopId = `${idBase}-arc-top`;
    const arcBottomId = `${idBase}-arc-bottom`;
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" className={className} {...a11yProps}>
        <g fill={petal}>
          <circle cx="100" cy="100" r="62" />
          {EMBLEM_PETALS.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="40" />
          ))}
        </g>
        <defs>
          <path id={arcTopId} d="M 42 100 A 58 58 0 0 1 158 100" />
          <path id={arcBottomId} d="M 36 100 A 64 64 0 0 0 164 100" />
        </defs>
        <text fontFamily="IBM Plex Mono, monospace" fontSize="17" fontWeight="600" fill={center} letterSpacing="7">
          <textPath href={`#${arcTopId}`} startOffset="50%" textAnchor="middle">
            LIBROS
          </textPath>
        </text>
        <text fontFamily="IBM Plex Mono, monospace" fontSize="17" fontWeight="600" fill={center} letterSpacing="9">
          <textPath href={`#${arcBottomId}`} startOffset="50%" textAnchor="middle">
            CLUB
          </textPath>
        </text>
        <polyline points="76,106 100,93 124,106" fill="none" stroke={center} strokeWidth="3" />
        <circle cx="38" cy="104" r="2.5" fill={center} />
        <circle cx="162" cy="104" r="2.5" fill={center} />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} {...a11yProps}>
      <g fill="none" stroke={petal} strokeWidth="22">
        <circle cx="100" cy="100" r="46" />
      </g>
      <g fill={petal}>
        {MARK_PETALS.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="26" />
        ))}
      </g>
      <circle cx="100" cy="100" r="34" fill={center} />
    </svg>
  );
};

export default FloralSeal;
