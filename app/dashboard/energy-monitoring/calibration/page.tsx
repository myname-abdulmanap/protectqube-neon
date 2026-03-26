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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useScopes, useTenants } from "@/lib/use-energy-data";
import { energyDashboardApi, type CalibrationHistoryData } from "@/lib/api";
import { exportToExcelStyled, exportToPdf } from "@/lib/report-export";
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
  const [calibrationCtRatio, setCalibrationCtRatio] = useState<string>("");
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
  const { data: allScopes } = useScopes(undefined);

  // Get user's accessible scope IDs
  const accessibleScopeIds = useMemo(() => {
    if (!user?.scopeIds || user.scopeIds.length === 0) return [];
    return user.scopeIds;
  }, [user?.scopeIds]);

  // Filter tenants to only show those with accessible scopes
  const filteredTenants = useMemo(() => {
    if (!tenants || !allScopes || !accessibleScopeIds.length)
      return tenants ?? [];

    // Find which tenants the user's accessible scopes belong to
    const accessibleTenantIds = new Set<string>();
    for (const scope of allScopes) {
      if (accessibleScopeIds.includes(scope.id)) {
        accessibleTenantIds.add(scope.tenantId);
      }
    }

    return tenants.filter((tenant) => accessibleTenantIds.has(tenant.id));
  }, [tenants, allScopes, accessibleScopeIds]);

  // Filter scopes by both tenant AND user's accessible scopes
  const filteredScopes = useMemo(() => {
    if (!scopes) return scopes;
    return scopes.filter((scope) => accessibleScopeIds.includes(scope.id));
  }, [scopes, accessibleScopeIds]);

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
  }, [scopeFilter, scopes, filteredScopes]);

  // Reset tenant filter if it becomes inaccessible
  useEffect(() => {
    if (tenantFilter === "all") return;
    if (!filteredTenants.some((t) => t.id === tenantFilter)) {
      setTenantFilter("all");
    }
  }, [filteredTenants, tenantFilter]);

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
    setCalibrationCtRatio("");
    setCalibrationStartTimestamp("");
    setIsModalOpen(false);
  }, []);

  const deleteCalibrationEntry = useCallback(
    async (id: string) => {
      if (!confirm("Hapus data kalibrasi ini? Aksi tidak bisa dibatalkan."))
        return;
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
        ctRatio:
          calibrationCtRatio !== "" ? Number(calibrationCtRatio) : undefined,
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
    calibrationCtRatio,
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
    return (
      tenants.find((tenant) => tenant.id === effectiveTenantId)?.name ?? null
    );
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

  const formatTooltipDateTime = useCallback(
    (iso: string | null | undefined) => {
      if (!iso) return "-";
      const value = new Date(iso);
      if (Number.isNaN(value.getTime())) return "-";
      return value.toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    },
    [],
  );

  const formatOffsetSeconds = useCallback(
    (value: number | null | undefined) => {
      if (value === null || value === undefined || Number.isNaN(value))
        return "-";
      if (value === 0) return "tepat di detik yang sama";
      return value > 0 ? `+${value} detik` : `${value} detik`;
    },
    [],
  );

  const formatTableDateRange = useCallback(
    (
      startIso: string | null | undefined,
      endIso: string | null | undefined,
    ) => {
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
    (
      startIso: string | null | undefined,
      endIso: string | null | undefined,
    ) => {
      const effectiveEnd = endIso ?? null;
      const effectiveStart = startIso ?? effectiveEnd;
      return `${formatTimeOnly(effectiveStart)} - ${formatTimeOnly(effectiveEnd)}`;
    },
    [formatTimeOnly],
  );

  const isAnchorRow = useCallback(
    (row: CalibrationHistoryData["rows"][number]) =>
      row.prevReadingAt === null || row.intervalLabel === "Anchor awal",
    [],
  );

  const handleExportExcel = useCallback(async () => {
    if (!calibrationData?.rows?.length) return;
    try {
      setExportLoading("excel");
      await exportToExcelStyled(
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
                "Tanggal Export": formatExportDateTime(
                  new Date().toISOString(),
                ),
              },
            ],
          },
          {
            name: "Calibration History",
            rows: calibrationData.rows.map((row) => {
              const anchorRow = isAnchorRow(row);
              return {
                Date: formatTableDateRange(row.periodStartAt, row.readingAt),
                "Time Interval": formatTableTimeInterval(
                  row.periodStartAt,
                  row.readingAt,
                ),
                "Raw PLN": row.plnEnergyKwh,
                "Raw ProtectCube": row.protectCubeEnergyKwh,
                "Delta PLN": anchorRow ? "-" : row.deltaPln,
                "Delta PQ": anchorRow ? "-" : row.deltaPq,
                "GAP (kWh)": anchorRow ? "-" : row.gapKwh,
                "GAP (%)": anchorRow ? "-" : Number(row.gapPercent.toFixed(2)),
                Accuracy: anchorRow
                  ? "-"
                  : Number(row.accuracyPercent.toFixed(2)),
                "CT Ratio": row.ctRatio ?? "-",
                Status: row.note ?? "-",
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
    formatExportDateTime,
    formatTableDateRange,
    formatTableTimeInterval,
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
              "Time Interval",
              "Raw PLN",
              "Raw PQ",
              "Delta PLN",
              "Delta PQ",
              "GAP",
              "GAP %",
              "Accuracy",
              "CT Ratio",
              "Status",
            ],
            rows: calibrationData.rows.map((row) => [
              formatTableDateRange(row.periodStartAt, row.readingAt),
              formatTableTimeInterval(row.periodStartAt, row.readingAt),
              row.plnEnergyKwh,
              row.protectCubeEnergyKwh,
              isAnchorRow(row) ? "-" : row.deltaPln,
              isAnchorRow(row) ? "-" : row.deltaPq,
              isAnchorRow(row) ? "-" : row.gapKwh,
              isAnchorRow(row) ? "-" : `${row.gapPercent.toFixed(2)}%`,
              isAnchorRow(row) ? "-" : `${row.accuracyPercent.toFixed(2)}%`,
              row.ctRatio ?? "-",
              row.note ?? "-",
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
    formatExportDateTime,
    formatTableDateRange,
    formatTableTimeInterval,
    isAnchorRow,
    selectedScopeName,
    selectedTenantName,
    summary.avgAccuracyPercent,
    summary.avgGapKwh,
    summary.avgGapPercent,
    summary.totalRows,
  ]);

  return (
    <TooltipProvider>
      <PageTransition>
        <div className="space-y-3 w-full max-w-[1700px] mx-auto px-3 overflow-x-hidden">
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm">
                History Kalibrasi Energy
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={tenantFilter} onValueChange={setTenantFilter}>
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue placeholder="Tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTenants.length > 0 && (
                      <SelectItem value="all">All Tenants</SelectItem>
                    )}
                    {filteredTenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                    {filteredTenants.length === 0 && (
                      <SelectItem value="none" disabled>
                        No tenants available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <Select value={scopeFilter} onValueChange={setScopeFilter}>
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue placeholder="Outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredScopes && filteredScopes.length > 0 && (
                      <SelectItem value="all">All Outlets</SelectItem>
                    )}
                    {(filteredScopes ?? []).map((scope) => (
                      <SelectItem key={scope.id} value={scope.id}>
                        {scope.name}
                      </SelectItem>
                    ))}
                    {(!filteredScopes || filteredScopes.length === 0) && (
                      <SelectItem value="none" disabled>
                        No outlets available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <DateFilter value={globalRange} onChange={setGlobalRange} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!effectiveScopeId ? (
                <p className="text-xs text-muted-foreground">
                  Pilih outlet spesifik untuk input dan melihat history
                  kalibrasi.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => void handleExportPdf()}
                      disabled={
                        exportLoading !== null || !calibrationData?.rows?.length
                      }
                      className="relative h-9 w-9"
                      title="Export PDF"
                      aria-label="Export PDF"
                    >
                      <FileText className="h-4 w-4 text-red-600" />
                      <span className="absolute -bottom-0.5 rounded bg-red-600 px-1 text-[8px] font-semibold leading-3 text-white">
                        PDF
                      </span>
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => void handleExportExcel()}
                      disabled={
                        exportLoading !== null || !calibrationData?.rows?.length
                      }
                      className="relative h-9 w-9"
                      title="Export Excel"
                      aria-label="Export Excel"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      <span className="absolute -bottom-0.5 rounded bg-emerald-600 px-1 text-[8px] font-semibold leading-3 text-white">
                        XLS
                      </span>
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
                      Avg Accuracy:{" "}
                      {Math.min(100, summary.avgAccuracyPercent).toFixed(2)}%
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
                          <th className="px-2 py-1 text-right">
                            Raw ProtectCube
                          </th>
                          <th className="px-2 py-1 text-right">Delta PLN</th>
                          <th className="px-2 py-1 text-right">Delta PQ</th>
                          <th className="px-2 py-1 text-right">GAP (kWh)</th>
                          <th className="px-2 py-1 text-right">GAP (%)</th>
                          <th className="px-2 py-1 text-right">Accuracy</th>
                          <th className="px-2 py-1 text-right">CT Ratio</th>
                          <th className="px-2 py-1 text-left">Status</th>
                          {!isUserRole && (
                            <th className="px-2 py-1 text-left">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(calibrationData?.rows ?? []).map((row) => {
                          const anchorRow = isAnchorRow(row);
                          const gapClass = anchorRow
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
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="cursor-help text-right underline decoration-dotted underline-offset-2"
                                    >
                                      {row.protectCubeEnergyKwh}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    sideOffset={6}
                                    className="max-w-[320px] space-y-1 px-3 py-2 text-[11px] leading-4"
                                  >
                                    <div className="font-semibold">
                                      Detail raw ProtectCube
                                    </div>
                                    <div>
                                      Raw: {row.protectCubeEnergyKwh} kWh
                                    </div>
                                    <div>
                                      Timestamp raw:{" "}
                                      {formatTooltipDateTime(
                                        row.protectCubeSampleAt,
                                      )}
                                    </div>
                                    <div>
                                      Selisih ke waktu baca:{" "}
                                      {row.protectCubeSampleAt
                                        ? formatOffsetSeconds(
                                            row.protectCubeSampleOffsetSeconds,
                                          )
                                        : "raw terdekat tidak ditemukan"}
                                    </div>
                                    <div>Sumber: raw ProtectCube terdekat</div>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                              <td className="px-2 py-1 text-right">
                                {anchorRow ? "-" : row.deltaPln}
                              </td>
                              <td className="px-2 py-1 text-right">
                                {anchorRow ? "-" : row.deltaPq}
                              </td>
                              <td
                                className={`px-2 py-1 text-right ${gapClass}`}
                              >
                                {anchorRow ? "-" : row.gapKwh}
                              </td>
                              <td
                                className={`px-2 py-1 text-right ${gapClass}`}
                              >
                                {anchorRow
                                  ? "-"
                                  : `${row.gapPercent.toFixed(2)}%`}
                              </td>
                              <td className="px-2 py-1 text-right">
                                {anchorRow
                                  ? "-"
                                  : `${row.accuracyPercent.toFixed(2)}%`}
                              </td>
                              <td className="px-2 py-1 text-right">
                                {row.ctRatio !== null &&
                                row.ctRatio !== undefined
                                  ? row.ctRatio
                                  : "-"}
                              </td>
                              <td className="px-2 py-1 text-left">
                                {row.note ?? "-"}
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
                                            ? toLocalInputValue(
                                                row.periodStartAt,
                                              )
                                            : "",
                                        );
                                        setCalibrationTimestamp(
                                          toLocalInputValue(row.readingAt),
                                        );
                                        setCalibrationPln(
                                          String(row.plnEnergyKwh),
                                        );
                                        setCalibrationPq(
                                          String(row.protectCubeEnergyKwh),
                                        );
                                        setCalibrationNote(row.note ?? "");
                                        setCalibrationCtRatio(
                                          row.ctRatio !== null &&
                                            row.ctRatio !== undefined
                                            ? String(row.ctRatio)
                                            : "",
                                        );
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
                                      onClick={() =>
                                        void deleteCalibrationEntry(row.id)
                                      }
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
                                colSpan={isUserRole ? 11 : 12}
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
                    Anchor pertama tetap ditampilkan sebagai baseline. Nilai
                    Delta, GAP, dan Accuracy akan terhitung setelah ada anchor
                    hari berikutnya.
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
                            CT Ratio (opsional)
                          </label>
                          <Input
                            type="number"
                            step="0.0001"
                            value={calibrationCtRatio}
                            onChange={(e) =>
                              setCalibrationCtRatio(e.target.value)
                            }
                            placeholder="contoh: 200"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Status (opsional)
                          </label>
                          <Input
                            value={calibrationNote}
                            onChange={(e) => setCalibrationNote(e.target.value)}
                            placeholder="Status"
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
    </TooltipProvider>
  );
}
