import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const SEVERITY_COLORS = {
  LOW: '#8fa986',
  MODERATE: '#d4af37',
  HIGH: '#e07a5f',
  CRITICAL: '#e63946',
};

export default function MonthlyTrendsChart({ monthlyData = [] }) {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState('bars'); // 'bars' | 'lines'
  const [hoveredMonth, setHoveredMonth] = useState(null);

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-outline-variant rounded-xl text-on-surface-variant dark:text-tertiary-fixed-dim">
        <span className="material-symbols-outlined text-[32px] opacity-40 mb-2">bar_chart</span>
        <p className="font-body-md text-sm">No monthly trend data available yet.</p>
        <p className="font-body-sm text-xs opacity-75 mt-1">
          Historical screening records will appear as students and employees participate over time.
        </p>
      </div>
    );
  }

  // Calculate max volume for bar scale
  const maxVolume = Math.max(...monthlyData.map((m) => m.total), 4);

  // SVG dimensions for Line Chart
  const svgWidth = 560;
  const svgHeight = 200;
  const paddingX = 40;
  const paddingY = 25;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingY * 2;

  // Max score across instruments for line chart scale (PSS max is 40)
  const maxLineScore = 35;

  const getX = (idx) => {
    if (monthlyData.length <= 1) return paddingX + plotWidth / 2;
    return paddingX + (idx / (monthlyData.length - 1)) * plotWidth;
  };

  const getY = (score) => {
    const clamped = Math.max(0, Math.min(score, maxLineScore));
    return svgHeight - paddingY - (clamped / maxLineScore) * plotHeight;
  };

  // Generate SVG path for a metric key
  const makePath = (key) => {
    if (monthlyData.length === 0) return '';
    return monthlyData
      .map((item, idx) => {
        const x = getX(idx);
        const y = getY(item[key] || 0);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const phqPath = makePath('avgPhq');
  const gadPath = makePath('avgGad');
  const pssPath = makePath('avgPss');

  return (
    <div className="flex flex-col gap-space-md">
      {/* Chart Header & Toggle Controls */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-primary dark:bg-primary-fixed-dim animate-pulse" />
          <h3 className="font-title-md text-title-md text-on-surface dark:text-inverse-on-surface font-semibold">
            Longitudinal Screening Trajectory
          </h3>
          <span className="font-label-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim ml-1">
            ({monthlyData.length} {monthlyData.length === 1 ? 'month' : 'months'} tracked)
          </span>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex items-center bg-surface-container-high dark:bg-surface-container rounded-lg p-0.5 border border-outline-variant/60">
          <button
            type="button"
            onClick={() => setViewMode('bars')}
            className={`px-3 py-1 rounded-md font-label-sm text-xs transition-all cursor-pointer ${
              viewMode === 'bars'
                ? 'bg-primary-fixed dark:bg-primary-container border border-primary/40 dark:border-primary-fixed-dim/50 text-stone-900 dark:text-white font-bold shadow-sm'
                : 'border border-transparent text-on-surface-variant dark:text-tertiary-fixed-dim hover:text-on-surface dark:hover:text-inverse-on-surface font-medium'
            }`}
          >
            Severity Bars
          </button>
          <button
            type="button"
            onClick={() => setViewMode('lines')}
            className={`px-3 py-1 rounded-md font-label-sm text-xs transition-all cursor-pointer ${
              viewMode === 'lines'
                ? 'bg-primary-fixed dark:bg-primary-container border border-primary/40 dark:border-primary-fixed-dim/50 text-stone-900 dark:text-white font-bold shadow-sm'
                : 'border border-transparent text-on-surface-variant dark:text-tertiary-fixed-dim hover:text-on-surface dark:hover:text-inverse-on-surface font-medium'
            }`}
          >
            Score Trajectory
          </button>
        </div>
      </div>

      {/* Main Chart Graphic Canvas */}
      {viewMode === 'bars' ? (
        <div className="bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-md flex flex-col gap-space-md">
          {/* Bar Columns Container */}
          <div className="h-48 flex items-end justify-around gap-space-md pt-space-md border-b border-outline-variant/50 relative">
            {monthlyData.map((m, idx) => {
              const isHovered = hoveredMonth?.month === m.month;
              const barHeightPct = Math.max(12, Math.round((m.total / maxVolume) * 100));

              // Stacked heights
              const lowPct = m.total ? (m.low / m.total) * 100 : 0;
              const modPct = m.total ? (m.moderate / m.total) * 100 : 0;
              const highPct = m.total ? (m.high / m.total) * 100 : 0;
              const critPct = m.total ? (m.critical / m.total) * 100 : 0;

              return (
                <div
                  key={m.month}
                  className="flex-1 max-w-[80px] flex flex-col items-center h-full justify-end cursor-pointer group"
                  onMouseEnter={() => setHoveredMonth(m)}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  {/* Volume Label on top */}
                  <span
                    className={`font-label-sm text-xs font-bold mb-1 transition-transform ${
                      isHovered ? 'scale-125 text-primary dark:text-primary-fixed-dim' : 'text-on-surface-variant'
                    }`}
                  >
                    {m.total}
                  </span>

                  {/* Stacked Bar Pill */}
                  <div
                    className={`w-full rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-300 shadow-sm ${
                      isHovered ? 'ring-2 ring-primary/80 scale-[1.04]' : 'group-hover:opacity-90'
                    }`}
                    style={{ height: `${barHeightPct}%` }}
                  >
                    {m.low > 0 && (
                      <div
                        style={{ height: `${lowPct}%`, backgroundColor: SEVERITY_COLORS.LOW }}
                        title={`Low: ${m.low}`}
                      />
                    )}
                    {m.moderate > 0 && (
                      <div
                        style={{ height: `${modPct}%`, backgroundColor: SEVERITY_COLORS.MODERATE }}
                        title={`Moderate: ${m.moderate}`}
                      />
                    )}
                    {m.high > 0 && (
                      <div
                        style={{ height: `${highPct}%`, backgroundColor: SEVERITY_COLORS.HIGH }}
                        title={`High: ${m.high}`}
                      />
                    )}
                    {m.critical > 0 && (
                      <div
                        style={{ height: `${critPct}%`, backgroundColor: SEVERITY_COLORS.CRITICAL }}
                        title={`Critical: ${m.critical}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Month Labels underneath */}
          <div className="flex justify-around text-center">
            {monthlyData.map((m) => (
              <span
                key={m.month}
                className={`flex-1 max-w-[80px] font-label-sm text-xs ${
                  hoveredMonth?.month === m.month
                    ? 'font-bold text-on-surface dark:text-inverse-on-surface'
                    : 'text-on-surface-variant dark:text-tertiary-fixed-dim'
                }`}
              >
                {m.month}
              </span>
            ))}
          </div>

          {/* Interactive Tooltip Card */}
          <div className="bg-surface-container-high dark:bg-surface-container p-space-sm rounded-lg flex flex-wrap items-center justify-between gap-space-sm">
            {hoveredMonth ? (
              <>
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-inverse-on-surface">
                    {hoveredMonth.month}:
                  </span>
                  <span className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim">
                    {hoveredMonth.total} total screenings
                  </span>
                </div>
                <div className="flex items-center gap-space-md text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS.LOW }} />
                    Low: {hoveredMonth.low}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS.MODERATE }} />
                    Mod: {hoveredMonth.moderate}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS.HIGH }} />
                    High: {hoveredMonth.high}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS.CRITICAL }} />
                    Crit: {hoveredMonth.critical}
                  </span>
                </div>
              </>
            ) : (
              <span className="font-body-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim italic">
                Hover over any month column to inspect exact clinical severity distributions.
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Line Chart Mode */
        <div className="bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-md flex flex-col gap-space-sm">
          {/* Legend */}
          <div className="flex items-center justify-end gap-space-md text-xs font-medium pb-2 border-b border-outline-variant/40">
            <span className="flex items-center gap-1.5 text-on-surface dark:text-inverse-on-surface">
              <span className="w-3 h-0.5 rounded bg-[#8fa986]" />
              PHQ-9 Depression
            </span>
            <span className="flex items-center gap-1.5 text-on-surface dark:text-inverse-on-surface">
              <span className="w-3 h-0.5 rounded bg-[#d4af37]" />
              GAD-7 Anxiety
            </span>
            <span className="flex items-center gap-1.5 text-on-surface dark:text-inverse-on-surface">
              <span className="w-3 h-0.5 rounded bg-[#e07a5f]" />
              PSS-10 Stress
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <svg className="w-full h-48 min-w-[400px] overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
              {/* Horizontal Grid lines */}
              {[10, 20, 30].map((val) => {
                const y = getY(val);
                return (
                  <g key={val}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      className="text-outline-variant/40"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 4}
                      fill="currentColor"
                      fontSize="10"
                      textAnchor="end"
                      className="text-on-surface-variant dark:text-tertiary-fixed-dim"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Trajectory Paths */}
              <path d={phqPath} fill="none" stroke="#8fa986" strokeWidth="2.5" strokeLinecap="round" />
              <path d={gadPath} fill="none" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" />
              <path d={pssPath} fill="none" stroke="#e07a5f" strokeWidth="2.5" strokeLinecap="round" />

              {/* Data points */}
              {monthlyData.map((m, idx) => {
                const x = getX(idx);
                const yPhq = getY(m.avgPhq);
                const yGad = getY(m.avgGad);
                const yPss = getY(m.avgPss);

                return (
                  <g key={m.month}>
                    {/* Month X label */}
                    <text
                      x={x}
                      y={svgHeight - 6}
                      fill="currentColor"
                      fontSize="11"
                      textAnchor="middle"
                      className="text-on-surface-variant dark:text-tertiary-fixed-dim font-medium"
                    >
                      {m.month}
                    </text>

                    {/* Circles */}
                    <circle cx={x} cy={yPhq} r="4" fill="#8fa986" stroke={isDark ? '#121318' : '#ffffff'} strokeWidth="1.5" />
                    <circle cx={x} cy={yGad} r="4" fill="#d4af37" stroke={isDark ? '#121318' : '#ffffff'} strokeWidth="1.5" />
                    <circle cx={x} cy={yPss} r="4" fill="#e07a5f" stroke={isDark ? '#121318' : '#ffffff'} strokeWidth="1.5" />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
