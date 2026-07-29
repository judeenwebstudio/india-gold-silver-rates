import { prisma } from '@/lib/prisma';

export type HistoryMetal = 'gold24k' | 'gold22k' | 'silver';
export type HistoryUnit = 'gram' | 'kilogram';

type StoredRateData = {
  purity?: string;
  source?: string;
  cityId?: string | null;
  recordedAt?: string;
  pricePerGram?: string | number;
  pricePerKilogram?: string | number | null;
};

export type PublicHistoryRecord = {
  date: string;
  rate: number;
  rateDate: string;
  sourcePublishedAt: string;
  city: string;
  sourceName: string;
  sourceReference: string;
  sourceSession: 'AM' | 'PM' | 'LATEST';
  isOfficial: boolean;
  rateType: 'ORIGINAL' | 'INDICATIVE';
  recordedAt: string;
};

const purityByMetal = { gold24k: 'K24', gold22k: 'K22', silver: 'P999' } as const;

export function sourceSession(timestamp: string): 'AM' | 'PM' {
  return new Date(timestamp).getUTCHours() >= 12 ? 'PM' : 'AM';
}

export function selectDailyHistory(records: PublicHistoryRecord[], days: number): PublicHistoryRecord[] {
  const bestByDate = new Map<string, PublicHistoryRecord>();
  for (const record of records) {
    const current = bestByDate.get(record.date);
    const priority = (value: PublicHistoryRecord) =>
      (value.isOfficial ? 100 : 0) + (value.sourceSession === 'PM' ? 20 : value.sourceSession === 'AM' ? 10 : 0);
    if (!current || priority(record) > priority(current) ||
      (priority(record) === priority(current) && record.sourcePublishedAt > current.sourcePublishedAt)) {
      bestByDate.set(record.date, record);
    }
  }
  return [...bestByDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
}

export function historySummary(records: PublicHistoryRecord[]) {
  if (records.length === 0) return null;
  const current = records.at(-1)!.rate;
  const previous = records.length > 1 ? records.at(-2)!.rate : null;
  const first = records[0].rate;
  const change = current - first;
  return {
    current,
    previous,
    change,
    changePercent: first === 0 ? 0 : (change / first) * 100,
    high: Math.max(...records.map((record) => record.rate)),
    low: Math.min(...records.map((record) => record.rate)),
  };
}

export async function getStoredRateHistory(options: {
  citySlug: string;
  days: number;
  metal: HistoryMetal;
  unit: HistoryUnit;
}) {
  const city = await prisma.city.findFirst({
    where: { slug: options.citySlug, isActive: true, deletedAt: null },
    select: {
      id: true, name: true,
      gold24KAdjustment: true, gold22KAdjustment: true, silver999Adjustment: true,
    },
  });
  if (!city) throw new Error('City not found.');
  const history = await prisma.rateHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { newData: true, source: true, createdAt: true },
  });
  const purity = purityByMetal[options.metal];
  const adjustment = options.metal === 'gold24k'
    ? Number(city.gold24KAdjustment)
    : options.metal === 'gold22k'
      ? Number(city.gold22KAdjustment)
      : Number(city.silver999Adjustment);
  const multiplier = options.metal === 'silver' && options.unit === 'kilogram' ? 1000 : 1;
  const candidates: PublicHistoryRecord[] = [];
  for (const entry of history) {
    if (!entry.newData || Array.isArray(entry.newData)) continue;
    const data = entry.newData as StoredRateData;
    if (data.purity !== purity || data.cityId != null || !data.recordedAt) continue;
    const base = options.metal === 'silver' && options.unit === 'kilogram'
      ? Number(data.pricePerKilogram ?? Number(data.pricePerGram) * 1000)
      : Number(data.pricePerGram);
    if (!Number.isFinite(base) || base <= 0) continue;
    const publishedAt = new Date(data.recordedAt).toISOString();
    const isOfficial = data.source === 'IBJA' && entry.source.startsWith('SCRAPER:IBJA:');
    candidates.push({
      date: publishedAt.slice(0, 10),
      rateDate: publishedAt.slice(0, 10),
      rate: Math.round((base + adjustment * multiplier) * 100) / 100,
      sourcePublishedAt: publishedAt,
      city: city.name,
      sourceName: data.source || 'Configured source',
      sourceReference: entry.source,
      sourceSession: sourceSession(publishedAt),
      isOfficial,
      rateType: 'INDICATIVE',
      recordedAt: entry.createdAt.toISOString(),
    });
  }
  const records = selectDailyHistory(candidates, options.days);
  return {
    city: city.name,
    metal: options.metal,
    unit: options.unit,
    currency: 'INR',
    rateType: 'INDICATIVE' as const,
    records,
    summary: historySummary(records),
    availableDays: records.length,
  };
}
