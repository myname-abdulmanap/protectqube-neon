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
import { devicesApi, scopesApi, type Device, type Scope } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Pencil, Trash2, Plus, Cpu } from "lucide-react";

export default function DevicesPage() {
  const { hasPermission } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterScope, setFilterScope] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    scopeId: "",
    name: "",
    serialNo: "",
    locationName: "",
    locationType: "",
    firmwareVersion: "",
    status: "offline",
    isActive: true,
  });

  const canManage =
    hasPermission("manage_roles") || hasPermission("devices:read");

  const load = async () => {
    try {
      setIsLoading(true);
      const [dRes, scRes] = await Promise.all([
        devicesApi.getAll(filterScope || undefined),
        scopesApi.getAll(),
      ]);
      if (dRes.success && dRes.data) setDevices(dRes.data);
      if (scRes.success && scRes.data) setScopes(scRes.data);
    } catch {
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterScope]);

  const resetForm = () => {
    setForm({
      scopeId: "",
      name: "",
      serialNo: "",
      locationName: "",
      locationType: "",
      firmwareVersion: "",
      status: "offline",
      isActive: true,
    });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };
  const openEdit = (d: Device) => {
    setEditingId(d.id);
    setForm({
      scopeId: d.scopeId,
      name: d.name,
      serialNo: d.serialNo,
      locationName: d.locationName || "",
      locationType: d.locationType || "",
      firmwareVersion: d.firmwareVersion || "",
      status: d.status || "offline",
      isActive: d.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.scopeId || !form.name || !form.serialNo) return;
    try {
      const payload = {
        scopeId: form.scopeId,
        name: form.name,
        serialNo: form.serialNo,
        locationName: form.locationName || undefined,
        locationType: form.locationType || undefined,
        firmwareVersion: form.firmwareVersion || undefined,
        status: form.status || undefined,
        isActive: form.isActive,
      };
      if (editingId) {
        await devicesApi.update(editingId, payload);
      } else {
        await devicesApi.create(payload);
      }
      setModalOpen(false);
      resetForm();
      load();
    } catch {
      setError("Failed to save device");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this device?")) return;
    try {
      await devicesApi.delete(id);
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
          <Cpu className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Devices</h1>
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
            Add Device
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
                <TableHead className="text-xs">Device ID</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Serial No</TableHead>
                <TableHead className="text-xs">Scope</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs">Loc Type</TableHead>
                <TableHead className="text-xs">Firmware</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Last Seen</TableHead>
                <TableHead className="text-xs">Active</TableHead>
                <TableHead className="text-xs w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-xs text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : devices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-xs text-muted-foreground"
                  >
                    No devices
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs font-mono text-slate-500">
                      {d.id}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {d.name}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {d.serialNo}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.scope?.name || "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.locationName || "-"}
                    </TableCell>
                    <TableCell>
                      {d.locationType ? (
                        <span className="inline-flex rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-500/20 dark:text-purple-400">
                          {d.locationType}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.firmwareVersion || "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${d.status === "online" ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300"}`}
                      >
                        {d.status || "offline"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.lastSeenAt
                        ? new Date(d.lastSeenAt).toLocaleString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${d.isActive ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}
                      >
                        {d.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => openEdit(d)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDelete(d.id)}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingId ? "Edit" : "New"} Device
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingId ? "Update device details" : "Create a new device"}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Device name"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Serial No *</Label>
                <Input
                  value={form.serialNo}
                  onChange={(e) =>
                    setForm({ ...form, serialNo: e.target.value })
                  }
                  placeholder="SN-00001"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Location Name</Label>
                <Input
                  value={form.locationName}
                  onChange={(e) =>
                    setForm({ ...form, locationName: e.target.value })
                  }
                  placeholder="e.g. Building A, Room 101"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Location Type</Label>
                <Input
                  value={form.locationType}
                  onChange={(e) =>
                    setForm({ ...form, locationType: e.target.value })
                  }
                  placeholder="e.g. area, zone, room..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Firmware</Label>
                <Input
                  value={form.firmwareVersion}
                  onChange={(e) =>
                    setForm({ ...form, firmwareVersion: e.target.value })
                  }
                  placeholder="v1.0.0"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offline" className="text-xs">
                      Offline
                    </SelectItem>
                    <SelectItem value="online" className="text-xs">
                      Online
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-end gap-2 pb-1">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                <Label className="text-xs">Active</Label>
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
