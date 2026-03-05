"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  deviceModulesApi,
  devicesApi,
  type DeviceModule,
  type Device,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Pencil, Trash2, Plus, Puzzle } from "lucide-react";

export default function SmartboxModulesPage() {
  const { hasPermission } = useAuth();
  const [modules, setModules] = useState<DeviceModule[]>([]);
  const [smartboxes, setSmartboxes] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSb, setFilterSb] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    deviceId: "",
    moduleType: "",
    config: "{}",
    isActive: true,
  });

  const canManage =
    hasPermission("manage_roles") || hasPermission("device_modules:read");

  const load = async () => {
    try {
      setIsLoading(true);
      const [mRes, sbRes] = await Promise.all([
        deviceModulesApi.getAll(filterSb || undefined),
        devicesApi.getAll(),
      ]);
      if (mRes.success && mRes.data) setModules(mRes.data);
      if (sbRes.success && sbRes.data) setSmartboxes(sbRes.data);
    } catch {
      setError("Failed to load modules");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterSb]);

  const resetForm = () => {
    setForm({ deviceId: "", moduleType: "", config: "{}", isActive: true });
    setEditingId(null);
  };
  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };
  const openEdit = (m: DeviceModule) => {
    setEditingId(m.id);
    setForm({
      deviceId: m.deviceId,
      moduleType: m.moduleType,
      config: JSON.stringify(m.config || {}, null, 2),
      isActive: m.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.deviceId || !form.moduleType) return;
    try {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(form.config);
      } catch {
        /* keep empty */
      }
      const payload = {
        deviceId: form.deviceId,
        moduleType: form.moduleType,
        config: parsedConfig,
        isActive: form.isActive,
      };
      if (editingId) {
        await deviceModulesApi.update(editingId, payload);
      } else {
        await deviceModulesApi.create(payload);
      }
      setModalOpen(false);
      resetForm();
      load();
    } catch {
      setError("Failed to save module");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this module?")) return;
    try {
      await deviceModulesApi.delete(id);
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
          <Puzzle className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Device Modules</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Device:</Label>
            <Select
              value={filterSb || "all"}
              onValueChange={(value) =>
                setFilterSb(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="All devices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All devices
                </SelectItem>
                {smartboxes.map((sb) => (
                  <SelectItem key={sb.id} value={sb.id} className="text-xs">
                    {sb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={openCreate} className="h-8 text-xs">
            <Plus className="mr-1 h-3 w-3" />
            Add Module
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
                <TableHead className="text-xs">Module Type</TableHead>
                <TableHead className="text-xs">Device</TableHead>
                <TableHead className="text-xs">Config</TableHead>
                <TableHead className="text-xs">Active</TableHead>
                <TableHead className="text-xs w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-xs text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : modules.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-xs text-muted-foreground"
                  >
                    No modules
                  </TableCell>
                </TableRow>
              ) : (
                modules.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <span className="inline-flex rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                        {m.moduleType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {m.device?.name || "-"}
                    </TableCell>
                    <TableCell className="text-xs font-mono max-w-[200px] truncate">
                      {JSON.stringify(m.config || {})}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${m.isActive ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}
                      >
                        {m.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDelete(m.id)}
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
              {editingId ? "Edit" : "New"} Module
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingId
                ? "Update module details"
                : "Create a new device module"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Device *</Label>
              <Select
                value={form.deviceId}
                onValueChange={(v) => setForm({ ...form, deviceId: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  {smartboxes.map((sb) => (
                    <SelectItem key={sb.id} value={sb.id} className="text-xs">
                      {sb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Module Type *</Label>
              <Input
                value={form.moduleType}
                onChange={(e) =>
                  setForm({ ...form, moduleType: e.target.value })
                }
                placeholder="e.g. energy_meter, fuel_sensor, temperature..."
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Config (JSON)</Label>
              <textarea
                value={form.config}
                onChange={(e) => setForm({ ...form, config: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring min-h-[60px]"
                placeholder="{}"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label className="text-xs">Active</Label>
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
