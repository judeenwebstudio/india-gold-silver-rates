import "server-only";
import { prisma } from "@/lib/prisma";

type JsonMap = Record<string, unknown>;
export type CoverageTab = "supported" | "unsupported" | "failed";
export type SupportedRow = { state: string; rateStackCity: string; providerCity: string; providerSlug: string; mappingType: "Exact" | "Alias"; status: "Supported" | "Alias Supported" };
export type UnsupportedRow = { state: string; city: string; status: "Unsupported"; reason: string };
export type FailedRow = { state: string; city: string; providerSlug: string; reason: string };
export type CoverageReport = { id: string; status: string; createdAt: Date; totalActiveCities: number; supported: number; unsupported: number; failed: number; aliases: number; supportedRows: SupportedRow[]; unsupportedRows: UnsupportedRow[]; failedRows: FailedRow[]; usedCsvFallback: boolean };
export type CoverageFilters = { tab?: string; q?: string; state?: string; mapping?: string; status?: string; sort?: string; dir?: string; page?: string; size?: string };

const object = (value: unknown): JsonMap | null => value && typeof value === "object" && !Array.isArray(value) ? value as JsonMap : null;
const array = (value: unknown) => Array.isArray(value) ? value.map(object).filter(Boolean) as JsonMap[] : [];
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

function csvRows(csv: string) {
  const parse = (line: string) => { const cells: string[] = []; let value = "", quoted = false; for (let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&quoted&&line[i+1]==='"'){value+='"';i++;}else if(c==='"')quoted=!quoted;else if(c===','&&!quoted){cells.push(value);value="";}else value+=c;}cells.push(value);return cells; };
  return csv.split(/\r?\n/).slice(1).map(parse).filter(row => row.length >= 4);
}

export function normalizeCoverageLog(log: { id: string; status: string; createdAt: Date; rawData: unknown }): CoverageReport | null {
  const report = object(object(log.rawData)?.mappingReport);
  if (!report) return null;
  const aliases = array(report.aliasMappings), correct = array(report.correctMappings);
  const aliasKeys = new Set(aliases.map(row => `${text(row.rateStackState)}\0${text(row.rateStackCity)}`));
  const supportedMap = new Map<string, SupportedRow>();
  for (const row of [...correct, ...aliases]) {
    const state=text(row.rateStackState), city=text(row.rateStackCity), key=`${state}\0${city}`, alias=aliasKeys.has(key)||text(row.status)==="ALIAS";
    if (!city) continue;
    supportedMap.set(key,{state,rateStackCity:city,providerCity:text(row.parsedCity)||city,providerSlug:text(row.providerSlug),mappingType:alias?"Alias":"Exact",status:alias?"Alias Supported":"Supported"});
  }
  let missing = array(report.missingMappings);
  if (!missing.length) missing = array(report.unsupportedCities);
  let usedCsvFallback = false;
  if (!missing.length && text(report.csv)) {
    usedCsvFallback = true;
    missing = csvRows(text(report.csv)).filter(row=>row[3]==="MISSING").map(row=>({rateStackCity:row[0],providerSlug:row[1],parsedCity:row[2],status:row[3]}));
  }
  const unsupportedMap = new Map<string, UnsupportedRow>();
  for (const row of missing) { const state=text(row.rateStackState)||text(row.state), city=text(row.rateStackCity)||text(row.city); if(city) unsupportedMap.set(`${state}\0${city}`,{state,city,status:"Unsupported",reason:"Not available in the verified GoodReturns city catalogue"}); }
  const failedRows = array(report.failedCities).flatMap(row=>{const city=text(row.rateStackCity)||text(row.city);return city?[{state:text(row.rateStackState)||text(row.state),city,providerSlug:text(row.providerSlug),reason:text(row.reason)||"Provider synchronization failed"}]:[]});
  return {id:log.id,status:log.status,createdAt:log.createdAt,totalActiveCities:number(report.totalActiveCities),supported:number(report.successfullyMapped)||supportedMap.size,unsupported:number(report.unsupported)||unsupportedMap.size,failed:number(report.failed)||failedRows.length,aliases:aliases.length,supportedRows:[...supportedMap.values()],unsupportedRows:[...unsupportedMap.values()],failedRows,usedCsvFallback};
}

export async function latestCoverageReport() {
  const logs = await prisma.rateUpdateLog.findMany({ where: { source: "GOODRETURNS", status: { in: ["SUCCESS", "NO_CHANGE"] }, message: { startsWith: "GoodReturns city mapping completed" } }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, status: true, createdAt: true, rawData: true } });
  for (const log of logs) { const normalized=normalizeCoverageLog(log); if(normalized) return normalized; }
  return null;
}

export function filteredCoverage(report: CoverageReport, filters: CoverageFilters) {
  const tab: CoverageTab = filters.tab === "unsupported" || filters.tab === "failed" ? filters.tab : "supported";
  const q=(filters.q||"").trim().toLocaleLowerCase(), state=(filters.state||"").trim().toLocaleLowerCase(), mapping=filters.mapping;
  let rows: Array<SupportedRow|UnsupportedRow|FailedRow> = tab==="supported"?report.supportedRows:tab==="unsupported"?report.unsupportedRows:report.failedRows;
  rows=rows.filter(row=>{const values=Object.values(row).join(" ").toLocaleLowerCase();return (!q||values.includes(q))&&(!state||row.state.toLocaleLowerCase()===state)&&(!mapping||mapping==="all"||("mappingType" in row&&row.mappingType.toLocaleLowerCase()===mapping.toLocaleLowerCase()));});
  const sort=filters.sort||"state", dir=filters.dir==="desc"?-1:1;
  rows.sort((a,b)=>{const field=(row:typeof a)=>sort==="city"?("rateStackCity" in row?row.rateStackCity:row.city):sort==="slug"&&"providerSlug" in row?row.providerSlug:sort==="mapping"&&"mappingType" in row?row.mappingType:row.state;return field(a).localeCompare(field(b),"en",{sensitivity:"base"})*dir||("rateStackCity" in a?a.rateStackCity:a.city).localeCompare("rateStackCity" in b?b.rateStackCity:b.city,"en",{sensitivity:"base"});});
  const size=[25,50,100].includes(Number(filters.size))?Number(filters.size):50, page=Math.max(1,Number(filters.page)||1);
  return {tab,rows:rows.slice((page-1)*size,page*size),allRows:rows,total:rows.length,page,size,states:[...new Set((tab==="supported"?report.supportedRows:tab==="unsupported"?report.unsupportedRows:report.failedRows).map(row=>row.state).filter(Boolean))].sort()};
}
