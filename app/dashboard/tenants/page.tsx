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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tenantsApi, type Tenant } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Pencil, Trash2, Plus, Building2 } from "lucide-react";

export default function TenantsPage() {
  const { hasPermission } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", isActive: true });

  const canManage =
    hasPermission("manage_roles") || hasPermission("tenants:read");

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await tenantsApi.getAll();
      if (res.success && res.data) setTenants(res.data);
    } catch {
      setError("Failed to load tenants");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({ name: "", code: "", isActive: true });
    setEditingId(null);
  };
  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };
  const openEdit = (t: Tenant) => {
    setEditingId(t.id);
    setForm({ name: t.name, code: t.code, isActive: t.isActive });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.code) return;
    try {
      if (editingId) {
        await tenantsApi.update(editingId, form);
      } else {
        await tenantsApi.create(form);
      }
      setModalOpen(false);
      resetForm();
      load();
    } catch {
      setError("Failed to save tenant");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tenant?")) return;
    try {
      await tenantsApi.delete(id);
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
          <Building2 className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Tenants</h1>
        </div>
        <Button size="sm" onClick={openCreate} className="h-8 text-xs">
          <Plus className="mr-1 h-3 w-3" />
          Add Tenant
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
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Active</TableHead>
                <TableHead className="text-xs">Created</TableHead>
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
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-xs text-muted-foreground"
                  >
                    No tenants
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs font-medium">
                      {t.name}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {t.code}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${t.isActive ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}
                      >
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDelete(t.id)}
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
              {editingId ? "Edit" : "New"} Tenant
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingId ? "Update tenant details" : "Create a new tenant"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tenant name"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="TENANT_CODE"
                className="h-8 text-xs"
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
