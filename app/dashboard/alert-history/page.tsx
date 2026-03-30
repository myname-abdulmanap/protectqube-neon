"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Filter,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  ShieldAlert,
  Info,
  AlertTriangle,
  CheckSquare,
  Square,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  alertEventsApi,
  energyDashboardApi,
  severityConfigsApi,
  type AlertEvent,
  type SeverityConfig,
} from "@/lib/api";
import { format, formatDistance } from "date-fns";
import { toast } from "sonner";

const PAGE_SIZE = 50;

function normalizeSeverityLabel(severity: string): string {
  const v = severity.toLowerCase();
  if (v === "critical") return "Critical";
  if (v === "suspicious" || v === "high") return "Suspicious";
  return "Health";
}

function CategoryIcon({ severity }: { severity: string }) {
  const v = severity.toLowerCase();
  if (v === "critical") return <ShieldAlert className="h-3 w-3 text-red-500" />;
  if (v === "suspicious" || v === "high")
    return <Info className="h-3 w-3 text-blue-500" />;
  return <AlertTriangle className="h-3 w-3 text-amber-500" />;
}

interface OutletData {
  scopeId: string;
  scope: { name: string };
}

export default function AlertHistoryPage() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [severityConfigs, setSeverityConfigs] = useState<SeverityConfig[]>([]);
  const [outlets, setOutlets] = useState<OutletData[]>([]);

  const [filterOutlet, setFilterOutlet] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const outletNameByScopeId = useMemo(() => {
    const map: Record<string, string> = {};
    outlets.forEach((o) => {
      map[o.scopeId] = o.scope.name;
    });
    return map;
  }, [outlets]);

  const severityColorMap = useMemo(() => {
    const map: Record<string, { color: string; label: string }> = {};
    severityConfigs.forEach((c) => {
      map[c.key] = { color: c.color, label: c.label };
    });
    return map;
  }, [severityConfigs]);

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await alertEventsApi.getAll({
        excludeActionKey: "open",
        severity: filterSeverity !== "all" ? filterSeverity : undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
        limit: 1000,
      });
      if (res.success && res.data) {
        setAlerts(res.data);
        setTotal(res.data.length);
        setPage(1);
        setSelectedIds(new Set());
      }
    } catch {
      toast.error("Gagal memuat riwayat alert");
    } finally {
      setIsLoading(false);
    }
  }, [filterSeverity, filterFrom, filterTo]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    Promise.all([energyDashboardApi.getOutlets(), severityConfigsApi.getAll()])
      .then(([outletsRes, sevRes]) => {
        if (outletsRes.success && outletsRes.data)
          setOutlets(outletsRes.data as OutletData[]);
        if (sevRes.success && sevRes.data) setSeverityConfigs(sevRes.data);
      })
      .catch(() => {});
  }, []);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const outletName =
        a.device?.scope?.name || outletNameByScopeId[a.scopeId] || "";
      const matchesOutlet =
        filterOutlet === "all" || outletName === filterOutlet;
      const matchesSearch =
        !searchTerm ||
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.alertType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.device?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        outletName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesOutlet && matchesSearch;
    });
  }, [alerts, filterOutlet, searchTerm, outletNameByScopeId]);

  const outletOptions = useMemo(() => {
    const names = new Set<string>();
    outlets.forEach((o) => names.add(o.scope.name));
    alerts.forEach((a) => {
      const name = a.device?.scope?.name || outletNameByScopeId[a.scopeId];
      if (name) names.add(name);
    });
    return Array.from(names).sort();
  }, [alerts, outlets, outletNameByScopeId]);

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE));
  const pagedAlerts = filteredAlerts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedAlerts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedAlerts.map((a) => a.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Hapus permanen ${selectedIds.size} alert? Tindakan ini tidak bisa dibatalkan.`,
      )
    )
      return;
    setIsDeleting(true);
    try {
      const res = await alertEventsApi.bulkDelete(Array.from(selectedIds));
      if (res.success) {
        toast.success(
          `${res.data?.deletedCount ?? selectedIds.size} alert dihapus`,
        );
        await loadAlerts();
      } else {
        toast.error(res.error || "Gagal menghapus");
      }
    } catch {
      toast.error("Gagal menghapus alert");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteOne = async (id: string) => {
    if (!confirm("Hapus permanen alert ini?")) return;
    try {
      const res = await alertEventsApi.deleteOne(id);
      if (res.success) {
        toast.success("Alert dihapus");
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setTotal((t) => t - 1);
      } else {
        toast.error(res.error || "Gagal menghapus");
      }
    } catch {
      toast.error("Gagal menghapus alert");
    }
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Alert History
          </h1>
          <p className="text-xs text-muted-foreground">
            Riwayat alert yang sudah diselesaikan · {total} total
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            size="sm"
            variant="destructive"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => void handleDeleteSelected()}
            disabled={isDeleting}
          >
            <Trash2 className="h-3 w-3" />
            {isDeleting ? "Menghapus..." : `Hapus ${selectedIds.size}`}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="rounded-lg border border-border/70 shadow-sm">
        <CardContent className="p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span className="font-semibold">Filter:</span>
            </div>

            <Select
              value={filterOutlet}
              onValueChange={(v) => {
                setFilterOutlet(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-[150px] text-xs">
                <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Semua Outlet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Semua Outlet
                </SelectItem>
                {outletOptions.map((n) => (
                  <SelectItem key={n} value={n} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterSeverity}
              onValueChange={(v) => {
                setFilterSeverity(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-[130px] text-xs">
                <SelectValue placeholder="Semua Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Semua Severity
                </SelectItem>
                <SelectItem value="critical" className="text-xs">
                  Critical
                </SelectItem>
                <SelectItem value="suspicious" className="text-xs">
                  Suspicious
                </SelectItem>
                <SelectItem value="health" className="text-xs">
                  Health
                </SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filterFrom}
              onChange={(e) => {
                setFilterFrom(e.target.value);
                setPage(1);
              }}
              className="h-7 w-[130px] text-xs"
              placeholder="From"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <Input
              type="date"
              value={filterTo}
              onChange={(e) => {
                setFilterTo(e.target.value);
                setPage(1);
              }}
              className="h-7 w-[130px] text-xs"
              placeholder="To"
            />

            <div className="relative flex-1 min-w-[160px] max-w-[240px]">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari alert..."
                className="h-7 pl-7 text-xs"
              />
            </div>

            <Badge variant="outline" className="ml-auto h-6 px-2 text-[10px]">
              {filteredAlerts.length} / {total}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-lg border border-border/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="w-8 px-2 py-2 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center"
                  >
                    {selectedIds.size === pagedAlerts.length &&
                    pagedAlerts.length > 0 ? (
                      <CheckSquare className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Square className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Alert
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Severity
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Device
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Outlet
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Waktu
                </th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground text-xs"
                  >
                    Memuat...
                  </td>
                </tr>
              )}
              {!isLoading && pagedAlerts.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground text-xs"
                  >
                    Tidak ada riwayat alert
                  </td>
                </tr>
              )}
              {!isLoading &&
                pagedAlerts.map((alert) => {
                  const outletName =
                    alert.device?.scope?.name ||
                    outletNameByScopeId[alert.scopeId] ||
                    `Scope ${alert.scopeId}`;
                  const sevInfo = severityColorMap[alert.severity];
                  const sevColor = sevInfo?.color || "#EF4444";
                  const sevLabel =
                    sevInfo?.label || normalizeSeverityLabel(alert.severity);
                  const isSelected = selectedIds.has(alert.id);

                  return (
                    <tr
                      key={alert.id}
                      className={`transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
                    >
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => toggleSelect(alert.id)}
                          className="flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <CategoryIcon severity={alert.severity} />
                          <div>
                            <p className="font-medium leading-tight line-clamp-1">
                              {alert.title || alert.alertType}
                            </p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {alert.alertType}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[9px]"
                          style={{
                            backgroundColor: `${sevColor}20`,
                            borderColor: sevColor,
                            color: sevColor,
                          }}
                        >
                          {sevLabel}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[120px]">
                        <span className="truncate block">
                          {alert.device?.name || alert.deviceId}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[120px]">
                        <span className="truncate block">{outletName}</span>
                      </td>
                      <td className="px-3 py-2">
                        {alert.action ? (
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[9px] capitalize"
                          >
                            {alert.action.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                          <span
                            title={format(
                              new Date(alert.timestamp),
                              "dd/MM/yyyy HH:mm:ss",
                            )}
                          >
                            {formatDistance(
                              new Date(alert.timestamp),
                              new Date(),
                              { addSuffix: true },
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => void handleDeleteOne(alert.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Hapus permanen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-3 py-2">
            <span className="text-[10px] text-muted-foreground">
              Hal {page} / {totalPages} · {filteredAlerts.length} alert
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
