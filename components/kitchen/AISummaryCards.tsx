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
    color: "text-slate-500",
    bg: "from-slate-500/10 to-slate-500/5",
  },
  {
    key: "activeDevices",
    label: "Active Devices",
    icon: Wifi,
    color: "text-green-500",
    bg: "from-green-500/10 to-green-500/5",
  },
  {
    key: "totalAlertsToday",
    label: "AI Alerts Today",
    icon: Bell,
    color: "text-violet-500",
    bg: "from-violet-500/10 to-violet-500/5",
  },
  {
    key: "criticalAlerts",
    label: "Critical",
    icon: ShieldAlert,
    color: "text-red-500",
    bg: "from-red-500/10 to-red-500/5",
  },
  {
    key: "suspiciousAlerts",
    label: "Suspicious",
    icon: Info,
    color: "text-blue-500",
    bg: "from-blue-500/10 to-blue-500/5",
  },
  {
    key: "warningAlerts",
    label: "Warning",
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "from-amber-500/10 to-amber-500/5",
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
            className={`border-0 shadow-sm bg-gradient-to-br ${item.bg}`}
          >
            <CardContent className="p-2">
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded bg-background/80 flex items-center justify-center flex-shrink-0">
                  <Icon className={`h-3 w-3 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[7px] text-muted-foreground truncate">
                    {item.label}
                  </p>
                  <p className="text-sm font-bold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </motion.div>
  );
}
