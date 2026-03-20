"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import { PageTransition } from "@/components/ui/page-transition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DateFilter,
  buildRange,
  type DateRange,
} from "@/components/electricity/detail/DateFilter";
import { useScopes, useTenants } from "@/lib/use-energy-data";
import { energyDashboardApi, type CalibrationHistoryData } from "@/lib/api";
import { useHeaderPage } from "@/components/providers/HeaderPageProvider";

type FilterValue = "all" | string;

export default function EnergyCalibrationPage() {
  const { setTitle, setFilterSlot } = useHeaderPage();
  const [tenantFilter, setTenantFilter] = useState<FilterValue>("all");
  const [scopeFilter, setScopeFilter] = useState<FilterValue>("all");
  const [globalRange, setGlobalRange] = useState<DateRange>(buildRange("30d"));

  const [calibrationData, setCalibrationData] =
    useState<CalibrationHistoryData | null>(null);
  const [calibrationLoading, setCalibrationLoading] = useState(false);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  const [calibrationTimestamp, setCalibrationTimestamp] = useState<string>("");
  const [calibrationPln, setCalibrationPln] = useState<string>("");
  const [calibrationPq, setCalibrationPq] = useState<string>("");
  const [calibrationNote, setCalibrationNote] = useState<string>("");
  const [editingCalibrationId, setEditingCalibrationId] = useState<
    string | null
  >(null);

  const effectiveTenantId = tenantFilter === "all" ? undefined : tenantFilter;
  const effectiveScopeId = scopeFilter === "all" ? undefined : scopeFilter;

  const { data: tenants } = useTenants();
  const { data: scopes } = useScopes(effectiveTenantId);

  useEffect(() => {
    if (!scopes || scopes.length === 0) {
      if (scopeFilter !== "all") {
        setScopeFilter("all");
      }
      return;
    }

    if (scopeFilter === "all") {
      setScopeFilter(scopes[0]!.id);
      return;
    }

    if (!scopes.some((scope) => scope.id === scopeFilter)) {
      setScopeFilter(scopes[0]!.id);
    }
  }, [scopeFilter, scopes]);

  useEffect(() => {
    setTitle("History Kalibrasi Energy");
    return () => setTitle("");
  }, [setTitle]);

  useEffect(() => {
    setFilterSlot(
      <div className="flex items-center gap-1">
        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="h-6 w-[120px] text-[10px] bg-background border-border/50">
            <SelectValue placeholder="Tenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tenants</SelectItem>
            {(tenants ?? []).map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="h-6 w-[120px] text-[10px] bg-background border-border/50">
            <SelectValue placeholder="Outlet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outlets</SelectItem>
            {(scopes ?? []).map((scope) => (
              <SelectItem key={scope.id} value={scope.id}>
                {scope.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateFilter value={globalRange} onChange={setGlobalRange} />
      </div>,
    );
    return () => setFilterSlot(null);
  }, [globalRange, scopeFilter, scopes, setFilterSlot, tenantFilter, tenants]);

  const toLocalInputValue = useCallback((iso: string) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "";
    const pad = (v: number) => String(v).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
      dt.getDate(),
    )}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }, []);

  const loadCalibrationHistory = useCallback(async () => {
    if (!effectiveScopeId) {
      setCalibrationData(null);
      return;
    }

    try {
      setCalibrationLoading(true);
      setCalibrationError(null);
      const res = await energyDashboardApi.getCalibrationHistory(
        effectiveScopeId,
        {
          from: globalRange.from,
          to: globalRange.to,
        },
      );
      if (res.success && res.data) {
        setCalibrationData(res.data);
      } else {
        setCalibrationData(null);
        setCalibrationError(res.error ?? "Failed to load calibration history");
      }
    } catch {
      setCalibrationData(null);
      setCalibrationError("Failed to load calibration history");
    } finally {
      setCalibrationLoading(false);
    }
  }, [effectiveScopeId, globalRange.from, globalRange.to]);

  useEffect(() => {
    void loadCalibrationHistory();
  }, [loadCalibrationHistory]);

  useEffect(() => {
    if (!calibrationTimestamp) {
      const now = new Date();
      const pad = (v: number) => String(v).padStart(2, "0");
      setCalibrationTimestamp(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
          now.getDate(),
        )}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
      );
    }
  }, [calibrationTimestamp]);

  const extractApiError = useCallback((error: unknown): string => {
    const fallback = "Gagal menyimpan data kalibrasi";
    const maybeAxios = error as AxiosError<{
      error?: string;
      message?: string;
    }>;
    const apiError =
      maybeAxios?.response?.data?.error || maybeAxios?.response?.data?.message;
    if (apiError && typeof apiError === "string") return apiError;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  }, []);

  const resetCalibrationForm = useCallback(() => {
    setEditingCalibrationId(null);
    setCalibrationPln("");
    setCalibrationPq("");
    setCalibrationNote("");
  }, []);

  const submitCalibration = useCallback(async () => {
    if (!effectiveScopeId) return;
    const pln = Number(calibrationPln);
    const pq = calibrationPq.trim() === "" ? undefined : Number(calibrationPq);
    if (!calibrationTimestamp || !Number.isFinite(pln)) {
      setCalibrationError("Timestamp dan PLN Energy harus valid");
      return;
    }
    if (pq !== undefined && !Number.isFinite(pq)) {
      setCalibrationError("Raw ProtectCube harus angka valid");
      return;
    }

    try {
      setCalibrationLoading(true);
      setCalibrationError(null);
      const payload = {
        scopeId: effectiveScopeId,
        timestamp: new Date(calibrationTimestamp).toISOString(),
        kwhPln: pln,
        kwhPq: pq,
        note: calibrationNote || undefined,
      };

      if (editingCalibrationId) {
        await energyDashboardApi.updateCalibration(
          editingCalibrationId,
          payload,
        );
      } else {
        await energyDashboardApi.createCalibration(payload);
      }

      resetCalibrationForm();
      await loadCalibrationHistory();
    } catch (error) {
      setCalibrationError(extractApiError(error));
    } finally {
      setCalibrationLoading(false);
    }
  }, [
    calibrationNote,
    calibrationPq,
    calibrationPln,
    calibrationTimestamp,
    editingCalibrationId,
    effectiveScopeId,
    extractApiError,
    loadCalibrationHistory,
    resetCalibrationForm,
  ]);

  const summary = useMemo(
    () =>
      calibrationData?.summary ?? {
        avgGapKwh: 0,
        avgGapPercent: 0,
        avgAccuracyPercent: 0,
        totalRows: 0,
      },
    [calibrationData?.summary],
  );

  const activeRangeLabel = useMemo(() => {
    const from = globalRange.from
      ? new Date(globalRange.from).toLocaleDateString("id-ID")
      : "-";
    const to = globalRange.to
      ? new Date(globalRange.to).toLocaleDateString("id-ID")
      : "-";
    return `${from} - ${to}`;
  }, [globalRange.from, globalRange.to]);

  const selectedScopeName = useMemo(() => {
    if (!effectiveScopeId || !scopes?.length) return null;
    return scopes.find((scope) => scope.id === effectiveScopeId)?.name ?? null;
  }, [effectiveScopeId, scopes]);

  return (
    <PageTransition>
      <div className="space-y-3 w-full max-w-[1700px] mx-auto px-3 overflow-x-hidden">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">History Kalibrasi Energy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!effectiveScopeId ? (
              <p className="text-xs text-muted-foreground">
                Pilih outlet spesifik untuk input dan melihat history kalibrasi.
              </p>
            ) : (
              <>
                <div className="rounded border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Outlet aktif:{" "}
                  <span className="font-medium text-foreground">
                    {selectedScopeName ?? effectiveScopeId}
                  </span>
                </div>

                <div className="rounded border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-900 dark:text-blue-200">
                  Range aktif:{" "}
                  <span className="font-semibold">{activeRangeLabel}</span>.
                  Jika input tanggal lama, pastikan range mencakup tanggal
                  tersebut.
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                  <Input
                    type="datetime-local"
                    value={calibrationTimestamp}
                    onChange={(event) =>
                      setCalibrationTimestamp(event.target.value)
                    }
                    className="h-8 text-xs"
                  />
                  <Input
                    type="number"
                    step="0.0001"
                    value={calibrationPln}
                    onChange={(event) => setCalibrationPln(event.target.value)}
                    placeholder="PLN Energy (kWh)"
                    className="h-8 text-xs"
                  />
                  <Input
                    type="number"
                    step="0.0001"
                    value={calibrationPq}
                    onChange={(event) => setCalibrationPq(event.target.value)}
                    placeholder="Raw ProtectCube (opsional)"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={calibrationNote}
                    onChange={(event) => setCalibrationNote(event.target.value)}
                    placeholder="Catatan (opsional)"
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => void submitCalibration()}
                      disabled={calibrationLoading}
                      className="h-8 text-xs"
                    >
                      {editingCalibrationId ? "Update" : "Tambah"}
                    </Button>
                    {editingCalibrationId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={resetCalibrationForm}
                        className="h-8 text-xs"
                      >
                        Batal
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded border p-2">
                    Rows: {summary.totalRows}
                  </div>
                  <div className="rounded border p-2">
                    Avg GAP KWH: {summary.avgGapKwh}
                  </div>
                  <div className="rounded border p-2">
                    Avg GAP %: {summary.avgGapPercent}%
                  </div>
                  <div className="rounded border p-2">
                    Avg Accuracy: {summary.avgAccuracyPercent}%
                  </div>
                </div>

                <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                  Anchor pertama tetap ditampilkan sebagai baseline. Nilai Delta,
                  GAP, dan Accuracy akan terhitung setelah ada anchor hari
                  berikutnya.
                </div>

                {calibrationError && (
                  <div className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    {calibrationError}
                  </div>
                )}

                <div className="max-h-[520px] overflow-auto rounded border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="px-2 py-1 text-left">Date</th>
                        <th className="px-2 py-1 text-left">Time Interval</th>
                        <th className="px-2 py-1 text-right">Raw PLN</th>
                        <th className="px-2 py-1 text-right">Raw ProtectCube</th>
                        <th className="px-2 py-1 text-right">Delta PLN</th>
                        <th className="px-2 py-1 text-right">Delta PQ</th>
                        <th className="px-2 py-1 text-right">GAP (kWh)</th>
                        <th className="px-2 py-1 text-right">GAP (%)</th>
                        <th className="px-2 py-1 text-right">Accuracy</th>
                        <th className="px-2 py-1 text-left">FW</th>
                        <th className="px-2 py-1 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(calibrationData?.rows ?? []).map((row) => {
                        const gapClass =
                          Math.abs(row.gapPercent) > 5
                            ? "text-red-600"
                            : "text-emerald-600";
                        return (
                          <tr key={row.id} className="border-b last:border-0">
                            <td className="px-2 py-1">{row.date}</td>
                            <td className="px-2 py-1">{row.intervalLabel}</td>
                            <td className="px-2 py-1 text-right">
                              {row.plnEnergyKwh}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {row.protectCubeEnergyKwh}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {row.deltaPln}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {row.deltaPq}
                            </td>
                            <td className={`px-2 py-1 text-right ${gapClass}`}>
                              {row.gapKwh}
                            </td>
                            <td className={`px-2 py-1 text-right ${gapClass}`}>
                              {row.gapPercent}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {row.accuracyPercent}
                            </td>
                            <td className="px-2 py-1">
                              {row.firmwareVersion ?? "-"}
                            </td>
                            <td className="px-2 py-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  setEditingCalibrationId(row.id);
                                  setCalibrationTimestamp(
                                    toLocalInputValue(row.readingAt),
                                  );
                                  setCalibrationPln(String(row.plnEnergyKwh));
                                  setCalibrationPq(
                                    String(row.protectCubeEnergyKwh),
                                  );
                                  setCalibrationNote(row.note ?? "");
                                }}
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {!calibrationLoading &&
                        (calibrationData?.rows.length ?? 0) === 0 && (
                          <tr>
                            <td
                              colSpan={11}
                              className="px-2 py-3 text-center text-muted-foreground"
                            >
                              Belum ada data kalibrasi untuk outlet dan range
                              tanggal yang dipilih
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
