"use client";

import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  MapPin,
  Brain,
  ImageIcon,
  Play,
  ListOrdered,
  Monitor,
  Wifi,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AIAlert, AlertSeverity } from "@/lib/ai-alerts";
import { useRef, useEffect, useState } from "react";

// Dynamically import Leaflet components (SSR-incompatible)
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

const severityConfig: Record<
  AlertSeverity,
  { bg: string; text: string; icon: typeof AlertTriangle; badgeBg: string }
> = {
  Critical: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    icon: ShieldAlert,
    badgeBg: "bg-red-500/10 text-red-500 border-red-500/30",
  },
  Suspicious: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    icon: Info,
    badgeBg: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  },
  Health: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    icon: AlertTriangle,
    badgeBg: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
};

interface AlertDetailModalProps {
  alert: AIAlert | null;
  open: boolean;
  onClose: () => void;
}

// Leaflet map sub-component rendered only client-side
function AlertLocationMap({ alert }: { alert: AIAlert }) {
  const [mounted, setMounted] = useState(false);
  const [leafletIcon, setLeafletIcon] = useState<L.DivIcon | null>(null);

  useEffect(() => {
    setMounted(true);
    import("leaflet").then((L) => {
      const severityColor =
        alert.severity === "Critical"
          ? "#ef4444"
          : alert.severity === "Health"
            ? "#f59e0b"
            : "#3b82f6";
      setLeafletIcon(
        L.divIcon({
          className: "custom-marker",
          html: `<div style="width:22px;height:22px;background:${severityColor};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.3);"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          popupAnchor: [0, -11],
        }),
      );
    });
  }, [alert.severity]);

  if (!mounted || !leafletIcon || !alert.location) {
    return (
      <div className="h-[300px] rounded-lg bg-muted/30 flex items-center justify-center">
        <p className="text-muted-foreground text-xs">Loading map…</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[alert.location.lat, alert.location.lng]}
      zoom={17}
      className="rounded-lg z-0"
      style={{ height: "300px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[alert.location.lat, alert.location.lng]}
        icon={leafletIcon}
      >
        <Popup>
          <div className="min-w-[160px]">
            <p className="font-semibold text-sm mb-0.5">
              {alert.location.name}
            </p>
            <p className="text-xs text-gray-500 mb-1">{alert.location.area}</p>
            <div className="text-xs space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Device:</span>
                <span className="font-medium">{alert.deviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID:</span>
                <span className="font-medium">{alert.deviceId}</span>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}

export function AlertDetailModal({
  alert,
  open,
  onClose,
}: AlertDetailModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    const v = videoRef.current;
    v.muted = true;
    v.load();
    v.currentTime = 0;
    const playAttempt = v.play();
    if (playAttempt !== undefined) {
      playAttempt.catch(() => {
        setTimeout(() => {
          v.play().catch(() => {});
        }, 150);
      });
    }
  }, [open, alert]);

  if (!alert) return null;

  const config = severityConfig[alert.severity];
  const SeverityIcon = config.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-3 pt-3 pb-2 border-b space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-md flex items-center justify-center ${config.bg}`}
              >
                <SeverityIcon className={`h-3.5 w-3.5 ${config.text}`} />
              </div>
              <DialogTitle className="text-xs font-semibold">
                {alert.alertType}
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className={`text-[8px] px-1.5 py-0 ${config.badgeBg}`}
            >
              {alert.severity}
            </Badge>
          </div>
        </DialogHeader>

        {/* Tabbed Content — 5 tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full rounded-none border-b bg-muted/30 h-8 px-2">
            <TabsTrigger value="overview" className="text-[9px] h-6 px-2">
              Overview
            </TabsTrigger>
            <TabsTrigger value="insight" className="text-[9px] h-6 px-2">
              AI Insight
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
            {/* TAB 1 — Overview + Gallery */}
            <TabsContent value="overview" className="p-4 space-y-3 mt-0">
              {/* Alert Details */}
              <div className="space-y-2">
                <Row label="Alert Type" value={alert.alertType} />
                <Row label="Severity">
                  <Badge
                    variant="outline"
                    className={`text-[8px] px-1.5 py-0 ${config.badgeBg}`}
                  >
                    {alert.severity}
                  </Badge>
                </Row>
                <Row
                  label="Device"
                  value={`${alert.deviceName} (${alert.deviceId})`}
                />
                <Row label="Outlet" value={alert.outlet} />
                <Row label="Area" value={alert.area} />
                <Row label="Timestamp" value={alert.timestamp} />
              </div>
              <div className="border-t pt-3">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Description
                </h4>
                <p className="text-xs leading-relaxed">{alert.description}</p>
              </div>

              {/* Gallery — Video + 3 frames stacked vertically */}
              <div className="border-t pt-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <ImageIcon className="h-3.5 w-3.5 text-cyan-500" />
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Alert Evidence
                  </h4>
                </div>

                <div className="space-y-1.5">
                  {/* Main video */}
                  {alert.videoUrl && (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                      <video
                        ref={videoRef}
                        src={alert.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        preload="auto"
                        controls
                      />
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 text-white text-[7px] px-1.5 py-0.5 rounded">
                        <Play className="h-2.5 w-2.5" />
                        <span>Video Evidence</span>
                      </div>
                    </div>
                  )}

                  {/* 3 thumbnail frames in a row */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center"
                      >
                        {alert.videoUrl ? (
                          <video
                            src={alert.videoUrl}
                            className="h-full w-full object-cover"
                            muted
                            preload="metadata"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[7px] text-center py-0.5">
                          Frame {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2 — AI Insight */}
            <TabsContent value="insight" className="p-4 space-y-3 mt-0">
              <div className="flex items-center gap-1.5 mb-2">
                <Brain className="h-3.5 w-3.5 text-violet-500" />
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Insight
                </h4>
              </div>
              <div className="space-y-1">
                {alert.aiInsight.map((insight, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs bg-violet-500/5 rounded-md px-2.5 py-1.5 border border-violet-500/10"
                  >
                    <span className="text-violet-500 font-mono text-[10px] mt-px">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-relaxed">{insight}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 3 — Timeline */}
            <TabsContent value="timeline" className="p-4 space-y-3 mt-0">
              <div className="flex items-center gap-1.5 mb-2">
                <ListOrdered className="h-3.5 w-3.5 text-cyan-500" />
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Event Timeline
                </h4>
              </div>
              <div className="relative pl-4 border-l-2 border-muted space-y-3">
                {alert.timeline.map((event, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-cyan-500 border-2 border-background" />
                    <p className="text-xs leading-relaxed">{event}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 4 — Location (Leaflet Map) */}
            <TabsContent value="location" className="p-4 space-y-3 mt-0">
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5 text-green-500" />
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Location
                </h4>
              </div>
              <div className="space-y-2 mb-3">
                <Row label="Outlet" value={alert.outlet} />
                <Row label="Area" value={alert.area} />
                <Row label="Device" value={alert.deviceName} />
              </div>
              <AlertLocationMap alert={alert} />
            </TabsContent>

            {/* TAB 5 — Device Info */}
            <TabsContent value="device" className="p-4 space-y-3 mt-0">
              <div className="flex items-center gap-1.5 mb-2">
                <Monitor className="h-3.5 w-3.5 text-indigo-500" />
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Device Info
                </h4>
              </div>
              <div className="space-y-2">
                <Row label="Device ID" value={alert.deviceId} />
                <Row label="Device Name" value={alert.deviceName} />
                <Row label="Status">
                  <div className="flex items-center gap-1.5">
                    <Wifi className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500 font-medium">
                      Active
                    </span>
                  </div>
                </Row>
                <Row label="Last Heartbeat">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs">3 seconds ago</span>
                  </div>
                </Row>
                <Row label="Area" value={alert.area} />
                <Row label="Outlet" value={alert.outlet} />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
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
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      {children || <span className="font-medium">{value}</span>}
    </div>
  );
}
