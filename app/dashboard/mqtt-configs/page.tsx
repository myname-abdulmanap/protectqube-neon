"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  mqttConfigsApi,
  devicesApi,
  type MqttConfig,
  type Device,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Pencil,
  Trash2,
  Plus,
  Radio,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function MqttConfigsPage() {
  const { hasPermission } = useAuth();
  const [configs, setConfigs] = useState<MqttConfig[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDeviceId, setFilterDeviceId] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNewModule, setIsNewModule] = useState(false);
  const [expandedDeviceIds, setExpandedDeviceIds] = useState<
    Record<string, boolean>
  >({});
  const [form, setForm] = useState({
    deviceId: "",
    brokerUrl: "",
    clientId: "",
    username: "",
    password: "",
    topicSubscribe: "",
    topicRole: "report",
    parserKey: "power_meter",
    topicPublish: "",
    qos: 0,
    isActive: true,
  });

  const canManage =
    hasPermission("manage_roles") || hasPermission("mqtt_configs:read");

  const moduleLabel = (config: MqttConfig): string => {
    const parserKey = config.parserKey?.trim();
    if (parserKey) return parserKey;
    return `mqtt-${config.topicRole || "report"}`;
  };

  const groupedConfigs = useMemo(() => {
    const map = new Map<
      string,
      {
        deviceId: string;
        deviceName: string;
        modules: Map<string, MqttConfig[]>;
      }
    >();

    const filtered = filterDeviceId
      ? configs.filter((config) => config.deviceId === filterDeviceId)
      : configs;

    for (const config of filtered) {
      const deviceName =
        config.device?.name ||
        devices.find((device) => device.id === config.deviceId)?.name ||
        "Unknown Device";
      const moduleName = moduleLabel(config);

      const deviceGroup = map.get(config.deviceId) ?? {
        deviceId: config.deviceId,
        deviceName,
        modules: new Map<string, MqttConfig[]>(),
      };

      const moduleItems = deviceGroup.modules.get(moduleName) ?? [];
      moduleItems.push(config);
      deviceGroup.modules.set(moduleName, moduleItems);
      map.set(config.deviceId, deviceGroup);
    }

    return Array.from(map.values())
      .map((deviceGroup) => ({
        ...deviceGroup,
        moduleGroups: Array.from(deviceGroup.modules.entries())
          .map(([name, items]) => ({
            name,
            items: [...items].sort((a, b) =>
              a.topicSubscribe.localeCompare(b.topicSubscribe),
            ),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.deviceName.localeCompare(b.deviceName));
  }, [configs, devices, filterDeviceId]);

  const moduleOptions = useMemo(() => {
    if (!form.deviceId) return [];

    const names = new Set<string>();
    for (const config of configs) {
      if (config.deviceId !== form.deviceId) continue;
      const parserKey = config.parserKey?.trim();
      if (parserKey) names.add(parserKey);
    }

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [configs, form.deviceId]);

  const load = async () => {
    try {
      setIsLoading(true);
      const [cRes, sbRes] = await Promise.all([
        mqttConfigsApi.getAll(filterDeviceId || undefined),
        devicesApi.getAll(),
      ]);
      if (cRes.success && cRes.data) setConfigs(cRes.data);
      if (sbRes.success && sbRes.data) setDevices(sbRes.data);
    } catch {
      setError("Failed to load configs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterDeviceId]);

  const resetForm = () => {
    setForm({
      deviceId: "",
      brokerUrl: "",
      clientId: "",
      username: "",
      password: "",
      topicSubscribe: "",
      topicRole: "report",
      parserKey: "power_meter",
      topicPublish: "",
      qos: 0,
      isActive: true,
    });
    setIsNewModule(false);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };
  const openEdit = (c: MqttConfig) => {
    const parserKey = c.parserKey?.trim() || "";
    setEditingId(c.id);
    setForm({
      deviceId: c.deviceId,
      brokerUrl: c.brokerUrl,
      clientId: c.clientId || "",
      username: c.username || "",
      password: c.password || "",
      topicSubscribe: c.topicSubscribe || "",
      topicRole: c.topicRole || "report",
      parserKey,
      topicPublish: c.topicPublish || "",
      qos: c.qos,
      isActive: c.isActive,
    });
    setIsNewModule(!parserKey);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (
      !form.deviceId ||
      !form.brokerUrl ||
      !form.clientId ||
      !form.topicSubscribe
    )
      return;

    if (!form.parserKey.trim()) {
      setError("Nama module fungsi MQTT wajib diisi");
      return;
    }
    try {
      const payload = {
        ...form,
        username: form.username || undefined,
        password: form.password || undefined,
        parserKey: form.parserKey || undefined,
        topicPublish: form.topicPublish || undefined,
      };
      if (editingId) {
        await mqttConfigsApi.update(editingId, payload);
      } else {
        await mqttConfigsApi.create(payload);
      }
      setModalOpen(false);
      resetForm();
      load();
    } catch {
      setError("Failed to save config");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this MQTT config?")) return;
    try {
      await mqttConfigsApi.delete(id);
      load();
    } catch {
      setError("Failed to delete");
    }
  };

  const toggleDevice = (deviceId: string) => {
    setExpandedDeviceIds((prev) => ({
      ...prev,
      [deviceId]: !prev[deviceId],
    }));
  };

  if (!canManage)
    return (
      <div className="p-4 text-sm text-muted-foreground">No permission</div>
    );

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          <h1 className="text-lg font-semibold">MQTT Configs</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link href="/dashboard/mqtt-messages">History MQTT</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Device:</Label>
            <Select
              value={filterDeviceId || "all"}
              onValueChange={(value) =>
                setFilterDeviceId(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="All devices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All devices
                </SelectItem>
                {devices.map((device) => (
                  <SelectItem
                    key={device.id}
                    value={device.id}
                    className="text-xs"
                  >
                    {device.name}
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
        <CardContent className="space-y-4 p-4">
          {isLoading ? (
            <div className="text-center text-xs text-muted-foreground">
              Loading...
            </div>
          ) : groupedConfigs.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground">
              No configs
            </div>
          ) : (
            groupedConfigs.map((deviceGroup) => (
              <div
                key={deviceGroup.deviceId}
                className="space-y-3 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-left"
                    onClick={() => toggleDevice(deviceGroup.deviceId)}
                  >
                    {expandedDeviceIds[deviceGroup.deviceId] ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <h3 className="text-sm font-semibold">
                      {deviceGroup.deviceName}
                    </h3>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground">
                      {deviceGroup.moduleGroups.length} module
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {deviceGroup.moduleGroups.reduce(
                        (total, moduleGroup) =>
                          total + moduleGroup.items.length,
                        0,
                      )}{" "}
                      mqtt item
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => toggleDevice(deviceGroup.deviceId)}
                    >
                      {expandedDeviceIds[deviceGroup.deviceId]
                        ? "Hide"
                        : "Show"}
                    </Button>
                  </div>
                </div>

                {expandedDeviceIds[deviceGroup.deviceId] &&
                  deviceGroup.moduleGroups.map((moduleGroup) => (
                    <div
                      key={`${deviceGroup.deviceId}-${moduleGroup.name}`}
                      className="space-y-2 rounded-md bg-muted/30 p-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          Module: {moduleGroup.name}
                        </p>
                        <span className="text-[11px] text-muted-foreground">
                          {moduleGroup.items.length} mqtt item
                        </span>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Role</TableHead>
                            <TableHead className="text-xs">Subscribe</TableHead>
                            <TableHead className="text-xs">Publish</TableHead>
                            <TableHead className="text-xs">Broker</TableHead>
                            <TableHead className="text-xs">QoS</TableHead>
                            <TableHead className="text-xs">Active</TableHead>
                            <TableHead className="text-xs w-[80px]">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {moduleGroup.items.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="text-xs">
                                {c.topicRole || "-"}
                              </TableCell>
                              <TableCell className="text-xs font-mono max-w-[200px] truncate">
                                {c.topicSubscribe || "-"}
                              </TableCell>
                              <TableCell className="text-xs font-mono max-w-[160px] truncate">
                                {c.topicPublish || "-"}
                              </TableCell>
                              <TableCell className="text-xs font-mono max-w-[180px] truncate">
                                {c.brokerUrl || "-"}
                              </TableCell>
                              <TableCell className="text-xs">{c.qos}</TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${c.isActive ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}
                                >
                                  {c.isActive ? "Active" : "Inactive"}
                                </span>
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
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
              </div>
            ))
          )}
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
              {editingId ? "Edit" : "New"} MQTT Config
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingId
                ? "Update item MQTT pada module device"
                : "Pilih device, tentukan module fungsi MQTT, lalu isi item MQTT"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <div>
              <Label className="text-xs">Device *</Label>
              <Select
                value={form.deviceId}
                onValueChange={(v) => {
                  const firstExistingModule = configs.find(
                    (config) =>
                      config.deviceId === v && config.parserKey?.trim(),
                  )?.parserKey;

                  setForm({
                    ...form,
                    deviceId: v,
                    parserKey: firstExistingModule || "",
                  });
                  setIsNewModule(!firstExistingModule);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem
                      key={device.id}
                      value={device.id}
                      className="text-xs"
                    >
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Broker URL *</Label>
              <Input
                value={form.brokerUrl}
                onChange={(e) =>
                  setForm({ ...form, brokerUrl: e.target.value })
                }
                placeholder="mqtt://broker.example.com:1883"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nama Module Fungsi MQTT *</Label>
                {!isNewModule ? (
                  <Select
                    value={form.parserKey || "__new__"}
                    onValueChange={(value) => {
                      if (value === "__new__") {
                        setIsNewModule(true);
                        setForm({ ...form, parserKey: "" });
                        return;
                      }

                      setIsNewModule(false);
                      setForm({ ...form, parserKey: value });
                    }}
                    disabled={!form.deviceId}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Pilih module" />
                    </SelectTrigger>
                    <SelectContent>
                      {moduleOptions.map((moduleName) => (
                        <SelectItem
                          key={moduleName}
                          value={moduleName}
                          className="text-xs"
                        >
                          {moduleName}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__" className="text-xs">
                        + Buat module baru
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-1">
                    <Input
                      value={form.parserKey}
                      onChange={(e) =>
                        setForm({ ...form, parserKey: e.target.value })
                      }
                      placeholder="contoh: alert_ai, alert_report"
                      className="h-8 text-xs"
                      disabled={!form.deviceId}
                    />
                    {moduleOptions.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-0 text-[11px]"
                        onClick={() => {
                          setIsNewModule(false);
                          setForm({ ...form, parserKey: moduleOptions[0] });
                        }}
                      >
                        Gunakan module existing
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">Client ID</Label>
                <Input
                  value={form.clientId}
                  onChange={(e) =>
                    setForm({ ...form, clientId: e.target.value })
                  }
                  placeholder="client-id"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">QoS</Label>
                <Select
                  value={String(form.qos)}
                  onValueChange={(v) => setForm({ ...form, qos: Number(v) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="text-xs">
                      0 - At most once
                    </SelectItem>
                    <SelectItem value="1" className="text-xs">
                      1 - At least once
                    </SelectItem>
                    <SelectItem value="2" className="text-xs">
                      2 - Exactly once
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Username</Label>
                <Input
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  placeholder="mqtt-user"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="********"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Subscribe Topic</Label>
                <Input
                  value={form.topicSubscribe}
                  onChange={(e) =>
                    setForm({ ...form, topicSubscribe: e.target.value })
                  }
                  placeholder="device/+/data"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Topic Role</Label>
                <Select
                  value={form.topicRole}
                  onValueChange={(v) => setForm({ ...form, topicRole: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="report" className="text-xs">
                      report
                    </SelectItem>
                    <SelectItem value="alert" className="text-xs">
                      alert
                    </SelectItem>
                    <SelectItem value="health" className="text-xs">
                      health
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Publish Topic</Label>
                <Input
                  value={form.topicPublish}
                  onChange={(e) =>
                    setForm({ ...form, topicPublish: e.target.value })
                  }
                  placeholder="device/+/cmd"
                  className="h-8 text-xs"
                />
              </div>
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
