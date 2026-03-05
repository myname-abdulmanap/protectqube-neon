"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  deviceMetricsApi,
  deviceModulesApi,
  type DeviceMetric,
  type DeviceModule,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { BarChart3, Search } from "lucide-react";

export default function DeviceMetricsPage() {
  const { hasPermission } = useAuth();
  const [metrics, setMetrics] = useState<DeviceMetric[]>([]);
  const [modules, setModules] = useState<DeviceModule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterModule, setFilterModule] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  const canManage =
    hasPermission("manage_roles") || hasPermission("device_metrics:read");

  useEffect(() => {
    (async () => {
      try {
        const res = await deviceModulesApi.getAll();
        if (res.success && res.data) setModules(res.data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const query = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};
      if (filterModule) params.moduleId = filterModule;
      if (filterFrom) params.from = new Date(filterFrom).toISOString();
      if (filterTo) params.to = new Date(filterTo).toISOString();
      const res = await deviceMetricsApi.getAll(params);
      if (res.success && res.data) setMetrics(res.data);
    } catch {
      setError("Failed to load metrics");
    } finally {
      setIsLoading(false);
    }
  };

  if (!canManage)
    return (
      <div className="p-4 text-sm text-muted-foreground">No permission</div>
    );

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Device Metrics</h1>
      </div>

      {error && (
        <div className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Module</Label>
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All modules
                  </SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.moduleType} ({m.device?.name || m.deviceId.slice(0, 8)}
                      )
                    </SelectItem>
                  ))}
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
                <TableHead className="text-xs">Module</TableHead>
                <TableHead className="text-xs">Metric Type</TableHead>
                <TableHead className="text-xs">Value</TableHead>
                <TableHead className="text-xs">Unit</TableHead>
                <TableHead className="text-xs">Recorded At</TableHead>
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
              ) : metrics.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-xs text-muted-foreground"
                  >
                    No metrics — click Query to search
                  </TableCell>
                </TableRow>
              ) : (
                metrics.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">
                      {m.moduleType || "-"}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {m.metricKey}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {m.metricValue}
                    </TableCell>
                    <TableCell className="text-xs">{m.unit || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
