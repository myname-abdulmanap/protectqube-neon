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
import { scopesApi, tenantsApi, type Scope, type Tenant } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Pencil, Trash2, Plus, Layers } from "lucide-react";

export default function ScopesPage() {
  const { hasPermission } = useAuth();
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTenant, setFilterTenant] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tenantId: "",
    name: "",
    code: "",
    scopeType: "",
    address: "",
    city: "",
    province: "",
    region: "",
    latitude: "",
    longitude: "",
    isActive: true,
  });

  const canManage =
    hasPermission("manage_roles") || hasPermission("scopes:read");

  const load = async () => {
    try {
      setIsLoading(true);
      const [scRes, tRes] = await Promise.all([
        scopesApi.getAll(filterTenant || undefined),
        tenantsApi.getAll(),
      ]);
      if (scRes.success && scRes.data) setScopes(scRes.data);
      if (tRes.success && tRes.data) setTenants(tRes.data);
    } catch {
      setError("Failed to load scopes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterTenant]);

  const resetForm = () => {
    setForm({
      tenantId: "",
      name: "",
      code: "",
      scopeType: "",
      address: "",
      city: "",
      province: "",
      region: "",
      latitude: "",
      longitude: "",
      isActive: true,
    });
    setEditingId(null);
  };
  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };
  const openEdit = (s: Scope) => {
    setEditingId(s.id);
    setForm({
      tenantId: s.tenantId,
      name: s.name,
      code: s.code,
      scopeType: s.scopeType,
      address: s.address || "",
      city: s.city || "",
      province: s.province || "",
      region: s.region || "",
      latitude: s.latitude != null ? String(s.latitude) : "",
      longitude: s.longitude != null ? String(s.longitude) : "",
      isActive: s.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.tenantId || !form.name || !form.code || !form.scopeType) return;
    const payload = {
      ...form,
      latitude: form.latitude !== "" ? Number(form.latitude) : null,
      longitude: form.longitude !== "" ? Number(form.longitude) : null,
    };
    try {
      if (editingId) {
        await scopesApi.update(editingId, payload);
      } else {
        await scopesApi.create(payload);
      }
      setModalOpen(false);
      resetForm();
      load();
    } catch {
      setError("Failed to save scope");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this scope?")) return;
    try {
      await scopesApi.delete(id);
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
          <Layers className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Scopes</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Tenant:</Label>
            <Select
              value={filterTenant || "all"}
              onValueChange={(value) =>
                setFilterTenant(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="All tenants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All tenants
                </SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={openCreate} className="h-8 text-xs">
            <Plus className="mr-1 h-3 w-3" />
            Add Scope
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
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Region</TableHead>
                <TableHead className="text-xs">Tenant</TableHead>
                <TableHead className="text-xs">Active</TableHead>
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
              ) : scopes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-xs text-muted-foreground"
                  >
                    No scopes
                  </TableCell>
                </TableRow>
              ) : (
                scopes.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs font-medium">
                      {s.name}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {s.code}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                        {s.scopeType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{s.region || "-"}</TableCell>
                    <TableCell className="text-xs">
                      {s.tenant?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${s.isActive ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDelete(s.id)}
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
              {editingId ? "Edit" : "New"} Scope
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingId ? "Update scope details" : "Create a new scope"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Tenant *</Label>
              <Select
                value={form.tenantId}
                onValueChange={(v) => setForm({ ...form, tenantId: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
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
                  placeholder="Scope name"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="SCOPE_CODE"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Type *</Label>
              <Input
                value={form.scopeType}
                onChange={(e) =>
                  setForm({ ...form, scopeType: e.target.value })
                }
                placeholder="e.g. outlet, warehouse, building..."
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Full address"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="City"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Province</Label>
                <Input
                  value={form.province}
                  onChange={(e) =>
                    setForm({ ...form, province: e.target.value })
                  }
                  placeholder="Province"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Region</Label>
              <Input
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="Region"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Latitude</Label>
                <Input
                  value={form.latitude}
                  onChange={(e) =>
                    setForm({ ...form, latitude: e.target.value })
                  }
                  type="number"
                  step="any"
                  placeholder="-6.200000"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Longitude</Label>
                <Input
                  value={form.longitude}
                  onChange={(e) =>
                    setForm({ ...form, longitude: e.target.value })
                  }
                  type="number"
                  step="any"
                  placeholder="106.816600"
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
