import type { Metadata } from "next";

import {
  RateManagementPage,
  type RateSearchParams,
} from "@/components/admin/rates/RateManagementPage";

export const metadata: Metadata = {
  title: "Gold Rates",
  description: "Manage gold rate records with audited, non-destructive updates.",
};

export const dynamic = "force-dynamic";

export default async function GoldRatesPage({
  searchParams,
}: {
  searchParams: Promise<RateSearchParams>;
}) {
  return <RateManagementPage metalType="GOLD" searchParams={await searchParams} />;
}
