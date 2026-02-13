"use client";

import { motion } from "framer-motion";
import {
  Monitor,
  Wifi,
  ShieldAlert,
  AlertTriangle,
  Info,
  Bell,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DeviceSummary } from "@/lib/ai-alerts";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const summaryItems = [
  {
    key: "totalDevices",
    label: "Total Devices",
    icon: Monitor,
    bg: "bg-purple-600",
  },
  {
    key: "activeDevices",
    label: "Active Devices",
    icon: Wifi,
    bg: "bg-green-600",
  },
  {
    key: "totalAlertsToday",
    label: "AI Alerts Today",
    icon: Bell,
    bg: "bg-violet-600",
  },
  {
    key: "criticalAlerts",
    label: "Critical",
    icon: ShieldAlert,
    bg: "bg-red-600",
  },
  {
    key: "suspiciousAlerts",
    label: "Suspicious",
    icon: Info,
    bg: "bg-blue-600",
  },
  {
    key: "healthAlerts",
    label: "Health",
    icon: AlertTriangle,
    bg: "bg-amber-500",
  },
] as const;

interface AISummaryCardsProps {
  summary: DeviceSummary;
}

export function AISummaryCards({ summary }: AISummaryCardsProps) {
  return (
    <motion.div variants={itemVariants} className="grid grid-cols-6 gap-1">
      {summaryItems.map((item) => {
        const Icon = item.icon;
        const value = summary[item.key];
        return (
          <Card
            key={item.key}
            className={`border-0 shadow-lg rounded-xl ${item.bg} text-white`}
          >
            <CardContent className="p-2">
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-3 w-3 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[7px] text-white/80 truncate">
                    {item.label}
                  </p>
                  <p className="text-sm font-extrabold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </motion.div>
  );
}
