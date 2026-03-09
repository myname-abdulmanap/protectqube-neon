"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cpu, Eye, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export default function DevicesPage() {
  const { hasPermission } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [filterScope, setFilterScope] = useState<string>("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canRead =
    hasPermission("devices:read") || hasPermission("manage_roles");
  const canCreate = hasPermission("devices:create") || hasPermission("manage_roles");
  const canUpdate = hasPermission("devices:update") || hasPermission("manage_roles");
  const canDelete = hasPermission("devices:delete") || hasPermission("manage_roles");

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [devicesRes, scopesRes] = await Promise.all([
        devicesApi.getAll(filterScope || undefined),
        scopesApi.getAll(),
      ]);

      if (devicesRes.success && devicesRes.data) {
        setDevices(devicesRes.data);
      }
      if (scopesRes.success && scopesRes.data) {
        setScopes(scopesRes.data);
      }
    } catch {
      setError("Failed to load device data");
    } finally {
      setIsLoading(false);
    }
  }, [filterScope]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const now = Date.now();
    return devices.map((device) => {
      const lastSeenMs = device.lastSeenAt
        ? new Date(device.lastSeenAt).getTime()
        : Number.NaN;
      const onlineByLastSeen =
        Number.isFinite(lastSeenMs) && now - lastSeenMs <= ONLINE_WINDOW_MS;
      const normalizedStored = (
        device.deviceStatus ||
        device.status ||
        ""
      ).toLowerCase();
      const isOnline = onlineByLastSeen || normalizedStored === "online";

      return {
        ...device,
        uiStatus: isOnline ? "online" : "offline",
      };
    });
  }, [devices]);

  const showValue = (
    value: string | number | null | undefined,
    unit?: string,
  ) => {
    if (value === null || value === undefined || value === "") return "-";
    return unit ? `${value} ${unit}` : String(value);
  };

  const handleOpenForm = (device?: Device) => {
    setEditDevice(device || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditDevice(null);
    setIsFormOpen(false);
  };

  const handleSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      scopeId: formData.get("scopeId") as string,
      name: formData.get("name") as string,
      serialNo: formData.get("serialNo") as string,
      locationName: formData.get("locationName") as string,
      locationType: formData.get("locationType") as string,
      firmwareVersion: formData.get("firmwareVersion") as string,
      isActive: formData.get("isActive") === "true",
    };

    // Status is managed automatically by system (default: offline, online when MQTT received)

    try {
      if (editDevice) {
        await devicesApi.update(editDevice.id, payload);
      } else {
        await devicesApi.create(payload);
      }
      handleCloseForm();
      void load();
    } catch {
      setError("Failed to save device");
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm("Are you sure you want to delete this device?")) return;
    try {
      await devicesApi.delete(deviceId);
      void load();
    } catch {
      setError("Failed to delete device");
    }
  };

  if (!canRead) {
    return (
      <div className="p-4 text-sm text-muted-foreground">No permission</div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Devices</h1>
        </div>

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
              {scopes.map((scope) => (
                <SelectItem key={scope.id} value={scope.id} className="text-xs">
                  {scope.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {canCreate && (
            <Button
              size="sm"
              onClick={() => handleOpenForm()}
              className="h-8 gap-1 text-xs"
            >
              <Plus className="h-3 w-3" />
              Add Device
            </Button>
          )}
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
                <TableHead className="text-xs">Device Name</TableHead>
                <TableHead className="text-xs">Device ID</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Last Seen</TableHead>
                <TableHead className="text-xs w-[120px]">Action</TableHead>
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
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-xs text-muted-foreground"
                  >
                    No devices
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="text-xs font-medium">
                      {device.name}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      {device.id}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          device.uiStatus === "online"
                            ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                        }`}
                      >
                        {device.uiStatus === "online"
                          ? "🟢 Online"
                          : "🔴 Offline"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {device.lastSeenAt
                        ? new Date(device.lastSeenAt).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setSelectedDevice(device)}
                          title="View Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canUpdate && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleOpenForm(device)}
                            title="Edit Device"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(device.id)}
                            title="Delete Device"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={Boolean(selectedDevice)}
        onOpenChange={() => setSelectedDevice(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Device Detail</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Basic Info Section */}
            <div className="rounded border p-3 bg-muted/30">
              <p className="mb-2 font-semibold text-xs">Basic Information</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Device Name</p>
                  <p className="font-medium">{selectedDevice?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Device ID</p>
                  <p className="font-mono">{selectedDevice?.id || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Serial Number</p>
                  <p>{selectedDevice?.serialNo || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Scope</p>
                  <p>{scopes.find(s => s.id === selectedDevice?.scopeId)?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p>{selectedDevice?.locationName || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location Type</p>
                  <p>{selectedDevice?.locationType || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Firmware</p>
                  <p>{selectedDevice?.firmwareVersion || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p>{selectedDevice?.status || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Active</p>
                  <p>{selectedDevice?.isActive ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Seen</p>
                  <p>{selectedDevice?.lastSeenAt ? new Date(selectedDevice.lastSeenAt).toLocaleString() : "-"}</p>
                </div>
              </div>
            </div>

            {/* System Health Section */}
            <div className="rounded border p-3">
              <p className="mb-2 font-semibold text-xs">System Health</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p>CPU Temp: {showValue(selectedDevice?.cpuTemp, "°C")}</p>
                <p>CPU Usage: {showValue(selectedDevice?.cpuUsage, "%")}</p>
                <p>
                  Memory: {showValue(selectedDevice?.memoryUsedMb)} /{" "}
                  {showValue(selectedDevice?.memoryTotalMb)} MB
                </p>
                <p>
                  Memory Usage:{" "}
                  {showValue(selectedDevice?.memoryUsagePercent, "%")}
                </p>
                <p>
                  Disk: {showValue(selectedDevice?.diskUsedGb)} /{" "}
                  {showValue(selectedDevice?.diskTotalGb)} GB
                </p>
                <p>
                  Disk Usage: {showValue(selectedDevice?.diskUsagePercent, "%")}
                </p>
                <p>Load Avg: {showValue(selectedDevice?.loadAverage)}</p>
                <p>Uptime: {showValue(selectedDevice?.uptime)}</p>
              </div>
            </div>

            {/* Network Section */}
            <div className="rounded border p-3">
              <p className="mb-2 font-semibold text-xs">Network</p>
              <div className="text-xs">
                <p>Internet Status: {showValue(selectedDevice?.internetStatus)}</p>
              </div>
            </div>

            {/* Power Section */}
            <div className="rounded border p-3">
              <p className="mb-2 font-semibold text-xs">Power</p>
              <div className="text-xs">
                <p>Power Status: {showValue(selectedDevice?.powerStatus)}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editDevice ? "Edit Device" : "Add Device"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitForm} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="scopeId" className="text-xs">Scope *</Label>
              <Select
                name="scopeId"
                defaultValue={editDevice?.scopeId || ""}
                required
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  {scopes.map((scope) => (
                    <SelectItem key={scope.id} value={scope.id} className="text-xs">
                      {scope.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs">Device Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editDevice?.name || ""}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNo" className="text-xs">Serial Number *</Label>
              <Input
                id="serialNo"
                name="serialNo"
                defaultValue={editDevice?.serialNo || ""}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="locationName" className="text-xs">Location</Label>
                <Input
                  id="locationName"
                  name="locationName"
                  defaultValue={editDevice?.locationName || ""}
                  className="text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationType" className="text-xs">Location Type</Label>
                <Input
                  id="locationType"
                  name="locationType"
                  defaultValue={editDevice?.locationType || ""}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firmwareVersion" className="text-xs">Firmware</Label>
              <Input
                id="firmwareVersion"
                name="firmwareVersion"
                defaultValue={editDevice?.firmwareVersion || ""}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isActive" className="text-xs">Active</Label>
              <Select
                name="isActive"
                defaultValue={editDevice?.isActive ? "true" : "false"}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true" className="text-xs">Yes</SelectItem>
                  <SelectItem value="false" className="text-xs">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseForm}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                {editDevice ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
