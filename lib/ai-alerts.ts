// ============================================================
// AI Alert Types & Dummy Data — 5 Modules
// ============================================================

export type AlertSeverity = "Critical" | "Suspicious" | "Health";
export type AlertModule = "Cashier" | "Kitchen" | "Oil" | "Jerrycan" | "Pooling";

export type AlertLocation = {
  name: string;
  lat: number;
  lng: number;
  area: string;
};

export type AIAlert = {
  id: string;
  module: AlertModule;
  outlet: string;
  deviceName: string;
  deviceId: string;
  area: string;
  alertType: string;
  severity: AlertSeverity;
  timestamp: string;
  description: string;
  aiInsight: string[];
  timeline: string[];
  images: string[];
  videoUrl?: string;
  location: AlertLocation;
};

export type DeviceSummary = {
  totalDevices: number;
  activeDevices: number;
  totalAlertsToday: number;
  criticalAlerts: number;
  suspiciousAlerts: number;
  healthAlerts: number;
};

// ============================================================
// Outlets
// ============================================================

export const outlets = [
  { id: "all", name: "All Outlets" },
  { id: "mall-abcd", name: "Recheese Mall ABCD" },
  { id: "central-park", name: "Recheese Central Park" },
  { id: "paris-van-java", name: "Recheese Paris Van Java" },
  { id: "tunjungan-plaza", name: "Recheese Tunjungan Plaza" },
  { id: "paragon-mall", name: "Recheese Paragon Mall" },
];

// ============================================================
// 1. CASHIER MONITORING
// ============================================================

export const cashierDeviceSummary: DeviceSummary = {
  totalDevices: 5,
  activeDevices: 5,
  totalAlertsToday: 4,
  criticalAlerts: 1,
  suspiciousAlerts: 2,
  healthAlerts: 1,
};

export interface CashierOverview {
  totalCustomers: number;
  totalServers: number;
  ojolDrivers: number;
  suspectedFraud: number;
  hourlyVisitors: number[];
  fraudTimeline: { time: string; description: string; severity: AlertSeverity }[];
  dailyTrend: { day: string; visitors: number; ojol: number }[];
  outletBreakdown: { outlet: string; outletId: string; customers: number; fraud: number }[];
  weatherCustomers: { weather: string; customers: number }[];
}

export const cashierOverviewData: CashierOverview = {
  totalCustomers: 487,
  totalServers: 4,
  ojolDrivers: 124,
  suspectedFraud: 3,
  hourlyVisitors: [0, 0, 0, 0, 0, 0, 5, 12, 25, 38, 45, 52, 61, 58, 42, 35, 28, 22, 18, 14, 8, 4, 0, 0],
  fraudTimeline: [
    { time: "14:10", description: "Unauthorized person at cashier area", severity: "Critical" },
    { time: "13:45", description: "Kasir memasukkan uang dari brangkas ke kantong pribadi", severity: "Suspicious" },
    { time: "09:20", description: "Kasir memasukkan uang dari brangkas ke kantong pribadi", severity: "Suspicious" },
  ],
  dailyTrend: [
    { day: "Sen", visitors: 412, ojol: 98 },
    { day: "Sel", visitors: 445, ojol: 105 },
    { day: "Rab", visitors: 478, ojol: 118 },
    { day: "Kam", visitors: 502, ojol: 132 },
    { day: "Jum", visitors: 540, ojol: 145 },
    { day: "Sab", visitors: 610, ojol: 168 },
    { day: "Min", visitors: 487, ojol: 124 },
  ],
  outletBreakdown: [
    { outlet: "Mall ABCD", outletId: "mall-abcd", customers: 115, fraud: 1 },
    { outlet: "Central Park", outletId: "central-park", customers: 102, fraud: 0 },
    { outlet: "Paris Van Java", outletId: "paris-van-java", customers: 98, fraud: 1 },
    { outlet: "Tunjungan Plaza", outletId: "tunjungan-plaza", customers: 88, fraud: 1 },
    { outlet: "Paragon Mall", outletId: "paragon-mall", customers: 84, fraud: 0 },
  ],
  weatherCustomers: [
    { weather: "Cerah", customers: 210 },
    { weather: "Berawan", customers: 150 },
    { weather: "Hujan", customers: 95 },
    { weather: "Gerimis", customers: 130 },
    { weather: "Panas", customers: 185 },
  ],
};

export const cashierAlerts: AIAlert[] = [
  {
    id: "ca-001", module: "Cashier", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Front Desk", deviceId: "PQBUBE-001", area: "Front Desk",
    alertType: "Unauthorized Kasir", severity: "Critical",
    timestamp: "2026-02-12 14:10:30",
    description: "Orang bukan pegawai terdeteksi berada di area kasir.",
    aiInsight: ["Unknown person detected at cashier area", "Face not in employee database", "No uniform detected", "Anomaly score: 0.95 (Critical)"],
    timeline: ["14:10:20 — Unknown person enters cashier zone", "14:10:25 — Face recognition: NOT MATCHED", "14:10:30 — Unauthorized access confirmed", "14:10:30 — Critical alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "https://res.cloudinary.com/dwkkbhn4z/video/upload/v1770965993/WhatsApp_Video_2026-02-13_at_10.56.29_cza6w8.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Front Desk" },
  },
  {
    id: "ca-002", module: "Cashier", outlet: "Recheese Central Park",
    deviceName: "PROTECTQUBE Front Desk", deviceId: "PQBUBE-002", area: "Front Desk",
    alertType: "Suspected Fraud Kasir", severity: "Suspicious",
    timestamp: "2026-02-12 13:45:30",
    description: "Kasir terdeteksi memasukkan uang dari brangkas ke kantong pribadi.",
    aiInsight: ["Hand movement from safe toward personal pocket", "Safe opened without transaction record", "No customer present during action", "Behavior anomaly score: 0.96"],
    timeline: ["13:45:25 — Kasir membuka brangkas", "13:45:28 — Uang diambil dari brangkas", "13:45:30 — Tangan bergerak ke kantong pribadi", "13:45:32 — AI alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "https://res.cloudinary.com/dwkkbhn4z/video/upload/v1770955271/WhatsApp_Video_2026-02-13_at_10.56.30_pdjb1v.mp4",
    location: { name: "Recheese Central Park", lat: -6.1777, lng: 106.7903, area: "Front Desk" },
  },
  {
    id: "ca-003", module: "Cashier", outlet: "Recheese Tunjungan Plaza",
    deviceName: "PROTECTQUBE Front Desk", deviceId: "PQBUBE-004", area: "Front Desk",
    alertType: "Suspected Fraud Kasir", severity: "Suspicious",
    timestamp: "2026-02-12 09:20:10",
    description: "Kasir terdeteksi memasukkan uang dari brangkas ke kantong pribadi.",
    aiInsight: ["Hand movement from safe toward pocket detected", "Safe access without corresponding transaction", "Behavior pattern matches fraud profile", "Confidence: 0.89"],
    timeline: ["09:20:00 — Kasir membuka brangkas", "09:20:05 — Uang diambil dari brangkas", "09:20:08 — Tangan bergerak ke kantong pribadi", "09:20:10 — Fraud alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "https://res.cloudinary.com/dwkkbhn4z/video/upload/v1770955271/WhatsApp_Video_2026-02-13_at_10.56.30_pdjb1v.mp4",
    location: { name: "Recheese Tunjungan Plaza", lat: -7.2620, lng: 112.7378, area: "Front Desk" },
  },
  {
    id: "ca-004", module: "Cashier", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Front Desk", deviceId: "PQBUBE-001", area: "Front Desk",
    alertType: "Camera Disconnected", severity: "Health",
    timestamp: "2026-02-12 08:40:33",
    description: "Kamera PQBUBE-001 terputus dari jaringan.",
    aiInsight: ["Device PQBUBE-001 lost connection", "Last heartbeat: 08:38:00", "Network timeout after 2 minutes", "Auto-reconnect failed"],
    timeline: ["08:38:00 — Last heartbeat received", "08:39:00 — Connection timeout", "08:40:00 — Reconnect attempt failed", "08:40:33 — Health alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "https://res.cloudinary.com/dwkkbhn4z/video/upload/v1770965993/WhatsApp_Video_2026-02-13_at_10.56.29_cza6w8.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Front Desk" },
  },
];

// ============================================================
// 2. KITCHEN MONITORING
// ============================================================

export const kitchenDeviceSummary: DeviceSummary = {
  totalDevices: 6, activeDevices: 5, totalAlertsToday: 6,
  criticalAlerts: 0, suspiciousAlerts: 1, healthAlerts: 5,
};

export interface KitchenOverview {
  activeWorkers: number;
  gloveViolations: number;
  apronViolations: number;
  dirtyOilDetected: number;
  totalAttributeViolations: number;
  hourlyViolations: number[];
  dailyTrend: { day: string; glove: number; apron: number }[];
  outletBreakdown: { outlet: string; outletId: string; violations: number; compliance: number }[];
  complianceRate: { day: string; rate: number }[];
  violationsByType: { type: string; count: number; color: string }[];
}

export const kitchenOverviewData: KitchenOverview = {
  activeWorkers: 8, gloveViolations: 7, apronViolations: 4,
  dirtyOilDetected: 3, totalAttributeViolations: 11,
  hourlyViolations: [0, 0, 0, 0, 0, 0, 1, 3, 2, 1, 1, 2, 0, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  dailyTrend: [
    { day: "Sen", glove: 5, apron: 3 },
    { day: "Sel", glove: 8, apron: 4 },
    { day: "Rab", glove: 6, apron: 2 },
    { day: "Kam", glove: 4, apron: 5 },
    { day: "Jum", glove: 3, apron: 2 },
    { day: "Sab", glove: 9, apron: 6 },
    { day: "Min", glove: 7, apron: 4 },
  ],
  outletBreakdown: [
    { outlet: "Mall ABCD", outletId: "mall-abcd", violations: 5, compliance: 78 },
    { outlet: "Central Park", outletId: "central-park", violations: 3, compliance: 85 },
    { outlet: "Paris Van Java", outletId: "paris-van-java", violations: 2, compliance: 90 },
    { outlet: "Tunjungan Plaza", outletId: "tunjungan-plaza", violations: 2, compliance: 88 },
    { outlet: "Paragon Mall", outletId: "paragon-mall", violations: 2, compliance: 82 },
  ],
  complianceRate: [
    { day: "Sen", rate: 82 },
    { day: "Sel", rate: 78 },
    { day: "Rab", rate: 85 },
    { day: "Kam", rate: 88 },
    { day: "Jum", rate: 92 },
    { day: "Sab", rate: 75 },
    { day: "Min", rate: 80 },
  ],
  violationsByType: [
    { type: "Tanpa Sarung Tangan", count: 7, color: "hsl(45, 93%, 47%)" },
    { type: "Tanpa Apron", count: 4, color: "hsl(25, 95%, 53%)" },
    { type: "Dirty Oil", count: 3, color: "hsl(271, 91%, 65%)" },
  ],
};

export const kitchenAlerts: AIAlert[] = [
  {
    id: "ki-001", module: "Kitchen", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-007", area: "Kitchen",
    alertType: "Dirty Oil Detected in Kitchen", severity: "Suspicious",
    timestamp: "2026-02-12 10:20:33",
    description: "Minyak kotor di area kitchen. Warna terdeteksi gelap (Dark Brown/Black).",
    aiInsight: ["Oil color: Dark Brown/Black", "Color exceeds safe threshold", "Duration since change: 10h", "Immediate replacement required"],
    timeline: ["10:15:00 — Color scan initiated", "10:18:00 — Dark color detected", "10:20:33 — Dirty oil confirmed", "10:20:33 — Suspicious alert"],
    images: ["/kitchen.mp4"], videoUrl: "/kitchen.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Kitchen" },
  },
  {
    id: "ki-002", module: "Kitchen", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Kitchen Cam", deviceId: "PQBUBE-005", area: "Kitchen",
    alertType: "Camera Disconnected", severity: "Health",
    timestamp: "2026-02-12 14:32:15",
    description: "Kamera PQBUBE-005 terputus dari jaringan.",
    aiInsight: ["Device PQBUBE-005 lost connection", "Last heartbeat: 14:30:00", "Network timeout", "Auto-reconnect failed"],
    timeline: ["14:30:00 — Last heartbeat", "14:31:00 — Connection timeout", "14:32:15 — Health alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "/kitchen.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Kitchen" },
  },
  {
    id: "ki-003", module: "Kitchen", outlet: "Recheese Central Park",
    deviceName: "PROTECTQUBE Kitchen Cam", deviceId: "PQBUBE-006", area: "Kitchen",
    alertType: "Device Offline", severity: "Health",
    timestamp: "2026-02-12 13:15:40",
    description: "Device PQBUBE-006 offline, tidak merespons.",
    aiInsight: ["Device unresponsive for 5 minutes", "Power status: unknown", "Last data: 13:10:00", "Manual check required"],
    timeline: ["13:10:00 — Last data received", "13:13:00 — No heartbeat", "13:15:40 — Device offline confirmed"],
    images: ["/kitchen.mp4"], videoUrl: "/kitchen.mp4",
    location: { name: "Recheese Central Park", lat: -6.1777, lng: 106.7903, area: "Kitchen" },
  },
  {
    id: "ki-004", module: "Kitchen", outlet: "Recheese Paris Van Java",
    deviceName: "PROTECTQUBE Kitchen Cam", deviceId: "PQBUBE-005", area: "Kitchen",
    alertType: "Power Loss", severity: "Health",
    timestamp: "2026-02-12 11:45:22",
    description: "Daya terputus pada device PQBUBE-005.",
    aiInsight: ["Power supply interrupted", "UPS not detected", "Device shutdown imminent", "Check electrical panel"],
    timeline: ["11:44:50 — Voltage drop detected", "11:45:10 — Power loss confirmed", "11:45:22 — Device shutting down"],
    images: ["/kitchen.mp4"], videoUrl: "/kitchen.mp4",
    location: { name: "Recheese Paris Van Java", lat: -6.8898, lng: 107.6100, area: "Kitchen" },
  },
  {
    id: "ki-005", module: "Kitchen", outlet: "Recheese Tunjungan Plaza",
    deviceName: "PROTECTQUBE Kitchen Cam", deviceId: "PQBUBE-006", area: "Kitchen",
    alertType: "No Signal", severity: "Health",
    timestamp: "2026-02-12 09:50:10",
    description: "Device kehilangan sinyal jaringan.",
    aiInsight: ["Network signal lost", "WiFi disconnected", "Last RSSI: -90 dBm", "Check network infrastructure"],
    timeline: ["09:49:50 — Signal weak", "09:50:00 — Signal lost", "09:50:10 — No signal alert"],
    images: ["/kitchen.mp4"], videoUrl: "/kitchen.mp4",
    location: { name: "Recheese Tunjungan Plaza", lat: -7.2620, lng: 112.7378, area: "Kitchen" },
  },
  {
    id: "ki-006", module: "Kitchen", outlet: "Recheese Paragon Mall",
    deviceName: "PROTECTQUBE Kitchen Cam", deviceId: "PQBUBE-005", area: "Kitchen",
    alertType: "Camera Disconnected", severity: "Health",
    timestamp: "2026-02-12 08:30:00",
    description: "Kamera terputus dari sistem monitoring.",
    aiInsight: ["Camera feed interrupted", "Last frame: 08:28:00", "Connection reset required", "Hardware check recommended"],
    timeline: ["08:28:00 — Last frame received", "08:29:00 — Feed interrupted", "08:30:00 — Disconnected alert"],
    images: ["/kitchen.mp4"], videoUrl: "/kitchen.mp4",
    location: { name: "Recheese Paragon Mall", lat: -6.9864, lng: 110.4199, area: "Kitchen" },
  },
];

// ============================================================
// 3. OIL MONITORING
// ============================================================

export const oilDeviceSummary: DeviceSummary = {
  totalDevices: 5, activeDevices: 5, totalAlertsToday: 6,
  criticalAlerts: 0, suspiciousAlerts: 3, healthAlerts: 3,
};

export interface FryerStatus {
  id: number; name: string;
  status: "Fresh" | "Dirty" | "Empty Fryer";
  oilColor: string; colorHex: string;
  temp: string; duration: string;
}

export interface OilOverview {
  fryers: FryerStatus[];
  freshOilCount: number;
  dirtyOilCount: number;
  emptyFryerCount: number;
  dailyQuality: { day: string; fresh: number; dirty: number; emptyFryer: number }[];
  outletBreakdown: { outlet: string; outletId: string; changes: number; alerts: number }[];
  oilChanges: { day: string; scheduled: number; unscheduled: number }[];
  tempHistory: { hour: string; fryer1: number; fryer2: number; fryer3: number }[];
}

export const oilOverviewData: OilOverview = {
  fryers: [
    { id: 1, name: "Fryer 1", status: "Fresh", oilColor: "Clear Yellow", colorHex: "#ffd700", temp: "170°C", duration: "4h 00m" },
    { id: 2, name: "Fryer 2", status: "Dirty", oilColor: "Dark Purple", colorHex: "#6b21a8", temp: "175°C", duration: "9h 30m" },
    { id: 3, name: "Fryer 3", status: "Empty Fryer", oilColor: "—", colorHex: "#9ca3af", temp: "—", duration: "—" },
  ],
  freshOilCount: 1, dirtyOilCount: 1, emptyFryerCount: 1,
  dailyQuality: [
    { day: "Sen", fresh: 3, dirty: 1, emptyFryer: 0 },
    { day: "Sel", fresh: 2, dirty: 2, emptyFryer: 0 },
    { day: "Rab", fresh: 2, dirty: 1, emptyFryer: 1 },
    { day: "Kam", fresh: 1, dirty: 2, emptyFryer: 1 },
    { day: "Jum", fresh: 3, dirty: 1, emptyFryer: 0 },
    { day: "Sab", fresh: 1, dirty: 1, emptyFryer: 2 },
    { day: "Min", fresh: 1, dirty: 1, emptyFryer: 1 },
  ],
  outletBreakdown: [
    { outlet: "Mall ABCD", outletId: "mall-abcd", changes: 3, alerts: 2 },
    { outlet: "Central Park", outletId: "central-park", changes: 2, alerts: 1 },
    { outlet: "Paris Van Java", outletId: "paris-van-java", changes: 4, alerts: 3 },
    { outlet: "Tunjungan Plaza", outletId: "tunjungan-plaza", changes: 2, alerts: 1 },
    { outlet: "Paragon Mall", outletId: "paragon-mall", changes: 3, alerts: 2 },
  ],
  oilChanges: [
    { day: "Sen", scheduled: 3, unscheduled: 1 },
    { day: "Sel", scheduled: 2, unscheduled: 0 },
    { day: "Rab", scheduled: 4, unscheduled: 2 },
    { day: "Kam", scheduled: 2, unscheduled: 1 },
    { day: "Jum", scheduled: 3, unscheduled: 0 },
    { day: "Sab", scheduled: 5, unscheduled: 3 },
    { day: "Min", scheduled: 3, unscheduled: 1 },
  ],
  tempHistory: [
    { hour: "06", fryer1: 165, fryer2: 168, fryer3: 170 },
    { hour: "08", fryer1: 168, fryer2: 172, fryer3: 175 },
    { hour: "10", fryer1: 170, fryer2: 174, fryer3: 178 },
    { hour: "12", fryer1: 170, fryer2: 175, fryer3: 180 },
    { hour: "14", fryer1: 169, fryer2: 175, fryer3: 180 },
    { hour: "16", fryer1: 170, fryer2: 176, fryer3: 181 },
    { hour: "18", fryer1: 170, fryer2: 175, fryer3: 180 },
  ],
};

export const oilAlerts: AIAlert[] = [
  {
    id: "oi-001", module: "Oil", outlet: "Recheese Central Park",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-008", area: "Fryer",
    alertType: "Dirty Oil Detected", severity: "Suspicious",
    timestamp: "2026-02-12 12:45:18",
    description: "Fryer 2 berwarna UNGU gelap (dirty oil). Warna melebihi ambang batas.",
    aiInsight: ["Oil color: Dark Purple", "Color exceeds safe threshold", "Dirty oil detected", "Replacement recommended"],
    timeline: ["12:40:00 — Color scan initiated", "12:42:00 — Dark Purple detected", "12:44:00 — Dirty oil confirmed", "12:45:18 — Alert triggered"],
    images: ["/minyak.mp4"], videoUrl: "/oil.mp4",
    location: { name: "Recheese Central Park", lat: -6.1777, lng: 106.7903, area: "Fryer" },
  },
  {
    id: "oi-002", module: "Oil", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-007", area: "Fryer",
    alertType: "Dirty Oil Detected", severity: "Suspicious",
    timestamp: "2026-02-12 09:55:42",
    description: "Fryer 3 berwarna UNGU gelap. Warna melebihi batas aman.",
    aiInsight: ["Oil color: Dark Purple", "Color exceeds safe threshold", "10 hours since last change", "Replacement needed"],
    timeline: ["09:50:00 — Color scan initiated", "09:52:00 — Dark Purple detected", "09:55:42 — Dirty oil confirmed", "09:55:42 — Suspicious alert"],
    images: ["/minyak.mp4"], videoUrl: "/oil.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Fryer" },
  },
  {
    id: "oi-003", module: "Oil", outlet: "Recheese Paris Van Java",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-007", area: "Fryer",
    alertType: "Dirty Oil Detected", severity: "Suspicious",
    timestamp: "2026-02-12 11:20:30",
    description: "Fryer 1 terdeteksi dirty oil. Warna ungu gelap.",
    aiInsight: ["Oil color: Dark Purple", "Color exceeds safe threshold", "Quality degraded", "Schedule replacement"],
    timeline: ["11:18:00 — Color scan initiated", "11:19:15 — Dark Purple detected", "11:20:30 — Dirty oil confirmed", "11:20:30 — Alert triggered"],
    images: ["/minyak.mp4"], videoUrl: "/oil.mp4",
    location: { name: "Recheese Paris Van Java", lat: -6.8898, lng: 107.6100, area: "Fryer" },
  },
  {
    id: "oi-004", module: "Oil", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-007", area: "Fryer",
    alertType: "Camera Disconnected", severity: "Health",
    timestamp: "2026-02-12 14:10:05",
    description: "Kamera fryer PQBUBE-007 terputus dari jaringan.",
    aiInsight: ["Device PQBUBE-007 lost connection", "Last heartbeat: 14:08:00", "Network timeout", "Auto-reconnect failed"],
    timeline: ["14:08:00 — Last heartbeat", "14:09:00 — Timeout", "14:10:05 — Disconnected"],
    images: ["/minyak.mp4"], videoUrl: "/oil.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Fryer" },
  },
  {
    id: "oi-005", module: "Oil", outlet: "Recheese Paragon Mall",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-008", area: "Fryer",
    alertType: "Device Offline", severity: "Health",
    timestamp: "2026-02-12 08:15:55",
    description: "Device PQBUBE-008 offline, tidak merespons.",
    aiInsight: ["Device unresponsive", "Last data: 08:13:00", "Power check required", "Manual restart needed"],
    timeline: ["08:13:00 — Last data", "08:14:30 — No heartbeat", "08:15:55 — Offline confirmed"],
    images: ["/minyak.mp4"], videoUrl: "/oil.mp4",
    location: { name: "Recheese Paragon Mall", lat: -6.9864, lng: 110.4199, area: "Fryer" },
  },
  {
    id: "oi-006", module: "Oil", outlet: "Recheese Tunjungan Plaza",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-007", area: "Fryer",
    alertType: "Power Loss", severity: "Health",
    timestamp: "2026-02-12 07:30:00",
    description: "Daya terputus pada device fryer cam.",
    aiInsight: ["Power supply interrupted", "UPS not available", "Device shutdown", "Check electrical"],
    timeline: ["07:28:00 — Voltage drop", "07:29:00 — Power loss", "07:30:00 — Device down"],
    images: ["/minyak.mp4"], videoUrl: "/oil.mp4",
    location: { name: "Recheese Tunjungan Plaza", lat: -7.2620, lng: 112.7378, area: "Fryer" },
  },
];

// ============================================================
// 4. JERRYCAN MONITORING
// ============================================================

export const jerrycanDeviceSummary: DeviceSummary = {
  totalDevices: 4, activeDevices: 4, totalAlertsToday: 5,
  criticalAlerts: 1, suspiciousAlerts: 2, healthAlerts: 2,
};

export interface JerrycanOverview {
  totalJerrycan: number;
  removedCount: number;
  fraudEvents: number;
  personWithApron: number;
  hourlyMovements: number[];
  dailyTrend: { day: string; movements: number; fraud: number; returned: number }[];
  outletBreakdown: { outlet: string; outletId: string; total: number; removed: number; fraud: number }[];
  inventoryHistory: { day: string; available: number; removed: number }[];
  movementByType: { type: string; count: number }[];
}

export const jerrycanOverviewData: JerrycanOverview = {
  totalJerrycan: 12, removedCount: 3, fraudEvents: 2, personWithApron: 8,
  hourlyMovements: [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  dailyTrend: [
    { day: "Sen", movements: 8, fraud: 0, returned: 7 },
    { day: "Sel", movements: 6, fraud: 1, returned: 5 },
    { day: "Rab", movements: 10, fraud: 0, returned: 10 },
    { day: "Kam", movements: 7, fraud: 2, returned: 5 },
    { day: "Jum", movements: 5, fraud: 0, returned: 5 },
    { day: "Sab", movements: 12, fraud: 1, returned: 11 },
    { day: "Min", movements: 3, fraud: 2, returned: 1 },
  ],
  outletBreakdown: [
    { outlet: "Mall ABCD", outletId: "mall-abcd", total: 12, removed: 1, fraud: 0 },
    { outlet: "Central Park", outletId: "central-park", total: 10, removed: 1, fraud: 1 },
    { outlet: "Paris Van Java", outletId: "paris-van-java", total: 8, removed: 0, fraud: 1 },
    { outlet: "Tunjungan Plaza", outletId: "tunjungan-plaza", total: 12, removed: 1, fraud: 0 },
    { outlet: "Paragon Mall", outletId: "paragon-mall", total: 10, removed: 0, fraud: 0 },
  ],
  inventoryHistory: [
    { day: "Sen", available: 12, removed: 1 },
    { day: "Sel", available: 11, removed: 2 },
    { day: "Rab", available: 10, removed: 0 },
    { day: "Kam", available: 12, removed: 3 },
    { day: "Jum", available: 10, removed: 1 },
    { day: "Sab", available: 11, removed: 2 },
    { day: "Min", available: 9, removed: 3 },
  ],
  movementByType: [
    { type: "Returned", count: 20 },
    { type: "Unauthorized", count: 2 },
    { type: "Out", count: 3 },
  ],
};

export const jerrycanAlerts: AIAlert[] = [
  {
    id: "jc-001", module: "Jerrycan", outlet: "Recheese Paris Van Java",
    deviceName: "PROTECTQUBE Jerrycan Cam", deviceId: "PQBUBE-009", area: "Jerrycan Room",
    alertType: "Jerrycan Out (Fraud)", severity: "Critical",
    timestamp: "2026-02-12 10:30:00",
    description: "Jerrycan keluar dari area penyimpanan tanpa record. Potensi pencurian.",
    aiInsight: ["Jerrycan taken out of storage", "No transfer record", "Direction: rear exit", "Flagged as fraud"],
    timeline: ["10:28:00 — Person approaches storage", "10:29:00 — Picks up jerrycan", "10:30:00 — Exits via rear", "10:30:00 — Fraud alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "/jerrycan.mp4",
    location: { name: "Recheese Paris Van Java", lat: -6.8898, lng: 107.6100, area: "Jerrycan Room" },
  },
  {
    id: "jc-002", module: "Jerrycan", outlet: "Recheese Central Park",
    deviceName: "PROTECTQUBE Jerrycan Cam", deviceId: "PQBUBE-010", area: "Jerrycan Room",
    alertType: "Unauthorized Jerrycan Movement", severity: "Suspicious",
    timestamp: "2026-02-12 12:05:33",
    description: "Seseorang tanpa seragam mengambil jerrycan melewati boundary ruangan.",
    aiInsight: ["Person WITHOUT apron/uniform", "Jerrycan past boundary line", "No scheduled transfer", "Anomaly score: 0.93"],
    timeline: ["12:04:00 — Unknown person near room", "12:04:30 — Enters (no uniform)", "12:05:15 — Picks up jerrycan", "12:05:33 — Crosses boundary — ALERT"],
    images: ["/kitchen.mp4"], videoUrl: "/jerrycan.mp4",
    location: { name: "Recheese Central Park", lat: -6.1777, lng: 106.7903, area: "Jerrycan Room" },
  },
  {
    id: "jc-003", module: "Jerrycan", outlet: "Recheese Paragon Mall",
    deviceName: "PROTECTQUBE Jerrycan Cam", deviceId: "PQBUBE-009", area: "Jerrycan Room",
    alertType: "Unauthorized Jerrycan Movement", severity: "Suspicious",
    timestamp: "2026-02-12 08:00:15",
    description: "Jerrycan dipindahkan ke area parkir belakang, di luar jalur standar.",
    aiInsight: ["Movement: toward rear parking", "Not on kitchen/pooling route", "Before operational hours (08:00)", "Anomaly score: 0.85"],
    timeline: ["07:58:00 — Near Jerry storage", "07:59:30 — Picks up jerrycan", "08:00:15 — Exits to parking (unauthorized)", "08:00:15 — Alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "/jerrycan.mp4",
    location: { name: "Recheese Paragon Mall", lat: -6.9864, lng: 110.4199, area: "Jerrycan Room" },
  },
  {
    id: "jc-004", module: "Jerrycan", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Jerrycan Cam", deviceId: "PQBUBE-009", area: "Jerrycan Room",
    alertType: "Camera Disconnected", severity: "Health",
    timestamp: "2026-02-12 14:20:10",
    description: "Kamera jerrycan room PQBUBE-009 terputus.",
    aiInsight: ["Device lost connection", "Last heartbeat: 14:18:00", "Network issue suspected", "Manual check required"],
    timeline: ["14:18:00 — Last heartbeat", "14:19:00 — Timeout", "14:20:10 — Disconnected alert"],
    images: ["/kitchen.mp4"], videoUrl: "/jerrycan.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Jerrycan Room" },
  },
  {
    id: "jc-005", module: "Jerrycan", outlet: "Recheese Tunjungan Plaza",
    deviceName: "PROTECTQUBE Jerrycan Cam", deviceId: "PQBUBE-010", area: "Jerrycan Room",
    alertType: "Device Offline", severity: "Health",
    timestamp: "2026-02-12 09:10:20",
    description: "Device PQBUBE-010 tidak merespons.",
    aiInsight: ["Device unresponsive", "Last data: 09:08:00", "Power check required", "Manual restart needed"],
    timeline: ["09:08:00 — Last data", "09:09:30 — No heartbeat", "09:10:20 — Offline confirmed"],
    images: ["/kitchen.mp4"], videoUrl: "/jerrycan.mp4",
    location: { name: "Recheese Tunjungan Plaza", lat: -7.2620, lng: 112.7378, area: "Jerrycan Room" },
  },
];

// ============================================================
// 5. POOLING MONITORING
// ============================================================

export const poolingDeviceSummary: DeviceSummary = {
  totalDevices: 4, activeDevices: 4, totalAlertsToday: 7,
  criticalAlerts: 1, suspiciousAlerts: 3, healthAlerts: 3,
};

export interface PoolingOverview {
  totalPoolingActivity: number;
  drumFullCount: number;
  dirtyOilPooling: number;
  drums: { id: number; name: string; status: "Full" | "Not Full"; fillPercent: number }[];
  dailyVolume: { day: string; volume: number; activities: number }[];
  outletBreakdown: { outlet: string; outletId: string; volume: number; drums: number; alerts: number }[];
  hourlyActivity: { hour: string; pooling: number; pickup: number }[];
  drumFillHistory: { day: string; drum1: number; drum2: number; drum3: number; drum4: number }[];
  safetyCompliance: { day: string; gloves: number; apron: number; filter: number }[];
}

export const poolingOverviewData: PoolingOverview = {
  totalPoolingActivity: 24, drumFullCount: 2, dirtyOilPooling: 5,
  drums: [
    { id: 1, name: "Drum #1", status: "Full", fillPercent: 100 },
    { id: 2, name: "Drum #2", status: "Not Full", fillPercent: 65 },
    { id: 3, name: "Drum #3", status: "Full", fillPercent: 100 },
    { id: 4, name: "Drum #4", status: "Not Full", fillPercent: 30 },
  ],
  dailyVolume: [
    { day: "Sen", volume: 180, activities: 20 },
    { day: "Sel", volume: 150, activities: 18 },
    { day: "Rab", volume: 200, activities: 25 },
    { day: "Kam", volume: 165, activities: 22 },
    { day: "Jum", volume: 190, activities: 24 },
    { day: "Sab", volume: 240, activities: 30 },
    { day: "Min", volume: 170, activities: 24 },
  ],
  outletBreakdown: [
    { outlet: "Mall ABCD", outletId: "mall-abcd", volume: 42, drums: 1, alerts: 2 },
    { outlet: "Central Park", outletId: "central-park", volume: 38, drums: 1, alerts: 1 },
    { outlet: "Paris Van Java", outletId: "paris-van-java", volume: 35, drums: 1, alerts: 1 },
    { outlet: "Tunjungan Plaza", outletId: "tunjungan-plaza", volume: 30, drums: 0, alerts: 0 },
    { outlet: "Paragon Mall", outletId: "paragon-mall", volume: 25, drums: 1, alerts: 1 },
  ],
  hourlyActivity: [
    { hour: "06", pooling: 0, pickup: 0 },
    { hour: "08", pooling: 2, pickup: 0 },
    { hour: "10", pooling: 4, pickup: 1 },
    { hour: "12", pooling: 5, pickup: 0 },
    { hour: "14", pooling: 3, pickup: 1 },
    { hour: "16", pooling: 4, pickup: 2 },
    { hour: "18", pooling: 4, pickup: 1 },
    { hour: "20", pooling: 2, pickup: 1 },
  ],
  drumFillHistory: [
    { day: "Sen", drum1: 40, drum2: 20, drum3: 30, drum4: 10 },
    { day: "Sel", drum1: 55, drum2: 35, drum3: 45, drum4: 15 },
    { day: "Rab", drum1: 70, drum2: 48, drum3: 60, drum4: 20 },
    { day: "Kam", drum1: 85, drum2: 55, drum3: 75, drum4: 25 },
    { day: "Jum", drum1: 92, drum2: 60, drum3: 88, drum4: 28 },
    { day: "Sab", drum1: 100, drum2: 65, drum3: 100, drum4: 30 },
    { day: "Min", drum1: 100, drum2: 65, drum3: 100, drum4: 30 },
  ],
  safetyCompliance: [
    { day: "Sen", gloves: 80, apron: 85, filter: 70 },
    { day: "Sel", gloves: 75, apron: 82, filter: 68 },
    { day: "Rab", gloves: 85, apron: 88, filter: 75 },
    { day: "Kam", gloves: 82, apron: 86, filter: 72 },
    { day: "Jum", gloves: 90, apron: 92, filter: 80 },
    { day: "Sab", gloves: 72, apron: 78, filter: 65 },
    { day: "Min", gloves: 75, apron: 82, filter: 70 },
  ],
};

export const poolingAlerts: AIAlert[] = [
  {
    id: "po-001", module: "Pooling", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Pooling Cam", deviceId: "PQBUBE-011", area: "Pooling Area",
    alertType: "Camera Disconnected", severity: "Health",
    timestamp: "2026-02-12 14:30:00",
    description: "Kamera PQBUBE-011 terputus dari jaringan.",
    aiInsight: ["Device PQBUBE-011 lost connection", "Last heartbeat: 14:28:00", "Network timeout after 2 minutes", "Auto-reconnect failed"],
    timeline: ["14:28:00 — Last heartbeat received", "14:29:00 — Connection timeout", "14:30:00 — Reconnect attempt failed", "14:30:00 — Health alert triggered"],
    images: ["/poling.mp4"], videoUrl: "/pooling.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Pooling Area" },
  },
  {
    id: "po-002", module: "Pooling", outlet: "Recheese Central Park",
    deviceName: "PROTECTQUBE Pooling Cam", deviceId: "PQBUBE-012", area: "Pooling Area",
    alertType: "Used Oil Pooling Activity", severity: "Suspicious",
    timestamp: "2026-02-12 13:15:45",
    description: "Aktivitas pooling di luar jadwal normal.",
    aiInsight: ["Pooling outside schedule", "Normal: 10:00-12:00, 16:00-18:00", "Current: 13:15 — unscheduled", "Off-record activity"],
    timeline: ["13:14:00 — Person approaches drums", "13:14:30 — Begins pouring", "13:15:45 — Unscheduled pooling", "13:15:45 — Alert triggered"],
    images: ["/poling.mp4"], videoUrl: "/pooling.mp4",
    location: { name: "Recheese Central Park", lat: -6.1777, lng: 106.7903, area: "Pooling Area" },
  },
  {
    id: "po-003", module: "Pooling", outlet: "Recheese Paris Van Java",
    deviceName: "PROTECTQUBE Pooling Cam", deviceId: "PQBUBE-011", area: "Pooling Area",
    alertType: "Device Offline", severity: "Health",
    timestamp: "2026-02-12 11:40:20",
    description: "Device PQBUBE-011 offline, tidak merespons.",
    aiInsight: ["Device unresponsive for 5 minutes", "Power status: unknown", "Last data: 11:35:00", "Manual check required"],
    timeline: ["11:35:00 — Last data received", "11:38:00 — No heartbeat", "11:40:20 — Device offline confirmed"],
    images: ["/poling.mp4"], videoUrl: "/pooling.mp4",
    location: { name: "Recheese Paris Van Java", lat: -6.8898, lng: 107.6100, area: "Pooling Area" },
  },
  {
    id: "po-004", module: "Pooling", outlet: "Recheese Tunjungan Plaza",
    deviceName: "PROTECTQUBE Pooling Cam", deviceId: "PQBUBE-012", area: "Pooling Area",
    alertType: "Dirty Oil Pooling", severity: "Suspicious",
    timestamp: "2026-02-12 10:25:15",
    description: "Minyak sangat kotor dimasukkan ke drum tanpa pre-filtering.",
    aiInsight: ["Oil color: Very Dark/Black", "No pre-filtering detected", "Contamination risk", "SOP requires filtering"],
    timeline: ["10:24:00 — Oil container brought", "10:24:30 — Color: BLACK", "10:25:15 — Poured without filter", "10:25:15 — Alert triggered"],
    images: ["/poling.mp4"], videoUrl: "/pooling.mp4",
    location: { name: "Recheese Tunjungan Plaza", lat: -7.2620, lng: 112.7378, area: "Pooling Area" },
  },
  {
    id: "po-005", module: "Pooling", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Pooling Cam", deviceId: "PQBUBE-011", area: "Pooling Area",
    alertType: "Power Loss", severity: "Health",
    timestamp: "2026-02-12 09:15:30",
    description: "Daya terputus pada device PQBUBE-011.",
    aiInsight: ["Power supply interrupted", "UPS not detected", "Device shutdown imminent", "Check electrical panel"],
    timeline: ["09:14:50 — Voltage drop detected", "09:15:10 — Power loss confirmed", "09:15:30 — Device shutting down"],
    images: ["/poling.mp4"], videoUrl: "/pooling.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Pooling Area" },
  },
  {
    id: "po-006", module: "Pooling", outlet: "Recheese Paragon Mall",
    deviceName: "PROTECTQUBE Pooling Cam", deviceId: "PQBUBE-012", area: "Pooling Area",
    alertType: "Drum Full — Overdue Pickup", severity: "Suspicious",
    timestamp: "2026-02-12 08:30:00",
    description: "Drum #3 penuh, belum dijemput sudah 2 jam lewat jadwal.",
    aiInsight: ["Drum #3 at 100% for 2+ hours", "Pickup was 06:30 — overdue", "No pickup activity", "Logistics issue"],
    timeline: ["06:30:00 — Scheduled pickup (missed)", "07:00:00 — Still full", "08:00:00 — 1.5h overdue", "08:30:00 — Escalation alert"],
    images: ["/poling.mp4"], videoUrl: "/pooling.mp4",
    location: { name: "Recheese Paragon Mall", lat: -6.9864, lng: 110.4199, area: "Pooling Area" },
  },
  {
    id: "po-007", module: "Pooling", outlet: "Recheese Central Park",
    deviceName: "PROTECTQUBE Pooling Cam", deviceId: "PQBUBE-011", area: "Pooling Area",
    alertType: "Used Oil Pooling Activity", severity: "Critical",
    timestamp: "2026-02-12 07:45:10",
    description: "Pooling sebelum jam operasional (toko buka 09:00). Kemungkinan tidak tercatat.",
    aiInsight: ["Pooling at 07:45 — 1h 15m before open", "No authorized schedule", "Off-hours activity", "Anomaly score: 0.91"],
    timeline: ["07:40:00 — Motion in pooling area", "07:42:00 — Oil transfer begins", "07:45:10 — Off-hours confirmed", "07:45:10 — Critical alert"],
    images: ["/poling.mp4"], videoUrl: "/pooling.mp4",
    location: { name: "Recheese Central Park", lat: -6.1777, lng: 106.7903, area: "Pooling Area" },
  },
];
