"use client";

import useSWR, { type SWRConfiguration } from "swr";
import {
  energyDashboardApi,
  scopesApi,
  devicesApi,
  deviceMetricsApi,
  type EnergyDashboardFilters,
  type EnergyOverviewData,
  type EnergyOutletSummary,
  type EnergyOutletDetail,
  type Scope,
  type Device,
  type DeviceMetric,
} from "@/lib/api";

// ── SWR defaults: stale-while-revalidate with 30s dedup ──
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  dedupingInterval: 30_000,
};

// ── Generic fetcher that unwraps ApiResponse<T> ──
type ApiFn<T> = () => Promise<{ success: boolean; data?: T; error?: string }>;

function useApi<T>(key: string | null, fetcher: ApiFn<T>, config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    key,
    async () => {
      const res = await fetcher();
      if (!res.success || !res.data) throw new Error(res.error || "API error");
      return res.data;
    },
    { ...defaultConfig, ...config },
  );

  return { data: data ?? null, error, isLoading, isValidating, mutate };
}

// ── Energy dashboard hooks ──

export function useEnergyOverview(filters?: EnergyDashboardFilters) {
  const key = filters
    ? `energy-overview:${filters.from || ""}:${filters.to || ""}`
    : null;

  return useApi<EnergyOverviewData>(key, () =>
    energyDashboardApi.getOverview(filters),
  );
}

export function useEnergyOutlets(filters?: EnergyDashboardFilters) {
  const key = filters
    ? `energy-outlets:${filters.from || ""}:${filters.to || ""}`
    : "energy-outlets";

  return useApi<EnergyOutletSummary[]>(key, () =>
    energyDashboardApi.getOutlets(filters),
  );
}

export function useOutletDetail(
  scopeId: string | null,
  filters?: EnergyDashboardFilters,
) {
  const key = scopeId
    ? `outlet-detail:${scopeId}:${filters?.from || ""}:${filters?.to || ""}`
    : null;

  return useApi<EnergyOutletDetail>(key, () =>
    energyDashboardApi.getOutletDetail(scopeId!, filters),
  );
}

// ── Reference data hooks (rarely changes, long cache) ──

export function useScopes(tenantId?: string) {
  const key = tenantId ? `scopes:${tenantId}` : "scopes";

  return useApi<Scope[]>(
    key,
    () => scopesApi.getAll(tenantId),
    { dedupingInterval: 120_000 },
  );
}

export function useDevices(scopeId?: string) {
  const key = scopeId ? `devices:${scopeId}` : "devices";

  return useApi<Device[]>(
    key,
    () => devicesApi.getAll(scopeId),
    { dedupingInterval: 120_000 },
  );
}

// ── Metrics hooks ──

export function useDeviceMetrics(
  filters: Record<string, string | number> | null,
) {
  const key = filters
    ? `metrics:${JSON.stringify(filters)}`
    : null;

  return useApi<DeviceMetric[]>(
    key,
    () => deviceMetricsApi.getAll(filters!),
    { dedupingInterval: 60_000 },
  );
}
