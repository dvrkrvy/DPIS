import { useState } from 'react';

const SEVERITY_COLORS = {
  LOW: '#8fa986',
  MODERATE: '#d4af37',
  HIGH: '#e07a5f',
  CRITICAL: '#e63946',
};

export default function ComorbidityScatterPlot({ profiles = [] }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  // SVG dimensions
  const svgWidth = 480;
  const svgHeight = 260;
  const paddingLeft = 45;
  const paddingBottom = 35;
  const paddingTop = 20;
  const paddingRight = 20;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // PHQ-9 range: 0 to 27
  // GAD-7 range: 0 to 21
  const maxPhq = 27;
  const maxGad = 21;

  const getX = (phq) => {
    const clamped = Math.max(0, Math.min(phq || 0, maxPhq));
    return paddingLeft + (clamped / maxPhq) * plotWidth;
  };

  const getY = (gad) => {
    const clamped = Math.max(0, Math.min(gad || 0, maxGad));
    return svgHeight - paddingBottom - (clamped / maxGad) * plotHeight;
  };

  const xThreshold = getX(10); // Moderate depression threshold
  const yThreshold = getY(10); // Moderate anxiety threshold

  return (
    <div className="bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-md flex flex-col gap-space-sm relative">
      <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-xs border-b border-outline-variant/40">
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant dark:text-tertiary-fixed-dim">
            Co-Morbidity Clinical Matrix
          </span>
          <h3 className="font-title-md text-title-md text-on-surface dark:text-inverse-on-surface font-semibold">
            Depression (PHQ-9) vs Anxiety (GAD-7)
          </h3>
        </div>
        <div className="flex items-center gap-space-sm text-xs">
          <span className="flex items-center gap-1 font-medium text-on-surface dark:text-inverse-on-surface">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8fa986]" /> Low
          </span>
          <span className="flex items-center gap-1 font-medium text-on-surface dark:text-inverse-on-surface">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37]" /> Mod
          </span>
          <span className="flex items-center gap-1 font-medium text-on-surface dark:text-inverse-on-surface">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e07a5f]" /> High
          </span>
          <span className="flex items-center gap-1 font-medium text-on-surface dark:text-inverse-on-surface">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e63946]" /> Crit
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto relative">
        <svg
          className="w-full h-64 min-w-[380px] overflow-visible"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        >
          {/* Quadrant Background Shading for High-Risk Zone */}
          <rect
            x={xThreshold}
            y={paddingTop}
            width={svgWidth - paddingRight - xThreshold}
            height={yThreshold - paddingTop}
            fill="#e63946"
            opacity="0.06"
            className="rounded"
          />

          {/* Quadrant Watermark Label */}
          <text
            x={svgWidth - paddingRight - 8}
            y={paddingTop + 16}
            textAnchor="end"
            fontSize="10"
            fontWeight="bold"
            fill="#e63946"
            opacity="0.5"
            className="uppercase tracking-widest pointer-events-none"
          >
            Acute Comorbid Zone
          </text>

          {/* Reference Threshold Lines */}
          <line
            x1={xThreshold}
            y1={paddingTop}
            x2={xThreshold}
            y2={svgHeight - paddingBottom}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-outline-variant/60"
          />
          <line
            x1={paddingLeft}
            y1={yThreshold}
            x2={svgWidth - paddingRight}
            y2={yThreshold}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-outline-variant/60"
          />

          {/* Threshold Label tags */}
          <text
            x={xThreshold + 4}
            y={svgHeight - paddingBottom + 12}
            fontSize="9"
            fill="currentColor"
            className="text-on-surface-variant dark:text-tertiary-fixed-dim"
          >
            PHQ=10
          </text>
          <text
            x={paddingLeft - 6}
            y={yThreshold - 4}
            fontSize="9"
            textAnchor="end"
            fill="currentColor"
            className="text-on-surface-variant dark:text-tertiary-fixed-dim"
          >
            GAD=10
          </text>

          {/* Axes */}
          <line
            x1={paddingLeft}
            y1={svgHeight - paddingBottom}
            x2={svgWidth - paddingRight}
            y2={svgHeight - paddingBottom}
            stroke="currentColor"
            className="text-outline-variant"
          />
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={svgHeight - paddingBottom}
            stroke="currentColor"
            className="text-outline-variant"
          />

          {/* Axis Labels */}
          <text
            x={paddingLeft + plotWidth / 2}
            y={svgHeight - 6}
            fontSize="11"
            textAnchor="middle"
            fill="currentColor"
            className="font-medium text-on-surface dark:text-inverse-on-surface"
          >
            PHQ-9 Depression Score (0 — 27) ➔
          </text>
          <text
            x={-svgHeight / 2}
            y={14}
            transform="rotate(-90)"
            fontSize="11"
            textAnchor="middle"
            fill="currentColor"
            className="font-medium text-on-surface dark:text-inverse-on-surface"
          >
            GAD-7 Anxiety (0 — 21) ➔
          </text>

          {/* Scatter Data Points */}
          {profiles.map((p) => {
            const phq = p.scores?.phq9 || 0;
            const gad = p.scores?.gad7 || 0;
            const cx = getX(phq);
            const cy = getY(gad);
            const color = SEVERITY_COLORS[p.severityTier] || '#8fa986';
            const isHovered = hoveredNode?._id === p._id;

            return (
              <g
                key={p._id}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setHoveredNode(p)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle cx={cx} cy={cy} r="12" fill={color} opacity="0.35" className="animate-ping" />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : 5}
                  fill={color}
                  stroke="#121318"
                  strokeWidth="1.5"
                  className="transition-all duration-200"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div className="absolute top-2 right-2 bg-surface-container-highest dark:bg-surface-container border border-primary/40 rounded-lg p-2.5 shadow-xl text-xs z-20 pointer-events-none min-w-[170px]">
            <div className="flex items-center justify-between pb-1 border-b border-outline-variant/40">
              <span className="font-mono font-bold text-primary dark:text-primary-fixed-dim">
                {hoveredNode.anonymousId}
              </span>
              <span
                className="font-semibold text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${SEVERITY_COLORS[hoveredNode.severityTier]}25`,
                  color: SEVERITY_COLORS[hoveredNode.severityTier],
                }}
              >
                {hoveredNode.severityTier}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 pt-1.5 text-center font-medium">
              <div>
                <span className="text-[10px] text-on-surface-variant block">PHQ</span>
                <span className="font-bold text-on-surface dark:text-inverse-on-surface">{hoveredNode.scores?.phq9}</span>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block">GAD</span>
                <span className="font-bold text-on-surface dark:text-inverse-on-surface">{hoveredNode.scores?.gad7}</span>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block">PSS</span>
                <span className="font-bold text-on-surface dark:text-inverse-on-surface">{hoveredNode.scores?.pss10}</span>
              </div>
            </div>
            <div className="pt-1 text-[10px] text-on-surface-variant border-t border-outline-variant/30 mt-1">
              Care Status: <strong className="text-on-surface dark:text-inverse-on-surface">{hoveredNode.doctorStatus || 'UNREVIEWED'}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
