"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { useSession } from "next-auth/react";
import {
  energyDashboardApi,
  scopesApi,
  devicesApi,
  deviceMetricsApi,
  tenantsApi,
  type EnergyDashboardFilters,
  type EnergyOverviewData,
  type EnergyPeakHoursData,
  type EnergyOutletSummary,
  type EnergyOutletDetail,
  type Scope,
  type Device,
  type DeviceMetric,
  type Tenant,
} from "@/lib/api";

// ── SWR defaults: aggressive caching to protect backend ──
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60_000, // 1 minute default dedup
  errorRetryCount: 2,
};

// Cache profiles for different data types
const CACHE_PROFILES = {
  realtime: { dedupingInterval: 10_000 }, // 10s for live data
  standard: { dedupingInterval: 60_000 }, // 1min for normal data
  historical: { dedupingInterval: 300_000 }, // 5min for historical/aggregated
  static: { dedupingInterval: 600_000 }, // 10min for rarely changing data
} as const;

// ── Generic fetcher that unwraps ApiResponse<T> ──
type ApiFn<T> = () => Promise<{ success: boolean; data?: T; error?: string }>;

function useApi<T>(key: string | null, fetcher: ApiFn<T>, config?: SWRConfiguration) {
  const { status, data: session } = useSession();
  // Block all SWR fetches until the session is resolved AND the backendToken
  // is present. This covers two cases:
  //   1. status === "loading" — session not resolved yet
  //   2. status === "authenticated" but backendToken missing — shouldn't happen
  //      in normal flow but guards against edge cases
  // TokenSync writes the token synchronously during render when session
  // resolves, so by the time readyKey becomes non-null the in-memory token
  // is already set and axios will include it.
  const hasToken = status === "authenticated" && !!(session as { user?: { backendToken?: string } } | null)?.user?.backendToken;
  const readyKey = (status === "loading" || !hasToken) ? null : key;

  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    readyKey,
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
    ? `energy-overview:${filters.tenantId || "all"}:${filters.scopeId || "all"}:${filters.from || ""}:${filters.to || ""}`
    : null;

  return useApi<EnergyOverviewData>(
    key, 
    () => energyDashboardApi.getOverview(filters),
    CACHE_PROFILES.historical, // 5min cache for overview
  );
}

export function useEnergyPeakHours() {
  return useApi<EnergyPeakHoursData>(
    "energy-peak-hours",
    () => energyDashboardApi.getPeakHours(),
    CACHE_PROFILES.historical,
  );
}

export function useEnergyOutlets(filters?: EnergyDashboardFilters) {
  const key = filters
    ? `energy-outlets:${filters.from || ""}:${filters.to || ""}`
    : "energy-outlets";

  return useApi<EnergyOutletSummary[]>(
    key, 
    () => energyDashboardApi.getOutlets(filters),
    CACHE_PROFILES.historical, // 5min cache for outlets list
  );
}

export function useOutletDetail(
  scopeId: string | null,
  filters?: EnergyDashboardFilters,
) {
  const key = scopeId
    ? `outlet-detail:${scopeId}:${filters?.from || ""}:${filters?.to || ""}`
    : null;

  return useApi<EnergyOutletDetail>(
    key, 
    () => energyDashboardApi.getOutletDetail(scopeId!, filters),
    CACHE_PROFILES.historical, // 5min cache for historical detail
  );
}

// ── Reference data hooks (rarely changes, long cache) ──

export function useTenants() {
  return useApi<Tenant[]>(
    "tenants",
    () => tenantsApi.getAll(),
    CACHE_PROFILES.static, // 10min cache for tenants
  );
}

export function useScopes(tenantId?: string) {
  const key = tenantId ? `scopes:${tenantId}` : "scopes";

  return useApi<Scope[]>(
    key,
    () => scopesApi.getAll(tenantId),
    CACHE_PROFILES.static, // 10min cache for scopes
  );
}

export function useDevices(scopeId?: string) {
  const key = scopeId ? `devices:${scopeId}` : "devices";

  return useApi<Device[]>(
    key,
    () => devicesApi.getAll(scopeId),
    CACHE_PROFILES.static, // 10min cache for devices
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
    CACHE_PROFILES.standard, // 1min cache for metrics
  );
}

export function useAggregatedMetrics(
  params: { scopeId?: string; moduleType?: string; from: string; to: string; interval: 'hour' | 'day' } | null,
) {
  const key = params
    ? `metrics-agg:${JSON.stringify(params)}`
    : null;

  return useApi<{ timestamp: string; metricKey: string; avg: number; min: number; max: number }[]>(
    key,
    () => deviceMetricsApi.getAggregated(params!),
    CACHE_PROFILES.historical, // 5min cache for aggregated metrics
  );
}

export function usePaginatedMetrics(
  params: { scopeId: string; moduleType?: string; from?: string; to?: string; page: number; pageSize: number } | null,
) {
  const { status, data: session } = useSession();
  const hasToken = status === "authenticated" && !!(session as { user?: { backendToken?: string } } | null)?.user?.backendToken;
  const readyKey = (status === "loading" || !hasToken || !params) ? null : `metrics-paginated:${JSON.stringify(params)}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: DeviceMetric[]; total: number; page: number; pageSize: number; totalPages: number }>(
    readyKey,
    async () => {
      const res = await deviceMetricsApi.getPaginated(params!);
      if (!res.success) throw new Error('API error');
      return { data: res.data ?? [], total: res.total, page: res.page, pageSize: res.pageSize, totalPages: res.totalPages };
    },
    { ...defaultConfig, ...CACHE_PROFILES.standard },
  );

  return { data: data ?? null, error, isLoading, isValidating, mutate };
}
