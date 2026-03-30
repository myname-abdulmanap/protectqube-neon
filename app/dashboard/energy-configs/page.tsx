"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  energyConfigsApi,
  scopesApi,
  type EnergyConfig,
  type Scope,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { History, Pencil, Trash2, Plus, Zap } from "lucide-react";

/** Format a Date as "YYYY-MM-DDTHH:mm" in local time (for datetime-local inputs). */
const toLocalDatetimeString = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type FormPeriodThreshold = {
  id: string;
  period: string;
  warningLower: string;
  warningUpper: string;
  criticalLower: string;
  criticalUpper: string;
};

type FormRealtimeThreshold = {
  id: string;
  metricKey: string;
  label: string;
  warningLower: string;
  warningUpper: string;
  criticalLower: string;
  criticalUpper: string;
};

const PERIOD_OPTIONS = ["1d", "7d", "30d"];

const POWER_METRIC_KEYS = new Set([
  "power_total",
  "power",
  "power_l1",
  "power_l2",
  "power_l3",
]);

const isPowerMetricKey = (metricKey: string): boolean =>
  POWER_METRIC_KEYS.has(
    String(metricKey || "")
      .trim()
      .toLowerCase(),
  );

const formatRealtimeThresholdInput = (
  metricKey: string,
  value: unknown,
): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (isPowerMetricKey(metricKey)) {
    return String(Number((n / 1000).toFixed(6)));
  }
  return String(n);
};

const parseRealtimeThresholdInput = (
  metricKey: string,
  value: string,
): number | undefined => {
  const n = toOptionalNumber(value);
  if (n === undefined) return undefined;
  if (isPowerMetricKey(metricKey)) {
    return Number((n * 1000).toFixed(6));
  }
  return n;
};

const REALTIME_METRIC_OPTIONS = [
  { value: "power_total", label: "Power Total (input kW)" },
  { value: "power_l1", label: "Power L1 (W)" },
  { value: "power_l2", label: "Power L2 (W)" },
  { value: "power_l3", label: "Power L3 (W)" },
  { value: "voltage_l1", label: "Voltage L1 (V)" },
  { value: "voltage_l2", label: "Voltage L2 (V)" },
  { value: "voltage_l3", label: "Voltage L3 (V)" },
  { value: "current_l1", label: "Current L1 (A)" },
  { value: "current_l2", label: "Current L2 (A)" },
  { value: "current_l3", label: "Current L3 (A)" },
  { value: "current_total", label: "Current Total (A)" },
  { value: "frequency", label: "Frequency" },
  { value: "pf_sigma", label: "Power Factor Total" },
  { value: "pf_a", label: "Power Factor A" },
  { value: "pf_b", label: "Power Factor B" },
  { value: "pf_c", label: "Power Factor C" },
  { value: "va_sigma", label: "Apparent Power Total (VA)" },
  { value: "va_a", label: "Apparent Power A (VA)" },
  { value: "va_b", label: "Apparent Power B (VA)" },
  { value: "va_c", label: "Apparent Power C (VA)" },
  // Backward compatibility with old custom keys
  { value: "voltage_phase_a", label: "Voltage Phase A (legacy)" },
  { value: "voltage_phase_b", label: "Voltage Phase B (legacy)" },
  { value: "voltage_phase_c", label: "Voltage Phase C (legacy)" },
  { value: "current_phase_a", label: "Current Phase A (legacy)" },
  { value: "current_phase_b", label: "Current Phase B (legacy)" },
  { value: "current_phase_c", label: "Current Phase C (legacy)" },
];

const makeId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createPeriodThreshold = (period = "1d"): FormPeriodThreshold => ({
  id: makeId("pt"),
  period,
  warningLower: "",
  warningUpper: "",
  criticalLower: "",
  criticalUpper: "",
});

const createRealtimeThreshold = (
  metricKey = "power_total",
): FormRealtimeThreshold => ({
  id: makeId("rt"),
  metricKey,
  label: "",
  warningLower: "",
  warningUpper: "",
  criticalLower: "",
  criticalUpper: "",
});

const toBoundString = (value: unknown): string => {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "";
};

const toOptionalNumber = (value: string): number | undefined => {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const mapPeriodThresholdsFromConfig = (
  items: unknown,
): FormPeriodThreshold[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const current = (item || {}) as {
      id?: string;
      period?: string;
      warning?: { lower?: number; upper?: number };
      critical?: { lower?: number; upper?: number };
      thresholds?: Array<{ value: number; severity: string }>;
    };

    const legacyWarning = current.thresholds?.find(
      (t) => String(t.severity).toLowerCase() === "warning",
    );
    const legacyCritical = current.thresholds?.find(
      (t) => String(t.severity).toLowerCase() === "critical",
    );

    return {
      id: current.id || makeId("pt"),
      period: current.period || "1d",
      warningLower: toBoundString(current.warning?.lower),
      warningUpper: toBoundString(
        current.warning?.upper ?? legacyWarning?.value,
      ),
      criticalLower: toBoundString(current.critical?.lower),
      criticalUpper: toBoundString(
        current.critical?.upper ?? legacyCritical?.value,
      ),
    };
  });
};

const mapRealtimeThresholdsFromConfig = (
  items: unknown,
): FormRealtimeThreshold[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const current = (item || {}) as {
      id?: string;
      metricKey?: string;
      label?: string;
      warning?: { lower?: number; upper?: number };
      critical?: { lower?: number; upper?: number };
      operator?: string;
      value?: number;
      severity?: string;
    };

    const legacyIsLower = current.operator === "<" || current.operator === "<=";
    const legacyIsUpper = current.operator === ">" || current.operator === ">=";
    const legacySeverity = String(current.severity || "warning").toLowerCase();
    const metricKey = current.metricKey || "power_total";

    return {
      id: current.id || makeId("rt"),
      metricKey,
      label: current.label || "",
      warningLower:
        current.warning?.lower !== undefined
          ? formatRealtimeThresholdInput(metricKey, current.warning.lower)
          : legacySeverity === "warning" && legacyIsLower
            ? formatRealtimeThresholdInput(metricKey, current.value)
            : "",
      warningUpper:
        current.warning?.upper !== undefined
          ? formatRealtimeThresholdInput(metricKey, current.warning.upper)
          : legacySeverity === "warning" && legacyIsUpper
            ? formatRealtimeThresholdInput(metricKey, current.value)
            : "",
      criticalLower:
        current.critical?.lower !== undefined
          ? formatRealtimeThresholdInput(metricKey, current.critical.lower)
          : legacySeverity === "critical" && legacyIsLower
            ? formatRealtimeThresholdInput(metricKey, current.value)
            : "",
      criticalUpper:
        current.critical?.upper !== undefined
          ? formatRealtimeThresholdInput(metricKey, current.critical.upper)
          : legacySeverity === "critical" && legacyIsUpper
            ? formatRealtimeThresholdInput(metricKey, current.value)
            : "",
    };
  });
};

export default function EnergyConfigsPage() {
  const { hasPermission } = useAuth();
  const [configs, setConfigs] = useState<EnergyConfig[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterScope, setFilterScope] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    scopeId: "",
    pricePerKwh: "",
    tariffMode: "flat",
    flatPricePerKwh: "",
    touPeriods: [
      {
        id: "lwbp-default",
        label: "LWBP",
        startTime: "00:00",
        endTime: "18:00",
        pricePerKwh: "",
      },
      {
        id: "wbp-default",
        label: "WBP",
        startTime: "18:00",
        endTime: "23:59",
        pricePerKwh: "",
      },
    ] as Array<{
      id: string;
      label: string;
      startTime: string;
      endTime: string;
      pricePerKwh: string;
    }>,
    capacityVa: "",
    startPointStartAt: "",
    startPointInitialKwh: "",
    validFrom: "",
    consumptionThresholds: [] as FormPeriodThreshold[],
    reactiveConsumptionThresholds: [] as FormPeriodThreshold[],
    costThresholds: [] as FormPeriodThreshold[],
    realtimeThresholds: [] as FormRealtimeThreshold[],
  });

  const canRead = hasPermission("energy_configs:read");
  const canCreate = hasPermission("energy_configs:create");
  const canUpdate = hasPermission("energy_configs:update");
  const canDelete = hasPermission("energy_configs:delete");

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [cRes, scRes] = await Promise.all([
        energyConfigsApi.getAll(filterScope || undefined),
        scopesApi.getAll(),
      ]);
      if (cRes.success && cRes.data) setConfigs(cRes.data);
      if (scRes.success && scRes.data) setScopes(scRes.data);
    } catch {
      setError("Failed to load configs");
    } finally {
      setIsLoading(false);
    }
  }, [filterScope]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({
      scopeId: "",
      pricePerKwh: "",
      tariffMode: "flat",
      flatPricePerKwh: "",
      touPeriods: [
        {
          id: "lwbp-default",
          label: "LWBP",
          startTime: "00:00",
          endTime: "18:00",
          pricePerKwh: "",
        },
        {
          id: "wbp-default",
          label: "WBP",
          startTime: "18:00",
          endTime: "23:59",
          pricePerKwh: "",
        },
      ],
      capacityVa: "",
      startPointStartAt: "",
      startPointInitialKwh: "",
      validFrom: "",
      consumptionThresholds: [],
      reactiveConsumptionThresholds: [],
      costThresholds: [],
      realtimeThresholds: [],
    });
    setEditingId(null);
  };

  const openCreate = () => {
    if (!canCreate) return;
    resetForm();
    setModalOpen(true);
  };
  const openEdit = (c: EnergyConfig) => {
    const tariff = c.config?.tariff;
    const touPeriods =
      tariff?.mode === "tou" &&
      Array.isArray(tariff.touPeriods) &&
      tariff.touPeriods.length > 0
        ? tariff.touPeriods.map((p) => ({
            id: p.id || `tou-${Date.now()}-${Math.random()}`,
            label: p.label || "Period",
            startTime: p.startTime || "00:00",
            endTime: p.endTime || "23:59",
            pricePerKwh: Number.isFinite(Number(p.pricePerKwh))
              ? String(p.pricePerKwh)
              : "",
          }))
        : [
            {
              id: "lwbp-default",
              label: "LWBP",
              startTime: "00:00",
              endTime: "18:00",
              pricePerKwh: "",
            },
            {
              id: "wbp-default",
              label: "WBP",
              startTime: "18:00",
              endTime: "23:59",
              pricePerKwh: "",
            },
          ];

    setEditingId(c.id);
    setForm({
      scopeId: c.scopeId,
      pricePerKwh: String(c.pricePerKwh),
      tariffMode: tariff?.mode === "tou" ? "tou" : "flat",
      flatPricePerKwh:
        tariff?.flatPricePerKwh !== undefined
          ? String(tariff.flatPricePerKwh)
          : String(c.pricePerKwh),
      touPeriods,
      capacityVa: c.capacityVa ? String(c.capacityVa) : "",
      startPointStartAt: c.config?.startPoint?.startAt
        ? toLocalDatetimeString(new Date(c.config.startPoint.startAt))
        : "",
      startPointInitialKwh:
        c.config?.startPoint?.initialKwh !== undefined
          ? String(c.config.startPoint.initialKwh)
          : "",
      validFrom: c.validFrom
        ? toLocalDatetimeString(new Date(c.validFrom))
        : "",
      consumptionThresholds: mapPeriodThresholdsFromConfig(
        c.config?.consumptionThresholds,
      ),
      reactiveConsumptionThresholds: mapPeriodThresholdsFromConfig(
        c.config?.reactiveConsumptionThresholds,
      ),
      costThresholds: mapPeriodThresholdsFromConfig(c.config?.costThresholds),
      realtimeThresholds: mapRealtimeThresholdsFromConfig(
        c.config?.realtimeThresholds,
      ),
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.scopeId) return;
    if ((editingId && !canUpdate) || (!editingId && !canCreate)) return;
    try {
      type TariffConfigPayload = {
        mode: "flat" | "tou";
        flatPricePerKwh?: number;
        timezone: string;
        touPeriods?: Array<{
          id: string;
          label: string;
          startTime: string;
          endTime: string;
          pricePerKwh: number;
        }>;
      };

      type AlertJsonThresholdPayload = {
        id?: string;
        period: string;
        warning?: { lower?: number; upper?: number };
        critical?: { lower?: number; upper?: number };
        thresholds?: Array<{ value: number; severity: string }>;
      };

      type AlertJsonRealtimePayload = {
        id?: string;
        metricKey: string;
        warning?: { lower?: number; upper?: number };
        critical?: { lower?: number; upper?: number };
        operator?: ">" | ">=" | "<" | "<=" | "=";
        value?: number;
        severity?: string;
        label?: string;
      };

      const config: {
        startPoint?: {
          startAt: string;
          initialKwh: number;
        };
        tariff?: TariffConfigPayload;
        consumptionThresholds?: AlertJsonThresholdPayload[];
        costThresholds?: AlertJsonThresholdPayload[];
        reactiveConsumptionThresholds?: AlertJsonThresholdPayload[];
        realtimeThresholds?: AlertJsonRealtimePayload[];
      } = {};

      const buildPeriodPayload = (
        list: FormPeriodThreshold[],
      ): AlertJsonThresholdPayload[] =>
        list
          .map((item) => {
            const warningLower = toOptionalNumber(item.warningLower);
            const warningUpper = toOptionalNumber(item.warningUpper);
            const criticalLower = toOptionalNumber(item.criticalLower);
            const criticalUpper = toOptionalNumber(item.criticalUpper);

            const warning =
              warningLower !== undefined || warningUpper !== undefined
                ? {
                    ...(warningLower !== undefined
                      ? { lower: warningLower }
                      : {}),
                    ...(warningUpper !== undefined
                      ? { upper: warningUpper }
                      : {}),
                  }
                : undefined;

            const critical =
              criticalLower !== undefined || criticalUpper !== undefined
                ? {
                    ...(criticalLower !== undefined
                      ? { lower: criticalLower }
                      : {}),
                    ...(criticalUpper !== undefined
                      ? { upper: criticalUpper }
                      : {}),
                  }
                : undefined;

            return {
              id: item.id,
              period: item.period,
              warning,
              critical,
            };
          })
          .filter(
            (item) =>
              item.period &&
              (item.warning !== undefined || item.critical !== undefined),
          );

      const buildRealtimePayload = (
        list: FormRealtimeThreshold[],
      ): AlertJsonRealtimePayload[] =>
        list
          .map((item) => {
            const warningLower = parseRealtimeThresholdInput(
              item.metricKey,
              item.warningLower,
            );
            const warningUpper = parseRealtimeThresholdInput(
              item.metricKey,
              item.warningUpper,
            );
            const criticalLower = parseRealtimeThresholdInput(
              item.metricKey,
              item.criticalLower,
            );
            const criticalUpper = parseRealtimeThresholdInput(
              item.metricKey,
              item.criticalUpper,
            );

            const warning =
              warningLower !== undefined || warningUpper !== undefined
                ? {
                    ...(warningLower !== undefined
                      ? { lower: warningLower }
                      : {}),
                    ...(warningUpper !== undefined
                      ? { upper: warningUpper }
                      : {}),
                  }
                : undefined;

            const critical =
              criticalLower !== undefined || criticalUpper !== undefined
                ? {
                    ...(criticalLower !== undefined
                      ? { lower: criticalLower }
                      : {}),
                    ...(criticalUpper !== undefined
                      ? { upper: criticalUpper }
                      : {}),
                  }
                : undefined;

            return {
              id: item.id,
              metricKey: item.metricKey,
              label: item.label || undefined,
              warning,
              critical,
            };
          })
          .filter(
            (item) =>
              item.metricKey &&
              (item.warning !== undefined || item.critical !== undefined),
          );
      const tariffMode = form.tariffMode === "tou" ? "tou" : "flat";

      // Add start point if provided
      if (form.startPointStartAt && form.startPointInitialKwh) {
        config.startPoint = {
          startAt: new Date(form.startPointStartAt).toISOString(),
          initialKwh: parseFloat(form.startPointInitialKwh),
        };
      }

      if (tariffMode === "flat") {
        config.tariff = {
          mode: "flat",
          flatPricePerKwh: form.flatPricePerKwh
            ? parseFloat(form.flatPricePerKwh)
            : form.pricePerKwh
              ? parseFloat(form.pricePerKwh)
              : undefined,
          timezone: "Asia/Jakarta",
        };
      } else {
        const touPeriods = form.touPeriods
          .filter((p) => p.label && p.startTime && p.endTime && p.pricePerKwh)
          .map((p) => ({
            id: p.id,
            label: p.label,
            startTime: p.startTime,
            endTime: p.endTime,
            pricePerKwh: parseFloat(p.pricePerKwh),
          }));

        config.tariff = {
          mode: "tou",
          flatPricePerKwh: form.flatPricePerKwh
            ? parseFloat(form.flatPricePerKwh)
            : undefined,
          timezone: "Asia/Jakarta",
          touPeriods,
        };
      }

      const consumptionThresholdsPayload = buildPeriodPayload(
        form.consumptionThresholds,
      );
      const reactiveThresholdsPayload = buildPeriodPayload(
        form.reactiveConsumptionThresholds,
      );
      const costThresholdsPayload = buildPeriodPayload(form.costThresholds);
      const realtimeThresholdsPayload = buildRealtimePayload(
        form.realtimeThresholds,
      );

      if (consumptionThresholdsPayload.length > 0) {
        config.consumptionThresholds = consumptionThresholdsPayload;
      }
      if (reactiveThresholdsPayload.length > 0) {
        config.reactiveConsumptionThresholds = reactiveThresholdsPayload;
      }
      if (costThresholdsPayload.length > 0) {
        config.costThresholds = costThresholdsPayload;
      }
      if (realtimeThresholdsPayload.length > 0) {
        config.realtimeThresholds = realtimeThresholdsPayload;
      }

      const resolvedPricePerKwh =
        tariffMode === "flat"
          ? form.flatPricePerKwh
            ? parseFloat(form.flatPricePerKwh)
            : form.pricePerKwh
              ? parseFloat(form.pricePerKwh)
              : 0
          : (() => {
              const prices = form.touPeriods
                .map((p) => parseFloat(p.pricePerKwh))
                .filter((v) => Number.isFinite(v));
              if (!prices.length) return 0;
              return prices.reduce((sum, v) => sum + v, 0) / prices.length;
            })();

      const basePayload = {
        pricePerKwh: resolvedPricePerKwh,
        capacityVa: form.capacityVa ? parseFloat(form.capacityVa) : undefined,
        config: Object.keys(config).length > 0 ? config : undefined,
        validFrom: form.validFrom
          ? new Date(form.validFrom).toISOString()
          : new Date().toISOString(),
      };

      if (editingId) {
        const updatePayload: Parameters<typeof energyConfigsApi.update>[1] = {
          ...basePayload,
        };
        await energyConfigsApi.update(editingId, updatePayload);
      } else {
        const createPayload: Parameters<typeof energyConfigsApi.create>[0] = {
          scopeId: form.scopeId,
          ...basePayload,
        };
        await energyConfigsApi.create(createPayload);
      }
      setModalOpen(false);
      resetForm();
      load();
    } catch {
      setError("Failed to save config");
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (!confirm("Delete this config?")) return;
    try {
      await energyConfigsApi.delete(id);
      load();
    } catch {
      setError("Failed to delete");
    }
  };

  if (!canRead)
    return (
      <div className="p-4 text-sm text-muted-foreground">No permission</div>
    );

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Energy Configs</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Scope:</Label>
            <Select
              value={filterScope || "all"}
              onValueChange={(value) =>
                setFilterScope(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="All scopes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All scopes
                </SelectItem>
                {scopes.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" asChild className="h-8 text-xs">
            <Link href="/dashboard/energy-configs/history">
              <History className="mr-1 h-3 w-3" />
              History
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={openCreate}
            className="h-8 text-xs"
            disabled={!canCreate}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Config
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Scope</TableHead>
                <TableHead className="text-xs">Tariff</TableHead>
                <TableHead className="text-xs">Price/kWh</TableHead>
                <TableHead className="text-xs">Kapasitas VA</TableHead>
                <TableHead className="text-xs">Thresholds</TableHead>
                <TableHead className="text-xs">Starting Point</TableHead>
                <TableHead className="text-xs">Valid From</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-xs text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : configs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-xs text-muted-foreground"
                  >
                    No configs
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium">
                      {c.scope?.name || "-"}
                    </TableCell>
                    <TableCell className="text-xs uppercase">
                      {c.config?.tariff?.mode || "flat"}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {c.pricePerKwh}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.capacityVa ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {(c.config?.consumptionThresholds?.length ?? 0) > 0 ||
                      (c.config?.reactiveConsumptionThresholds?.length ?? 0) >
                        0 ||
                      (c.config?.costThresholds?.length ?? 0) > 0 ||
                      (c.config?.realtimeThresholds?.length ?? 0) > 0 ? (
                        <div className="space-y-1">
                          {c.config?.consumptionThresholds?.map((t) => (
                            <div key={t.id} className="text-xs">
                              <span className="font-medium">
                                kWh {t.period}:
                              </span>{" "}
                              {t.warning || t.critical
                                ? [
                                    t.warning?.lower !== undefined
                                      ? `warning bawah: ${t.warning.lower}`
                                      : null,
                                    t.warning?.upper !== undefined
                                      ? `warning atas: ${t.warning.upper}`
                                      : null,
                                    t.critical?.lower !== undefined
                                      ? `critical bawah: ${t.critical.lower}`
                                      : null,
                                    t.critical?.upper !== undefined
                                      ? `critical atas: ${t.critical.upper}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")
                                : (t.thresholds || [])
                                    .map(
                                      (th) => `${th.severity}: ${th.value} kWh`,
                                    )
                                    .join(", ")}
                            </div>
                          ))}
                          {c.config?.reactiveConsumptionThresholds?.map((t) => (
                            <div key={t.id} className="text-xs">
                              <span className="font-medium">
                                kVArh {t.period}:
                              </span>{" "}
                              {t.warning || t.critical
                                ? [
                                    t.warning?.lower !== undefined
                                      ? `warning bawah: ${t.warning.lower}`
                                      : null,
                                    t.warning?.upper !== undefined
                                      ? `warning atas: ${t.warning.upper}`
                                      : null,
                                    t.critical?.lower !== undefined
                                      ? `critical bawah: ${t.critical.lower}`
                                      : null,
                                    t.critical?.upper !== undefined
                                      ? `critical atas: ${t.critical.upper}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")
                                : (t.thresholds || [])
                                    .map(
                                      (th) =>
                                        `${th.severity}: ${th.value} kVArh`,
                                    )
                                    .join(", ")}
                            </div>
                          ))}
                          {c.config?.costThresholds?.map((t) => (
                            <div key={t.id} className="text-xs">
                              <span className="font-medium">
                                Cost {t.period}:
                              </span>{" "}
                              {t.warning || t.critical
                                ? [
                                    t.warning?.lower !== undefined
                                      ? `warning bawah: ${t.warning.lower}`
                                      : null,
                                    t.warning?.upper !== undefined
                                      ? `warning atas: ${t.warning.upper}`
                                      : null,
                                    t.critical?.lower !== undefined
                                      ? `critical bawah: ${t.critical.lower}`
                                      : null,
                                    t.critical?.upper !== undefined
                                      ? `critical atas: ${t.critical.upper}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")
                                : (t.thresholds || [])
                                    .map(
                                      (th) => `${th.severity}: ${th.value} Rp`,
                                    )
                                    .join(", ")}
                            </div>
                          ))}
                          {c.config?.realtimeThresholds?.map((t) => (
                            <div key={t.id} className="text-xs">
                              <span className="font-medium">
                                {t.label || t.metricKey}:
                              </span>{" "}
                              {[
                                t.warning?.lower !== undefined
                                  ? `warning bawah: ${t.warning.lower}`
                                  : null,
                                t.warning?.upper !== undefined
                                  ? `warning atas: ${t.warning.upper}`
                                  : null,
                                t.critical?.lower !== undefined
                                  ? `critical bawah: ${t.critical.lower}`
                                  : null,
                                t.critical?.upper !== undefined
                                  ? `critical atas: ${t.critical.upper}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(", ") ||
                                (t.operator && t.value !== undefined
                                  ? `${t.severity || "warning"}: ${t.metricKey} ${t.operator} ${t.value}`
                                  : "-")}
                            </div>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.config?.startPoint
                        ? `${new Date(c.config.startPoint.startAt).toLocaleString("id-ID")} / ${c.config.startPoint.initialKwh} kWh`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.validFrom
                        ? new Date(c.validFrom).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={!canUpdate}
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          disabled={!canDelete}
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={(v) => {
          if (!v) {
            setModalOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingId ? "Edit" : "New"} Energy Config
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingId
                ? "Update energy configuration"
                : "Create a new energy configuration"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Scope *</Label>
              <Select
                value={form.scopeId}
                onValueChange={(v) => setForm({ ...form, scopeId: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  {scopes.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 1: Tariff Mode + Capacity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tariff Mode *</Label>
                <Select
                  value={form.tariffMode}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      tariffMode: value === "tou" ? "tou" : "flat",
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat" className="text-xs">
                      Flat
                    </SelectItem>
                    <SelectItem value="tou" className="text-xs">
                      TOU
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Capacity (VA)</Label>
                <Input
                  type="number"
                  step="1"
                  value={form.capacityVa}
                  onChange={(e) =>
                    setForm({ ...form, capacityVa: e.target.value })
                  }
                  placeholder="22000"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* FLAT ONLY: harga per kWh */}
            {form.tariffMode === "flat" && (
              <div>
                <Label className="text-xs">Harga per kWh (Rp) — Flat</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.flatPricePerKwh}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      flatPricePerKwh: e.target.value,
                      pricePerKwh: e.target.value,
                    })
                  }
                  placeholder="1500"
                  className="h-8 text-xs"
                />
              </div>
            )}

            {/* TOU ONLY: periods */}
            {form.tariffMode === "tou" && (
              <div className="rounded border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    TOU Periods (WIB)
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    className="h-6 text-xs"
                    onClick={() =>
                      setForm({
                        ...form,
                        touPeriods: [
                          ...form.touPeriods,
                          {
                            id: `tou-${Date.now()}`,
                            label: "Custom",
                            startTime: "00:00",
                            endTime: "23:59",
                            pricePerKwh: "",
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Period
                  </Button>
                </div>
                <div className="grid grid-cols-12 gap-1 mb-1">
                  <p className="col-span-3 text-[10px] text-muted-foreground">
                    Label
                  </p>
                  <p className="col-span-3 text-[10px] text-muted-foreground">
                    Mulai (WIB)
                  </p>
                  <p className="col-span-3 text-[10px] text-muted-foreground">
                    Selesai (WIB)
                  </p>
                  <p className="col-span-2 text-[10px] text-muted-foreground">
                    Rp/kWh
                  </p>
                </div>
                <div className="space-y-2">
                  {form.touPeriods.map((period, periodIndex) => (
                    <div key={period.id} className="grid grid-cols-12 gap-2">
                      <Input
                        value={period.label}
                        onChange={(e) => {
                          const next = [...form.touPeriods];
                          next[periodIndex].label = e.target.value;
                          setForm({ ...form, touPeriods: next });
                        }}
                        placeholder="LWBP"
                        className="col-span-3 h-8 text-xs"
                      />
                      <Input
                        type="time"
                        value={period.startTime}
                        onChange={(e) => {
                          const next = [...form.touPeriods];
                          next[periodIndex].startTime = e.target.value;
                          setForm({ ...form, touPeriods: next });
                        }}
                        className="col-span-3 h-8 text-xs"
                      />
                      <Input
                        type="time"
                        value={period.endTime}
                        onChange={(e) => {
                          const next = [...form.touPeriods];
                          next[periodIndex].endTime = e.target.value;
                          setForm({ ...form, touPeriods: next });
                        }}
                        className="col-span-3 h-8 text-xs"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={period.pricePerKwh}
                        onChange={(e) => {
                          const next = [...form.touPeriods];
                          next[periodIndex].pricePerKwh = e.target.value;
                          setForm({ ...form, touPeriods: next });
                        }}
                        placeholder="Rp/kWh"
                        className="col-span-2 h-8 text-xs"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        type="button"
                        className="col-span-1 h-8 w-8 text-destructive"
                        onClick={() =>
                          setForm({
                            ...form,
                            touPeriods: form.touPeriods.filter(
                              (_, idx) => idx !== periodIndex,
                            ),
                          })
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Starting Point + Valid From */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-xs">Valid From</Label>
                <Input
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(e) =>
                    setForm({ ...form, validFrom: e.target.value })
                  }
                  className="h-8 text-xs"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() =>
                      setForm({
                        ...form,
                        validFrom: toLocalDatetimeString(new Date()),
                      })
                    }
                  >
                    Berlaku Sekarang
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(0, 0, 0, 0);
                      setForm({
                        ...form,
                        validFrom: toLocalDatetimeString(d),
                      });
                    }}
                  >
                    Mulai Besok 00:00
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Sistem pakai config terbaru dengan validFrom yang sudah lewat
                  waktu saat ini.
                </p>
              </div>
              <div>
                <Label className="text-xs">Starting Point Datetime</Label>
                <Input
                  type="datetime-local"
                  value={form.startPointStartAt}
                  onChange={(e) =>
                    setForm({ ...form, startPointStartAt: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Initial kWh</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.startPointInitialKwh}
                  onChange={(e) =>
                    setForm({ ...form, startPointInitialKwh: e.target.value })
                  }
                  placeholder="365.7645"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Alert Config UI */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Alert Rules (UI)
                </Label>
              </div>

              <div className="rounded-md border bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">Panduan isi:</p>
                <p>1) Pilih period (1d/7d/30d) untuk kWh, kVArh, dan cost.</p>
                <p>2) Isi batas bawah/atas untuk warning dan critical.</p>
                <p>3) Kosongkan jika tidak ingin pakai batas tersebut.</p>
                <p>4) Realtime pakai metricKey, bukan period.</p>
                <p>
                  5) Untuk metric power, input dalam kW (otomatis dikonversi ke
                  W saat simpan).
                </p>
              </div>

              <div className="rounded border p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Consumption Thresholds (kWh)
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      setForm({
                        ...form,
                        consumptionThresholds: [
                          ...form.consumptionThresholds,
                          createPeriodThreshold(),
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                </div>
                {form.consumptionThresholds.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    Belum ada rule.
                  </p>
                ) : (
                  form.consumptionThresholds.map((row, idx) => (
                    <div
                      key={row.id}
                      className="rounded-md border p-2 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                        <div>
                          <Label className="text-[10px]">Period</Label>
                          <Select
                            value={row.period}
                            onValueChange={(value) => {
                              const next = [...form.consumptionThresholds];
                              next[idx].period = value;
                              setForm({ ...form, consumptionThresholds: next });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PERIOD_OPTIONS.map((period) => (
                                <SelectItem
                                  key={period}
                                  value={period}
                                  className="text-xs"
                                >
                                  {period}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() =>
                              setForm({
                                ...form,
                                consumptionThresholds:
                                  form.consumptionThresholds.filter(
                                    (_, i) => i !== idx,
                                  ),
                              })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px]">Warning Bawah</Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.warningLower}
                            onChange={(e) => {
                              const next = [...form.consumptionThresholds];
                              next[idx].warningLower = e.target.value;
                              setForm({ ...form, consumptionThresholds: next });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Warning Atas</Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.warningUpper}
                            onChange={(e) => {
                              const next = [...form.consumptionThresholds];
                              next[idx].warningUpper = e.target.value;
                              setForm({ ...form, consumptionThresholds: next });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Critical Bawah</Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.criticalLower}
                            onChange={(e) => {
                              const next = [...form.consumptionThresholds];
                              next[idx].criticalLower = e.target.value;
                              setForm({ ...form, consumptionThresholds: next });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Critical Atas</Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.criticalUpper}
                            onChange={(e) => {
                              const next = [...form.consumptionThresholds];
                              next[idx].criticalUpper = e.target.value;
                              setForm({ ...form, consumptionThresholds: next });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded border p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Reactive Thresholds (kVArh)
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      setForm({
                        ...form,
                        reactiveConsumptionThresholds: [
                          ...form.reactiveConsumptionThresholds,
                          createPeriodThreshold(),
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                </div>
                {form.reactiveConsumptionThresholds.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    Belum ada rule.
                  </p>
                ) : (
                  form.reactiveConsumptionThresholds.map((row, idx) => (
                    <div
                      key={row.id}
                      className="rounded-md border p-2 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                        <div>
                          <Label className="text-[10px]">Period</Label>
                          <Select
                            value={row.period}
                            onValueChange={(value) => {
                              const next = [
                                ...form.reactiveConsumptionThresholds,
                              ];
                              next[idx].period = value;
                              setForm({
                                ...form,
                                reactiveConsumptionThresholds: next,
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PERIOD_OPTIONS.map((period) => (
                                <SelectItem
                                  key={period}
                                  value={period}
                                  className="text-xs"
                                >
                                  {period}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() =>
                              setForm({
                                ...form,
                                reactiveConsumptionThresholds:
                                  form.reactiveConsumptionThresholds.filter(
                                    (_, i) => i !== idx,
                                  ),
                              })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px]">Warning Bawah</Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.warningLower}
                            onChange={(e) => {
                              const next = [
                                ...form.reactiveConsumptionThresholds,
                              ];
                              next[idx].warningLower = e.target.value;
                              setForm({
                                ...form,
                                reactiveConsumptionThresholds: next,
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Warning Atas</Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.warningUpper}
                            onChange={(e) => {
                              const next = [
                                ...form.reactiveConsumptionThresholds,
                              ];
                              next[idx].warningUpper = e.target.value;
                              setForm({
                                ...form,
                                reactiveConsumptionThresholds: next,
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Critical Bawah</Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.criticalLower}
                            onChange={(e) => {
                              const next = [
                                ...form.reactiveConsumptionThresholds,
                              ];
                              next[idx].criticalLower = e.target.value;
                              setForm({
                                ...form,
                                reactiveConsumptionThresholds: next,
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Critical Atas</Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.criticalUpper}
                            onChange={(e) => {
                              const next = [
                                ...form.reactiveConsumptionThresholds,
                              ];
                              next[idx].criticalUpper = e.target.value;
                              setForm({
                                ...form,
                                reactiveConsumptionThresholds: next,
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded border p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Cost Thresholds (Rp)
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      setForm({
                        ...form,
                        costThresholds: [
                          ...form.costThresholds,
                          createPeriodThreshold(),
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                </div>
                {form.costThresholds.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    Belum ada rule.
                  </p>
                ) : (
                  form.costThresholds.map((row, idx) => (
                    <div
                      key={row.id}
                      className="rounded-md border p-2 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                        <div>
                          <Label className="text-[10px]">Period</Label>
                          <Select
                            value={row.period}
                            onValueChange={(value) => {
                              const next = [...form.costThresholds];
                              next[idx].period = value;
                              setForm({ ...form, costThresholds: next });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PERIOD_OPTIONS.map((period) => (
                                <SelectItem
                                  key={period}
                                  value={period}
                                  className="text-xs"
                                >
                                  {period}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() =>
                              setForm({
                                ...form,
                                costThresholds: form.costThresholds.filter(
                                  (_, i) => i !== idx,
                                ),
                              })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px]">Warning Bawah</Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.warningLower}
                            onChange={(e) => {
                              const next = [...form.costThresholds];
                              next[idx].warningLower = e.target.value;
                              setForm({ ...form, costThresholds: next });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Warning Atas</Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.warningUpper}
                            onChange={(e) => {
                              const next = [...form.costThresholds];
                              next[idx].warningUpper = e.target.value;
                              setForm({ ...form, costThresholds: next });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Critical Bawah</Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.criticalLower}
                            onChange={(e) => {
                              const next = [...form.costThresholds];
                              next[idx].criticalLower = e.target.value;
                              setForm({ ...form, costThresholds: next });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Critical Atas</Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.criticalUpper}
                            onChange={(e) => {
                              const next = [...form.costThresholds];
                              next[idx].criticalUpper = e.target.value;
                              setForm({ ...form, costThresholds: next });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded border p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Realtime Thresholds
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      setForm({
                        ...form,
                        realtimeThresholds: [
                          ...form.realtimeThresholds,
                          createRealtimeThreshold(),
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                </div>
                {form.realtimeThresholds.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    Belum ada rule.
                  </p>
                ) : (
                  form.realtimeThresholds.map((row, idx) => (
                    <div
                      key={row.id}
                      className="rounded-md border p-2 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                        <div>
                          <Label className="text-[10px]">Metric</Label>
                          <Select
                            value={row.metricKey}
                            onValueChange={(value) => {
                              const next = [...form.realtimeThresholds];
                              next[idx].metricKey = value;
                              setForm({ ...form, realtimeThresholds: next });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REALTIME_METRIC_OPTIONS.map((metric) => (
                                <SelectItem
                                  key={metric.value}
                                  value={metric.value}
                                  className="text-xs"
                                >
                                  {metric.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px]">
                            Label (opsional)
                          </Label>
                          <Input
                            className="h-8 text-xs"
                            value={row.label}
                            onChange={(e) => {
                              const next = [...form.realtimeThresholds];
                              next[idx].label = e.target.value;
                              setForm({ ...form, realtimeThresholds: next });
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px]">
                            Warning Bawah{" "}
                            {isPowerMetricKey(row.metricKey) ? "(kW)" : ""}
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.warningLower}
                            onChange={(e) => {
                              const next = [...form.realtimeThresholds];
                              next[idx].warningLower = e.target.value;
                              setForm({ ...form, realtimeThresholds: next });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">
                            Warning Atas{" "}
                            {isPowerMetricKey(row.metricKey) ? "(kW)" : ""}
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.warningUpper}
                            onChange={(e) => {
                              const next = [...form.realtimeThresholds];
                              next[idx].warningUpper = e.target.value;
                              setForm({ ...form, realtimeThresholds: next });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">
                            Critical Bawah{" "}
                            {isPowerMetricKey(row.metricKey) ? "(kW)" : ""}
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.criticalLower}
                            onChange={(e) => {
                              const next = [...form.realtimeThresholds];
                              next[idx].criticalLower = e.target.value;
                              setForm({ ...form, realtimeThresholds: next });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">
                            Critical Atas{" "}
                            {isPowerMetricKey(row.metricKey) ? "(kW)" : ""}
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs"
                            value={row.criticalUpper}
                            onChange={(e) => {
                              const next = [...form.realtimeThresholds];
                              next[idx].criticalUpper = e.target.value;
                              setForm({ ...form, realtimeThresholds: next });
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() =>
                            setForm({
                              ...form,
                              realtimeThresholds:
                                form.realtimeThresholds.filter(
                                  (_, i) => i !== idx,
                                ),
                            })
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              className="text-xs"
              disabled={editingId ? !canUpdate : !canCreate}
            >
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
