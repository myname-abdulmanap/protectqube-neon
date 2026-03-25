"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import { FileSpreadsheet, FileText, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useScopes, useTenants } from "@/lib/use-energy-data";
import { energyDashboardApi, type CalibrationHistoryData } from "@/lib/api";
import { exportToExcel, exportToPdf } from "@/lib/report-export";
import { useHeaderPage } from "@/components/providers/HeaderPageProvider";
import { useAuth } from "@/lib/auth-context";

type FilterValue = "all" | string;

export default function EnergyCalibrationPage() {
  const { setTitle } = useHeaderPage();
  const { user } = useAuth();
  const isUserRole = user?.role?.name === "user";
  const [tenantFilter, setTenantFilter] = useState<FilterValue>("all");
  const [scopeFilter, setScopeFilter] = useState<FilterValue>("all");
  const [globalRange, setGlobalRange] = useState<DateRange>(buildRange("30d"));

  const [calibrationData, setCalibrationData] =
    useState<CalibrationHistoryData | null>(null);
  const [calibrationLoading, setCalibrationLoading] = useState(false);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<"pdf" | "excel" | null>(
    null,
  );

  const [calibrationTimestamp, setCalibrationTimestamp] = useState<string>("");
  const [calibrationPln, setCalibrationPln] = useState<string>("");
  const [calibrationPq, setCalibrationPq] = useState<string>("");
  const [calibrationNote, setCalibrationNote] = useState<string>("");
  const [editingCalibrationId, setEditingCalibrationId] = useState<
    string | null
  >(null);

  const [calibrationStartTimestamp, setCalibrationStartTimestamp] =
    useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    setCalibrationStartTimestamp("");
    setIsModalOpen(false);
  }, []);

  const deleteCalibrationEntry = useCallback(
    async (id: string) => {
      if (!confirm("Hapus data kalibrasi ini? Aksi tidak bisa dibatalkan.")) return;
      try {
        setCalibrationLoading(true);
        setCalibrationError(null);
        await energyDashboardApi.deleteCalibration(id);
        await loadCalibrationHistory();
      } catch (error) {
        setCalibrationError(extractApiError(error));
      } finally {
        setCalibrationLoading(false);
      }
    },
    [extractApiError, loadCalibrationHistory],
  );

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
        startTimestamp: calibrationStartTimestamp
          ? new Date(calibrationStartTimestamp).toISOString()
          : undefined,
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
    calibrationStartTimestamp,
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

  const selectedTenantName = useMemo(() => {
    if (!effectiveTenantId || !tenants?.length) return null;
    return tenants.find((tenant) => tenant.id === effectiveTenantId)?.name ?? null;
  }, [effectiveTenantId, tenants]);

  const formatExportDateTime = useCallback((iso: string | null | undefined) => {
    if (!iso) return "-";
    const value = new Date(iso);
    if (Number.isNaN(value.getTime())) return "-";
    return value.toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }, []);

  const formatCalibrationHistoryRange = useCallback(
    (startIso: string | null | undefined, endIso: string | null | undefined) => {
      const startLabel = formatExportDateTime(startIso);
      const endLabel = formatExportDateTime(endIso);
      if (startLabel === "-" && endLabel === "-") return "-";
      if (startLabel === "-") return endLabel;
      if (endLabel === "-") return startLabel;
      return `${startLabel} - ${endLabel}`;
    },
    [formatExportDateTime],
  );

  const formatDateOnly = useCallback((iso: string | null | undefined) => {
    if (!iso) return "-";
    const value = new Date(iso);
    if (Number.isNaN(value.getTime())) return "-";
    return value
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
      .replace(/\s/g, "-");
  }, []);

  const formatTimeOnly = useCallback((iso: string | null | undefined) => {
    if (!iso) return "00.00";
    const value = new Date(iso);
    if (Number.isNaN(value.getTime())) return "00.00";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(value.getHours())}.${pad(value.getMinutes())}`;
  }, []);

  const formatTableDateRange = useCallback(
    (startIso: string | null | undefined, endIso: string | null | undefined) => {
      const effectiveEnd = endIso ?? null;
      const effectiveStart = startIso ?? effectiveEnd;
      const startLabel = formatDateOnly(effectiveStart);
      const endLabel = formatDateOnly(effectiveEnd);

      if (startLabel === "-" && endLabel === "-") return "-";
      if (startLabel === "-" || startLabel === endLabel) return endLabel;
      if (endLabel === "-") return startLabel;
      return `${startLabel} - ${endLabel}`;
    },
    [formatDateOnly],
  );

  const formatTableTimeInterval = useCallback(
    (startIso: string | null | undefined, endIso: string | null | undefined) => {
      const effectiveEnd = endIso ?? null;
      const effectiveStart = startIso ?? effectiveEnd;
      return `${formatTimeOnly(effectiveStart)} - ${formatTimeOnly(effectiveEnd)}`;
    },
    [formatTimeOnly],
  );

  const isAnchorRow = useCallback(
    (row: CalibrationHistoryData["rows"][number]) => row.intervalLabel === "Anchor awal",
    [],
  );

  const handleExportExcel = useCallback(async () => {
    if (!calibrationData?.rows?.length) return;
    try {
      setExportLoading("excel");
      await exportToExcel(
        `calibration-history-${selectedScopeName ?? effectiveScopeId ?? "scope"}-${new Date().toISOString().slice(0, 10)}.xlsx`,
        [
          {
            name: "Ringkasan",
            rows: [
              {
                Outlet: selectedScopeName ?? effectiveScopeId ?? "-",
                Tenant: selectedTenantName ?? "-",
                Periode: activeRangeLabel,
                Rows: summary.totalRows,
                "Avg GAP KWH": summary.avgGapKwh,
                "Avg GAP %": Number(summary.avgGapPercent.toFixed(2)),
                "Avg Accuracy %": Number(summary.avgAccuracyPercent.toFixed(2)),
                "Tanggal Export": formatExportDateTime(new Date().toISOString()),
              },
            ],
          },
          {
            name: "Calibration History",
            rows: calibrationData.rows.map((row) => {
              const anchorRow = isAnchorRow(row);
              return {
                Date: row.date,
                "Calibration History": formatCalibrationHistoryRange(
                  row.periodStartAt,
                  row.readingAt,
                ),
                "Time Interval": row.intervalLabel,
                "Raw PLN": row.plnEnergyKwh,
                "Raw ProtectCube": row.protectCubeEnergyKwh,
                "Delta PLN": anchorRow ? "-" : row.deltaPln,
                "Delta PQ": anchorRow ? "-" : row.deltaPq,
                "GAP (kWh)": anchorRow ? "-" : row.gapKwh,
                "GAP (%)": anchorRow ? "-" : Number(row.gapPercent.toFixed(2)),
                Accuracy: anchorRow ? "-" : Number(row.accuracyPercent.toFixed(2)),
                Note: row.note ?? "-",
              };
            }),
          },
        ],
      );
    } finally {
      setExportLoading(null);
    }
  }, [
    activeRangeLabel,
    calibrationData?.rows,
    effectiveScopeId,
    formatCalibrationHistoryRange,
    formatExportDateTime,
    isAnchorRow,
    selectedScopeName,
    selectedTenantName,
    summary.avgAccuracyPercent,
    summary.avgGapKwh,
    summary.avgGapPercent,
    summary.totalRows,
  ]);

  const handleExportPdf = useCallback(async () => {
    if (!calibrationData?.rows?.length) return;
    try {
      setExportLoading("pdf");
      await exportToPdf({
        fileName: `calibration-history-${selectedScopeName ?? effectiveScopeId ?? "scope"}-${new Date().toISOString().slice(0, 10)}.pdf`,
        title: "Calibration History Report",
        scopeName: selectedScopeName ?? effectiveScopeId ?? undefined,
        tenantName: selectedTenantName ?? undefined,
        period: activeRangeLabel,
        generatedAt: formatExportDateTime(new Date().toISOString()),
        summary: [
          `Rows: ${summary.totalRows}`,
          `Avg GAP KWH: ${summary.avgGapKwh}`,
          `Avg GAP %: ${summary.avgGapPercent.toFixed(2)}%`,
          `Avg Accuracy: ${summary.avgAccuracyPercent.toFixed(2)}%`,
        ],
        tables: [
          {
            title: "Calibration History",
            columns: [
              "Date",
              "Calibration History",
              "Time Interval",
              "Raw PLN",
              "Raw PQ",
              "Delta PLN",
              "Delta PQ",
              "GAP",
              "GAP %",
              "Accuracy",
            ],
            rows: calibrationData.rows.map((row) => [
              row.date,
              formatCalibrationHistoryRange(
                row.periodStartAt,
                row.readingAt,
              ),
              row.intervalLabel,
              row.plnEnergyKwh,
              row.protectCubeEnergyKwh,
              isAnchorRow(row) ? "-" : row.deltaPln,
              isAnchorRow(row) ? "-" : row.deltaPq,
              isAnchorRow(row) ? "-" : row.gapKwh,
              isAnchorRow(row) ? "-" : `${row.gapPercent.toFixed(2)}%`,
              isAnchorRow(row) ? "-" : `${row.accuracyPercent.toFixed(2)}%`,
            ]),
          },
        ],
      });
    } finally {
      setExportLoading(null);
    }
  }, [
    activeRangeLabel,
    calibrationData?.rows,
    effectiveScopeId,
    formatCalibrationHistoryRange,
    formatExportDateTime,
    isAnchorRow,
    selectedScopeName,
    selectedTenantName,
    summary.avgAccuracyPercent,
    summary.avgGapKwh,
    summary.avgGapPercent,
    summary.totalRows,
  ]);

  return (
    <PageTransition>
      <div className="space-y-3 w-full max-w-[1700px] mx-auto px-3 overflow-x-hidden">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm">History Kalibrasi Energy</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
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
              <SelectTrigger className="h-8 w-[150px] text-xs">
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
          </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!effectiveScopeId ? (
              <p className="text-xs text-muted-foreground">
                Pilih outlet spesifik untuk input dan melihat history kalibrasi.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => void handleExportPdf()}
                    disabled={exportLoading !== null || !calibrationData?.rows?.length}
                    className="h-8 w-8"
                    title="Export PDF"
                    aria-label="Export PDF"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => void handleExportExcel()}
                    disabled={exportLoading !== null || !calibrationData?.rows?.length}
                    className="h-8 w-8"
                    title="Export Excel"
                    aria-label="Export Excel"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                  </Button>
                  {!isUserRole && (
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        resetCalibrationForm();
                        setIsModalOpen(true);
                      }}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Tambah
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded border p-2">
                    Rows: {summary.totalRows}
                  </div>
                  <div className="rounded border p-2">
                    Avg GAP KWH: {summary.avgGapKwh}
                  </div>
                  <div className="rounded border p-2">
                    Avg GAP %: {summary.avgGapPercent.toFixed(2)}%
                  </div>
                  <div className="rounded border p-2">
                    Avg Accuracy: {summary.avgAccuracyPercent.toFixed(2)}%
                  </div>
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
                        {!isUserRole && <th className="px-2 py-1 text-left">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(calibrationData?.rows ?? []).map((row) => {
                        const anchorRow = isAnchorRow(row);
                        const gapClass =
                          anchorRow
                            ? ""
                            : Math.abs(row.gapPercent) > 5
                            ? "text-red-600"
                            : "text-emerald-600";
                        const tableDateRange = formatTableDateRange(
                          row.periodStartAt,
                          row.readingAt,
                        );
                        const tableTimeInterval = formatTableTimeInterval(
                          row.periodStartAt,
                          row.readingAt,
                        );
                        return (
                          <tr key={row.id} className="border-b last:border-0">
                            <td className="px-2 py-1">{tableDateRange}</td>
                            <td className="px-2 py-1">{tableTimeInterval}</td>
                            <td className="px-2 py-1 text-right">
                              {row.plnEnergyKwh}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {row.protectCubeEnergyKwh}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {anchorRow ? "-" : row.deltaPln}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {anchorRow ? "-" : row.deltaPq}
                            </td>
                            <td className={`px-2 py-1 text-right ${gapClass}`}>
                              {anchorRow ? "-" : row.gapKwh}
                            </td>
                            <td className={`px-2 py-1 text-right ${gapClass}`}>
                              {anchorRow ? "-" : `${row.gapPercent.toFixed(2)}%`}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {anchorRow ? "-" : `${row.accuracyPercent.toFixed(2)}%`}
                            </td>
                            {!isUserRole && (
                              <td className="px-2 py-1">
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    title="Edit calibration"
                                    aria-label="Edit calibration"
                                    onClick={() => {
                                      setEditingCalibrationId(row.id);
                                      setCalibrationStartTimestamp(
                                        row.periodStartAt
                                          ? toLocalInputValue(row.periodStartAt)
                                          : "",
                                      );
                                      setCalibrationTimestamp(
                                        toLocalInputValue(row.readingAt),
                                      );
                                      setCalibrationPln(String(row.plnEnergyKwh));
                                      setCalibrationPq(
                                        String(row.protectCubeEnergyKwh),
                                      );
                                      setCalibrationNote(row.note ?? "");
                                      setIsModalOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-500 hover:text-red-600"
                                    disabled={calibrationLoading}
                                    title="Delete calibration"
                                    aria-label="Delete calibration"
                                    onClick={() => void deleteCalibrationEntry(row.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {!calibrationLoading &&
                        (calibrationData?.rows.length ?? 0) === 0 && (
                          <tr>
                            <td
                              colSpan={isUserRole ? 9 : 10}
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

                <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                  Anchor pertama tetap ditampilkan sebagai baseline. Nilai Delta,
                  GAP, dan Accuracy akan terhitung setelah ada anchor hari
                  berikutnya.
                </div>

                {/* Calibration form modal */}
                <Dialog
                  open={isModalOpen}
                  onOpenChange={(open) => {
                    setIsModalOpen(open);
                    if (!open) resetCalibrationForm();
                  }}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCalibrationId
                          ? "Edit Kalibrasi"
                          : "Tambah Kalibrasi"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Start Date
                        </label>
                        <Input
                          type="datetime-local"
                          value={calibrationStartTimestamp}
                          onChange={(e) =>
                            setCalibrationStartTimestamp(e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          End Date (Reading)
                        </label>
                        <Input
                          type="datetime-local"
                          value={calibrationTimestamp}
                          onChange={(e) =>
                            setCalibrationTimestamp(e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          PLN Energy (kWh)
                        </label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={calibrationPln}
                          onChange={(e) => setCalibrationPln(e.target.value)}
                          placeholder="0.0000"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Raw ProtectCube (opsional)
                        </label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={calibrationPq}
                          onChange={(e) => setCalibrationPq(e.target.value)}
                          placeholder="0.0000"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Catatan (opsional)
                        </label>
                        <Input
                          value={calibrationNote}
                          onChange={(e) => setCalibrationNote(e.target.value)}
                          placeholder="Catatan"
                          className="h-8 text-xs"
                        />
                      </div>
                      {calibrationError && (
                        <div className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                          {calibrationError}
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={resetCalibrationForm}
                      >
                        Batal
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => void submitCalibration()}
                        disabled={calibrationLoading}
                      >
                        {editingCalibrationId ? "Update" : "Tambah"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
