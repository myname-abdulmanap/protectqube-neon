import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { LayoutDashboard } from "lucide-react";

type IconComponent = ComponentType<LucideProps>;

const isComponentLike = (value: unknown): boolean => {
  return (
    typeof value === "function" ||
    (typeof value === "object" && value !== null)
  );
};

const iconEntries = Object.entries(LucideIcons).filter(
  ([name, value]) => /^[A-Z]/.test(name) && isComponentLike(value),
);

export const availableMenuIcons = iconEntries
  .map(([name]) => name)
  .sort((a, b) => a.localeCompare(b));

export const getMenuIconComponent = (
  iconName?: string | null,
): IconComponent => {
  if (!iconName) {
    return LayoutDashboard;
  }

  const iconCandidate = (LucideIcons as Record<string, unknown>)[iconName];

  if (isComponentLike(iconCandidate)) {
    return iconCandidate as IconComponent;
  }

  return LayoutDashboard;
};
