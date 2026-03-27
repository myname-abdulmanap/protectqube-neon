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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { severityConfigsApi, type SeverityConfig } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Pencil, Trash2, Plus, AlertTriangle } from "lucide-react";

export default function SeverityConfigsPage() {
  const { hasPermission } = useAuth();
  const [configs, setConfigs] = useState<SeverityConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    key: "",
    label: "",
    color: "#FF0000",
    priority: "0",
  });

  const canRead = hasPermission("severity_configs:read");
  const canCreate = hasPermission("severity_configs:create");
  const canUpdate = hasPermission("severity_configs:update");
  const canDelete = hasPermission("severity_configs:delete");

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await severityConfigsApi.getAll();
      if (res.success && res.data) setConfigs(res.data);
    } catch {
      setError("Failed to load severity configs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({
      key: "",
      label: "",
      color: "#FF0000",
      priority: "0",
    });
    setEditingId(null);
  };

  const openCreate = () => {
    if (!canCreate) return;
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (c: SeverityConfig) => {
    if (!canUpdate) return;
    setEditingId(c.id);
    setForm({
      key: c.key,
      label: c.label,
      color: c.color,
      priority: String(c.priority),
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.key || !form.label || !form.color) return;
    if ((editingId && !canUpdate) || (!editingId && !canCreate)) return;
    try {
      if (editingId) {
        await severityConfigsApi.update(editingId, {
          label: form.label,
          color: form.color,
          priority: parseInt(form.priority, 10),
        });
      } else {
        await severityConfigsApi.create({
          key: form.key,
          label: form.label,
          color: form.color,
          priority: parseInt(form.priority, 10),
        });
      }
      setModalOpen(false);
      resetForm();
      load();
    } catch {
      setError("Failed to save severity config");
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (!confirm("Delete this severity config?")) return;
    try {
      await severityConfigsApi.delete(id);
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
          <AlertTriangle className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Severity Configurations</h1>
        </div>
        <Button size="sm" onClick={openCreate} className="h-8 text-xs" disabled={!canCreate}>
          <Plus className="mr-1 h-3 w-3" />
          Add Severity
        </Button>
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
                <TableHead className="text-xs">Key</TableHead>
                <TableHead className="text-xs">Label</TableHead>
                <TableHead className="text-xs">Color</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-xs text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : configs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-xs text-muted-foreground"
                  >
                    No severity configs
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-mono">{c.key}</TableCell>
                    <TableCell className="text-xs font-medium">{c.label}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{c.color}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-center font-semibold">
                      {c.priority}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.isActive ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800">
                          Inactive
                        </span>
                      )}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingId ? "Edit" : "New"} Severity Config
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingId
                ? "Update severity configuration"
                : "Create a new severity configuration"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Key (unique identifier) *</Label>
              <Input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="e.g., warning, critical, urgent"
                className="h-8 text-xs"
                disabled={!!editingId} // Cannot change key after creation
              />
            </div>
            <div>
              <Label className="text-xs">Label (display name) *</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g., Warning, Critical"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Color *</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    aria-label="Severity color"
                    title="Severity color"
                    onChange={(e) =>
                      setForm({ ...form, color: e.target.value })
                    }
                    className="h-8 w-12 cursor-pointer rounded"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) =>
                      setForm({ ...form, color: e.target.value })
                    }
                    placeholder="#FF0000"
                    className="h-8 text-xs flex-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Priority (0 = highest) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
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
