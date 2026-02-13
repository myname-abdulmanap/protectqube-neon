"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  Clock,
  MapPin,
  Camera,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AIAlert, AlertSeverity } from "@/lib/ai-alerts";

const severityConfig: Record<
  AlertSeverity,
  {
    bg: string;
    border: string;
    text: string;
    icon: typeof AlertTriangle;
    badgeBg: string;
  }
> = {
  Critical: {
    bg: "bg-red-500/5 hover:bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-500",
    icon: ShieldAlert,
    badgeBg: "bg-red-500/10 text-red-500 border-red-500/30",
  },
  Warning: {
    bg: "bg-amber-500/5 hover:bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-500",
    icon: AlertTriangle,
    badgeBg: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  Suspicious: {
    bg: "bg-blue-500/5 hover:bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-500",
    icon: Info,
    badgeBg: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  },
};

interface AIAlertCardProps {
  alert: AIAlert;
  onClick: (alert: AIAlert) => void;
}

export function AIAlertCard({ alert, onClick }: AIAlertCardProps) {
  const config = severityConfig[alert.severity];
  const SeverityIcon = config.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={() => onClick(alert)}
    >
      <Card
        className={`border ${config.border} ${config.bg} shadow-sm transition-all h-full`}
      >
        <CardContent className="p-3 flex flex-col gap-2 h-full">
          {/* Top: Icon + Severity Badge */}
          <div className="flex items-center justify-between">
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}
            >
              <SeverityIcon className={`h-4 w-4 ${config.text}`} />
            </div>
            <Badge
              variant="outline"
              className={`text-[7px] px-1.5 py-0 h-4 ${config.badgeBg}`}
            >
              {alert.severity}
            </Badge>
          </div>

          {/* Alert Type */}
          <p className="text-[10px] font-semibold leading-tight line-clamp-2">
            {alert.alertType}
          </p>

          {/* Device + Area */}
          <div className="space-y-1 mt-auto">
            <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
              <Camera className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="font-medium text-foreground">
                {alert.deviceId}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{alert.area}</span>
            </div>
            <div className="flex items-center gap-1 text-[7px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5 flex-shrink-0" />
              <span>{alert.timestamp.split(" ")[1]}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
