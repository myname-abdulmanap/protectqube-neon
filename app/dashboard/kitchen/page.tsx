"use client";

import { useEffect } from "react";
import { useHeaderSelector } from "@/components/providers/HeaderSelectorProvider";
import { KitchenAnalysis } from "@/components/kitchen/KitchenAnalysis";
import { OilMonitoring } from "@/components/kitchen/OilMonitoring";
import { OilPooling } from "@/components/kitchen/OilPooling";

export default function KitchenPage() {
  const { value, setValue } = useHeaderSelector();

  useEffect(() => {
    if (
      !value ||
      !["kitchen-analysis", "oil-monitoring", "oil-pooling"].includes(value)
    ) {
      setValue("kitchen-analysis");
    }
  }, []);

  const activeView = value || "kitchen-analysis";

  return (
    <div className="h-full">
      {activeView === "kitchen-analysis" && <KitchenAnalysis />}
      {activeView === "oil-monitoring" && <OilMonitoring />}
      {activeView === "oil-pooling" && <OilPooling />}
    </div>
  );
}
