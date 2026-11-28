import { useTheme } from '../../context/ThemeContext';

export default function ClinicalRadialGauge({
  title,
  instrument,
  score = 0,
  maxScore = 27,
  band = 'Minimal',
  zones = [
    { label: 'Minimal', range: '0-4', color: '#8fa986' },
    { label: 'Mild', range: '5-9', color: '#a3be8c' },
    { label: 'Moderate', range: '10-14', color: '#d4af37' },
    { label: 'Severe', range: '15+', color: '#e07a5f' },
  ],
  description = '',
}) {
  const { isDark } = useTheme();
  const clampedScore = Math.max(0, Math.min(score, maxScore));
  const fraction = maxScore > 0 ? clampedScore / maxScore : 0;

  // 180 degree gauge from 180 deg (left) to 0 deg (right)
  const angleDeg = 180 - fraction * 180;
  const angleRad = (angleDeg * Math.PI) / 180;

  // Center (80, 80), radius 58
  const cx = 80;
  const cy = 80;
  const radius = 58;

  // Tapered speedometer pointer polygon (avoids 0-height SVG line clipping)
  const needleLen = 48;
  const tipX = cx + needleLen * Math.cos(angleRad);
  const tipY = cy - needleLen * Math.sin(angleRad);
  const baseHalf = 3.2;
  const bx1 = cx + baseHalf * Math.sin(angleRad);
  const by1 = cy + baseHalf * Math.cos(angleRad);
  const bx2 = cx - baseHalf * Math.sin(angleRad);
  const by2 = cy - baseHalf * Math.cos(angleRad);
  const tailX = cx - 7 * Math.cos(angleRad);
  const tailY = cy + 7 * Math.sin(angleRad);
  const needleColor = isDark ? '#f4f4f7' : '#18181b';

  // Determine active zone
  const activeZone =
    zones.find((z) => {
      const parts = z.range.split('-');
      if (parts.length === 2) {
        const min = Number(parts[0]);
        const max = Number(parts[1]);
        return clampedScore >= min && clampedScore <= max;
      }
      if (z.range.includes('+')) {
        const min = Number(z.range.replace('+', ''));
        return clampedScore >= min;
      }
      return false;
    }) || zones[0];

  return (
    <div className="bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-md flex flex-col justify-between gap-space-sm hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant dark:text-tertiary-fixed-dim">
            {instrument}
          </span>
          <h3 className="font-title-md text-title-md text-on-surface dark:text-inverse-on-surface font-semibold">
            {title}
          </h3>
        </div>
        <span
          className="font-label-sm text-xs font-semibold px-space-sm py-0.5 rounded-full"
          style={{
            backgroundColor: `${activeZone.color}25`,
            color: activeZone.color,
          }}
        >
          {band}
        </span>
      </div>

      {/* SVG Semicircle Dial */}
      <div className="relative w-full flex flex-col items-center justify-center pt-2">
        <svg className="w-44 h-24 overflow-visible" viewBox="0 0 160 90">
          <defs>
            <linearGradient id={`gauge-grad-${instrument}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8fa986" />
              <stop offset="35%" stopColor="#a3be8c" />
              <stop offset="65%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#e07a5f" />
            </linearGradient>
          </defs>

          {/* Background track (semi-circle) */}
          <path
            d="M 22 80 A 58 58 0 0 1 138 80"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            className="text-surface-container-high dark:text-surface-container"
          />

          {/* Colored gradient arc track */}
          <path
            d="M 22 80 A 58 58 0 0 1 138 80"
            fill="none"
            stroke={`url(#gauge-grad-${instrument})`}
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Threshold markers */}
          <circle cx="22" cy="80" r="3" fill="#8fa986" />
          <circle cx="138" cy="80" r="3" fill="#e07a5f" />

          {/* Needle */}
          <polygon
            points={`${bx1},${by1} ${tipX},${tipY} ${bx2},${by2} ${tailX},${tailY}`}
            fill={needleColor}
            stroke={needleColor}
            strokeWidth="1"
            strokeLinejoin="round"
            className="transition-all duration-500"
          />
          <circle cx={cx} cy={cy} r="6.5" fill={needleColor} />
          <circle cx={cx} cy={cy} r="3" fill={activeZone.color} />
        </svg>

        {/* Score Readout below needle */}
        <div className="flex items-baseline gap-1 -mt-2">
          <span className="font-display-lg text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface">
            {score}
          </span>
          <span className="font-body-sm text-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
            / {maxScore}
          </span>
        </div>
      </div>

      {/* Clinical scale benchmarks */}
      <div className="pt-space-xs border-t border-outline-variant/50">
        <div className="grid grid-cols-4 gap-1 text-center">
          {zones.map((z) => (
            <div
              key={z.label}
              className={`py-1 px-0.5 rounded text-[10px] font-medium transition-colors ${
                z.label === band
                  ? 'bg-surface-container-highest dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-bold ring-1 ring-primary/40'
                  : 'text-on-surface-variant dark:text-tertiary-fixed-dim opacity-70'
              }`}
            >
              <div className="truncate">{z.label}</div>
              <div className="text-[9px] opacity-75">{z.range}</div>
            </div>
          ))}
        </div>
        {description && (
          <p className="font-body-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim mt-2 text-center">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
