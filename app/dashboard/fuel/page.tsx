"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Fuel,
  Play,
  Square,
  Droplets,
  Clock,
  Zap,
  Plug,
  Flame,
  Thermometer,
  Gauge,
  AlertTriangle,
  Check,
  Shield,
  History,
  ArrowRight,
  Trash2,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { toast } from "sonner";

// Constants
const FUEL_CAPACITY = 800; // Liter
const CONSUMPTION_RATE = 5; // Liter per jam saat running
const LOW_FUEL_THRESHOLD = 20; // Percentage
const CRITICAL_FUEL_THRESHOLD = 10; // Percentage

interface ActivityLog {
  id: string;
  time: string;
  activity: string;
  status: "normal" | "anomaly";
}

interface AnomalyItem {
  id: string;
  time: string;
  message: string;
}

// Sample chart data
const consumptionData = [
  { day: "Sen", consumption: 42 },
  { day: "Sel", consumption: 38 },
  { day: "Rab", consumption: 55 },
  { day: "Kam", consumption: 50 },
  { day: "Jum", consumption: 45 },
  { day: "Sab", consumption: 40 },
  { day: "Min", consumption: 48 },
];

const patternData = [
  { time: "06:00", actual: 95, predicted: 95, anomaly: null },
  { time: "08:00", actual: 90, predicted: 90, anomaly: null },
  { time: "10:00", actual: 85, predicted: 85, anomaly: null },
  { time: "12:00", actual: 80, predicted: 80, anomaly: null },
  { time: "14:00", actual: 45, predicted: 75, anomaly: 45 },
  { time: "16:00", actual: 75, predicted: 70, anomaly: null },
  { time: "18:00", actual: 70, predicted: 65, anomaly: null },
  { time: "20:00", actual: 65, predicted: 60, anomaly: null },
  { time: "22:00", actual: 60, predicted: 55, anomaly: null },
];

const chartConfig = {
  consumption: {
    label: "Konsumsi BBM",
    color: "hsl(var(--chart-1))",
  },
  actual: {
    label: "Level BBM Aktual",
    color: "hsl(var(--chart-1))",
  },
  predicted: {
    label: "Prediksi Normal",
    color: "hsl(var(--chart-2))",
  },
  anomaly: {
    label: "Anomali",
    color: "hsl(var(--destructive))",
  },
};

export default function FuelMonitoringPage() {
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [fuelLevel, setFuelLevel] = useState(50);
  const [runtime, setRuntime] = useState(0);
  const [consumptionToday, setConsumptionToday] = useState(0);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [anomalyTodayCount, setAnomalyTodayCount] = useState(0);
  const [anomalyWeekCount, setAnomalyWeekCount] = useState(0);
  const [anomalyDetectionEnabled, setAnomalyDetectionEnabled] = useState(true);
  const [lastAnomaly, setLastAnomaly] = useState<string | null>(null);
  const [anomalyStatus, setAnomalyStatus] = useState<"normal" | "detected">(
    "normal",
  );
  const [anomalyList, setAnomalyList] = useState<AnomalyItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([
    {
      id: "1",
      time: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      activity: "Sistem monitoring diaktifkan",
      status: "normal",
    },
  ]);

  // Operational data
  const [voltage, setVoltage] = useState(220);
  const [power, setPower] = useState(0);
  const [fuelConsumption, setFuelConsumption] = useState(0);
  const [temperature, setTemperature] = useState(35);
  const [rpm, setRpm] = useState(0);

  // Current date/time
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  // Calculate fuel in liters
  const fuelLiters = Math.round((fuelLevel / 100) * FUEL_CAPACITY);

  const getFuelGradient = () => {
    if (fuelLevel <= CRITICAL_FUEL_THRESHOLD) return "from-red-600 to-red-400";
    if (fuelLevel <= LOW_FUEL_THRESHOLD) return "from-amber-600 to-amber-400";
    if (fuelLevel >= 80) return "from-green-600 to-green-400";
    return "from-blue-600 to-blue-400";
  };

  // Add activity log
  const addActivityLog = useCallback(
    (activity: string, status: "normal" | "anomaly") => {
      const newLog: ActivityLog = {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        activity,
        status,
      };
      setActivityLog((prev) => [newLog, ...prev].slice(0, 10));
    },
    [],
  );

  // Detect anomaly
  const detectAnomaly = useCallback(() => {
    const timeString = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setAnomalyCount((prev) => prev + 1);
    setAnomalyTodayCount((prev) => prev + 1);
    setAnomalyWeekCount((prev) => prev + 1);
    setLastAnomaly(timeString);
    setAnomalyStatus("detected");

    const newAnomaly: AnomalyItem = {
      id: Date.now().toString(),
      time: timeString,
      message: "Penurunan BBM tidak normal",
    };
    setAnomalyList((prev) => [newAnomaly, ...prev]);

    addActivityLog(
      "Anomali terdeteksi - Penurunan BBM tidak normal",
      "anomaly",
    );
    toast.error("Anomali Terdeteksi!", {
      description: "Penurunan level BBM tidak normal",
    });

    // Simulate fuel drop
    const fuelDrop = Math.floor(3 + Math.random() * 5);
    setFuelLevel((prev) => Math.max(0, prev - fuelDrop));

    // Reset status after 5 seconds
    setTimeout(() => {
      setAnomalyStatus("normal");
    }, 5000);
  }, [addActivityLog]);

  // Stop engine - defined early to be used in useEffect
  const stopEngine = useCallback(() => {
    setIsRunning(false);
    setPower(0);
    setFuelConsumption(0);
    setRpm(0);
    addActivityLog("Mesin dimatikan", "normal");
    toast.success("Berhasil", {
      description: "Mesin berhasil dimatikan",
    });
  }, [addActivityLog]);

  // Update date/time
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      );
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sensor simulation when running
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // Update runtime
      setRuntime((prev) => prev + 0.1);

      // Consume fuel
      const fuelConsumed = (CONSUMPTION_RATE / 3600) * 5;
      setFuelLevel((prev) => {
        const newLevel = Math.max(
          0,
          prev - (fuelConsumed / FUEL_CAPACITY) * 100,
        );

        // Check for critical fuel
        if (
          newLevel <= CRITICAL_FUEL_THRESHOLD &&
          prev > CRITICAL_FUEL_THRESHOLD
        ) {
          stopEngine();
          toast.warning("Peringatan", {
            description: "Mesin berhenti - BBM habis!",
          });
          addActivityLog("Mesin berhenti - BBM kritis", "anomaly");
        }

        return newLevel;
      });

      setConsumptionToday((prev) => prev + fuelConsumed);

      // Simulate sensor variations
      setTemperature(Math.floor(70 + Math.random() * 10));
      setVoltage(Math.floor(215 + Math.random() * 10));
      setPower(Number((43 + Math.random() * 4).toFixed(1)));
      setRpm(Math.floor(1780 + Math.random() * 40));

      // Random anomaly detection (5% chance)
      if (anomalyDetectionEnabled && Math.random() < 0.05) {
        detectAnomaly();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [
    isRunning,
    anomalyDetectionEnabled,
    addActivityLog,
    detectAnomaly,
    stopEngine,
  ]);

  // Start engine
  const startEngine = () => {
    if (isRunning) return;

    if (fuelLevel < CRITICAL_FUEL_THRESHOLD) {
      toast.error("Gagal", {
        description: "BBM tidak cukup untuk menjalankan mesin",
      });
      return;
    }

    setIsRunning(true);
    setVoltage(220);
    setPower(45);
    setFuelConsumption(CONSUMPTION_RATE);
    setRpm(1800);

    addActivityLog("Mesin dihidupkan", "normal");
    toast.success("Berhasil", {
      description: "Mesin berhasil dihidupkan",
    });
  };

  // Refuel
  const refuelTank = () => {
    const previousLevel = fuelLevel;
    setFuelLevel(100);

    const addedLiters = Math.round(
      ((100 - previousLevel) / 100) * FUEL_CAPACITY,
    );
    addActivityLog(`Pengisian BBM (+${addedLiters} L)`, "normal");
    toast.success("Berhasil", {
      description: `Tangki diisi ulang. Ditambah ${addedLiters} Liter`,
    });
  };

  // Clear anomaly history
  const clearAnomalyHistory = () => {
    setAnomalyList([]);
    toast.success("Berhasil", {
      description: "Riwayat anomali telah dihapus",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Fuel className="h-6 w-6 text-primary" />
            Fuel Monitoring
          </h1>
          <p className="text-muted-foreground text-sm">
            Genset ID:{" "}
            <code className="bg-muted px-2 py-0.5 rounded text-xs">
              GS-ABCD-123
            </code>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{currentDate}</p>
          <p className="text-xs text-muted-foreground">{currentTime}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fuel Level */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Level Bahan Bakar
                </p>
                <p className="text-2xl font-bold mt-1">{fuelLiters} L</p>
                <p className="text-xs text-muted-foreground mt-1">
                  dari {FUEL_CAPACITY} L kapasitas
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Fuel className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={fuelLevel} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Engine Status */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status Mesin</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    isRunning ? "text-blue-600" : "text-green-600"
                  }`}
                >
                  {isRunning ? "RUNNING" : "STANDBY"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isRunning ? "Mesin sedang beroperasi" : "Siap dioperasikan"}
                </p>
              </div>
              <div
                className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                  isRunning
                    ? "bg-blue-100 dark:bg-blue-500/20"
                    : "bg-green-100 dark:bg-green-500/20"
                }`}
              >
                <Zap
                  className={`h-6 w-6 ${
                    isRunning
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Consumption */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Konsumsi Hari Ini
                </p>
                <p className="text-2xl font-bold mt-1">
                  {consumptionToday.toFixed(1)} L
                </p>
                <p className="text-xs text-green-500 mt-1">↓ 5% dari kemarin</p>
              </div>
              <div className="h-12 w-12 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Flame className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anomaly Count */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Anomali Terdeteksi
                </p>
                <p className="text-2xl font-bold mt-1">{anomalyCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Bulan ini</p>
              </div>
              <div className="h-12 w-12 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fuel Tank Visualization */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Droplets className="h-4 w-4 text-primary" />
                Tangki Bahan Bakar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Tank Visualization */}
              <div className="relative mx-auto w-48 h-64 bg-muted rounded-2xl overflow-hidden border-4 border-muted-foreground/20 shadow-inner">
                <div
                  className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${getFuelGradient()} transition-all duration-500`}
                  style={{ height: `${fuelLevel}%` }}
                >
                  {/* Wave effect */}
                  <div className="absolute top-0 left-0 right-0 h-4 bg-white/20 rounded-t-full animate-pulse" />
                </div>

                {/* Fuel Markings */}
                <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-between py-2 text-xs font-medium text-muted-foreground">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>

                {/* Center Display */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow">
                    <p className="text-3xl font-bold">
                      {Math.round(fuelLevel)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {fuelLiters} L
                    </p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Simulasi Level BBM
                  </label>
                  <Slider
                    value={[fuelLevel]}
                    onValueChange={(value) => setFuelLevel(value[0])}
                    max={100}
                    step={1}
                    disabled={isRunning}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={startEngine}
                    disabled={isRunning}
                    className="bg-green-500 hover:bg-green-600"
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                  <Button
                    onClick={stopEngine}
                    disabled={!isRunning}
                    variant="destructive"
                    size="sm"
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                  <Button onClick={refuelTank} size="sm">
                    <Fuel className="h-4 w-4 mr-1" />
                    Isi
                  </Button>
                </div>
              </div>

              {/* Alert */}
              {fuelLevel <= LOW_FUEL_THRESHOLD && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Peringatan: Level BBM rendah!</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Real-time Data & Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Operational Data */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="h-4 w-4 text-primary" />
                Data Operasional Real-time
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-2xl font-bold">{runtime.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Jam Operasi</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Zap className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{voltage}</p>
                  <p className="text-xs text-muted-foreground">Tegangan (V)</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Plug className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{power}</p>
                  <p className="text-xs text-muted-foreground">Daya (kW)</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Flame className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{fuelConsumption}</p>
                  <p className="text-xs text-muted-foreground">
                    Konsumsi (L/jam)
                  </p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Thermometer className="h-6 w-6 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{temperature}</p>
                  <p className="text-xs text-muted-foreground">
                    Temperatur (°C)
                  </p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Gauge className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{rpm}</p>
                  <p className="text-xs text-muted-foreground">RPM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consumption Chart */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                Grafik Konsumsi BBM
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <AreaChart data={consumptionData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    className="text-xs"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="consumption"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Anomaly Detection & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomaly Detection */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" />
                Deteksi Anomali
              </CardTitle>
              <div className="flex items-center gap-2">
                <Switch
                  checked={anomalyDetectionEnabled}
                  onCheckedChange={setAnomalyDetectionEnabled}
                />
                <span className="text-sm">Aktif</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {/* Status */}
            <div
              className={`flex items-center gap-3 p-4 rounded-lg mb-4 ${
                anomalyStatus === "detected"
                  ? "bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50"
                  : "bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/50"
              }`}
            >
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  anomalyStatus === "detected" ? "bg-red-500" : "bg-green-500"
                }`}
              >
                {anomalyStatus === "detected" ? (
                  <AlertTriangle className="h-5 w-5 text-white" />
                ) : (
                  <Check className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <p
                  className={`font-medium ${
                    anomalyStatus === "detected"
                      ? "text-red-800 dark:text-red-400"
                      : "text-green-800 dark:text-green-400"
                  }`}
                >
                  {anomalyStatus === "detected"
                    ? "Anomali Terdeteksi!"
                    : "Sistem Normal"}
                </p>
                <p
                  className={`text-sm ${
                    anomalyStatus === "detected"
                      ? "text-red-600 dark:text-red-300"
                      : "text-green-600 dark:text-green-300"
                  }`}
                >
                  {anomalyStatus === "detected"
                    ? "Penurunan BBM tidak normal"
                    : "Tidak ada anomali terdeteksi"}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{anomalyTodayCount}</p>
                <p className="text-xs text-muted-foreground">Hari Ini</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{anomalyWeekCount}</p>
                <p className="text-xs text-muted-foreground">Minggu Ini</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">{lastAnomaly || "-"}</p>
                <p className="text-xs text-muted-foreground">Terakhir</p>
              </div>
            </div>

            {/* Anomaly History */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Riwayat Anomali</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAnomalyHistory}
                className="text-red-500 hover:text-red-700 h-auto py-1"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Hapus
              </Button>
            </div>

            <ScrollArea className="h-48">
              {anomalyList.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  Tidak ada riwayat anomali
                </p>
              ) : (
                <div className="space-y-2">
                  {anomalyList.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-500/10 rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span>
                          {item.time} - {item.message}
                        </span>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        Anomali
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Activity Logs */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" />
                Log Aktivitas
              </CardTitle>
              <Button variant="link" size="sm" className="h-auto p-0">
                Lihat Semua <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Waktu</TableHead>
                    <TableHead>Aktivitas</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLog.map((log) => (
                    <TableRow
                      key={log.id}
                      className={
                        log.status === "anomaly"
                          ? "bg-red-50 dark:bg-red-500/10"
                          : ""
                      }
                    >
                      <TableCell className="text-muted-foreground">
                        {log.time}
                      </TableCell>
                      <TableCell>{log.activity}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === "anomaly" ? "destructive" : "default"
                          }
                          className={
                            log.status === "normal"
                              ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-500/20 dark:text-green-400"
                              : ""
                          }
                        >
                          {log.status === "anomaly" ? "Anomali" : "Normal"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Pattern Analysis Chart */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Analisis Pola Penggunaan BBM
            </CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-muted-foreground">Level BBM</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-muted-foreground">Anomali</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-muted-foreground">Konsumsi Normal</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <LineChart data={patternData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                className="text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="text-xs"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Level BBM Aktual"
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Prediksi Normal"
              />
              <Line
                type="monotone"
                dataKey="anomaly"
                stroke="hsl(var(--destructive))"
                strokeWidth={0}
                dot={{ r: 8, fill: "hsl(var(--destructive))" }}
                name="Anomali"
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
