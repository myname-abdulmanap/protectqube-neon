"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Pencil, Trash2, Plus, Zap } from "lucide-react";

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
    maxLoadKw: "",
    upperLimitKwh: "",
    anomalyPct: "",
    baselineDays: "",
    validFrom: "",
  });

  const canManage =
    hasPermission("manage_roles") || hasPermission("energy_configs:read");

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
      maxLoadKw: "",
      upperLimitKwh: "",
      anomalyPct: "",
      baselineDays: "",
      validFrom: "",
    });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };
  const openEdit = (c: EnergyConfig) => {
    setEditingId(c.id);
    setForm({
      scopeId: c.scopeId,
      pricePerKwh: String(c.pricePerKwh),
      maxLoadKw: c.maxLoadKw ? String(c.maxLoadKw) : "",
      upperLimitKwh: c.upperLimitKwh ? String(c.upperLimitKwh) : "",
      anomalyPct: c.anomalyPct ? String(c.anomalyPct) : "",
      baselineDays: c.baselineDays ? String(c.baselineDays) : "",
      validFrom: c.validFrom
        ? new Date(c.validFrom).toISOString().slice(0, 16)
        : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.scopeId || !form.pricePerKwh) return;
    try {
      const payload = {
        scopeId: form.scopeId,
        pricePerKwh: parseFloat(form.pricePerKwh),
        maxLoadKw: form.maxLoadKw ? parseFloat(form.maxLoadKw) : undefined,
        upperLimitKwh: form.upperLimitKwh
          ? parseFloat(form.upperLimitKwh)
          : undefined,
        anomalyPct: form.anomalyPct ? parseFloat(form.anomalyPct) : undefined,
        baselineDays: form.baselineDays
          ? parseInt(form.baselineDays, 10)
          : undefined,
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
    if (!confirm("Delete this config?")) return;
    try {
      await energyConfigsApi.delete(id);
      load();
    } catch {
      setError("Failed to delete");
    }
  };

  if (!canManage)
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
          <Button size="sm" onClick={openCreate} className="h-8 text-xs">
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
                <TableHead className="text-xs">Price/kWh</TableHead>
                <TableHead className="text-xs">Max Load (kW)</TableHead>
                <TableHead className="text-xs">Upper Limit</TableHead>
                <TableHead className="text-xs">Deviasi %</TableHead>
                <TableHead className="text-xs">Baseline (hari)</TableHead>
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
                    <TableCell className="text-xs font-mono">
                      {c.pricePerKwh}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.maxLoadKw ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.upperLimitKwh ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.anomalyPct ? c.anomalyPct + "%" : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.baselineDays ?? 7}
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
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
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
        <DialogContent className="sm:max-w-md">
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Price per kWh *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.pricePerKwh}
                  onChange={(e) =>
                    setForm({ ...form, pricePerKwh: e.target.value })
                  }
                  placeholder="1500"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Max Load (kW)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.maxLoadKw}
                  onChange={(e) =>
                    setForm({ ...form, maxLoadKw: e.target.value })
                  }
                  placeholder="5.5"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Upper Limit (kWh)</Label>
                <Input
                  type="number"
                  value={form.upperLimitKwh}
                  onChange={(e) =>
                    setForm({ ...form, upperLimitKwh: e.target.value })
                  }
                  placeholder="10000"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Deviasi %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.anomalyPct}
                  onChange={(e) =>
                    setForm({ ...form, anomalyPct: e.target.value })
                  }
                  placeholder="15"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Baseline Days</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.baselineDays}
                  onChange={(e) =>
                    setForm({ ...form, baselineDays: e.target.value })
                  }
                  placeholder="7"
                  className="h-8 text-xs"
                />
              </div>
            </div>
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
            <Button size="sm" onClick={handleSubmit} className="text-xs">
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
