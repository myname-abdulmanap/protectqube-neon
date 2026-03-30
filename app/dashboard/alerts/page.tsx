"use client";

import { useEffect, useState } from "react";
import { AlertsDashboard } from "@/components/dashboard/AlertsDashboard";
import { energyDashboardApi, type AlertEvent } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Camera, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AlertsDashboardPage() {
  const [filterOutlet, setFilterOutlet] = useState("all");
  const [filterDevice, setFilterDevice] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [outlets, setOutlets] = useState<{ scopeId: string; scope: { name: string } }[]>([]);
  const [devices, setDevices] = useState<{ id: string; name: string }[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);

  // Load outlets on mount
  useEffect(() => {
    energyDashboardApi.getOutlets().then((res) => {
      if (res.success && res.data) {
        setOutlets(res.data);
      }
    });
  }, []);

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Alert</h1>
        
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <Select value={filterOutlet} onValueChange={setFilterOutlet}>
              <SelectTrigger size="sm" className="h-7 w-[130px] text-xs border-0 bg-secondary">
                <SelectValue placeholder="Outlets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Outlets</SelectItem>
                {outlets.map((o) => (
                  <SelectItem key={o.scopeId} value={o.scope.name} className="text-xs">
                    {o.scope.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Camera className="h-3 w-3 text-muted-foreground" />
            <Select value={filterDevice} onValueChange={setFilterDevice}>
              <SelectTrigger size="sm" className="h-7 w-[140px] text-xs border-0 bg-secondary">
                <SelectValue placeholder="Devices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Devices</SelectItem>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative min-w-[120px]">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="h-7 pl-7 text-xs border-0 bg-secondary"
            />
          </div>

          <Badge variant="secondary" className="h-6 px-2 text-[10px]">
            {alerts.length}
          </Badge>
        </div>
      </div>
      
      <AlertsDashboard 
        filterOutlet={filterOutlet}
        onFilterOutletChange={setFilterOutlet}
        filterDevice={filterDevice}
        onFilterDeviceChange={setFilterDevice}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      />
    </div>
  );
}
