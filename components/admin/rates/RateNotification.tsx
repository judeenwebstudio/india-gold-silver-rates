const NOTICE_MESSAGES = {
  created: "Rate created successfully. A CREATE entry was added to Rate History.",
  updated: "Rate updated successfully. An UPDATE entry was added to Rate History.",
  deleted: "Rate soft deleted successfully. The record remains stored and the action was added to Rate History.",
} as const;

type RateNotificationProps = {
  notice?: string;
};

export function RateNotification({ notice }: RateNotificationProps) {
  if (!notice || !(notice in NOTICE_MESSAGES)) {
    return null;
  }

  const message = NOTICE_MESSAGES[notice as keyof typeof NOTICE_MESSAGES];

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900 shadow-sm" role="status">
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
      <p className="font-semibold leading-6">{message}</p>
    </div>
  );
}
