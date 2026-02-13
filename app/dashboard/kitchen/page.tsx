"use client";

import { useEffect } from "react";
import { useHeaderSelector } from "@/components/providers/HeaderSelectorProvider";
import { CashierMonitoring } from "@/components/kitchen/CashierMonitoring";
import { KitchenMonitoring } from "@/components/kitchen/KitchenMonitoring";
import { OilMonitoring } from "@/components/kitchen/OilMonitoring";
import { JerrycanMonitoring } from "@/components/kitchen/JerrycanMonitoring";
import { PoolingMonitoring } from "@/components/kitchen/PoolingMonitoring";

const VALID_VIEWS = [
  "cashier-monitoring",
  "kitchen-monitoring",
  "oil-monitoring",
  "jerrycan-monitoring",
  "pooling-monitoring",
];

export default function KitchenPage() {
  const { value, setValue } = useHeaderSelector();

  useEffect(() => {
    if (!value || !VALID_VIEWS.includes(value)) {
      setValue("cashier-monitoring");
    }
  }, []);

  const activeView = value || "cashier-monitoring";

  return (
    <div className="h-full">
      {activeView === "cashier-monitoring" && <CashierMonitoring />}
      {activeView === "kitchen-monitoring" && <KitchenMonitoring />}
      {activeView === "oil-monitoring" && <OilMonitoring />}
      {activeView === "jerrycan-monitoring" && <JerrycanMonitoring />}
      {activeView === "pooling-monitoring" && <PoolingMonitoring />}
    </div>
  );
}
