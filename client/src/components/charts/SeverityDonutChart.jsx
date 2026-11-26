import { useState } from 'react';

const TIERS = [
  { key: 'LOW', label: 'Low Risk', color: '#8fa986', lightColor: '#53634b', desc: 'Minimal/mild non-clinical symptoms' },
  { key: 'MODERATE', label: 'Moderate', color: '#d4af37', lightColor: '#96781c', desc: 'Mild-moderate, guidance advised' },
  { key: 'HIGH', label: 'High Risk', color: '#e07a5f', lightColor: '#c05621', desc: 'Clinical thresholds crossed, outreach needed' },
  { key: 'CRITICAL', label: 'Critical', color: '#e63946', lightColor: '#ba1a1a', desc: 'Urgent crisis intervention required' },
];

export default function SeverityDonutChart({ severityCounts = {}, totalAssessments = 0 }) {
  const [hoveredTier, setHoveredTier] = useState(null);

  const total = totalAssessments || 1;
  const radius = 64;
  const circumference = 2 * Math.PI * radius; // ~402.12

  let cumulativeOffset = 0;
  const slices = TIERS.map((tier) => {
    const count = severityCounts[tier.key] || 0;
    const fraction = totalAssessments > 0 ? count / total : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeOffset;
    cumulativeOffset += fraction * circumference;
    const pct = totalAssessments > 0 ? Math.round((count / total) * 100) : 0;
    return {
      ...tier,
      count,
      fraction,
      pct,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const dominantTier = slices.reduce(
    (max, item) => (item.count > max.count ? item : max),
    slices[0]
  );

  return (
    <div className="flex flex-col md:flex-row items-center gap-space-lg">
      {/* SVG Donut */}
      <div className="relative shrink-0 flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
          {/* Base track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="20"
            className="text-surface-container-high dark:text-surface-container"
          />

          {totalAssessments === 0 ? (
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="20"
              strokeDasharray={`${circumference} ${circumference}`}
              className="text-outline-variant opacity-30"
            />
          ) : (
            slices.map((slice) => {
              if (slice.count === 0) return null;
              const isHovered = hoveredTier === slice.key;
              return (
                <circle
                  key={slice.key}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={isHovered ? 24 : 20}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 6px ${slice.color})` : undefined,
                  }}
                  onMouseEnter={() => setHoveredTier(slice.key)}
                  onMouseLeave={() => setHoveredTier(null)}
                />
              );
            })
          )}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          {hoveredTier ? (
            (() => {
              const active = slices.find((s) => s.key === hoveredTier);
              return (
                <>
                  <span
                    className="font-headline-lg text-headline-lg font-bold"
                    style={{ color: active?.color }}
                  >
                    {active?.pct}%
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface dark:text-inverse-on-surface">
                    {active?.count} {active?.label}
                  </span>
                </>
              );
            })()
          ) : (
            <>
              <span className="font-display-lg text-display-lg text-on-surface dark:text-inverse-on-surface font-semibold leading-tight">
                {totalAssessments.toLocaleString()}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-tertiary-fixed-dim">
                Total Screened
              </span>
              {totalAssessments > 0 && (
                <span
                  className="font-label-sm text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 font-semibold"
                  style={{
                    backgroundColor: `${dominantTier.color}25`,
                    color: dominantTier.color,
                  }}
                >
                  Peak: {dominantTier.label}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Legend & Risk Funnel Breakdown */}
      <div className="flex-1 w-full flex flex-col justify-between gap-space-sm">
        <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant dark:text-tertiary-fixed-dim">
            Severity Spectrum
          </span>
          <span className="font-label-sm text-label-sm text-primary dark:text-primary-fixed-dim">
            {totalAssessments > 0
              ? `${Math.round(((severityCounts.HIGH || 0) + (severityCounts.CRITICAL || 0)) / total * 100)}% Flagged Elevated`
              : 'No screening data'}
          </span>
        </div>

        {/* Proportional Segment Bar */}
        <div className="w-full h-3 rounded-full bg-surface-container-high dark:bg-surface-container overflow-hidden flex gap-0.5">
          {slices.map((s) => {
            if (s.count === 0) return null;
            return (
              <div
                key={s.key}
                className="h-full transition-all duration-300"
                style={{
                  width: `${s.pct}%`,
                  backgroundColor: s.color,
                }}
                title={`${s.label}: ${s.count} (${s.pct}%)`}
              />
            );
          })}
        </div>

        {/* Interactive Level Cards */}
        <div className="grid grid-cols-2 gap-space-xs pt-space-xs">
          {slices.map((slice) => {
            const isHovered = hoveredTier === slice.key;
            return (
              <div
                key={slice.key}
                onMouseEnter={() => setHoveredTier(slice.key)}
                onMouseLeave={() => setHoveredTier(null)}
                className={`p-space-sm rounded-lg transition-all duration-200 cursor-pointer border ${
                  isHovered
                    ? 'border-primary dark:border-primary-fixed-dim bg-surface-container-high dark:bg-surface-container scale-[1.02]'
                    : 'border-outline-variant/50 bg-surface-container-low dark:bg-surface-container-lowest hover:bg-surface-container-high dark:hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="font-label-sm text-label-sm text-on-surface dark:text-inverse-on-surface font-medium">
                      {slice.key}
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm font-semibold" style={{ color: slice.color }}>
                    {slice.pct}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface">
                    {slice.count}
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant dark:text-tertiary-fixed-dim">
                    {slice.count === 1 ? 'case' : 'cases'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
