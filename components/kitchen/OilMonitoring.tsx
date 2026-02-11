"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Droplets,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Thermometer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const trayData = [
  {
    id: 1,
    name: "Tray #1",
    oilColor: "Dark Yellow",
    colorHex: "#b8860b",
    status: "Need Change",
    statusColor: "text-red-500 bg-red-500/10 border-red-500/30",
    startTime: "06:00 AM",
    duration: "8h 30m",
    temp: "175°C",
    tds: 24,
  },
  {
    id: 2,
    name: "Tray #2",
    oilColor: "Clear Yellow",
    colorHex: "#ffd700",
    status: "Fresh Oil",
    statusColor: "text-green-500 bg-green-500/10 border-green-500/30",
    startTime: "10:30 AM",
    duration: "4h 00m",
    temp: "170°C",
    tds: 8,
  },
  {
    id: 3,
    name: "Tray #3",
    oilColor: "Brown Black",
    colorHex: "#3b2f2f",
    status: "Need Change",
    statusColor: "text-red-500 bg-red-500/10 border-red-500/30",
    startTime: "05:30 AM",
    duration: "9h 00m",
    temp: "180°C",
    tds: 31,
  },
  {
    id: 4,
    name: "Tray #4",
    oilColor: "Light Yellow",
    colorHex: "#ffe066",
    status: "Good",
    statusColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    startTime: "08:00 AM",
    duration: "6h 30m",
    temp: "165°C",
    tds: 14,
  },
  {
    id: 5,
    name: "Tray #5",
    oilColor: "Dark Brown",
    colorHex: "#654321",
    status: "Warning",
    statusColor: "text-orange-500 bg-orange-500/10 border-orange-500/30",
    startTime: "07:00 AM",
    duration: "7h 30m",
    temp: "172°C",
    tds: 22,
  },
];

const summaryStats = [
  {
    label: "Fresh Oil",
    value: "2",
    icon: CheckCircle2,
    color: "text-green-500",
  },
  {
    label: "Need Change",
    value: "2",
    icon: AlertTriangle,
    color: "text-red-500",
  },
  { label: "Warning", value: "1", icon: Droplets, color: "text-orange-500" },
  {
    label: "Avg Temp",
    value: "172°C",
    icon: Thermometer,
    color: "text-cyan-500",
  },
];

export function OilMonitoring() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.muted = true;
      video.play().catch(() => {});
    };

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

  return (
    <motion.div
      className="grid grid-cols-[2fr_3fr] gap-1.5 h-full"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
      }}
      initial="hidden"
      animate="visible"
    >
      {/* Left - Summary */}
      <div className="space-y-1.5">
        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-1">
          {summaryStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded bg-muted/50 flex items-center justify-center">
                      <Icon className={`h-3 w-3 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-[8px] text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="text-sm font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Tray List */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Oil Condition per Tray
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-1.5 pt-1">
              <ScrollArea className="h-[320px]">
                <div className="space-y-1.5">
                  {trayData.map((tray) => (
                    <div
                      key={tray.id}
                      className="p-2 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] font-semibold">{tray.name}</p>
                        <Badge
                          variant="outline"
                          className={`text-[7px] px-1 py-0 h-3.5 ${tray.statusColor}`}
                        >
                          {tray.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="h-4 w-8 rounded border"
                          style={{ backgroundColor: tray.colorHex }}
                        />
                        <span className="text-[8px] text-muted-foreground">
                          {tray.oilColor}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[7px] text-muted-foreground">
                        <div className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          <span>Start: {tray.startTime}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          <span>Duration: {tray.duration}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Thermometer className="h-2.5 w-2.5" />
                          <span>{tray.temp}</span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[7px] text-muted-foreground">
                          TDS:
                        </span>
                        <Progress
                          value={(tray.tds / 35) * 100}
                          className={`h-1 flex-1 ${tray.tds > 25 ? "[&>div]:bg-red-500" : tray.tds > 18 ? "[&>div]:bg-orange-500" : "[&>div]:bg-green-500"}`}
                        />
                        <span className="text-[7px] text-muted-foreground">
                          {tray.tds}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Right - Video Feed */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm h-full">
          <CardHeader className="px-2 pt-1.5 pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] font-semibold">
                Oil Color Detection Feed
              </CardTitle>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[8px] text-muted-foreground">LIVE</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-1">
            <div className="relative h-[420px] rounded-md overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
              >
                <source src="/minyak-hasil.mp4" type="video/mp4" />
              </video>
              {/* Bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="flex items-center justify-between text-white/70 text-[8px]">
                  <span>CAM-02 | Oil Color Detection</span>
                  <span>Last Update: 5 sec ago</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
