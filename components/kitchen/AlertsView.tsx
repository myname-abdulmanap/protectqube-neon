"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  ShieldAlert,
  AlertTriangle,
  Info,
  Filter,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AIAlertCard } from "./AIAlertCard";
import { AlertDetailModal } from "./AlertDetailModal";
import { AISummaryCards } from "./AISummaryCards";
import type { AIAlert, DeviceSummary, AlertSeverity } from "@/lib/ai-alerts";
import { outlets } from "@/lib/ai-alerts";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const severitySections: {
  key: AlertSeverity;
  label: string;
  icon: typeof ShieldAlert;
  color: string;
  badgeColor: string;
}[] = [
  {
    key: "Critical",
    label: "Critical Alerts",
    icon: ShieldAlert,
    color: "text-red-500",
    badgeColor: "border-red-500/30 text-red-500 bg-red-500/10",
  },
  {
    key: "Suspicious",
    label: "Suspicious Alerts",
    icon: Info,
    color: "text-blue-500",
    badgeColor: "border-blue-500/30 text-blue-500 bg-blue-500/10",
  },
  {
    key: "Health",
    label: "Health Alerts",
    icon: AlertTriangle,
    color: "text-amber-500",
    badgeColor: "border-amber-500/30 text-amber-500 bg-amber-500/10",
  },
];

interface AlertsViewProps {
  alerts: AIAlert[];
  summary: DeviceSummary;
  title?: string;
}

export function AlertsView({ alerts, summary }: AlertsViewProps) {
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [selectedDevice, setSelectedDevice] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<AIAlert | null>(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  const devices = useMemo(() => {
    const set = new Set(alerts.map((a) => a.deviceId));
    return Array.from(set).map((id) => {
      const a = alerts.find((x) => x.deviceId === id)!;
      return { id, name: `${a.deviceId} — ${a.deviceName}` };
    });
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (
        selectedOutlet !== "all" &&
        a.outlet !== outlets.find((o) => o.id === selectedOutlet)?.name
      )
        return false;
      if (selectedDevice !== "all" && a.deviceId !== selectedDevice)
        return false;
      return true;
    });
  }, [alerts, selectedOutlet, selectedDevice]);

  const groupedAlerts = useMemo(() => {
    return {
      Critical: filteredAlerts.filter((a) => a.severity === "Critical"),
      Suspicious: filteredAlerts.filter((a) => a.severity === "Suspicious"),
      Health: filteredAlerts.filter((a) => a.severity === "Health"),
    };
  }, [filteredAlerts]);

  const handleAlertClick = (alert: AIAlert) => {
    setSelectedAlert(alert);
    setAlertModalOpen(true);
  };

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
      <AISummaryCards summary={summary} />

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Filter className="h-3 w-3" />
                <span className="font-semibold">Filters:</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <Select
                  value={selectedOutlet}
                  onValueChange={setSelectedOutlet}
                >
                  <SelectTrigger size="sm" className="h-6 w-[150px] text-[9px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => (
                      <SelectItem
                        key={o.id}
                        value={o.id}
                        className="text-[9px]"
                      >
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <Select
                  value={selectedDevice}
                  onValueChange={setSelectedDevice}
                >
                  <SelectTrigger size="sm" className="h-6 w-[160px] text-[9px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[9px]">
                      All Devices
                    </SelectItem>
                    {devices.map((d) => (
                      <SelectItem
                        key={d.id}
                        value={d.id}
                        className="text-[9px]"
                      >
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge
                variant="outline"
                className="text-[7px] px-1.5 py-0 h-4 ml-auto"
              >
                {filteredAlerts.length} / {alerts.length} alerts
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alert Grid Sections by Severity */}
      <motion.div variants={itemVariants} className="flex-1 min-h-0">
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-4 pr-2">
            {severitySections.map((section) => {
              const sectionAlerts = groupedAlerts[section.key];
              if (sectionAlerts.length === 0) return null;
              const SectionIcon = section.icon;
              return (
                <div key={section.key}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <SectionIcon className={`h-3.5 w-3.5 ${section.color}`} />
                    <h3 className="text-[11px] font-semibold">
                      {section.label}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`text-[7px] px-1.5 py-0 h-4 ${section.badgeColor}`}
                    >
                      {sectionAlerts.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {sectionAlerts.map((alert) => (
                      <AIAlertCard
                        key={alert.id}
                        alert={alert}
                        onClick={handleAlertClick}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredAlerts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No alerts match the selected filters
              </div>
            )}
          </div>
        </ScrollArea>
      </motion.div>

      <AlertDetailModal
        alert={selectedAlert}
        open={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
      />
    </motion.div>
  );
}
