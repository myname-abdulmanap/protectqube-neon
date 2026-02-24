"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  Key,
  Loader2,
  Settings,
} from "lucide-react";

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions?: Permission[];
  _count?: {
    users: number;
  };
  createdAt: string;
}

export default function RolesPage() {
  const { token } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch("/api/roles", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      } else {
        toast.error("Failed to fetch roles");
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to fetch roles");
    }
  }, [token]);

  const fetchPermissions = useCallback(async () => {
    try {
      const response = await fetch("/api/permissions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setPermissions(data.data);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    }
  }, [token]);

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const response = await fetch(`/api/roles/${roleId}/permissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setRolePermissions(data.data.map((p: Permission) => p.id));
      }
    } catch (error) {
      console.error("Error fetching role permissions:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRoles(), fetchPermissions()]);
      setLoading(false);
    };
    if (token) {
      loadData();
    }
  }, [token, fetchRoles, fetchPermissions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Role created successfully");
        setIsCreateOpen(false);
        setFormData({ name: "", description: "" });
        await fetchRoles();
      } else {
        toast.error(data.error || "Failed to create role");
      }
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error("Failed to create role");
    }
    setSubmitting(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Role updated successfully");
        setIsEditOpen(false);
        setSelectedRole(null);
        setFormData({ name: "", description: "" });
        await fetchRoles();
      } else {
        toast.error(data.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Role deleted successfully");
        setIsDeleteOpen(false);
        setSelectedRole(null);
        await fetchRoles();
      } else {
        toast.error(data.error || "Failed to delete role");
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Failed to delete role");
    }
    setSubmitting(false);
  };

  const handlePermissionToggle = async (
    permissionId: string,
    granted: boolean,
  ) => {
    if (!selectedRole) return;
    try {
      if (granted) {
        // Assign permission
        const response = await fetch(
          `/api/roles/${selectedRole.id}/permissions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ permissionId }),
          },
        );
        const data = await response.json();
        if (data.success) {
          setRolePermissions([...rolePermissions, permissionId]);
          toast.success("Permission assigned");
        } else {
          toast.error(data.error || "Failed to assign permission");
        }
      } else {
        // Revoke permission
        const response = await fetch(
          `/api/roles/${selectedRole.id}/permissions/${permissionId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await response.json();
        if (data.success) {
          setRolePermissions(
            rolePermissions.filter((id) => id !== permissionId),
          );
          toast.success("Permission revoked");
        } else {
          toast.error(data.error || "Failed to revoke permission");
        }
      }
    } catch (error) {
      console.error("Error toggling permission:", error);
      toast.error("Failed to update permission");
    }
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteOpen(true);
  };

  const openPermissionDialog = async (role: Role) => {
    setSelectedRole(role);
    await fetchRolePermissions(role.id);
    setIsPermissionOpen(true);
  };

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName?.toLowerCase()) {
      case "superadmin":
        return "bg-orange-500 hover:bg-orange-600 text-white";
      case "admin":
        return "bg-blue-600 hover:bg-blue-700 text-white";
      case "user":
        return "bg-slate-500 hover:bg-slate-600 text-white";
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white";
    }
  };

  const groupPermissionsByResource = (perms: Permission[]) => {
    return perms.reduce(
      (acc, perm) => {
        if (!acc[perm.resource]) {
          acc[perm.resource] = [];
        }
        acc[perm.resource].push(perm);
        return acc;
      },
      {} as Record<string, Permission[]>,
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  const groupedPermissions = groupPermissionsByResource(permissions);

  return (
    <div className="p-2 space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white">
              Role Management
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Manage roles and their permissions
            </p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Add a new role to the system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Manager"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Role description"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Role"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-l-2 border-l-blue-600 border-0 shadow-sm">
          <CardContent className="p-2">
            <p className="text-[9px] text-gray-500">Total Roles</p>
            <p className="text-lg font-bold text-blue-600">{roles.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-orange-500 border-0 shadow-sm">
          <CardContent className="p-2">
            <p className="text-[9px] text-gray-500">Total Permissions</p>
            <p className="text-lg font-bold text-orange-500">
              {permissions.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-green-500 border-0 shadow-sm">
          <CardContent className="p-2">
            <p className="text-[9px] text-gray-500">Resource Types</p>
            <p className="text-lg font-bold text-green-500">
              {Object.keys(groupedPermissions).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Roles Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-2 py-1.5">
          <CardTitle className="flex items-center gap-1.5 text-xs">
            <Key className="h-3.5 w-3.5 text-blue-600" />
            All Roles
          </CardTitle>
          <CardDescription className="text-[10px]">
            A list of all roles in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-[10px]">
                  <TableHead className="h-7 px-2 text-[10px]">
                    Role Name
                  </TableHead>
                  <TableHead className="h-7 px-2 text-[10px]">
                    Description
                  </TableHead>
                  <TableHead className="h-7 px-2 text-[10px] hidden md:table-cell">
                    Users
                  </TableHead>
                  <TableHead className="h-7 px-2 text-[10px] hidden md:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="h-7 px-2 text-[10px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id} className="text-xs">
                    <TableCell className="py-1.5 px-2">
                      <Badge
                        className={`${getRoleBadgeColor(role.name)} text-[9px] px-1.5 py-0`}
                      >
                        {role.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 px-2 text-gray-600 dark:text-gray-400 max-w-[150px] truncate text-[10px]">
                      {role.description || "-"}
                    </TableCell>
                    <TableCell className="py-1.5 px-2 hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0"
                      >
                        {role._count?.users || 0} users
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 px-2 hidden md:table-cell text-gray-500 text-[10px]">
                      {new Date(role.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="py-1.5 px-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPermissionDialog(role)}
                          className="h-6 w-6 p-0 text-orange-500 border-orange-500 hover:bg-orange-50"
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(role)}
                          className="h-6 w-6 p-0 text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(role)}
                          className="h-6 w-6 p-0 text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {roles.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-4 text-gray-500 text-xs"
                    >
                      No roles found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update role information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Role Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permission Assignment Dialog */}
      <Dialog open={isPermissionOpen} onOpenChange={setIsPermissionOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>
              Assign or revoke permissions for{" "}
              <Badge className={getRoleBadgeColor(selectedRole?.name || "")}>
                {selectedRole?.name}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <div key={resource} className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  {resource}
                </h4>
                <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  {perms.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {permission.action}
                        </span>
                        <span className="text-xs text-gray-500">
                          {permission.name}
                        </span>
                      </div>
                      <Switch
                        checked={rolePermissions.includes(permission.id)}
                        onCheckedChange={(checked) =>
                          handlePermissionToggle(permission.id, checked)
                        }
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {permissions.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                No permissions available
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsPermissionOpen(false)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{selectedRole?.name}</span>? Users
              with this role will lose their permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
