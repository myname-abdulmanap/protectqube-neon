"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  ListOrdered,
  MapPin,
  Monitor,
  Wifi,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AlertEvent, AlertAction } from "@/lib/api";
import { formatDistance } from "date-fns";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

export interface AlertDetailData {
  alertType: string;
  severityLabel: string;
  deviceLabel: string;
  outletLabel: string;
  areaLabel: string;
  timestampLabel: string;
  descriptionLabel: string;
  timeline: string[];
  imageUrls: string[];
  latitude: number | null;
  longitude: number | null;
  deviceStatus: string;
  deviceId: string;
  deviceName: string;
  outlet: string;
  area: string;
}

interface AlertDetailDialogProps {
  alert: AlertEvent | null;
  detail: AlertDetailData | null;
  onClose: () => void;
  getAlertCategory: (alert: AlertEvent) => "critical" | "suspicious" | "health";
  actions?: AlertAction[];
  onActionUpdate?: (alertId: string, actionKey: string) => Promise<boolean>;
  onActionUpdateAll?: (actionKey: string) => Promise<boolean>;
}

function AlertLocationMap({ detail }: { detail: AlertDetailData }) {
  const [mounted, setMounted] = useState(false);
  const [leafletIcon, setLeafletIcon] = useState<L.DivIcon | null>(null);

  useEffect(() => {
    setMounted(true);
    import("leaflet").then((L) => {
      setLeafletIcon(
        L.divIcon({
          className: "custom-marker",
          html: '<div style="width:22px;height:22px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.3);"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          popupAnchor: [0, -11],
        }),
      );
    });
  }, []);

  if (
    !mounted ||
    !leafletIcon ||
    detail.latitude == null ||
    detail.longitude == null
  ) {
    return (
      <div className="h-[280px] rounded-lg bg-muted/30 flex items-center justify-center">
        <p className="text-muted-foreground text-xs">
          Location coordinates not available
        </p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[detail.latitude, detail.longitude]}
      zoom={16}
      className="rounded-lg z-0"
      style={{ height: "280px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[detail.latitude, detail.longitude]} icon={leafletIcon}>
        <Popup>
          <div className="min-w-[180px]">
            <p className="font-semibold text-sm mb-0.5">{detail.outlet}</p>
            <p className="text-xs text-gray-500 mb-1">{detail.area}</p>
            <div className="text-xs space-y-0.5">
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Device:</span>
                <span className="font-medium text-right">
                  {detail.deviceName}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">ID:</span>
                <span className="font-medium text-right">
                  {detail.deviceId}
                </span>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-xs gap-3">
      <span className="text-muted-foreground">{label}</span>
      {children || <span className="font-medium text-right">{value}</span>}
    </div>
  );
}

export function AlertDetailDialog({
  alert,
  detail,
  onClose,
  getAlertCategory,
  actions,
  onActionUpdate,
  onActionUpdateAll,
}: AlertDetailDialogProps) {
  const [selectedActionKey, setSelectedActionKey] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizeModuleType = (value: string | null | undefined): string => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    if (normalized.includes("ai")) return "ai";
    return "power_meter";
  };

  const availableActions = useMemo(() => {
    const list = actions ?? [];
    if (!alert) return list;

    const alertModuleType = normalizeModuleType(alert.moduleType);
    const byModule = list.filter(
      (action) => normalizeModuleType(action.moduleType) === alertModuleType,
    );
    return byModule.length > 0 ? byModule : list;
  }, [actions, alert]);

  useEffect(() => {
    if (!alert) {
      setSelectedActionKey("");
      setIsSubmitting(false);
    }
  }, [alert]);

  useEffect(() => {
    if (!selectedActionKey) return;
    const stillValid = availableActions.some(
      (a) => a.key === selectedActionKey,
    );
    if (!stillValid) {
      setSelectedActionKey("");
    }
  }, [availableActions, selectedActionKey]);

  const handleUpdate = async () => {
    if (!alert || !selectedActionKey || !onActionUpdate) return;
    setIsSubmitting(true);
    try {
      await onActionUpdate(alert.id, selectedActionKey);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAll = async () => {
    if (!selectedActionKey || !onActionUpdateAll) return;
    setIsSubmitting(true);
    try {
      await onActionUpdateAll(selectedActionKey);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!alert} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {alert && detail && (
          <>
            <DialogHeader className="px-3 pt-3 pb-2 border-b space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md flex items-center justify-center bg-muted">
                  {getAlertCategory(alert) === "critical" ? (
                    <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                  ) : getAlertCategory(alert) === "suspicious" ? (
                    <Info className="h-3.5 w-3.5 text-blue-500" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full rounded-none border-b bg-muted/30 h-8 px-2">
                <TabsTrigger value="overview" className="text-[9px] h-6 px-2">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-[9px] h-6 px-2">
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="location" className="text-[9px] h-6 px-2">
                  Location
                </TabsTrigger>
                <TabsTrigger value="device" className="text-[9px] h-6 px-2">
                  Device Info
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="max-h-[55vh]">
                <TabsContent value="overview" className="p-4 space-y-3 mt-0">
                  <div className="space-y-2">
                    <Row label="Alert Type" value={detail.alertType} />
                    <Row label="Severity">
                      <Badge
                        variant="outline"
                        className="text-[8px] px-1.5 py-0"
                      >
                        {detail.severityLabel}
                      </Badge>
                    </Row>
                    <Row label="Device" value={detail.deviceLabel} />
                    <Row label="Outlet" value={detail.outletLabel} />
                    <Row label="Area" value={detail.areaLabel} />
                    <Row label="Timestamp" value={detail.timestampLabel} />
                  </div>

                  <div className="border-t pt-3">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Description
                    </h4>
                    <p className="text-xs leading-relaxed">
                      {detail.descriptionLabel}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="p-4 space-y-3 mt-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ListOrdered className="h-3.5 w-3.5 text-cyan-500" />
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Event Timeline
                    </h4>
                  </div>
                  <div className="relative pl-4 border-l-2 border-muted space-y-3">
                    {detail.timeline.map((event, index) => (
                      <div key={`${event}-${index}`} className="relative">
                        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-cyan-500 border-2 border-background" />
                        <p className="text-xs leading-relaxed">{event}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="location" className="p-4 space-y-3 mt-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin className="h-3.5 w-3.5 text-green-500" />
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Location
                    </h4>
                  </div>
                  <div className="space-y-2 mb-3">
                    <Row label="Outlet" value={detail.outlet} />
                    <Row label="Area" value={detail.area} />
                    <Row label="Device" value={detail.deviceName} />
                  </div>
                  <AlertLocationMap detail={detail} />
                </TabsContent>

                <TabsContent value="device" className="p-4 space-y-3 mt-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Monitor className="h-3.5 w-3.5 text-indigo-500" />
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Device Info
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <Row label="Device Name" value={detail.deviceName} />
                    <Row label="Status">
                      <div className="flex items-center gap-1.5">
                        <Wifi className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-500 font-medium">
                          {detail.deviceStatus}
                        </span>
                      </div>
                    </Row>
                    <Row label="Last Update">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">
                          {formatDistance(
                            new Date(alert.timestamp),
                            new Date(),
                            {
                              addSuffix: true,
                            },
                          )}
                        </span>
                      </div>
                    </Row>
                    <Row label="Area" value={detail.area} />
                    <Row label="Outlet" value={detail.outlet} />
                    <Row label="Module" value={alert.moduleType} />
                  </div>
                </TabsContent>
              </ScrollArea>

              {onActionUpdate && (
                <div className="border-t px-4 py-3 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                    Action:
                  </span>
                  <Select
                    value={selectedActionKey}
                    onValueChange={setSelectedActionKey}
                    disabled={availableActions.length === 0 || isSubmitting}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue
                        placeholder={
                          availableActions.length > 0
                            ? "Pilih action..."
                            : "Action tidak tersedia"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableActions.map((action) => (
                        <SelectItem
                          key={action.id}
                          value={action.key}
                          className="text-xs"
                        >
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => void handleUpdate()}
                    disabled={
                      availableActions.length === 0 ||
                      !selectedActionKey ||
                      isSubmitting
                    }
                  >
                    {isSubmitting ? "Saving..." : "Update"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => void handleUpdateAll()}
                    disabled={
                      availableActions.length === 0 ||
                      !selectedActionKey ||
                      isSubmitting ||
                      !onActionUpdateAll
                    }
                  >
                    Update All
                  </Button>
                </div>
              )}
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
