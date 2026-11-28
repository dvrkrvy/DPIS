export default function TriageFunnelChart({ funnel = {} }) {
  const {
    total = 0,
    unreviewed = 0,
    contacted = 0,
    inCare = 0,
    resolved = 0,
    flagged = 0,
    actionRate = 100,
  } = funnel;

  const stages = [
    {
      id: 'screened',
      label: 'Cohort Screened',
      count: total,
      pct: 100,
      icon: 'groups',
      color: 'bg-[#33452f] dark:bg-[#3f573a] text-white',
      barColor: 'bg-primary dark:bg-primary-fixed-dim',
    },
    {
      id: 'flagged',
      label: 'Flagged (Mod / High / Crit)',
      count: flagged,
      pct: total > 0 ? Math.round((flagged / total) * 100) : 0,
      icon: 'warning',
      color: 'bg-[#d4af37] text-stone-900',
      barColor: 'bg-[#d4af37]',
    },
    {
      id: 'contacted',
      label: 'Clinician Outreach',
      count: contacted,
      pct: flagged > 0 ? Math.round((contacted / flagged) * 100) : 0,
      icon: 'contact_phone',
      color: 'bg-[#8fa986] text-stone-900',
      barColor: 'bg-[#8fa986]',
    },
    {
      id: 'active',
      label: 'In Care / Resolved',
      count: inCare + resolved,
      pct: flagged > 0 ? Math.round(((inCare + resolved) / flagged) * 100) : 0,
      icon: 'health_and_safety',
      color: 'bg-[#33452f] dark:bg-[#3f573a] text-white',
      barColor: 'bg-primary dark:bg-primary-fixed-dim',
    },
  ];

  return (
    <div className="bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-md flex flex-col gap-space-md">
      <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-xs border-b border-outline-variant/50">
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant dark:text-tertiary-fixed-dim">
            Care Delivery Funnel
          </span>
          <h3 className="font-title-md text-title-md text-on-surface dark:text-inverse-on-surface font-semibold">
            Clinical Triage Velocity
          </h3>
        </div>
        <div className="flex items-center gap-space-xs bg-primary-fixed dark:bg-primary-fixed/30 text-on-primary-fixed-variant dark:text-primary-fixed-dim px-3 py-1 rounded-full font-label-sm text-xs font-semibold">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          <span>{actionRate}% Intervention Rate</span>
        </div>
      </div>

      {/* Funnel Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            className="p-space-sm bg-surface-container-high dark:bg-surface-container rounded-lg flex flex-col justify-between gap-space-xs border border-outline-variant/40"
          >
            <div className="flex items-center justify-between">
              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold ${stage.color}`}>
                <span className="material-symbols-outlined text-[14px]">{stage.icon}</span>
              </span>
              <span className="font-label-sm text-xs font-bold text-on-surface-variant dark:text-tertiary-fixed-dim">
                {stage.pct}%
              </span>
            </div>

            <div>
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface">
                {stage.count}
              </span>
              <p className="font-label-sm text-xs text-on-surface-variant dark:text-tertiary-fixed-dim truncate">
                {stage.label}
              </p>
            </div>

            {/* Micro progress bar */}
            <div className="w-full h-1.5 rounded-full bg-surface-container-lowest dark:bg-surface-container-low overflow-hidden mt-1">
              <div
                className={`h-full ${stage.barColor} transition-all duration-500`}
                style={{ width: `${Math.min(100, stage.pct)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-on-surface-variant dark:text-tertiary-fixed-dim pt-space-xs">
        <span>Pending clinician review: <strong className="text-on-surface dark:text-inverse-on-surface">{unreviewed}</strong> cases</span>
        <span>Active caseload: <strong className="text-on-surface dark:text-inverse-on-surface">{inCare}</strong> individuals</span>
        <span>Fully resolved: <strong className="text-on-surface dark:text-inverse-on-surface">{resolved}</strong> interventions</span>
      </div>
    </div>
  );
}
