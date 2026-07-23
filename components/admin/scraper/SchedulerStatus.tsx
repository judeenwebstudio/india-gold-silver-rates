type SchedulerLog = {
  createdAt: Date;
  status: "SUCCESS" | "NO_CHANGE" | "FAILED" | "REJECTED";
} | null;

type SchedulerStatusProps = {
  enabled: boolean;
  scheduleLabelUtc: string;
  scheduleLabelIst: string;
  configuredTimezone: string;
  lastAttempt: SchedulerLog;
  lastSuccessfulSync: SchedulerLog;
  lastFailedSync: SchedulerLog;
  lastResult: "SUCCESS" | "NO_CHANGE" | "FAILED" | "REJECTED" | null;
  sourceName: string;
  changedRates: number;
  consecutiveFailures: number;
};

function formatDateTime(log: SchedulerLog) {
  if (!log) return "No runs yet";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(log.createdAt);
}

const resultClasses = {
  SUCCESS: "text-emerald-700",
  NO_CHANGE: "text-blue-700",
  FAILED: "text-red-700",
  REJECTED: "text-amber-800",
} as const;

export function SchedulerStatus(props: SchedulerStatusProps) {
  const cards = [
    { label: "Last automatic attempt", value: formatDateTime(props.lastAttempt) },
    { label: "Last successful sync", value: formatDateTime(props.lastSuccessfulSync) },
    { label: "Last failed sync", value: formatDateTime(props.lastFailedSync) },
    {
      label: "Last result",
      value: props.lastResult ?? "No runs yet",
      className: props.lastResult ? resultClasses[props.lastResult] : undefined,
    },
    { label: "Source", value: props.sourceName },
    { label: "Changed rates", value: String(props.changedRates) },
    {
      label: "Consecutive failures",
      value: String(props.consecutiveFailures),
      className:
        props.consecutiveFailures > 0 ? "text-red-700" : "text-emerald-700",
    },
  ];

  return (
    <section
      className="mt-7 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="scheduler-status-title"
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                props.enabled ? "bg-emerald-500" : "bg-stone-400"
              }`}
            />
            <p className="text-xs font-black uppercase tracking-[0.15em] text-stone-500">
              {props.enabled ? "Scheduler enabled" : "Scheduler not configured"}
            </p>
          </div>
          <h2
            id="scheduler-status-title"
            className="mt-2 font-display text-2xl font-bold text-stone-950"
          >
            Automatic daily synchronization
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            Vercel Cron invokes the same validated, transaction-safe sync used by
            the manual action.
          </p>
        </div>
        <div className="rounded-xl bg-stone-50 px-4 py-3 text-xs leading-5 text-stone-600">
          <span className="block font-black text-stone-900">
            {props.scheduleLabelUtc}
          </span>
          <span className="block">{props.scheduleLabelIst}</span>
          <span className="block text-stone-400">
            Display timezone: {props.configuredTimezone}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-3"
          >
            <p className="text-[0.65rem] font-black uppercase tracking-[0.11em] text-stone-500">
              {card.label}
            </p>
            <p
              className={`mt-2 text-sm font-bold text-stone-900 ${
                card.className ?? ""
              }`}
            >
              {card.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
