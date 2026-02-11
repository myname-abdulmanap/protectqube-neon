"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Flame,
  ShoppingBag,
  Package,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const detections = [
  {
    id: 1,
    type: "Frying Activity",
    icon: Flame,
    confidence: 94,
    status: "active",
    time: "2 min ago",
    detail: "Deep frying detected at Station #2",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: 2,
    type: "Serving Customer",
    icon: ShoppingBag,
    confidence: 87,
    status: "active",
    time: "30 sec ago",
    detail: "Staff serving at Counter #1",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: 3,
    type: "Drum Detected",
    icon: Package,
    confidence: 91,
    status: "idle",
    time: "5 min ago",
    detail: "Oil drum at storage area",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: 4,
    type: "Jerrycan Detected",
    icon: Package,
    confidence: 88,
    status: "idle",
    time: "5 min ago",
    detail: "Jerrycan near fryer station",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: 5,
    type: "Frying Activity",
    icon: Flame,
    confidence: 92,
    status: "active",
    time: "1 min ago",
    detail: "Batch frying at Station #1",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: 6,
    type: "Cleaning Activity",
    icon: Activity,
    confidence: 79,
    status: "completed",
    time: "15 min ago",
    detail: "Floor cleaning near Station #3",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

const stats = [
  { label: "Total Detections", value: "142", change: "+12%", icon: Eye },
  { label: "Active Activities", value: "3", change: "", icon: Activity },
  { label: "Alerts Today", value: "2", change: "-50%", icon: AlertTriangle },
  { label: "Uptime", value: "99.2%", change: "", icon: CheckCircle2 },
];

export function KitchenAnalysis() {
  const videoRef = useRef<HTMLVideoElement>(null);

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
        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-1">
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

        {/* Detection List */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                AI Detection Log
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-1.5 pt-1">
              <ScrollArea className="h-[320px]">
                <div className="space-y-1">
                  {detections.map((d) => {
                    const Icon = d.icon;
                    return (
                      <div
                        key={d.id}
                        className="flex items-start gap-2 p-1.5 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className={`h-6 w-6 rounded flex items-center justify-center ${d.bgColor}`}
                        >
                          <Icon className={`h-3 w-3 ${d.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[9px] font-semibold truncate">
                              {d.type}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-[7px] px-1 py-0 h-3.5 ${
                                d.status === "active"
                                  ? "border-green-500/50 text-green-500"
                                  : d.status === "completed"
                                    ? "border-blue-500/50 text-blue-500"
                                    : "border-muted-foreground/50 text-muted-foreground"
                              }`}
                            >
                              {d.status}
                            </Badge>
                          </div>
                          <p className="text-[8px] text-muted-foreground">
                            {d.detail}
                          </p>
                          <div className="flex items-center justify-between mt-0.5">
                            <div className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                              <span className="text-[7px] text-muted-foreground">
                                {d.time}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Progress
                                value={d.confidence}
                                className="h-1 w-10"
                              />
                              <span className="text-[7px] text-muted-foreground">
                                {d.confidence}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                AI Vision Feed
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
                <source src="/kitchen-hasil.mp4" type="video/mp4" />
              </video>
              {/* Bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="flex items-center justify-between text-white/70 text-[8px]">
                  <span>CAM-01 | Kitchen AI Detection</span>
                  <span>Last Update: 2 sec ago</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
