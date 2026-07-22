import type { Metadata } from "next";

import {
  RateManagementPage,
  type RateSearchParams,
} from "@/components/admin/rates/RateManagementPage";

export const metadata: Metadata = {
  title: "Silver Rates",
  description: "Manage silver rate records with audited, non-destructive updates.",
};

export const dynamic = "force-dynamic";

export default async function SilverRatesPage({
  searchParams,
}: {
  searchParams: Promise<RateSearchParams>;
}) {
  return <RateManagementPage metalType="SILVER" searchParams={await searchParams} />;
}
