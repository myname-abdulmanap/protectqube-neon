"use client";

import { useEffect, useState } from "react";
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
  alertEventsApi,
  alertActionsApi,
  deviceModulesApi,
  type AlertAction,
  type AlertEvent,
  type DeviceModule,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AlertTriangle, Pencil, Search, Settings2, Trash2 } from "lucide-react";

export default function AlertEventsPage() {
  const { hasPermission } = useAuth();
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [modules, setModules] = useState<DeviceModule[]>([]);
  const [actions, setActions] = useState<AlertAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [savingActionId, setSavingActionId] = useState<string | null>(null);

  const [actionForm, setActionForm] = useState({
    id: "",
    key: "",
    label: "",
    color: "#3B82F6",
    moduleType: "power_meter",
    isDefault: false,
    isActive: true,
    sortOrder: "0",
  });

  const [filterModule, setFilterModule] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  const canManage =
    hasPermission("manage_roles") || hasPermission("alert_events:read");
  const canUpdate =
    hasPermission("manage_roles") || hasPermission("alert_events:update");

  const normalizeActionModuleType = (moduleType: string): string =>
    moduleType.toLowerCase().includes("ai") ? "ai" : "power_meter";

  useEffect(() => {
    (async () => {
      try {
        const [moduleRes, actionRes] = await Promise.all([
          deviceModulesApi.getAll(),
          alertActionsApi.getAll(),
        ]);
        if (moduleRes.success && moduleRes.data) setModules(moduleRes.data);
        if (actionRes.success && actionRes.data) setActions(actionRes.data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const loadActions = async () => {
    const res = await alertActionsApi.getAll();
    if (res.success && res.data) setActions(res.data);
  };

  const moduleTypeOptions = Array.from(
    new Set(
      modules
        .map((module) => module.moduleType)
        .filter((moduleType): moduleType is string => Boolean(moduleType)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const query = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};
      if (filterModule && filterModule !== "all")
        params.moduleType = filterModule;
      if (filterSeverity && filterSeverity !== "all")
        params.severity = filterSeverity;
      if (filterFrom) params.from = new Date(filterFrom).toISOString();
      if (filterTo) params.to = new Date(filterTo).toISOString();
      const res = await alertEventsApi.getAll(params);
      if (res.success && res.data) setEvents(res.data);
    } catch {
      setError("Failed to load alert events");
    } finally {
      setIsLoading(false);
    }
  };

  const getActionsForModule = (moduleType: string) => {
    const normalized = normalizeActionModuleType(moduleType);
    return actions
      .filter((action) => action.moduleType === normalized && action.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const handleEventActionChange = async (eventId: string, actionId: string) => {
    try {
      setSavingActionId(eventId);
      const res = await alertEventsApi.updateAction(eventId, { actionId });
      if (res.success && res.data) {
        setEvents((prev) =>
          prev.map((item) => (item.id === eventId ? res.data! : item)),
        );
      }
    } catch {
      setError("Failed to update alert action");
    } finally {
      setSavingActionId(null);
    }
  };

  const resetActionForm = () => {
    setActionForm({
      id: "",
      key: "",
      label: "",
      color: "#3B82F6",
      moduleType: "power_meter",
      isDefault: false,
      isActive: true,
      sortOrder: "0",
    });
  };

  const handleSaveActionConfig = async () => {
    if (!actionForm.key || !actionForm.label || !actionForm.moduleType) return;
    try {
      const payload = {
        key: actionForm.key,
        label: actionForm.label,
        color: actionForm.color,
        moduleType: actionForm.moduleType,
        isDefault: actionForm.isDefault,
        isActive: actionForm.isActive,
        sortOrder: Number(actionForm.sortOrder) || 0,
      };
      if (actionForm.id) {
        await alertActionsApi.update(actionForm.id, payload);
      } else {
        await alertActionsApi.create(payload);
      }
      await loadActions();
      resetActionForm();
    } catch {
      setError("Failed to save action config");
    }
  };

  const handleEditAction = (action: AlertAction) => {
    setActionForm({
      id: action.id,
      key: action.key,
      label: action.label,
      color: action.color,
      moduleType: action.moduleType,
      isDefault: action.isDefault,
      isActive: action.isActive,
      sortOrder: String(action.sortOrder),
    });
  };

  const handleDeleteAction = async (id: string) => {
    if (!confirm("Delete this alert action?")) return;
    try {
      await alertActionsApi.delete(id);
      await loadActions();
      if (actionForm.id === id) resetActionForm();
    } catch {
      setError("Failed to delete action config");
    }
  };

  const severityColor = (s: string) => {
    switch (s.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
      case "suspicious":
        return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400";
      case "health":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300";
    }
  };

  if (!canManage)
    return (
      <div className="p-4 text-sm text-muted-foreground">No permission</div>
    );

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Alert Events</h1>
        {canUpdate && (
          <Button
            size="sm"
            variant="outline"
            className="ml-2 h-8 text-xs"
            onClick={() => setManageOpen(true)}
          >
            <Settings2 className="mr-1 h-3 w-3" />
            Manage Actions
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Module</Label>
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All modules
                  </SelectItem>
                  {moduleTypeOptions.map((moduleType) => (
                    <SelectItem
                      key={moduleType}
                      value={moduleType}
                      className="text-xs"
                    >
                      {moduleType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Severity</Label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All
                  </SelectItem>
                  <SelectItem value="health" className="text-xs">
                    Health
                  </SelectItem>
                  <SelectItem value="suspicious" className="text-xs">
                    Suspicious
                  </SelectItem>
                  <SelectItem value="critical" className="text-xs">
                    Critical
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input
                type="datetime-local"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="h-8 text-xs w-44"
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="datetime-local"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="h-8 text-xs w-44"
              />
            </div>
            <Button size="sm" onClick={query} className="h-8 text-xs">
              <Search className="mr-1 h-3 w-3" />
              Query
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Severity</TableHead>
                <TableHead className="text-xs">Alert Type</TableHead>
                <TableHead className="text-xs">Module</TableHead>
                <TableHead className="text-xs">Message</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-xs text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-xs text-muted-foreground"
                  >
                    No events — click Query to search
                  </TableCell>
                </TableRow>
              ) : (
                events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${severityColor(e.severity)}`}
                      >
                        {e.severity.toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{e.alertType}</TableCell>
                    <TableCell className="text-xs">
                      {e.moduleType || "-"}
                    </TableCell>
                    <TableCell className="text-xs max-w-[250px] truncate">
                      {e.description || "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {canUpdate ? (
                        <Select
                          value={e.actionId ?? undefined}
                          onValueChange={(value) =>
                            handleEventActionChange(e.id, value)
                          }
                          disabled={savingActionId === e.id}
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            {getActionsForModule(e.moduleType).map((action) => (
                              <SelectItem
                                key={action.id}
                                value={action.id}
                                className="text-xs"
                              >
                                {action.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span
                          className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                          style={{
                            backgroundColor: e.action?.color || "#64748B",
                          }}
                        >
                          {e.action?.label || "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(e.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={manageOpen}
        onOpenChange={(value) => {
          setManageOpen(value);
          if (!value) resetActionForm();
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Alert Action Management
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manage action name, color, default, and module target.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs">Action Key *</Label>
              <Input
                value={actionForm.key}
                onChange={(e) =>
                  setActionForm({ ...actionForm, key: e.target.value })
                }
                className="h-8 text-xs"
                placeholder="open"
              />
            </div>
            <div>
              <Label className="text-xs">Action Label *</Label>
              <Input
                value={actionForm.label}
                onChange={(e) =>
                  setActionForm({ ...actionForm, label: e.target.value })
                }
                className="h-8 text-xs"
                placeholder="Open"
              />
            </div>
            <div>
              <Label className="text-xs">Module *</Label>
              <Select
                value={actionForm.moduleType}
                onValueChange={(value) =>
                  setActionForm({ ...actionForm, moduleType: value })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="power_meter" className="text-xs">
                    power_meter
                  </SelectItem>
                  <SelectItem value="ai" className="text-xs">
                    ai
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Color</Label>
              <Input
                type="color"
                value={actionForm.color}
                onChange={(e) =>
                  setActionForm({ ...actionForm, color: e.target.value })
                }
                className="h-8 w-full p-1"
              />
            </div>
            <div>
              <Label className="text-xs">Sort Order</Label>
              <Input
                type="number"
                value={actionForm.sortOrder}
                onChange={(e) =>
                  setActionForm({ ...actionForm, sortOrder: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={actionForm.isDefault}
                  onChange={(e) =>
                    setActionForm({
                      ...actionForm,
                      isDefault: e.target.checked,
                    })
                  }
                />
                Default
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={actionForm.isActive}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, isActive: e.target.checked })
                  }
                />
                Active
              </label>
            </div>
          </div>

          <DialogFooter className="justify-between">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={resetActionForm}
              >
                Clear
              </Button>
              <Button
                size="sm"
                className="text-xs"
                onClick={handleSaveActionConfig}
              >
                {actionForm.id ? "Update" : "Add"} Action
              </Button>
            </div>
          </DialogFooter>

          <div className="max-h-64 overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Module</TableHead>
                  <TableHead className="text-xs">Key</TableHead>
                  <TableHead className="text-xs">Label</TableHead>
                  <TableHead className="text-xs">Color</TableHead>
                  <TableHead className="text-xs">Default</TableHead>
                  <TableHead className="text-xs">Active</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((action) => (
                  <TableRow key={action.id}>
                    <TableCell className="text-xs">
                      {action.moduleType}
                    </TableCell>
                    <TableCell className="text-xs">{action.key}</TableCell>
                    <TableCell className="text-xs">{action.label}</TableCell>
                    <TableCell className="text-xs">
                      <span
                        className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: action.color }}
                      >
                        {action.color}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {action.isDefault ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {action.isActive ? "Yes" : "No"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleEditAction(action)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteAction(action.id)}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
