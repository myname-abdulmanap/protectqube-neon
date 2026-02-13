// ============================================================
// AI Alert Types & Dummy Data — 5 Modules
// ============================================================

export type AlertSeverity = "Critical" | "Warning" | "Suspicious";
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
  warningAlerts: number;
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
  totalAlertsToday: 9,
  criticalAlerts: 3,
  suspiciousAlerts: 4,
  warningAlerts: 2,
};

export interface CashierOverview {
  totalCustomers: number;
  totalServers: number;
  ojolDrivers: number;
  suspectedFraud: number;
  upsellingDetected: number;
  upsellingMissed: number;
  hourlyVisitors: number[];
  fraudTimeline: { time: string; description: string; severity: AlertSeverity }[];
  dailyTrend: { day: string; visitors: number; ojol: number; revenue: number }[];
  outletBreakdown: { outlet: string; outletId: string; customers: number; fraud: number; upselling: number }[];
  weeklyUpselling: { day: string; detected: number; missed: number }[];
  hourlyRevenue: { hour: string; revenue: number; orders: number }[];
}

export const cashierOverviewData: CashierOverview = {
  totalCustomers: 487,
  totalServers: 4,
  ojolDrivers: 124,
  suspectedFraud: 3,
  upsellingDetected: 28,
  upsellingMissed: 12,
  hourlyVisitors: [0, 0, 0, 0, 0, 0, 5, 12, 25, 38, 45, 52, 61, 58, 42, 35, 28, 22, 18, 14, 8, 4, 0, 0],
  fraudTimeline: [
    { time: "13:45", description: "Kasir memasukkan uang ke kantong pribadi", severity: "Critical" },
    { time: "12:30", description: "Transaksi tanpa input POS", severity: "Suspicious" },
    { time: "11:15", description: "Gerakan mencurigakan di bawah counter", severity: "Suspicious" },
    { time: "09:20", description: "Kembalian lebih sedikit dari seharusnya", severity: "Critical" },
    { time: "08:40", description: "Laci kasir dibuka tanpa transaksi (3x dalam 1 jam)", severity: "Warning" },
  ],
  dailyTrend: [
    { day: "Sen", visitors: 412, ojol: 98, revenue: 18500 },
    { day: "Sel", visitors: 445, ojol: 105, revenue: 19200 },
    { day: "Rab", visitors: 478, ojol: 118, revenue: 21400 },
    { day: "Kam", visitors: 502, ojol: 132, revenue: 23100 },
    { day: "Jum", visitors: 540, ojol: 145, revenue: 25800 },
    { day: "Sab", visitors: 610, ojol: 168, revenue: 31200 },
    { day: "Min", visitors: 487, ojol: 124, revenue: 22600 },
  ],
  outletBreakdown: [
    { outlet: "Mall ABCD", outletId: "mall-abcd", customers: 115, fraud: 1, upselling: 8 },
    { outlet: "Central Park", outletId: "central-park", customers: 102, fraud: 0, upselling: 6 },
    { outlet: "Paris Van Java", outletId: "paris-van-java", customers: 98, fraud: 1, upselling: 5 },
    { outlet: "Tunjungan Plaza", outletId: "tunjungan-plaza", customers: 88, fraud: 1, upselling: 4 },
    { outlet: "Paragon Mall", outletId: "paragon-mall", customers: 84, fraud: 0, upselling: 5 },
  ],
  weeklyUpselling: [
    { day: "Sen", detected: 22, missed: 18 },
    { day: "Sel", detected: 25, missed: 15 },
    { day: "Rab", detected: 30, missed: 12 },
    { day: "Kam", detected: 28, missed: 14 },
    { day: "Jum", detected: 35, missed: 10 },
    { day: "Sab", detected: 38, missed: 8 },
    { day: "Min", detected: 28, missed: 12 },
  ],
  hourlyRevenue: [
    { hour: "08", revenue: 1200, orders: 15 },
    { hour: "09", revenue: 2800, orders: 32 },
    { hour: "10", revenue: 3500, orders: 42 },
    { hour: "11", revenue: 4800, orders: 55 },
    { hour: "12", revenue: 6200, orders: 72 },
    { hour: "13", revenue: 5800, orders: 65 },
    { hour: "14", revenue: 4200, orders: 48 },
    { hour: "15", revenue: 3600, orders: 40 },
    { hour: "16", revenue: 3200, orders: 35 },
    { hour: "17", revenue: 4100, orders: 45 },
    { hour: "18", revenue: 5500, orders: 62 },
    { hour: "19", revenue: 5200, orders: 58 },
    { hour: "20", revenue: 3800, orders: 38 },
  ],
};

export const cashierAlerts: AIAlert[] = [
  {
    id: "ca-001", module: "Cashier", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Front Desk", deviceId: "PQBUBE-001", area: "Front Desk",
    alertType: "Suspected Fraud Kasir", severity: "Critical",
    timestamp: "2026-02-12 13:45:30",
    description: "Kasir terdeteksi memasukkan uang tunai ke kantong pribadi setelah transaksi.",
    aiInsight: ["Hand movement toward personal pocket after cash receipt", "Cash register drawer not opened during transaction", "POS transaction logged but cash not deposited", "Behavior anomaly score: 0.96 (Critical Risk)"],
    timeline: ["13:45:25 — Customer approaches counter", "13:45:28 — Cash handed to cashier (Rp 100,000)", "13:45:30 — Hand moves toward pocket instead of drawer", "13:45:32 — AI alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "/cashir.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Front Desk" },
  },
  {
    id: "ca-002", module: "Cashier", outlet: "Recheese Central Park",
    deviceName: "PROTECTQUBE Front Desk", deviceId: "PQBUBE-002", area: "Front Desk",
    alertType: "No Upselling Detected", severity: "Warning",
    timestamp: "2026-02-12 12:30:15",
    description: "Kasir tidak menawarkan produk tambahan kepada pelanggan selama 10 transaksi terakhir.",
    aiInsight: ["No verbal upselling cue detected via audio analysis", "Screen navigation did not include add-on menu", "10 consecutive transactions without upselling", "Upselling compliance: 0.12 (Low)"],
    timeline: ["12:15:00 — Transaction #1 without upselling", "12:18:30 — Transaction #2 without upselling", "12:22:10 — Transaction #5: pattern flagged", "12:30:15 — Alert after 10 transactions"],
    images: ["/kitchen.mp4"], videoUrl: "/cashir.mp4",
    location: { name: "Recheese Central Park", lat: -6.1777, lng: 106.7903, area: "Front Desk" },
  },
  {
    id: "ca-003", module: "Cashier", outlet: "Recheese Paris Van Java",
    deviceName: "PROTECTQUBE Front Desk", deviceId: "PQBUBE-003", area: "Front Desk",
    alertType: "Transaksi Tanpa POS", severity: "Suspicious",
    timestamp: "2026-02-12 11:15:45",
    description: "Kasir menerima uang dari customer tetapi tidak ada input POS dalam 30 detik.",
    aiInsight: ["Cash received from customer via hand-over motion", "No POS input within 30-second window", "Screen idle during transaction", "Possible unrecorded sale"],
    timeline: ["11:15:30 — Customer presents payment", "11:15:35 — Cash exchanged, POS idle", "11:15:45 — 30s window expired", "11:15:45 — Alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "/cashir.mp4",
    location: { name: "Recheese Paris Van Java", lat: -6.8898, lng: 107.6100, area: "Front Desk" },
  },
  {
    id: "ca-004", module: "Cashier", outlet: "Recheese Tunjungan Plaza",
    deviceName: "PROTECTQUBE Front Desk", deviceId: "PQBUBE-004", area: "Front Desk",
    alertType: "Suspected Fraud Kasir", severity: "Critical",
    timestamp: "2026-02-12 09:20:10",
    description: "Kasir memberikan kembalian lebih sedikit dari seharusnya berdasarkan deteksi denomination.",
    aiInsight: ["Cash denomination analysis: discrepancy detected", "Customer paid Rp 100,000", "Change given: Rp 15,000 instead of Rp 25,000", "Short-changing confidence: 0.89"],
    timeline: ["09:20:00 — Customer pays Rp 100,000", "09:20:05 — POS total: Rp 75,000", "09:20:08 — Change: Rp 15,000 (should be Rp 25,000)", "09:20:10 — Denomination mismatch alert"],
    images: ["/kitchen.mp4"], videoUrl: "/cashir.mp4",
    location: { name: "Recheese Tunjungan Plaza", lat: -7.2620, lng: 112.7378, area: "Front Desk" },
  },
  {
    id: "ca-005", module: "Cashier", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Front Desk", deviceId: "PQBUBE-001", area: "Front Desk",
    alertType: "Laci Kasir Dibuka Tanpa Transaksi", severity: "Suspicious",
    timestamp: "2026-02-12 08:40:33",
    description: "Kasir membuka laci kasir 3 kali dalam 1 jam tanpa transaksi aktif.",
    aiInsight: ["Cash drawer opened without POS transaction", "3 occurrences in last hour", "Avg drawer open: 8 seconds", "Pattern: unauthorized cash access"],
    timeline: ["07:50:00 — Drawer opened (no tx)", "08:15:00 — Drawer opened again", "08:40:33 — Third occurrence triggers alert"],
    images: ["/kitchen.mp4"], videoUrl: "/cashir.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Front Desk" },
  },
];

// ============================================================
// 2. KITCHEN MONITORING
// ============================================================

export const kitchenDeviceSummary: DeviceSummary = {
  totalDevices: 6, activeDevices: 5, totalAlertsToday: 10,
  criticalAlerts: 2, suspiciousAlerts: 3, warningAlerts: 5,
};

export interface KitchenOverview {
  gloveViolations: number;
  apronViolations: number;
  personWithDrum: number;
  dirtyOilDetected: number;
  totalAttributeViolations: number;
  hourlyViolations: number[];
  dailyTrend: { day: string; glove: number; apron: number; headcover: number }[];
  outletBreakdown: { outlet: string; outletId: string; violations: number; compliance: number }[];
  complianceRate: { day: string; rate: number }[];
  violationsByType: { type: string; count: number; color: string }[];
}

export const kitchenOverviewData: KitchenOverview = {
  gloveViolations: 7, apronViolations: 4, personWithDrum: 2,
  dirtyOilDetected: 3, totalAttributeViolations: 14,
  hourlyViolations: [0, 0, 0, 0, 0, 0, 1, 3, 2, 1, 1, 2, 0, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  dailyTrend: [
    { day: "Sen", glove: 5, apron: 3, headcover: 2 },
    { day: "Sel", glove: 8, apron: 4, headcover: 3 },
    { day: "Rab", glove: 6, apron: 2, headcover: 1 },
    { day: "Kam", glove: 4, apron: 5, headcover: 2 },
    { day: "Jum", glove: 3, apron: 2, headcover: 1 },
    { day: "Sab", glove: 9, apron: 6, headcover: 4 },
    { day: "Min", glove: 7, apron: 4, headcover: 3 },
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
    { type: "Tanpa Penutup Kepala", count: 3, color: "hsl(0, 84%, 60%)" },
    { type: "Person + Drum", count: 2, color: "hsl(217, 91%, 60%)" },
    { type: "Dirty Oil", count: 3, color: "hsl(271, 91%, 65%)" },
  ],
};

export const kitchenAlerts: AIAlert[] = [
  {
    id: "ki-001", module: "Kitchen", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Kitchen Cam", deviceId: "PQBUBE-005", area: "Kitchen",
    alertType: "No Gloves Detected", severity: "Warning",
    timestamp: "2026-02-12 14:32:15",
    description: "Karyawan tidak memakai sarung tangan saat menangani makanan di frying station.",
    aiInsight: ["Person handling food without gloves", "Hand exposed at Station #2", "Confidence: 0.92", "SOP: Glove mandatory"],
    timeline: ["14:32:00 — Person enters frying station", "14:32:10 — Glove check: NOT detected", "14:32:15 — Food handling without gloves", "14:32:15 — Alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "/kitchen.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Kitchen" },
  },
  {
    id: "ki-002", module: "Kitchen", outlet: "Recheese Central Park",
    deviceName: "PROTECTQUBE Kitchen Cam", deviceId: "PQBUBE-006", area: "Kitchen",
    alertType: "No Apron Detected", severity: "Warning",
    timestamp: "2026-02-12 13:15:40",
    description: "Karyawan di area kitchen tidak memakai apron saat shift pagi.",
    aiInsight: ["Person without apron in cooking area", "Torso without apron near fryer", "Confidence: 0.88", "Second occurrence today"],
    timeline: ["13:15:30 — Person enters kitchen", "13:15:35 — Apron check: NOT detected", "13:15:40 — Food prep without apron", "13:15:40 — Alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "/kitchen.mp4",
    location: { name: "Recheese Central Park", lat: -6.1777, lng: 106.7903, area: "Kitchen" },
  },
  {
    id: "ki-003", module: "Kitchen", outlet: "Recheese Paris Van Java",
    deviceName: "PROTECTQUBE Kitchen Cam", deviceId: "PQBUBE-005", area: "Kitchen",
    alertType: "Person Carrying Drum Detected", severity: "Suspicious",
    timestamp: "2026-02-12 11:45:22",
    description: "Seseorang membawa drum di area kitchen, tidak sesuai jadwal pemindahan minyak.",
    aiInsight: ["Person carrying drum in kitchen", "Direction: toward rear exit", "No scheduled transfer at this time", "Anomaly score: 0.87"],
    timeline: ["11:44:50 — Picks up drum near fryer", "11:45:10 — Carrying toward rear", "11:45:22 — Exits kitchen zone", "11:45:22 — Alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "/kitchen.mp4",
    location: { name: "Recheese Paris Van Java", lat: -6.8898, lng: 107.6100, area: "Kitchen" },
  },
  {
    id: "ki-004", module: "Kitchen", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-007", area: "Kitchen",
    alertType: "Dirty Oil Detected in Kitchen", severity: "Critical",
    timestamp: "2026-02-12 10:20:33",
    description: "Minyak kotor di area kitchen. TDS: 32, melebihi batas aman 25.",
    aiInsight: ["Oil color: Brown Black", "TDS: 32 > threshold 25", "Duration since change: 10h", "Immediate replacement required"],
    timeline: ["10:15:00 — Quality scan", "10:18:00 — TDS: 32 (CRITICAL)", "10:20:33 — Dirty oil confirmed", "10:20:33 — Critical alert"],
    images: ["/kitchen.mp4"], videoUrl: "/kitchen.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Kitchen" },
  },
  {
    id: "ki-005", module: "Kitchen", outlet: "Recheese Tunjungan Plaza",
    deviceName: "PROTECTQUBE Kitchen Cam", deviceId: "PQBUBE-006", area: "Kitchen",
    alertType: "No Gloves Detected", severity: "Warning",
    timestamp: "2026-02-12 09:50:10",
    description: "Karyawan tidak memakai sarung tangan saat memotong bahan makanan.",
    aiInsight: ["Bare hands during food cutting", "Active food prep zone", "Confidence: 0.91", "First occurrence today"],
    timeline: ["09:49:50 — Approaches cutting station", "09:50:00 — Picks up knife, no gloves", "09:50:10 — Cutting started", "09:50:10 — Alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "/kitchen.mp4",
    location: { name: "Recheese Tunjungan Plaza", lat: -7.2620, lng: 112.7378, area: "Kitchen" },
  },
  {
    id: "ki-006", module: "Kitchen", outlet: "Recheese Paragon Mall",
    deviceName: "PROTECTQUBE Kitchen Cam", deviceId: "PQBUBE-005", area: "Kitchen",
    alertType: "Person Carrying Drum Detected", severity: "Suspicious",
    timestamp: "2026-02-12 08:30:00",
    description: "Seseorang membawa drum keluar kitchen menuju area belakang, di luar jadwal disposal.",
    aiInsight: ["Person carrying drum toward exit", "Time 08:30 — outside disposal schedule (14:00-16:00)", "Drum contains used oil", "Potential diversion"],
    timeline: ["08:28:00 — Approaches drum storage", "08:29:00 — Lifts drum", "08:30:00 — Exits kitchen via rear", "08:30:00 — Alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "/kitchen.mp4",
    location: { name: "Recheese Paragon Mall", lat: -6.9864, lng: 110.4199, area: "Kitchen" },
  },
];

// ============================================================
// 3. OIL MONITORING
// ============================================================

export const oilDeviceSummary: DeviceSummary = {
  totalDevices: 5, activeDevices: 5, totalAlertsToday: 8,
  criticalAlerts: 2, suspiciousAlerts: 3, warningAlerts: 3,
};

export interface FryerStatus {
  id: number; name: string;
  status: "Fresh" | "Dirty" | "Need Change";
  oilColor: string; colorHex: string;
  tds: number; temp: string; duration: string;
}

export interface OilOverview {
  fryers: FryerStatus[];
  freshOilCount: number;
  dirtyOilCount: number;
  needChangeCount: number;
  tdsHistory: { hour: string; fryer1: number; fryer2: number; fryer3: number }[];
  dailyQuality: { day: string; fresh: number; dirty: number; needChange: number }[];
  outletBreakdown: { outlet: string; outletId: string; avgTds: number; changes: number; alerts: number }[];
  oilChanges: { day: string; scheduled: number; unscheduled: number }[];
  tempHistory: { hour: string; fryer1: number; fryer2: number; fryer3: number }[];
}

export const oilOverviewData: OilOverview = {
  fryers: [
    { id: 1, name: "Fryer 1", status: "Fresh", oilColor: "Clear Yellow", colorHex: "#ffd700", tds: 8, temp: "170°C", duration: "4h 00m" },
    { id: 2, name: "Fryer 2", status: "Dirty", oilColor: "Dark Purple", colorHex: "#6b21a8", tds: 28, temp: "175°C", duration: "9h 30m" },
    { id: 3, name: "Fryer 3", status: "Need Change", oilColor: "Brown Black", colorHex: "#3b2f2f", tds: 33, temp: "180°C", duration: "10h 00m" },
  ],
  freshOilCount: 1, dirtyOilCount: 1, needChangeCount: 1,
  tdsHistory: [
    { hour: "06", fryer1: 5, fryer2: 12, fryer3: 18 },
    { hour: "08", fryer1: 6, fryer2: 15, fryer3: 21 },
    { hour: "10", fryer1: 6, fryer2: 18, fryer3: 25 },
    { hour: "12", fryer1: 7, fryer2: 22, fryer3: 28 },
    { hour: "14", fryer1: 7, fryer2: 25, fryer3: 30 },
    { hour: "16", fryer1: 8, fryer2: 27, fryer3: 32 },
    { hour: "18", fryer1: 8, fryer2: 28, fryer3: 33 },
  ],
  dailyQuality: [
    { day: "Sen", fresh: 3, dirty: 1, needChange: 0 },
    { day: "Sel", fresh: 2, dirty: 2, needChange: 0 },
    { day: "Rab", fresh: 2, dirty: 1, needChange: 1 },
    { day: "Kam", fresh: 1, dirty: 2, needChange: 1 },
    { day: "Jum", fresh: 3, dirty: 1, needChange: 0 },
    { day: "Sab", fresh: 1, dirty: 1, needChange: 2 },
    { day: "Min", fresh: 1, dirty: 1, needChange: 1 },
  ],
  outletBreakdown: [
    { outlet: "Mall ABCD", outletId: "mall-abcd", avgTds: 18, changes: 3, alerts: 2 },
    { outlet: "Central Park", outletId: "central-park", avgTds: 15, changes: 2, alerts: 1 },
    { outlet: "Paris Van Java", outletId: "paris-van-java", avgTds: 22, changes: 4, alerts: 3 },
    { outlet: "Tunjungan Plaza", outletId: "tunjungan-plaza", avgTds: 12, changes: 2, alerts: 1 },
    { outlet: "Paragon Mall", outletId: "paragon-mall", avgTds: 20, changes: 3, alerts: 2 },
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
    id: "oi-001", module: "Oil", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-007", area: "Fryer",
    alertType: "Oil Replaced While Still Fresh", severity: "Suspicious",
    timestamp: "2026-02-12 14:10:05",
    description: "Minyak Fryer 1 diganti, analisis warna menunjukkan masih baik (Clear Yellow, TDS: 8).",
    aiInsight: ["Oil color: Clear Yellow — acceptable", "TDS: 8 (threshold: 20)", "Premature replacement", "Cost: ~Rp 45,000 wasted"],
    timeline: ["14:08:00 — Staff approaches Fryer 1", "14:09:00 — Oil draining", "14:10:05 — Fresh oil removed", "14:10:05 — Alert triggered"],
    images: ["/minyak.mp4"], videoUrl: "/oil.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Fryer" },
  },
  {
    id: "oi-002", module: "Oil", outlet: "Recheese Central Park",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-008", area: "Fryer",
    alertType: "Dirty Oil Detected in Fryer 2", severity: "Critical",
    timestamp: "2026-02-12 12:45:18",
    description: "Fryer 2 berwarna UNGU gelap (dirty oil). TDS: 28, melebihi ambang batas 25.",
    aiInsight: ["Oil color: Dark Purple — critical", "TDS: 28 > threshold 25", "Dirty oil BB: PURPLE", "Immediate replacement needed"],
    timeline: ["12:40:00 — Quality scan", "12:42:00 — Dark Purple detected", "12:44:00 — TDS confirmed 28", "12:45:18 — Alert triggered"],
    images: ["/minyak.mp4"], videoUrl: "/oil.mp4",
    location: { name: "Recheese Central Park", lat: -6.1777, lng: 106.7903, area: "Fryer" },
  },
  {
    id: "oi-003", module: "Oil", outlet: "Recheese Paris Van Java",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-007", area: "Fryer",
    alertType: "Suspicious Oil Removal", severity: "Suspicious",
    timestamp: "2026-02-12 11:20:30",
    description: "Container minyak dipindahkan ke area tidak biasa, jalur tidak sesuai standar.",
    aiInsight: ["Container to non-standard location", "Deviation from normal route", "Duration at unauthorized zone: 4m 22s", "Geo-zone violation"],
    timeline: ["11:18:00 — Container removed", "11:19:15 — Off standard route", "11:20:30 — In unauthorized zone 4+ min", "11:20:30 — Alert triggered"],
    images: ["/minyak.mp4"], videoUrl: "/oil.mp4",
    location: { name: "Recheese Paris Van Java", lat: -6.8898, lng: 107.6100, area: "Fryer" },
  },
  {
    id: "oi-004", module: "Oil", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-007", area: "Fryer",
    alertType: "Dirty Oil Detected in Fryer 3", severity: "Critical",
    timestamp: "2026-02-12 09:55:42",
    description: "Fryer 3 Brown Black. TDS: 33 melebihi 25. Belum diganti.",
    aiInsight: ["TDS: 33 > threshold 25", "Color: Brown Black", "10 hours since last change", "Immediate replacement required"],
    timeline: ["09:50:00 — Quality check", "09:52:00 — TDS: 33", "09:55:42 — No action taken", "09:55:42 — Critical alert"],
    images: ["/minyak.mp4"], videoUrl: "/oil.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Fryer" },
  },
  {
    id: "oi-005", module: "Oil", outlet: "Recheese Paragon Mall",
    deviceName: "PROTECTQUBE Fryer Cam", deviceId: "PQBUBE-008", area: "Fryer",
    alertType: "Oil Replaced While Still Fresh", severity: "Suspicious",
    timestamp: "2026-02-12 08:15:55",
    description: "Fryer 1 & 2 diganti bersamaan hanya 3 jam setelah pengisian.",
    aiInsight: ["Multiple fryers replaced simultaneously", "2x faster replacement", "Oil still within quality params", "Possible oil diversion"],
    timeline: ["08:10:00 — Draining Fryer 1", "08:12:00 — Fryer 2 draining", "08:15:55 — Both emptied (fresh)", "08:15:55 — Dual replacement alert"],
    images: ["/minyak.mp4"], videoUrl: "/oil.mp4",
    location: { name: "Recheese Paragon Mall", lat: -6.9864, lng: 110.4199, area: "Fryer" },
  },
];

// ============================================================
// 4. JERRYCAN MONITORING
// ============================================================

export const jerrycanDeviceSummary: DeviceSummary = {
  totalDevices: 4, activeDevices: 4, totalAlertsToday: 6,
  criticalAlerts: 2, suspiciousAlerts: 2, warningAlerts: 2,
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
    { type: "Kitchen Transfer", count: 15 },
    { type: "Pooling Transfer", count: 8 },
    { type: "Returned", count: 20 },
    { type: "Unauthorized", count: 2 },
    { type: "Maintenance", count: 3 },
  ],
};

export const jerrycanAlerts: AIAlert[] = [
  {
    id: "jc-001", module: "Jerrycan", outlet: "Recheese Mall ABCD",
    deviceName: "PROTECTQUBE Jerrycan Cam", deviceId: "PQBUBE-009", area: "Jerrycan Room",
    alertType: "Jerrycan Removed from Room", severity: "Warning",
    timestamp: "2026-02-12 14:20:10",
    description: "Jerrycan diambil dari ruangan penyimpanan. Jumlah berkurang 12 → 11.",
    aiInsight: ["Count decrease: 12 → 11", "Person carrying jerrycan to exit", "Person wearing apron — authorized", "Within working hours"],
    timeline: ["14:19:30 — Person enters room", "14:19:50 — Picks up jerrycan #7", "14:20:10 — Exits room", "14:20:10 — Count decrease alert"],
    images: ["/kitchen.mp4"], videoUrl: "/jerrycan.mp4",
    location: { name: "Recheese Mall ABCD", lat: -6.2255, lng: 106.8005, area: "Jerrycan Room" },
  },
  {
    id: "jc-002", module: "Jerrycan", outlet: "Recheese Central Park",
    deviceName: "PROTECTQUBE Jerrycan Cam", deviceId: "PQBUBE-010", area: "Jerrycan Room",
    alertType: "Unauthorized Jerrycan Movement", severity: "Critical",
    timestamp: "2026-02-12 12:05:33",
    description: "Seseorang tanpa seragam mengambil jerrycan melewati boundary ruangan.",
    aiInsight: ["Person WITHOUT apron/uniform", "Jerrycan past boundary line", "No scheduled transfer", "Anomaly score: 0.93"],
    timeline: ["12:04:00 — Unknown person near room", "12:04:30 — Enters (no uniform)", "12:05:15 — Picks up jerrycan", "12:05:33 — Crosses boundary — ALERT"],
    images: ["/kitchen.mp4"], videoUrl: "/jerrycan.mp4",
    location: { name: "Recheese Central Park", lat: -6.1777, lng: 106.7903, area: "Jerrycan Room" },
  },
  {
    id: "jc-003", module: "Jerrycan", outlet: "Recheese Paris Van Java",
    deviceName: "PROTECTQUBE Jerrycan Cam", deviceId: "PQBUBE-009", area: "Jerrycan Room",
    alertType: "Jerrycan Count Decreased (Fraud)", severity: "Critical",
    timestamp: "2026-02-12 10:30:00",
    description: "Jumlah jerrycan berkurang 2 unit tanpa record pemindahan. Potensi pencurian.",
    aiInsight: ["Count: 12 → 10 (2 missing)", "No transfer record", "Camera blind spot suspected", "Flagged as fraud"],
    timeline: ["10:00:00 — Count: 12", "10:15:00 — Movement detected", "10:30:00 — Recount: 10", "10:30:00 — 2 missing — fraud alert"],
    images: ["/kitchen.mp4"], videoUrl: "/jerrycan.mp4",
    location: { name: "Recheese Paris Van Java", lat: -6.8898, lng: 107.6100, area: "Jerrycan Room" },
  },
  {
    id: "jc-004", module: "Jerrycan", outlet: "Recheese Tunjungan Plaza",
    deviceName: "PROTECTQUBE Jerrycan Cam", deviceId: "PQBUBE-010", area: "Jerrycan Room",
    alertType: "Jerrycan Removed from Room", severity: "Warning",
    timestamp: "2026-02-12 09:10:20",
    description: "Jerrycan diambil karyawan berapron. Jalur menuju kitchen normal.",
    aiInsight: ["Person with apron — authorized", "Route: toward kitchen (normal)", "Count: 12 → 11", "Informational alert"],
    timeline: ["09:09:45 — Person enters with apron", "09:10:00 — Picks up jerrycan", "09:10:20 — Exits to kitchen", "09:10:20 — Info alert logged"],
    images: ["/kitchen.mp4"], videoUrl: "/jerrycan.mp4",
    location: { name: "Recheese Tunjungan Plaza", lat: -7.2620, lng: 112.7378, area: "Jerrycan Room" },
  },
  {
    id: "jc-005", module: "Jerrycan", outlet: "Recheese Paragon Mall",
    deviceName: "PROTECTQUBE Jerrycan Cam", deviceId: "PQBUBE-009", area: "Jerrycan Room",
    alertType: "Unauthorized Jerrycan Movement", severity: "Suspicious",
    timestamp: "2026-02-12 08:00:15",
    description: "Jerrycan dipindahkan ke area parkir belakang, di luar jalur standar.",
    aiInsight: ["Movement: toward rear parking", "Not on kitchen/pooling route", "Before operational hours (08:00)", "Anomaly score: 0.85"],
    timeline: ["07:58:00 — Near Jerry storage", "07:59:30 — Picks up jerrycan", "08:00:15 — Exits to parking (unauthorized)", "08:00:15 — Alert triggered"],
    images: ["/kitchen.mp4"], videoUrl: "/jerrycan.mp4",
    location: { name: "Recheese Paragon Mall", lat: -6.9864, lng: 110.4199, area: "Jerrycan Room" },
  },
];

// ============================================================
// 5. POOLING MONITORING
// ============================================================

export const poolingDeviceSummary: DeviceSummary = {
  totalDevices: 4, activeDevices: 4, totalAlertsToday: 7,
  criticalAlerts: 1, suspiciousAlerts: 3, warningAlerts: 3,
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
    alertType: "Drum Full Detected", severity: "Warning",
    timestamp: "2026-02-12 14:30:00",
    description: "Drum #1 penuh (100%). Perlu segera diganti atau dikosongkan.",
    aiInsight: ["Drum #1: 100% (FULL)", "Volume: ~200L", "Full for 30 minutes", "Pickup at 16:00"],
    timeline: ["14:00:00 — 90% capacity", "14:15:00 — 95% capacity", "14:30:00 — 100% reached", "14:30:00 — Full alert"],
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
    alertType: "Person Without Gloves During Pooling", severity: "Warning",
    timestamp: "2026-02-12 11:40:20",
    description: "Karyawan pooling tanpa sarung tangan. Pelanggaran SOP.",
    aiInsight: ["Handling used oil without gloves", "Hand region exposed", "Gloves mandatory for oil handling", "Confidence: 0.90"],
    timeline: ["11:39:30 — Pooling activity begins", "11:40:00 — Glove check: NOT detected", "11:40:20 — Oil handling without protection", "11:40:20 — Safety alert"],
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
    alertType: "Person Without Apron During Pooling", severity: "Warning",
    timestamp: "2026-02-12 09:15:30",
    description: "Karyawan pooling tanpa apron. Apron wajib saat menangani minyak bekas.",
    aiInsight: ["Person without apron in pooling area", "Apron mandatory for used oil", "Confidence: 0.87", "First occurrence today"],
    timeline: ["09:14:45 — Enters pooling area", "09:15:00 — Apron: NOT detected", "09:15:30 — Oil handling without apron", "09:15:30 — Alert triggered"],
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
