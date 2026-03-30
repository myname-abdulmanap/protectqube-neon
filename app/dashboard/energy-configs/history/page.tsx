"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, History, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  energyConfigsApi,
  scopesApi,
  type EnergyConfig,
  type Scope,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return currencyFormatter.format(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} ${date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} WIB`;
}

function getTariffMode(config: EnergyConfig) {
  return config.config?.tariff?.mode === "tou" ? "tou" : "flat";
}

function renderTariffSummary(config: EnergyConfig) {
  const tariff = config.config?.tariff;
  if (!tariff || tariff.mode === "flat") {
    const flatPrice = tariff?.flatPricePerKwh ?? config.pricePerKwh;
    return (
      <span className="text-xs font-medium">
        Flat {formatCurrency(flatPrice)}/kWh
      </span>
    );
  }

  if (!tariff.touPeriods?.length) {
    return (
      <span className="text-xs text-muted-foreground">TOU periods not set</span>
    );
  }

  return (
    <div className="space-y-1">
      {tariff.touPeriods.map((period) => (
        <div
          key={
            period.id ?? `${period.label}-${period.startTime}-${period.endTime}`
          }
          className="text-xs"
        >
          <span className="font-medium">{period.label}</span>
          <span className="text-muted-foreground">
            {" "}
            {period.startTime}-{period.endTime}
          </span>
          <span> · {formatCurrency(period.pricePerKwh)}/kWh</span>
        </div>
      ))}
    </div>
  );
}

export default function EnergyConfigHistoryPage() {
  const { hasPermission } = useAuth();
  const [configs, setConfigs] = useState<EnergyConfig[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [filterScope, setFilterScope] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canRead = hasPermission("energy_configs:read");

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [configRes, scopeRes] = await Promise.all([
        energyConfigsApi.getAll(filterScope || undefined),
        scopesApi.getAll(),
      ]);

      if (configRes.success && configRes.data) {
        setConfigs(
          [...configRes.data].sort(
            (a, b) =>
              new Date(b.validFrom).getTime() -
                new Date(a.validFrom).getTime() ||
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
      } else {
        setConfigs([]);
        setError(configRes.error ?? "Failed to load tariff history");
      }

      if (scopeRes.success && scopeRes.data) {
        setScopes(scopeRes.data);
      }
    } catch {
      setError("Failed to load tariff history");
    } finally {
      setIsLoading(false);
    }
  }, [filterScope]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    let flatCount = 0;
    let touCount = 0;
    for (const config of configs) {
      if (getTariffMode(config) === "tou") touCount += 1;
      else flatCount += 1;
    }
    return {
      total: configs.length,
      flatCount,
      touCount,
    };
  }, [configs]);

  if (!canRead) {
    return (
      <div className="p-4 text-sm text-muted-foreground">No permission</div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <div>
            <h1 className="text-lg font-semibold">Tariff History</h1>
            <p className="text-xs text-muted-foreground">
              Riwayat perubahan konfigurasi tarif per outlet.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filterScope || "all"}
            onValueChange={(value) =>
              setFilterScope(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="All scopes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All scopes
              </SelectItem>
              {scopes.map((scope) => (
                <SelectItem key={scope.id} value={scope.id} className="text-xs">
                  {scope.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" asChild className="h-8 text-xs">
            <Link href="/dashboard/energy-configs">
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to Configs
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Config</p>
            <p className="mt-1 text-xl font-semibold">{totals.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Flat</p>
            <p className="mt-1 text-xl font-semibold text-sky-700">
              {totals.flatCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">TOU</p>
            <p className="mt-1 text-xl font-semibold text-amber-700">
              {totals.touCount}
            </p>
          </CardContent>
        </Card>
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
                <TableHead className="text-xs">Scope</TableHead>
                <TableHead className="text-xs">Mode</TableHead>
                <TableHead className="text-xs">Tariff Detail</TableHead>
                <TableHead className="text-xs">Base Price</TableHead>
                <TableHead className="text-xs">Max Load</TableHead>
                <TableHead className="text-xs">Capacity VA</TableHead>
                <TableHead className="text-xs">Limit kWh</TableHead>
                <TableHead className="text-xs">Valid From</TableHead>
                <TableHead className="text-xs">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-xs text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : configs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-xs text-muted-foreground"
                  >
                    No history found
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((config) => {
                  const mode = getTariffMode(config);
                  return (
                    <TableRow key={config.id}>
                      <TableCell className="text-xs font-medium">
                        <div>{config.scope?.name ?? "-"}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {config.scopeId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            mode === "tou"
                              ? "border-amber-300 text-amber-700"
                              : "border-sky-300 text-sky-700"
                          }
                        >
                          {mode.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[260px]">
                        {renderTariffSummary(config)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {formatCurrency(config.pricePerKwh)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {config.maxLoadKw ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {config.capacityVa ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {config.upperLimitKwh ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(config.validFrom)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(config.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
