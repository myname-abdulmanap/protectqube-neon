"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Droplets,
  Timer,
  TrendingUp,
  Package,
  User,
  MapPin,
  ShieldAlert,
  Users,
  Bike,
  Baby,
  UserCheck,
  Calendar,
  Clock as ClockIcon,
  CloudRain,
  Banknote,
  Eye,
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
  poolingDeviceSummary,
  poolingAlerts,
  poolingVisitorAnalytics,
  poolingCashierFraud,
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

const _defaultPoolingLog = [
  {
    time: "2:15 PM",
    staff: "Ahmad",
    drum: "Drum #1",
    amount: "8L",
    action: "Pouring",
  },
  {
    time: "1:45 PM",
    staff: "Budi",
    drum: "Drum #3",
    amount: "5L",
    action: "Pouring",
  },
  {
    time: "1:20 PM",
    staff: "Ahmad",
    drum: "Drum #4",
    amount: "10L",
    action: "Pouring",
  },
  {
    time: "12:50 PM",
    staff: "Sari",
    drum: "Drum #1",
    amount: "7L",
    action: "Pouring",
  },
  {
    time: "12:10 PM",
    staff: "Budi",
    drum: "Drum #2",
    amount: "12L",
    action: "Completed",
  },
  {
    time: "11:30 AM",
    staff: "Ahmad",
    drum: "Drum #3",
    amount: "6L",
    action: "Pouring",
  },
];

const _defaultSummaryStats = [
  { label: "Total Drums", value: "4", icon: Package, color: "text-indigo-500" },
  {
    label: "Active Filling",
    value: "3",
    icon: Droplets,
    color: "text-cyan-500",
  },
  {
    label: "Full Drums",
    value: "1",
    icon: TrendingUp,
    color: "text-green-500",
  },
  {
    label: "Total Collected",
    value: "500L",
    icon: Timer,
    color: "text-amber-500",
  },
];

const poolingLogPerOutlet: Record<string, typeof _defaultPoolingLog> = {
  "mall-abcd": _defaultPoolingLog,
  "central-park": [
    {
      time: "2:30 PM",
      staff: "Dedi",
      drum: "Drum #2",
      amount: "9L",
      action: "Pouring",
    },
    {
      time: "1:50 PM",
      staff: "Rina",
      drum: "Drum #1",
      amount: "6L",
      action: "Pouring",
    },
    {
      time: "1:10 PM",
      staff: "Dedi",
      drum: "Drum #3",
      amount: "11L",
      action: "Completed",
    },
    {
      time: "12:40 PM",
      staff: "Rina",
      drum: "Drum #2",
      amount: "7L",
      action: "Pouring",
    },
    {
      time: "12:00 PM",
      staff: "Dedi",
      drum: "Drum #1",
      amount: "8L",
      action: "Pouring",
    },
  ],
  "paris-van-java": [
    {
      time: "2:00 PM",
      staff: "Yusuf",
      drum: "Drum #1",
      amount: "10L",
      action: "Pouring",
    },
    {
      time: "1:30 PM",
      staff: "Andi",
      drum: "Drum #2",
      amount: "7L",
      action: "Pouring",
    },
    {
      time: "1:00 PM",
      staff: "Yusuf",
      drum: "Drum #3",
      amount: "12L",
      action: "Completed",
    },
    {
      time: "12:30 PM",
      staff: "Andi",
      drum: "Drum #4",
      amount: "5L",
      action: "Pouring",
    },
    {
      time: "11:45 AM",
      staff: "Yusuf",
      drum: "Drum #1",
      amount: "9L",
      action: "Pouring",
    },
    {
      time: "11:00 AM",
      staff: "Andi",
      drum: "Drum #2",
      amount: "8L",
      action: "Completed",
    },
  ],
  "tunjungan-plaza": [
    {
      time: "2:10 PM",
      staff: "Hadi",
      drum: "Drum #1",
      amount: "6L",
      action: "Pouring",
    },
    {
      time: "1:40 PM",
      staff: "Siti",
      drum: "Drum #2",
      amount: "8L",
      action: "Pouring",
    },
    {
      time: "1:05 PM",
      staff: "Hadi",
      drum: "Drum #1",
      amount: "10L",
      action: "Completed",
    },
    {
      time: "12:20 PM",
      staff: "Siti",
      drum: "Drum #3",
      amount: "4L",
      action: "Pouring",
    },
  ],
  "paragon-mall": [
    {
      time: "2:20 PM",
      staff: "Fajar",
      drum: "Drum #2",
      amount: "7L",
      action: "Pouring",
    },
    {
      time: "1:55 PM",
      staff: "Wati",
      drum: "Drum #1",
      amount: "11L",
      action: "Pouring",
    },
    {
      time: "1:15 PM",
      staff: "Fajar",
      drum: "Drum #3",
      amount: "9L",
      action: "Completed",
    },
    {
      time: "12:45 PM",
      staff: "Wati",
      drum: "Drum #4",
      amount: "6L",
      action: "Pouring",
    },
    {
      time: "12:05 PM",
      staff: "Fajar",
      drum: "Drum #2",
      amount: "13L",
      action: "Completed",
    },
  ],
};

const summaryStatsPerOutlet: Record<string, typeof _defaultSummaryStats> = {
  "mall-abcd": _defaultSummaryStats,
  "central-park": [
    {
      label: "Total Drums",
      value: "3",
      icon: Package,
      color: "text-indigo-500",
    },
    {
      label: "Active Filling",
      value: "2",
      icon: Droplets,
      color: "text-cyan-500",
    },
    {
      label: "Full Drums",
      value: "1",
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      label: "Total Collected",
      value: "380L",
      icon: Timer,
      color: "text-amber-500",
    },
  ],
  "paris-van-java": [
    {
      label: "Total Drums",
      value: "5",
      icon: Package,
      color: "text-indigo-500",
    },
    {
      label: "Active Filling",
      value: "3",
      icon: Droplets,
      color: "text-cyan-500",
    },
    {
      label: "Full Drums",
      value: "2",
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      label: "Total Collected",
      value: "620L",
      icon: Timer,
      color: "text-amber-500",
    },
  ],
  "tunjungan-plaza": [
    {
      label: "Total Drums",
      value: "3",
      icon: Package,
      color: "text-indigo-500",
    },
    {
      label: "Active Filling",
      value: "2",
      icon: Droplets,
      color: "text-cyan-500",
    },
    {
      label: "Full Drums",
      value: "1",
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      label: "Total Collected",
      value: "310L",
      icon: Timer,
      color: "text-amber-500",
    },
  ],
  "paragon-mall": [
    {
      label: "Total Drums",
      value: "4",
      icon: Package,
      color: "text-indigo-500",
    },
    {
      label: "Active Filling",
      value: "2",
      icon: Droplets,
      color: "text-cyan-500",
    },
    {
      label: "Full Drums",
      value: "2",
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      label: "Total Collected",
      value: "470L",
      icon: Timer,
      color: "text-amber-500",
    },
  ],
};

const DRUM_CAPACITY = 200; // Liters

export function OilPooling() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedOutlet, setSelectedOutlet] = useState("mall-abcd");
  const [selectedAlert, setSelectedAlert] = useState<DeviceAIAlert | null>(
    null,
  );
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  const poolingLog = useMemo(
    () => poolingLogPerOutlet[selectedOutlet] || _defaultPoolingLog,
    [selectedOutlet],
  );
  const summaryStats = useMemo(
    () => summaryStatsPerOutlet[selectedOutlet] || _defaultSummaryStats,
    [selectedOutlet],
  );

  const handleAlertClick = (alert: DeviceAIAlert) => {
    setSelectedAlert(alert);
    setAlertModalOpen(true);
  };

  const [drumFillPercent, setDrumFillPercent] = useState(0);
  const [drumLiters, setDrumLiters] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [drumStatus, setDrumStatus] = useState<"Empty" | "Filling" | "Full">(
    "Empty",
  );

  const getDrumGradient = useCallback(() => {
    if (drumFillPercent >= 100) return "from-green-600 to-green-400";
    if (drumFillPercent >= 75) return "from-cyan-600 to-cyan-400";
    if (drumFillPercent >= 50) return "from-amber-600 to-amber-400";
    if (drumFillPercent >= 25) return "from-orange-600 to-orange-400";
    return "from-orange-700 to-orange-500";
  }, [drumFillPercent]);

  // Force autoplay on mount
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

  // Sync drum fill with video progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration && video.duration > 0) {
        const progress = (video.currentTime / video.duration) * 100;
        setDrumFillPercent(Math.min(100, Math.round(progress)));
        setDrumLiters(
          Math.min(DRUM_CAPACITY, Math.round((progress / 100) * DRUM_CAPACITY)),
        );

        if (progress >= 100) {
          setDrumStatus("Full");
        } else if (progress > 0) {
          setDrumStatus("Filling");
        }
      }
    };

    const handlePlay = () => setIsVideoPlaying(true);
    const handlePause = () => setIsVideoPlaying(false);
    const handleEnded = () => {
      setIsVideoPlaying(false);
      setDrumFillPercent(100);
      setDrumLiters(DRUM_CAPACITY);
      setDrumStatus("Full");
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const visitorCards = [
    {
      label: "Total Pengunjung",
      value: poolingVisitorAnalytics.totalVisitors,
      icon: Users,
      color: "text-violet-500",
    },
    {
      label: "Pengunjung OJOL",
      value: poolingVisitorAnalytics.ojolVisitors,
      icon: Bike,
      color: "text-green-500",
    },
    {
      label: "Anak-anak",
      value: poolingVisitorAnalytics.childVisitors,
      icon: Baby,
      color: "text-pink-500",
    },
    {
      label: "Dewasa",
      value: poolingVisitorAnalytics.adultVisitors,
      icon: UserCheck,
      color: "text-blue-500",
    },
  ];

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
      <AISummaryCards summary={poolingDeviceSummary} />

      {/* Main Content */}
      <div className="grid grid-cols-[2fr_3fr] gap-1.5 flex-1 min-h-0">
        {/* Left - Summary + AI Analytics */}
        <div className="space-y-1.5 overflow-auto">
          {/* Stats */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 gap-1"
          >
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

          {/* AI Visitor Analytics */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-2 pt-1.5 pb-0">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-violet-500" />
                  <CardTitle className="text-[10px] font-semibold">
                    AI Visitor Analytics
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-1.5 pt-1">
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {visitorCards.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="p-1.5 rounded border bg-card">
                        <div className="flex items-center gap-1.5">
                          <Icon
                            className={`h-3 w-3 ${item.color} flex-shrink-0`}
                          />
                          <div>
                            <p className="text-[7px] text-muted-foreground">
                              {item.label}
                            </p>
                            <p className="text-sm font-bold">{item.value}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Extra visitor insights */}
                <div className="space-y-1 border-t pt-1.5">
                  <div className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-card">
                    <Calendar className="h-2.5 w-2.5 text-indigo-500 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Hari Paling Ramai:
                    </span>
                    <span className="font-medium ml-auto">
                      {poolingVisitorAnalytics.busiestDay}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-card">
                    <ClockIcon className="h-2.5 w-2.5 text-cyan-500 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Jam Paling Ramai:
                    </span>
                    <span className="font-medium ml-auto">
                      {poolingVisitorAnalytics.busiestHour}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-card">
                    <CloudRain className="h-2.5 w-2.5 text-blue-500 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Korelasi Cuaca:
                    </span>
                    <span className="font-medium ml-auto text-[7px]">
                      {poolingVisitorAnalytics.weatherCorrelation}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Suspected Cashier Fraud */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-2 pt-1.5 pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5 text-red-500" />
                    <CardTitle className="text-[10px] font-semibold">
                      Suspected Fraud Kasir
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[7px] px-1 py-0 h-3.5 border-red-500/30 text-red-500"
                  >
                    {poolingCashierFraud.totalSuspectedFraud} events
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-1.5 pt-1">
                <ScrollArea className="h-[100px]">
                  <div className="space-y-0.5">
                    {poolingCashierFraud.timeline.map((event, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-red-500/5 border-red-500/20"
                      >
                        <ShieldAlert className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />
                        <span className="text-muted-foreground w-8">
                          {event.time}
                        </span>
                        <span className="flex-1 truncate">
                          {event.description}
                        </span>
                        <span className="text-[6px] text-muted-foreground">
                          {event.device}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          {/* Drum Simulator */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-2 pt-1.5 pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-semibold">
                    Drum Simulator
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-[7px] px-1 py-0 h-3.5 ${
                      drumStatus === "Full"
                        ? "border-green-500/50 text-green-500"
                        : drumStatus === "Filling"
                          ? "border-cyan-500/50 text-cyan-500"
                          : "border-muted-foreground/50 text-muted-foreground"
                    }`}
                  >
                    {isVideoPlaying && drumStatus === "Filling" && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse mr-1" />
                    )}
                    {drumStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-2 pt-2">
                {/* Tank / Drum Visualization */}
                <div className="relative mx-auto w-28 h-36 bg-muted rounded-xl overflow-hidden border-2 border-muted-foreground/20 shadow-inner">
                  {/* Fill level */}
                  <motion.div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${getDrumGradient()} transition-colors duration-300`}
                    initial={{ height: 0 }}
                    animate={{ height: `${drumFillPercent}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {isVideoPlaying &&
                      drumFillPercent > 0 &&
                      drumFillPercent < 100 && (
                        <div className="absolute top-0 left-0 right-0 h-3 bg-white/20 rounded-t-full animate-pulse" />
                      )}
                  </motion.div>

                  {/* Markings */}
                  <div className="absolute left-1.5 top-0 bottom-0 flex flex-col justify-between py-1.5 text-[6px] font-medium text-muted-foreground">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                  </div>

                  {/* Center Display */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow">
                      <p className="text-lg font-bold">{drumFillPercent}%</p>
                      <p className="text-[8px] text-muted-foreground">
                        {drumLiters}L / {DRUM_CAPACITY}L
                      </p>
                    </div>
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
                    Oil Pooling Detection Feed
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {isVideoPlaying && (
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    )}
                    <span className="text-[8px] text-muted-foreground">
                      {isVideoPlaying ? "LIVE" : "PAUSED"}
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
                    muted
                    playsInline
                    preload="auto"
                  >
                    <source src="/poling.mp4" type="video/mp4" />
                  </video>
                  {/* Bottom overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="flex items-center justify-between text-white/70 text-[8px]">
                      <span>CAM-03 | Oil Pooling Detection</span>
                      <span>Drum: {drumFillPercent}%</span>
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

          {/* Pooling Activity Log */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-2 pt-1.5 pb-0">
                <CardTitle className="text-[10px] font-semibold">
                  Pooling Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-1.5 pt-1">
                <ScrollArea className="h-[80px]">
                  <div className="space-y-0.5">
                    {poolingLog.map((log, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 py-0.5 text-[8px] border-b border-border/30 last:border-0"
                      >
                        <span className="text-muted-foreground w-12">
                          {log.time}
                        </span>
                        <div className="flex items-center gap-0.5 w-14">
                          <User className="h-2.5 w-2.5 text-muted-foreground" />
                          <span>{log.staff}</span>
                        </div>
                        <span className="font-medium w-14">{log.drum}</span>
                        <span className="text-cyan-500 w-8">{log.amount}</span>
                        <Badge
                          variant="outline"
                          className={`text-[6px] px-0.5 py-0 h-3 ${
                            log.action === "Completed"
                              ? "border-green-500/50 text-green-500"
                              : "border-blue-500/50 text-blue-500"
                          }`}
                        >
                          {log.action}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Alert Cards - Front Desk */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-2 pt-1.5 pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                    <CardTitle className="text-[10px] font-semibold">
                      AI Alerts — Front Desk
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[7px] px-1 py-0 h-3.5 border-red-500/30 text-red-500"
                  >
                    {poolingAlerts.length} alerts
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-1.5 pt-1">
                <ScrollArea className="h-[180px]">
                  <div className="space-y-1">
                    {poolingAlerts.map((alert) => (
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
