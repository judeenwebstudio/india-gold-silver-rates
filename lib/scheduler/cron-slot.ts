export const CRON_SLOTS = [
  "MORNING_10_AM",
  "AFTERNOON_2_PM",
  "EVENING_6_PM",
] as const;

export type CronSlot = (typeof CRON_SLOTS)[number];

export function parseCronSlot(value: string | null): CronSlot | null {
  return CRON_SLOTS.includes(value as CronSlot) ? (value as CronSlot) : null;
}

export function cronSlotLabel(slot: CronSlot | undefined) {
  switch (slot) {
    case "MORNING_10_AM":
      return "10:00 AM IST";
    case "AFTERNOON_2_PM":
      return "2:00 PM IST";
    case "EVENING_6_PM":
      return "6:00 PM IST";
    default:
      return "Unspecified slot";
  }
}
