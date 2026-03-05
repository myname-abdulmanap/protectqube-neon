"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
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
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Key,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Permission {
  id: string;
  name: string;
  resource: string | null;
  action: string | null;
  createdAt: string;
}

export default function PermissionsPage() {
  const { token } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] =
    useState<Permission | null>(null);
  const [collapsedModules, setCollapsedModules] = useState<
    Record<string, boolean>
  >({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [formData, setFormData] = useState({
    name: "",
    resource: "",
    action: "",
  });
  const [submitting, setSubmitting] = useState(false);

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
      } else {
        toast.error("Failed to fetch permissions");
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Failed to fetch permissions");
    }
  }, [token]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchPermissions();
      setLoading(false);
    };
    if (token) {
      loadData();
    }
  }, [token, fetchPermissions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Permission created successfully");
        setIsCreateOpen(false);
        setFormData({ name: "", resource: "", action: "" });
        await fetchPermissions();
      } else {
        toast.error(data.error || "Failed to create permission");
      }
    } catch (error) {
      console.error("Error creating permission:", error);
      toast.error("Failed to create permission");
    }
    setSubmitting(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPermission) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/permissions/${selectedPermission.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        },
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Permission updated successfully");
        setIsEditOpen(false);
        setSelectedPermission(null);
        setFormData({ name: "", resource: "", action: "" });
        await fetchPermissions();
      } else {
        toast.error(data.error || "Failed to update permission");
      }
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Failed to update permission");
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedPermission) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/permissions/${selectedPermission.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Permission deleted successfully");
        setIsDeleteOpen(false);
        setSelectedPermission(null);
        await fetchPermissions();
      } else {
        toast.error(data.error || "Failed to delete permission");
      }
    } catch (error) {
      console.error("Error deleting permission:", error);
      toast.error("Failed to delete permission");
    }
    setSubmitting(false);
  };

  const openEditDialog = (permission: Permission) => {
    setSelectedPermission(permission);
    setFormData({
      name: permission.name,
      resource: permission.resource || "",
      action: permission.action || "",
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (permission: Permission) => {
    setSelectedPermission(permission);
    setIsDeleteOpen(true);
  };

  const getResourceBadgeColor = (resource: string) => {
    const colors: Record<string, string> = {
      users: "bg-blue-100 text-blue-700 border-blue-200",
      roles: "bg-orange-100 text-orange-700 border-orange-200",
      energy: "bg-green-100 text-green-700 border-green-200",
      reports: "bg-purple-100 text-purple-700 border-purple-200",
      settings: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return (
      colors[resource.toLowerCase()] ||
      "bg-slate-100 text-slate-700 border-slate-200"
    );
  };

  const normalizeResource = (resource: string | null) => {
    const normalized = resource?.trim().toLowerCase();
    return normalized && normalized.length > 0 ? normalized : "uncategorized";
  };

  const normalizeAction = (action: string | null) => {
    const normalized = action?.trim().toLowerCase();
    return normalized && normalized.length > 0 ? normalized : "unknown";
  };

  const getEndpointInfo = (permission: Permission) => {
    const resource = normalizeResource(permission.resource);
    const action = normalizeAction(permission.action);

    const methodMap: Record<string, string> = {
      create: "POST",
      read: "GET",
      view: "GET",
      list: "GET",
      update: "PUT",
      edit: "PUT",
      delete: "DELETE",
      manage: "PUT",
    };

    const needsId = ["update", "edit", "delete"].includes(action);
    const path = `/api/${resource}${needsId ? "/:id" : ""}`;

    return {
      method: methodMap[action] || "GET",
      path,
    };
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return "bg-green-500 text-white";
      case "read":
      case "view":
        return "bg-blue-500 text-white";
      case "update":
      case "edit":
        return "bg-orange-500 text-white";
      case "delete":
        return "bg-red-500 text-white";
      case "manage":
        return "bg-purple-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const totalPages = Math.max(1, Math.ceil(permissions.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedPermissions = permissions.slice(
    startIndex,
    startIndex + pageSize,
  );

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, Math.min(prev, totalPages) - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) =>
      Math.min(totalPages, Math.min(prev, totalPages) + 1),
    );
  };

  const toggleModule = (resource: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [resource]: !(prev[resource] ?? true),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-500 rounded">
            <Key className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white">
              Permission Management
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Define granular permissions for system resources
            </p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Permission
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Permission</DialogTitle>
              <DialogDescription>
                Define a new permission for system access control.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Permission Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., manage_users"
                  required
                />
                <p className="text-xs text-gray-500">
                  Use snake_case for consistency
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resource">Resource</Label>
                <Input
                  id="resource"
                  value={formData.resource}
                  onChange={(e) =>
                    setFormData({ ...formData, resource: e.target.value })
                  }
                  placeholder="e.g., users, roles, energy"
                  required
                />
                <p className="text-xs text-gray-500">
                  The resource this permission applies to
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Input
                  id="action"
                  value={formData.action}
                  onChange={(e) =>
                    setFormData({ ...formData, action: e.target.value })
                  }
                  placeholder="e.g., create, read, update, delete"
                  required
                />
                <p className="text-xs text-gray-500">
                  The action allowed on the resource
                </p>
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
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Permission"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* All Permissions Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-2 py-1.5">
          <CardTitle className="flex items-center gap-1.5 text-xs">
            <Key className="h-3.5 w-3.5 text-orange-500" />
            All Permissions
          </CardTitle>
          <CardDescription className="text-[10px]">
            Complete list of all system permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-[10px]">
                  <TableHead className="h-7 px-2 text-[10px]">Name</TableHead>
                  <TableHead className="h-7 px-2 text-[10px]">Module</TableHead>
                  <TableHead className="h-7 px-2 text-[10px]">Action</TableHead>
                  <TableHead className="h-7 px-2 text-[10px] hidden md:table-cell">
                    Method
                  </TableHead>
                  <TableHead className="h-7 px-2 text-[10px] hidden lg:table-cell">
                    Backend Endpoint
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
                {Object.entries(
                  paginatedPermissions.reduce(
                    (acc, permission) => {
                      const resource = normalizeResource(permission.resource);
                      if (!acc[resource]) {
                        acc[resource] = [];
                      }
                      acc[resource].push(permission);
                      return acc;
                    },
                    {} as Record<string, Permission[]>,
                  ),
                ).map(([resource, modulePermissions]) => {
                  const isCollapsed = collapsedModules[resource] ?? true;

                  return (
                    <Fragment key={`group-fragment-${resource}`}>
                      <TableRow
                        key={`group-${resource}`}
                        className="bg-slate-50/60 dark:bg-slate-900/40"
                      >
                        <TableCell colSpan={7} className="py-1 px-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`${getResourceBadgeColor(resource)} text-[9px] px-1.5 py-0`}
                              >
                                {resource}
                              </Badge>
                              <span className="text-[10px] text-gray-500">
                                {modulePermissions.length} permission(s)
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleModule(resource)}
                              className="h-6 px-1.5 text-[10px]"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                              {isCollapsed ? "Show" : "Hide"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {!isCollapsed &&
                        modulePermissions.map((permission) => {
                          const endpoint = getEndpointInfo(permission);

                          return (
                            <TableRow key={permission.id} className="text-xs">
                              <TableCell className="py-1.5 px-2 font-medium font-mono text-[10px]">
                                {permission.name}
                              </TableCell>
                              <TableCell className="py-1.5 px-2">
                                <Badge
                                  variant="outline"
                                  className={`${getResourceBadgeColor(normalizeResource(permission.resource))} text-[9px] px-1.5 py-0`}
                                >
                                  {normalizeResource(permission.resource)}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-1.5 px-2">
                                <Badge
                                  className={`${getActionBadgeColor(normalizeAction(permission.action))} text-[9px] px-1.5 py-0`}
                                >
                                  {normalizeAction(permission.action)}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-1.5 px-2 hidden md:table-cell text-[10px]">
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0"
                                >
                                  {endpoint.method}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-1.5 px-2 hidden lg:table-cell text-gray-500 text-[10px] font-mono">
                                {endpoint.path}
                              </TableCell>
                              <TableCell className="py-1.5 px-2 hidden md:table-cell text-gray-500 text-[10px]">
                                {new Date(
                                  permission.createdAt,
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="py-1.5 px-2 text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(permission)}
                                    className="h-6 w-6 p-0 text-blue-600 border-blue-600 hover:bg-blue-50"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDeleteDialog(permission)}
                                    className="h-6 w-6 p-0 text-red-600 border-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </Fragment>
                  );
                })}
                {paginatedPermissions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-4 text-gray-500 text-xs"
                    >
                      No permissions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-2 py-2 border-t">
            <p className="text-[10px] text-gray-500">
              {permissions.length === 0
                ? "Showing 0 of 0"
                : `Showing ${startIndex + 1}-${Math.min(startIndex + pageSize, permissions.length)} of ${permissions.length}`}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={safeCurrentPage === 1}
                className="h-6 text-[10px]"
              >
                Prev
              </Button>
              <span className="text-[10px] px-1">
                {safeCurrentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={safeCurrentPage >= totalPages}
                className="h-6 text-[10px]"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
            <DialogDescription>Update permission details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Permission Name</Label>
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
              <Label htmlFor="edit-resource">Resource</Label>
              <Input
                id="edit-resource"
                value={formData.resource}
                onChange={(e) =>
                  setFormData({ ...formData, resource: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-action">Action</Label>
              <Input
                id="edit-action"
                value={formData.action}
                onChange={(e) =>
                  setFormData({ ...formData, action: e.target.value })
                }
                required
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Permission</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-mono font-semibold">
                {selectedPermission?.name}
              </span>
              ? This will remove the permission from all roles.
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
                "Delete Permission"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
