"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  MapPin,
  ShieldAlert,
  Hand,
  HardHat,
  Shirt,
  Droplets,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AISummaryCards } from "./AISummaryCards";
import { AIAlertCard } from "./AIAlertCard";
import { AlertDetailModal } from "./AlertDetailModal";
import {
  kitchenDeviceSummary,
  kitchenAlerts,
  kitchenAttributeViolations,
  kitchenOilChanges,
  kitchenOilAnomalies,
  kitchenOilFraud,
  type DeviceAIAlert,
} from "@/lib/ai-alerts";

const outlets = [
  { id: "mall-abcd", name: "Recheese Mall ABCD" },
  { id: "central-park", name: "Recheese Central Park" },
  { id: "paris-van-java", name: "Recheese Paris Van Java" },
  { id: "tunjungan-plaza", name: "Recheese Tunjungan Plaza" },
  { id: "paragon-mall", name: "Recheese Paragon Mall" },
];

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const _defaultStats = [
  { label: "Total Detections", value: "142", change: "+12%", icon: Eye },
  { label: "Active Activities", value: "3", change: "", icon: Activity },
  { label: "Alerts Today", value: "2", change: "-50%", icon: AlertTriangle },
  { label: "Uptime", value: "99.2%", change: "", icon: CheckCircle2 },
];

const statsPerOutlet: Record<string, typeof _defaultStats> = {
  "mall-abcd": _defaultStats,
  "central-park": [
    { label: "Total Detections", value: "118", change: "+8%", icon: Eye },
    { label: "Active Activities", value: "3", change: "", icon: Activity },
    { label: "Alerts Today", value: "1", change: "-75%", icon: AlertTriangle },
    { label: "Uptime", value: "98.5%", change: "", icon: CheckCircle2 },
  ],
  "paris-van-java": [
    { label: "Total Detections", value: "156", change: "+15%", icon: Eye },
    { label: "Active Activities", value: "4", change: "", icon: Activity },
    { label: "Alerts Today", value: "3", change: "+50%", icon: AlertTriangle },
    { label: "Uptime", value: "99.8%", change: "", icon: CheckCircle2 },
  ],
  "tunjungan-plaza": [
    { label: "Total Detections", value: "98", change: "+5%", icon: Eye },
    { label: "Active Activities", value: "2", change: "", icon: Activity },
    { label: "Alerts Today", value: "0", change: "-100%", icon: AlertTriangle },
    { label: "Uptime", value: "99.9%", change: "", icon: CheckCircle2 },
  ],
  "paragon-mall": [
    { label: "Total Detections", value: "131", change: "+10%", icon: Eye },
    { label: "Active Activities", value: "3", change: "", icon: Activity },
    { label: "Alerts Today", value: "2", change: "-25%", icon: AlertTriangle },
    { label: "Uptime", value: "97.8%", change: "", icon: CheckCircle2 },
  ],
};

export function KitchenAnalysis() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedOutlet, setSelectedOutlet] = useState("mall-abcd");
  const [selectedAlert, setSelectedAlert] = useState<DeviceAIAlert | null>(
    null,
  );
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  const stats = useMemo(
    () => statsPerOutlet[selectedOutlet] || _defaultStats,
    [selectedOutlet],
  );

  const handleAlertClick = (alert: DeviceAIAlert) => {
    setSelectedAlert(alert);
    setAlertModalOpen(true);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.muted = true;
      video.play().catch(() => {});
    };

    // Delay to let framer-motion animation complete (initial opacity: 0)
    const timer = setTimeout(() => {
      video.load();
      if (video.readyState >= 3) {
        tryPlay();
      } else {
        video.addEventListener("canplay", tryPlay, { once: true });
        video.addEventListener("loadeddata", tryPlay, { once: true });
      }
    }, 800);

    return () => {
      clearTimeout(timer);
      video.removeEventListener("canplay", tryPlay);
      video.removeEventListener("loadeddata", tryPlay);
    };
  }, []);

  const totalViolations = kitchenAttributeViolations.reduce(
    (a, b) => a + b.count,
    0,
  );

  return (
    <motion.div
      className="flex flex-col gap-1.5 h-full"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
      }}
      initial="hidden"
      animate="visible"
    >
      {/* Top - AI Device Summary */}
      <AISummaryCards summary={kitchenDeviceSummary} />

      {/* Main Content */}
      <div className="grid grid-cols-[2fr_3fr] gap-1.5 flex-1 min-h-0">
        {/* Left - Summary + AI Analytics */}
        <div className="space-y-1.5 overflow-auto">
          {/* Stats Grid */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 gap-1"
          >
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                        <Icon className="h-3 w-3 text-primary" />
                      </div>
                      <div>
                        <p className="text-[8px] text-muted-foreground">
                          {stat.label}
                        </p>
                        <div className="flex items-baseline gap-1">
                          <p className="text-sm font-bold">{stat.value}</p>
                          {stat.change && (
                            <span className="text-[8px] text-emerald-500">
                              {stat.change}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>

          {/* AI Kitchen Analytics Section */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-2 pt-1.5 pb-0">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-violet-500" />
                  <CardTitle className="text-[10px] font-semibold">
                    AI Kitchen Analytics
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-1.5 pt-1">
                {/* Attribute Violations */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-semibold text-muted-foreground">
                      Pelanggaran Atribut Hari Ini
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[7px] px-1 py-0 h-3.5 border-amber-500/30 text-amber-500"
                    >
                      {totalViolations} total
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {kitchenAttributeViolations.map((v) => {
                      const vIcon =
                        v.type === "glove"
                          ? Hand
                          : v.type === "apron"
                            ? Shirt
                            : HardHat;
                      const VIcon = vIcon;
                      return (
                        <div
                          key={v.type}
                          className="flex items-center gap-2 p-1.5 rounded border bg-card"
                        >
                          <VIcon className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          <span className="text-[8px] flex-1">{v.label}</span>
                          <Badge
                            variant="outline"
                            className="text-[7px] px-1 py-0 h-3.5 border-amber-500/30 text-amber-500"
                          >
                            {v.count}x
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  {/* Mini hourly chart via bars */}
                  <div className="mt-1.5">
                    <p className="text-[7px] text-muted-foreground mb-0.5">
                      Pelanggaran per jam (06-15)
                    </p>
                    <div className="flex items-end gap-[2px] h-6">
                      {Array.from({ length: 10 }, (_, i) => {
                        const hour = i + 6;
                        const total = kitchenAttributeViolations.reduce(
                          (acc, v) => acc + (v.hourlyData[hour] || 0),
                          0,
                        );
                        const maxH = 4;
                        const h =
                          total > 0 ? Math.max(4, (total / maxH) * 24) : 2;
                        return (
                          <div
                            key={hour}
                            className="flex flex-col items-center gap-0.5 flex-1"
                          >
                            <div
                              className={`w-full rounded-sm ${total > 0 ? "bg-amber-500" : "bg-muted"}`}
                              style={{ height: `${h}px` }}
                            />
                            <span className="text-[5px] text-muted-foreground">
                              {hour}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Oil Change Activity */}
                <div className="border-t pt-1.5 mb-2">
                  <span className="text-[8px] font-semibold text-muted-foreground">
                    Pergantian Minyak
                  </span>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    <div className="p-1.5 rounded border bg-card text-center">
                      <p className="text-xs font-bold text-cyan-500">
                        {kitchenOilChanges.totalChanges}
                      </p>
                      <p className="text-[6px] text-muted-foreground">Total</p>
                    </div>
                    <div className="p-1.5 rounded border bg-card text-center">
                      <p className="text-xs font-bold text-green-500">
                        {kitchenOilChanges.lastChangeTime}
                      </p>
                      <p className="text-[6px] text-muted-foreground">
                        Terakhir
                      </p>
                    </div>
                    <div className="p-1.5 rounded border bg-card text-center">
                      <p className="text-xs font-bold text-blue-500">
                        {kitchenOilChanges.frequencyPerDay}/hari
                      </p>
                      <p className="text-[6px] text-muted-foreground">
                        Frekuensi
                      </p>
                    </div>
                  </div>
                </div>

                {/* Oil Anomaly */}
                <div className="border-t pt-1.5 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-semibold text-muted-foreground">
                      Anomali Pergantian Minyak
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[7px] px-1 py-0 h-3.5 ${
                        kitchenOilAnomalies.riskLevel === "High"
                          ? "border-red-500/30 text-red-500"
                          : kitchenOilAnomalies.riskLevel === "Medium"
                            ? "border-amber-500/30 text-amber-500"
                            : "border-green-500/30 text-green-500"
                      }`}
                    >
                      {kitchenOilAnomalies.riskLevel} Risk
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    {kitchenOilAnomalies.events.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-orange-500/5 border-orange-500/20"
                      >
                        <Droplets className="h-2.5 w-2.5 text-orange-500 flex-shrink-0" />
                        <span className="text-muted-foreground w-8">
                          {e.time}
                        </span>
                        <span className="flex-1 truncate">{e.description}</span>
                        <span className="text-[7px] text-muted-foreground">
                          {e.tray}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suspected Oil Fraud */}
                <div className="border-t pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-semibold text-muted-foreground">
                      Suspected Fraud Minyak
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[7px] px-1 py-0 h-3.5 border-red-500/30 text-red-500"
                    >
                      {kitchenOilFraud.totalEvents} events
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    {kitchenOilFraud.events.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-red-500/5 border-red-500/20"
                      >
                        <ShieldAlert className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />
                        <span className="text-muted-foreground w-8">
                          {e.time}
                        </span>
                        <span className="flex-1 truncate">{e.description}</span>
                        <Badge
                          variant="outline"
                          className="text-[6px] px-0.5 py-0 h-3 border-red-500/30 text-red-500"
                        >
                          {e.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right - Video Feed + AI Alerts */}
        <div className="space-y-1.5 overflow-auto">
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-2 pt-1.5 pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-semibold">
                    AI Vision Feed
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[8px] text-muted-foreground">
                      LIVE
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-2 pt-1">
                <div className="relative h-[250px] rounded-md overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  >
                    <source src="/kitchen.mp4" type="video/mp4" />
                  </video>
                  {/* Bottom overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="flex items-center justify-between text-white/70 text-[8px]">
                      <span>CAM-01 | Kitchen AI Detection</span>
                      <span>Last Update: 2 sec ago</span>
                    </div>
                  </div>
                </div>

                {/* Outlet Selector */}
                <div className="flex items-center gap-2 mt-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <Select
                    value={selectedOutlet}
                    onValueChange={setSelectedOutlet}
                  >
                    <SelectTrigger size="sm" className="w-full h-7 text-[10px]">
                      <SelectValue placeholder="Pilih Outlet" />
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((outlet) => (
                        <SelectItem
                          key={outlet.id}
                          value={outlet.id}
                          className="text-[10px]"
                        >
                          {outlet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Alert Cards - Kitchen */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-2 pt-1.5 pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                    <CardTitle className="text-[10px] font-semibold">
                      AI Alerts — Kitchen
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[7px] px-1 py-0 h-3.5 border-red-500/30 text-red-500"
                  >
                    {kitchenAlerts.length} alerts
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-1.5 pt-1">
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {kitchenAlerts.map((alert) => (
                      <AIAlertCard
                        key={alert.id}
                        alert={alert}
                        onClick={handleAlertClick}
                        compact
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Alert Detail Modal */}
      <AlertDetailModal
        alert={selectedAlert}
        open={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
      />
    </motion.div>
  );
}
