import { calculateCityDisplayRate } from '@/lib/city-rate-calculation';
import { getLatestNationalBaseRates } from '@/lib/city-rate-service';
import { prisma } from '@/lib/prisma';

export type CitySort = 'gold22k' | 'gold24k' | 'silver' | 'city';
export type CityRateTypeFilter = 'ALL' | 'ORIGINAL' | 'INDICATIVE';

export type CityComparisonRecord = {
  rank: number;
  city: string;
  citySlug: string;
  state: string;
  stateSlug: string;
  gold24kPerGram: number | null;
  gold22kPerGram: number | null;
  silverPerGram: number | null;
  silverPerKg: number | null;
  rateDate: string;
  sourceName: string;
  sourcePublishedAt: string;
  rateType: 'ORIGINAL' | 'INDICATIVE';
  verificationStatus: 'VERIFIED' | 'CALCULATED';
  sourceReference: string;
  adjustment: { gold24k: number; gold22k: number; silverPerGram: number };
  stale: boolean;
};

function numericValue(record: CityComparisonRecord, sort: CitySort) {
  if (sort === 'gold24k') return record.gold24kPerGram;
  if (sort === 'silver') return record.silverPerKg;
  return record.gold22kPerGram;
}

export function sortCityRecords(records: CityComparisonRecord[], sort: CitySort) {
  return [...records].sort((a, b) => {
    if (sort === 'city') return a.city.localeCompare(b.city) || a.state.localeCompare(b.state);
    const aValue = numericValue(a, sort);
    const bValue = numericValue(b, sort);
    if (aValue == null && bValue == null) return a.city.localeCompare(b.city);
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    return aValue - bValue || a.city.localeCompare(b.city);
  });
}

export async function getCityComparison(options: {
  sort: CitySort;
  page: number;
  pageSize: number;
  search?: string;
  state?: string;
  rateType: CityRateTypeFilter;
}) {
  const [snapshot, cities] = await Promise.all([
    getLatestNationalBaseRates(),
    prisma.city.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        state: { isActive: true, ...(options.state ? { slug: options.state } : {}) },
        ...(options.search ? { name: { contains: options.search, mode: 'insensitive' } } : {}),
      },
      include: { state: true },
    }),
  ]);
  const base = new Map(snapshot.rates.map((rate) => [rate.id, rate.price]));
  const publishedAt = snapshot.sourceTimestamp;
  const freshnessHours = Number(process.env.CITY_RATE_FRESHNESS_HOURS || 48);
  const stale = Date.now() - new Date(publishedAt).getTime() > freshnessHours * 60 * 60 * 1000;
  let records: CityComparisonRecord[] = cities.map((city) => ({
    rank: 0,
    city: city.name,
    citySlug: city.slug,
    state: city.state.name,
    stateSlug: city.state.slug,
    gold24kPerGram: calculateCityDisplayRate(base.get('gold-24k')!, Number(city.gold24KAdjustment)),
    gold22kPerGram: calculateCityDisplayRate(base.get('gold-22k')!, Number(city.gold22KAdjustment)),
    silverPerGram: calculateCityDisplayRate(base.get('silver-gram')!, Number(city.silver999Adjustment)),
    silverPerKg: calculateCityDisplayRate(base.get('silver-kg')!, Number(city.silver999Adjustment) * 1000),
    rateDate: publishedAt.slice(0, 10),
    sourceName: snapshot.source,
    sourcePublishedAt: publishedAt,
    rateType: 'INDICATIVE',
    verificationStatus: 'CALCULATED',
    sourceReference: `${snapshot.source} national base + configured city adjustment`,
    adjustment: {
      gold24k: Number(city.gold24KAdjustment),
      gold22k: Number(city.gold22KAdjustment),
      silverPerGram: Number(city.silver999Adjustment),
    },
    stale,
  }));
  if (options.rateType === 'ORIGINAL') records = [];
  records = sortCityRecords(records, options.sort).map((record, index) => ({ ...record, rank: index + 1 }));
  const selectedValues = records.map((record) => numericValue(record, options.sort)).filter((value): value is number => value != null);
  const identicalRates = options.sort !== 'city' && new Set(selectedValues).size <= 1 && selectedValues.length > 1;
  const totalRecords = records.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / options.pageSize));
  const start = (options.page - 1) * options.pageSize;
  const pageRecords = records.slice(start, start + options.pageSize);
  const stateOptions = await prisma.state.findMany({
    where: { isActive: true, cities: { some: { isActive: true, deletedAt: null } } },
    orderBy: { name: 'asc' },
    select: { name: true, slug: true },
  });
  return {
    records: pageRecords,
    pagination: {
      page: options.page,
      pageSize: options.pageSize,
      totalRecords,
      totalPages,
      hasMore: options.page < totalPages,
    },
    rateDate: publishedAt.slice(0, 10),
    sourcePublishedAt: publishedAt,
    sourceSummary: { originalCount: 0, indicativeCount: totalRecords },
    identicalRates,
    states: stateOptions,
  };
}
