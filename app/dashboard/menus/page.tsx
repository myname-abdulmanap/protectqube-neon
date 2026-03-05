"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { menusApi, rolesApi, type Menu, type Role } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { availableMenuIcons, getMenuIconComponent } from "@/lib/menu-icons";

type RoleMap = Record<string, string[]>;

export default function MenusPage() {
  const { hasPermission, refreshUser } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleMap, setRoleMap] = useState<RoleMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    path: "",
    icon: "LayoutDashboard",
    selectorValue: "",
    order: 0,
    parentId: "",
  });

  const canManageMenus =
    hasPermission("manage_roles") ||
    (hasPermission("menus:read") && hasPermission("roles:read"));
  const SelectedIcon = getMenuIconComponent(form.icon);

  const sortedMenus = useMemo(
    () => [...menus].sort((a, b) => a.order - b.order),
    [menus],
  );

  const parentMenuOptions = useMemo(
    () =>
      sortedMenus.filter((menu) => !editingMenuId || menu.id !== editingMenuId),
    [sortedMenus, editingMenuId],
  );

  const menuNameById = useMemo(
    () => Object.fromEntries(menus.map((menu) => [menu.id, menu.name])),
    [menus],
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [menusRes, rolesRes] = await Promise.all([
        menusApi.getAll(),
        rolesApi.getAll(),
      ]);

      if (!menusRes.success || !menusRes.data) {
        throw new Error(menusRes.error || "Failed to load menus");
      }

      if (!rolesRes.success || !rolesRes.data) {
        throw new Error(rolesRes.error || "Failed to load roles");
      }

      setMenus(menusRes.data);
      setRoles(rolesRes.data);

      const roleEntries = await Promise.all(
        menusRes.data.map(async (menu) => {
          const roleRes = await menusApi.getRoles(menu.id);
          return [
            menu.id,
            roleRes.success && roleRes.data ? roleRes.data : [],
          ] as const;
        }),
      );

      setRoleMap(Object.fromEntries(roleEntries));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load menu data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canManageMenus) {
      void loadData();
    } else {
      setIsLoading(false);
    }
  }, [canManageMenus]);

  const resetForm = () => {
    setEditingMenuId(null);
    setForm({
      name: "",
      path: "",
      icon: "LayoutDashboard",
      selectorValue: "",
      order: 0,
      parentId: "",
    });
  };

  const handleEditMenu = (menu: Menu) => {
    setEditingMenuId(menu.id);
    setForm({
      name: menu.name,
      path: menu.path,
      icon: menu.icon,
      selectorValue: menu.selectorValue || "",
      order: menu.order,
      parentId: menu.parentId || "",
    });
  };

  const handleSubmitMenu = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.icon) {
      setError("Name and icon are required");
      return;
    }

    const pathValue = form.path.trim() || "#";

    try {
      setIsSaving(true);
      setError(null);

      if (editingMenuId) {
        const updateRes = await menusApi.update(editingMenuId, {
          name: form.name,
          path: pathValue,
          icon: form.icon,
          selectorValue: form.selectorValue || undefined,
          order: Number(form.order) || 0,
          parentId: form.parentId || undefined,
        });

        if (!updateRes.success || !updateRes.data) {
          throw new Error(updateRes.error || "Failed to update menu");
        }

        setMenus((prev) =>
          prev.map((menu) =>
            menu.id === editingMenuId ? (updateRes.data as Menu) : menu,
          ),
        );
      } else {
        const createRes = await menusApi.create({
          name: form.name,
          path: pathValue,
          icon: form.icon,
          selectorValue: form.selectorValue || undefined,
          order: Number(form.order) || 0,
          parentId: form.parentId || undefined,
        });

        if (!createRes.success || !createRes.data) {
          throw new Error(createRes.error || "Failed to create menu");
        }

        setMenus((prev) => [...prev, createRes.data as Menu]);
        setRoleMap((prev) => ({ ...prev, [createRes.data!.id]: [] }));
      }

      await refreshUser();
      resetForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save menu";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMenu = async (menuId: string) => {
    try {
      setError(null);
      const res = await menusApi.delete(menuId);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete menu");
      }

      setMenus((prev) => prev.filter((menu) => menu.id !== menuId));
      setRoleMap((prev) => {
        const next = { ...prev };
        delete next[menuId];
        return next;
      });

      if (editingMenuId === menuId) {
        resetForm();
      }

      await refreshUser();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete menu";
      setError(message);
    }
  };

  const handleToggleRole = async (
    menuId: string,
    roleId: string,
    checked: boolean,
  ) => {
    try {
      setError(null);
      if (checked) {
        const res = await menusApi.assignRole(menuId, roleId);
        if (!res.success) {
          throw new Error(res.error || "Failed to assign role");
        }

        setRoleMap((prev) => ({
          ...prev,
          [menuId]: Array.from(new Set([...(prev[menuId] || []), roleId])),
        }));
        await refreshUser();
      } else {
        const res = await menusApi.revokeRole(menuId, roleId);
        if (!res.success) {
          throw new Error(res.error || "Failed to revoke role");
        }

        setRoleMap((prev) => ({
          ...prev,
          [menuId]: (prev[menuId] || []).filter((id) => id !== roleId),
        }));
        await refreshUser();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update role mapping";
      setError(message);
    }
  };

  if (!canManageMenus) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold">Menu Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          You need manage_roles permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingMenuId ? "Edit Menu" : "Create Menu"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={handleSubmitMenu}
          >
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Reports"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="path">Path</Label>
              <Input
                id="path"
                value={form.path}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, path: e.target.value }))
                }
                placeholder="/dashboard/reports (kosongkan untuk parent menu)"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="icon">Icon</Label>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-md border bg-muted/40 flex items-center justify-center">
                  <SelectedIcon className="h-4 w-4" />
                </div>
                <Input
                  id="icon"
                  list="menu-icon-options"
                  value={form.icon}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, icon: e.target.value }))
                  }
                  placeholder="LayoutDashboard"
                />
              </div>
              <datalist id="menu-icon-options">
                {availableMenuIcons.map((iconName) => (
                  <option key={iconName} value={iconName} />
                ))}
              </datalist>
              <p className="text-[11px] text-muted-foreground">
                Ketik nama icon Lucide (contoh: FileText, BarChart3,
                ShieldCheck).
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="selectorValue">Selector Value (optional)</Label>
              <Input
                id="selectorValue"
                value={form.selectorValue}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    selectorValue: e.target.value,
                  }))
                }
                placeholder="kitchen-monitoring"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="parentMenu">Parent Menu (optional)</Label>
              <select
                id="parentMenu"
                aria-label="Parent menu"
                title="Parent menu"
                className="w-full rounded-md border bg-background h-9 px-3 text-sm"
                value={form.parentId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, parentId: e.target.value }))
                }
              >
                <option value="">No parent (Top Level)</option>
                {parentMenuOptions.map((menu) => (
                  <option key={menu.id} value={menu.id}>
                    {menu.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="order">Order</Label>
              <Input
                id="order"
                type="number"
                value={form.order}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    order: Number(e.target.value) || 0,
                  }))
                }
                placeholder="100"
              />
            </div>

            <div className="flex items-end">
              <div className="flex w-full gap-2 md:w-auto">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full md:w-auto"
                >
                  {isSaving
                    ? "Saving..."
                    : editingMenuId
                      ? "Save Changes"
                      : "Create Menu"}
                </Button>
                {editingMenuId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={isSaving}
                    className="w-full md:w-auto"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Menu Visibility by Role</CardTitle>
          <Button
            variant="outline"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading menus...</p>
          ) : sortedMenus.length === 0 ? (
            <p className="text-sm text-muted-foreground">No menus found.</p>
          ) : (
            <div className="space-y-3">
              {sortedMenus.map((menu) => (
                <div key={menu.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const MenuIcon = getMenuIconComponent(menu.icon);
                          return (
                            <MenuIcon className="h-4 w-4 text-muted-foreground" />
                          );
                        })()}
                        <p className="text-sm font-semibold">{menu.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {menu.path}
                        {menu.selectorValue ? ` (${menu.selectorValue})` : ""}
                      </p>
                      {menu.parentId && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Submenu of: {menuNameById[menu.parentId] || "Unknown"}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMenu(menu)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDeleteMenu(menu.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {roles.map((role) => {
                      const checked = (roleMap[menu.id] || []).includes(
                        role.id,
                      );
                      return (
                        <label
                          key={role.id}
                          className="inline-flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              void handleToggleRole(
                                menu.id,
                                role.id,
                                e.target.checked,
                              )
                            }
                          />
                          {role.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
