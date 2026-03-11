"use client";

import { use } from "react";
import { EnergyOverviewPage } from "../page";

export default function TenantEnergyOverviewPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <EnergyOverviewPage forcedTenantId={tenantId} />;
}
