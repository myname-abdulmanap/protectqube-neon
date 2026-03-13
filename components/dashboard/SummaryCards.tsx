"use client";

import { Zap, Store, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SummaryCardsProps {
  totalEnergy: number;
  totalOutlets: number;
  devicesOnline: number;
  devicesOffline: number;
  loading?: boolean;
}

export function SummaryCards({
  totalEnergy,
  totalOutlets,
  devicesOnline,
  devicesOffline,
  loading,
}: SummaryCardsProps) {
  const cards = [
    {
      label: "Total Energy",
      value: `${totalEnergy.toLocaleString("id-ID", { maximumFractionDigits: 2 })} kWh`,
      icon: Zap,
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      label: "Total Outlet",
      value: totalOutlets.toString(),
      icon: Store,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      label: "Device Online",
      value: devicesOnline.toString(),
      icon: Wifi,
      gradient: "from-green-500 to-emerald-600",
    },
    {
      label: "Device Offline",
      value: devicesOffline.toString(),
      icon: WifiOff,
      gradient: "from-rose-500 to-red-600",
    },
  ];

  return (
    <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={`border-0 bg-gradient-to-br ${card.gradient} text-white shadow-sm`}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <card.icon className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.1em] text-white/80 leading-tight">
                  {card.label}
                </p>
                <p className="mt-1 text-lg font-bold leading-none truncate">
                  {loading ? "—" : card.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
