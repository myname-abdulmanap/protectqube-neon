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
    maxLoadKw: "",
    capacityVa: "",
    upperLimitKwh: "",
    startPointStartAt: "",
    startPointInitialKwh: "",
    validFrom: "",
    consumptionThresholds: [] as Array<{
      id: string;
      period: string;
      thresholds: Array<{ value: string; severity: string }>;
    }>,
    costThresholds: [] as Array<{
      id: string;
      period: string;
      thresholds: Array<{ value: string; severity: string }>;
    }>,
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
      maxLoadKw: "",
      capacityVa: "",
      upperLimitKwh: "",
      startPointStartAt: "",
      startPointInitialKwh: "",
      validFrom: "",
      consumptionThresholds: [],
      costThresholds: [],
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
      tariff?.mode === "tou" && Array.isArray(tariff.touPeriods) && tariff.touPeriods.length > 0
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
      maxLoadKw: c.maxLoadKw ? String(c.maxLoadKw) : "",
      capacityVa: c.capacityVa ? String(c.capacityVa) : "",
      upperLimitKwh: c.upperLimitKwh ? String(c.upperLimitKwh) : "",
      startPointStartAt: c.config?.startPoint?.startAt
        ? new Date(c.config.startPoint.startAt).toISOString().slice(0, 16)
        : "",
      startPointInitialKwh:
        c.config?.startPoint?.initialKwh !== undefined
          ? String(c.config.startPoint.initialKwh)
          : "",
      validFrom: c.validFrom
        ? new Date(c.validFrom).toISOString().slice(0, 16)
        : "",
      consumptionThresholds: (c.config?.consumptionThresholds || []).map((ct) => ({
        id: ct.id || `threshold-${Date.now()}-${Math.random()}`,
        period: ct.period,
        thresholds: ct.thresholds.map((t) => ({
          value: String(t.value),
          severity: t.severity,
        })),
      })),
      costThresholds: (c.config?.costThresholds || []).map((ct) => ({
        id: ct.id || `cost-threshold-${Date.now()}-${Math.random()}`,
        period: ct.period,
        thresholds: ct.thresholds.map((t) => ({
          value: String(t.value),
          severity: t.severity,
        })),
      })),
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

      type ThresholdPayload = {
        id: string;
        period: string;
        thresholds: Array<{
          value: number;
          severity: string;
        }>;
      };

      const config: {
        startPoint?: {
          startAt: string;
          initialKwh: number;
        };
        tariff?: TariffConfigPayload;
        consumptionThresholds?: ThresholdPayload[];
        costThresholds?: ThresholdPayload[];
      } = {};
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

      // Add consumption thresholds if provided
      if (form.consumptionThresholds.length > 0) {
        config.consumptionThresholds = form.consumptionThresholds.map((ct) => ({
          ...ct,
          thresholds: ct.thresholds.map((t) => ({
            value: parseFloat(t.value),
            severity: t.severity,
          })),
        }));
      }

      if (form.costThresholds.length > 0) {
        config.costThresholds = form.costThresholds.map((ct) => ({
          ...ct,
          thresholds: ct.thresholds.map((t) => ({
            value: parseFloat(t.value),
            severity: t.severity,
          })),
        }));
      }

      const resolvedPricePerKwh = tariffMode === "flat"
        ? (form.flatPricePerKwh
            ? parseFloat(form.flatPricePerKwh)
            : form.pricePerKwh
              ? parseFloat(form.pricePerKwh)
              : 0)
        : (() => {
            const prices = form.touPeriods
              .map((p) => parseFloat(p.pricePerKwh))
              .filter((v) => Number.isFinite(v));
            if (!prices.length) return 0;
            return prices.reduce((sum, v) => sum + v, 0) / prices.length;
          })();

      const payload = {
        scopeId: form.scopeId,
        pricePerKwh: resolvedPricePerKwh,
        maxLoadKw: form.maxLoadKw ? parseFloat(form.maxLoadKw) : undefined,
        capacityVa: form.capacityVa ? parseFloat(form.capacityVa) : undefined,
        upperLimitKwh: form.upperLimitKwh
          ? parseFloat(form.upperLimitKwh)
          : undefined,
        config: Object.keys(config).length > 0 ? config : undefined,
        validFrom: form.validFrom
          ? new Date(form.validFrom).toISOString()
          : new Date().toISOString(),
      };

      if (editingId) {
        await energyConfigsApi.update(editingId, payload);
      } else {
        await energyConfigsApi.create(payload);
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
                <TableHead className="text-xs">Kapasitas kW</TableHead>
                <TableHead className="text-xs">Kapasitas VA</TableHead>
                <TableHead className="text-xs">Kapasitas kWh</TableHead>
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
                    colSpan={11}
                    className="text-center text-xs text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : configs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
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
                      {c.maxLoadKw ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.capacityVa ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.upperLimitKwh ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.config?.consumptionThresholds &&
                      c.config.consumptionThresholds.length > 0 ? (
                        <div className="space-y-1">
                          {c.config.consumptionThresholds.map((t) => (
                            <div key={t.id} className="text-xs">
                              <span className="font-medium">{t.period}:</span>{" "}
                              {t.thresholds
                                .map(
                                  (th) =>
                                    `${th.severity}: ${th.value} kWh`
                                )
                                .join(", ")}
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Tariff Mode *</Label>
                  <Select
                    value={form.tariffMode}
                    onValueChange={(value) =>
                      setForm({ ...form, tariffMode: value === "tou" ? "tou" : "flat" })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat" className="text-xs">Flat</SelectItem>
                      <SelectItem value="tou" className="text-xs">TOU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Max Load (kW)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.maxLoadKw}
                    onChange={(e) => setForm({ ...form, maxLoadKw: e.target.value })}
                    placeholder="5.5"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Capacity (VA)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={form.capacityVa}
                    onChange={(e) => setForm({ ...form, capacityVa: e.target.value })}
                    placeholder="22000"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Row 2: Limit kWh */}
              <div>
                <Label className="text-xs">Limit Konsumsi Harian (kWh)</Label>
                <Input
                  type="number"
                  value={form.upperLimitKwh}
                  onChange={(e) => setForm({ ...form, upperLimitKwh: e.target.value })}
                  placeholder="10000"
                  className="h-8 text-xs"
                />
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
                      setForm({ ...form, flatPricePerKwh: e.target.value, pricePerKwh: e.target.value })
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
                    <Label className="text-xs font-semibold">TOU Periods (WIB)</Label>
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
                            { id: `tou-${Date.now()}`, label: "Custom", startTime: "00:00", endTime: "23:59", pricePerKwh: "" },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Period
                    </Button>
                  </div>
                  <div className="grid grid-cols-12 gap-1 mb-1">
                    <p className="col-span-3 text-[10px] text-muted-foreground">Label</p>
                    <p className="col-span-3 text-[10px] text-muted-foreground">Mulai (WIB)</p>
                    <p className="col-span-3 text-[10px] text-muted-foreground">Selesai (WIB)</p>
                    <p className="col-span-2 text-[10px] text-muted-foreground">Rp/kWh</p>
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
                            setForm({ ...form, touPeriods: form.touPeriods.filter((_, idx) => idx !== periodIndex) })
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Valid From</Label>
                  <Input
                    type="datetime-local"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Starting Point Datetime</Label>
                  <Input
                    type="datetime-local"
                    value={form.startPointStartAt}
                    onChange={(e) => setForm({ ...form, startPointStartAt: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Initial kWh</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.startPointInitialKwh}
                    onChange={(e) => setForm({ ...form, startPointInitialKwh: e.target.value })}
                    placeholder="365.7645"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

            {/* Consumption Thresholds Section */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">
                  Consumption Thresholds (Multi-Period)
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  className="h-6 text-xs"
                  onClick={() => {
                    const newThreshold = {
                      id: `threshold-${Date.now()}`,
                      period: "7d",
                      thresholds: [
                        { value: "", severity: "warning" },
                        { value: "", severity: "critical" },
                      ],
                    };
                    setForm({
                      ...form,
                      consumptionThresholds: [
                        ...form.consumptionThresholds,
                        newThreshold,
                      ],
                    });
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Period
                </Button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {form.consumptionThresholds.map((ct, ctIdx) => (
                  <div key={ct.id} className="border rounded p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-xs w-16">Period:</Label>
                      <Select
                        value={ct.period}
                        onValueChange={(value) => {
                          const updated = [...form.consumptionThresholds];
                          updated[ctIdx].period = value;
                          setForm({ ...form, consumptionThresholds: updated });
                        }}
                      >
                        <SelectTrigger className="h-6 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1d" className="text-xs">
                            Daily (1d)
                          </SelectItem>
                          <SelectItem value="7d" className="text-xs">
                            Weekly (7d)
                          </SelectItem>
                          <SelectItem value="30d" className="text-xs">
                            Monthly (30d)
                          </SelectItem>
                          <SelectItem value="90d" className="text-xs">
                            Quarterly (90d)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        type="button"
                        className="h-6 w-6 text-destructive"
                        onClick={() => {
                          setForm({
                            ...form,
                            consumptionThresholds:
                              form.consumptionThresholds.filter(
                                (_, i) => i !== ctIdx
                              ),
                          });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      {ct.thresholds.map((th, thIdx) => (
                        <div
                          key={`${ct.id}-${thIdx}`}
                          className="flex items-center gap-2"
                        >
                          <Label className="text-xs w-20">
                            {th.severity}:
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={th.value}
                            onChange={(e) => {
                              const updated = [...form.consumptionThresholds];
                              updated[ctIdx].thresholds[thIdx].value =
                                e.target.value;
                              setForm({
                                ...form,
                                consumptionThresholds: updated,
                              });
                            }}
                            placeholder="500 kWh"
                            className="h-6 text-xs flex-1"
                          />
                          <span className="text-xs text-muted-foreground">
                            kWh
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Thresholds Section */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">
                  Cost Thresholds (Periode Biaya)
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  className="h-6 text-xs"
                  onClick={() => {
                    const newThreshold = {
                      id: `cost-threshold-${Date.now()}`,
                      period: "7d",
                      thresholds: [
                        { value: "", severity: "warning" },
                        { value: "", severity: "critical" },
                      ],
                    };
                    setForm({
                      ...form,
                      costThresholds: [...form.costThresholds, newThreshold],
                    });
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Period
                </Button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {form.costThresholds.map((ct, ctIdx) => (
                  <div key={ct.id} className="border rounded p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-xs w-16">Period:</Label>
                      <Select
                        value={ct.period}
                        onValueChange={(value) => {
                          const updated = [...form.costThresholds];
                          updated[ctIdx].period = value;
                          setForm({ ...form, costThresholds: updated });
                        }}
                      >
                        <SelectTrigger className="h-6 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1d" className="text-xs">Daily (1d)</SelectItem>
                          <SelectItem value="7d" className="text-xs">Weekly (7d)</SelectItem>
                          <SelectItem value="30d" className="text-xs">Monthly (30d)</SelectItem>
                          <SelectItem value="90d" className="text-xs">Quarterly (90d)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        type="button"
                        className="h-6 w-6 text-destructive"
                        onClick={() => {
                          setForm({
                            ...form,
                            costThresholds: form.costThresholds.filter((_, i) => i !== ctIdx),
                          });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      {ct.thresholds.map((th, thIdx) => (
                        <div key={`${ct.id}-${thIdx}`} className="flex items-center gap-2">
                          <Label className="text-xs w-20">{th.severity}:</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={th.value}
                            onChange={(e) => {
                              const updated = [...form.costThresholds];
                              updated[ctIdx].thresholds[thIdx].value = e.target.value;
                              setForm({ ...form, costThresholds: updated });
                            }}
                            placeholder="1000000"
                            className="h-6 text-xs flex-1"
                          />
                          <span className="text-xs text-muted-foreground">Rp</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
