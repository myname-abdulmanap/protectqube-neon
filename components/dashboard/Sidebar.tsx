"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/providers/SidebarProvider";
import { useHeaderSelector } from "@/components/providers/HeaderSelectorProvider";
import { useAuth } from "@/lib/auth-context";
import { getMenuIconComponent } from "@/lib/menu-icons";

interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  menus?: Array<{
    id: string;
    name: string;
    path: string;
    icon: string;
    selectorValue: string | null;
    order: number;
    parentId: string | null;
  }>;
}

interface SidebarProps {
  user: User;
}

interface NavigationItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  selectorValue?: string;
  children?: NavigationItem[];
}

// Animation variants
const sidebarVariants = {
  expanded: {
    width: 180,
    transition: {
      duration: 0.3,
      ease: "easeInOut" as const,
    },
  },
  collapsed: {
    width: 44,
    transition: {
      duration: 0.3,
      ease: "easeInOut" as const,
    },
  },
};

const menuItemVariants = {
  hover: {
    x: 3,
    transition: {
      duration: 0.15,
    },
  },
};

const iconVariants = {
  hover: {
    scale: 1.1,
    transition: {
      duration: 0.15,
    },
  },
};

const mobileMenuVariants = {
  closed: {
    x: "-100%",
    transition: {
      duration: 0.3,
      ease: "easeInOut" as const,
    },
  },
  open: {
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeInOut" as const,
    },
  },
};

const overlayVariants = {
  closed: {
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
  open: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
};

export default function Sidebar({ user }: SidebarProps) {
  const { user: authUser, hasPermission } = useAuth();
  const pathname = usePathname();
  const { isOpen, isCollapsed, toggleCollapse, setOpen } = useSidebar();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(
    {},
  );
  const userRole = authUser?.role?.name || user?.role || "user";
  const userName = authUser?.name || user?.name;

  const menuItems: NavigationItem[] = (() => {
    const sourceMenus = [...(authUser?.menus || user?.menus || [])].filter(
      (menu) => menu.path !== "/dashboard/alert-events",
    );

    const hasHealthMenu = sourceMenus.some(
      (menu) => menu.path === "/dashboard/health",
    );
    const devicesParent =
      sourceMenus.find((menu) => menu.selectorValue === "devices_group") ||
      sourceMenus.find((menu) => menu.name.toLowerCase() === "devices");

    if (!hasHealthMenu && hasPermission("devices:read")) {
      sourceMenus.push({
        id: "built-in-device-health",
        name: "Health",
        path: "/dashboard/health",
        icon: "Activity",
        selectorValue: "device_health",
        order: (devicesParent?.order ?? 40) + 2,
        parentId: devicesParent?.id ?? null,
      });
    }

    const hasCalibrationMenu = sourceMenus.some(
      (menu) => menu.path === "/dashboard/energy-monitoring/calibration",
    );
    const energyMonitoringParent =
      sourceMenus.find((menu) => menu.selectorValue === "energy_monitoring") ||
      sourceMenus.find(
        (menu) => menu.name.toLowerCase() === "energy monitoring",
      );

    if (!hasCalibrationMenu && hasPermission("outlet_energy_snapshots:read")) {
      sourceMenus.push({
        id: "built-in-energy-calibration",
        name: "Calibration",
        path: "/dashboard/energy-monitoring/calibration",
        icon: "ClipboardCheck",
        selectorValue: "energy_calibration",
        order: (energyMonitoringParent?.order ?? 11) + 6,
        parentId: energyMonitoringParent?.id ?? null,
      });
    }

    const mapById = new Map<string, NavigationItem>();
    sourceMenus.forEach((menu) => {
      mapById.set(menu.id, {
        id: menu.id,
        name: menu.name,
        href: menu.path,
        icon: getMenuIconComponent(menu.icon),
        selectorValue: menu.selectorValue || undefined,
        children: [],
      });
    });

    const roots: NavigationItem[] = [];
    const sortedSource = [...sourceMenus].sort((a, b) => a.order - b.order);

    sortedSource.forEach((menu) => {
      const current = mapById.get(menu.id);
      if (!current) return;

      if (menu.parentId) {
        const parent = mapById.get(menu.parentId);
        if (parent) {
          parent.children = [...(parent.children || []), current];
        } else {
          roots.push(current);
        }
      } else {
        roots.push(current);
      }
    });

    return roots;
  })();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "text-red-600 bg-red-100 dark:bg-red-500/20 dark:text-red-400";
      case "OPERATOR":
        return "text-blue-600 bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const NavItem = ({
    item,
    index,
    collapsed = false,
    isChild = false,
  }: {
    item: NavigationItem;
    index: number;
    collapsed?: boolean;
    isChild?: boolean;
  }) => {
    void isChild;
    const Icon = item.icon;
    const { setValue: setHeaderSelector, value: headerValue } =
      useHeaderSelector();
    const isActive = item.selectorValue
      ? pathname === item.href && headerValue === item.selectorValue
      : pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href));
    const hasActiveChild =
      item.children?.some(
        (child) =>
          pathname === child.href ||
          (child.href !== "/dashboard" && pathname.startsWith(child.href)),
      ) || false;
    const hasChildren = (item.children?.length || 0) > 0;
    const isGroupTrigger = !item.href || item.href === "#";
    const isExpanded = expandedMenus[item.id] ?? false;

    const toggleExpanded = () => {
      setExpandedMenus((prev) => ({
        ...prev,
        [item.id]: !(prev[item.id] ?? hasActiveChild),
      }));
    };

    const content = (
      <motion.div variants={menuItemVariants} whileHover="hover">
        <div
          className={cn(
            "group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            isActive || hasActiveChild
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-1.5",
          )}
        >
          {isGroupTrigger ? (
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => {
                if (hasChildren) {
                  toggleExpanded();
                }
              }}
            >
              <motion.div variants={iconVariants}>
                <Icon className="h-4 w-4 flex-shrink-0" />
              </motion.div>
              {!collapsed && (
                <span className="flex-1 truncate">{item.name}</span>
              )}
            </button>
          ) : (
            <Link
              href={item.href}
              onClick={() => {
                if (item.selectorValue) {
                  setHeaderSelector(item.selectorValue);
                }
                setOpen(false);
              }}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <motion.div variants={iconVariants}>
                <Icon className="h-4 w-4 flex-shrink-0" />
              </motion.div>
              {!collapsed && (
                <span className="flex-1 truncate">{item.name}</span>
              )}
            </Link>
          )}

          {!collapsed && hasChildren ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleExpanded();
              }}
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  isExpanded ? "rotate-0" : "-rotate-90",
                )}
              />
            </Button>
          ) : (
            !collapsed &&
            (isActive || hasActiveChild) && (
              <ChevronRight className="h-3 w-3 opacity-50" />
            )
          )}
        </div>
      </motion.div>
    );

    if (collapsed) {
      if (hasChildren && item.children && item.children.length > 0) {
        return (
          <div className="space-y-0.5">
            {/* Parent icon - click to toggle children */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={item.name}
                  onClick={toggleExpanded}
                  className={cn(
                    "flex w-full items-center justify-center rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors",
                    isActive || hasActiveChild
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.name}
              </TooltipContent>
            </Tooltip>
            {/* Child icons with toggle animation */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.16, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="space-y-0.5 pt-0.5">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = child.selectorValue
                        ? pathname === child.href &&
                          headerValue === child.selectorValue
                        : pathname === child.href ||
                          (child.href !== "/dashboard" &&
                            pathname.startsWith(child.href));
                      return (
                        <Tooltip key={child.id} delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Link
                              href={child.href}
                              onClick={() => {
                                if (child.selectorValue) {
                                  setHeaderSelector(child.selectorValue);
                                }
                                setOpen(false);
                              }}
                              className={cn(
                                "flex items-center justify-center rounded-md px-1.5 py-1.5 transition-colors",
                                childActive
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                              )}
                            >
                              <ChildIcon className="h-[15px] w-[15px]" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="font-medium">
                            {child.name}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      }

      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <>
        {content}
        {!collapsed && item.children && item.children.length > 0 && (
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.16, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="ml-4 border-l border-border pl-2 pt-0.5 space-y-0.5">
                  {item.children.map((child, childIndex) => (
                    <NavItem
                      key={child.id}
                      item={child}
                      index={index + childIndex + 1}
                      collapsed={collapsed}
                      isChild
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </>
    );
  };

  return (
    <TooltipProvider>
      {/* Desktop Sidebar */}
      <motion.aside
        className="fixed inset-y-0 left-0 z-50 hidden border-r bg-card lg:block"
        variants={sidebarVariants}
        initial={false}
        animate={isCollapsed ? "collapsed" : "expanded"}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-8 items-center gap-1.5 px-1.5 border-b">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="h-6 w-6 flex-shrink-0"
              >
                <motion.div
                  animate={{ rotate: isCollapsed ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isCollapsed ? (
                    <PanelLeft className="h-3.5 w-3.5" />
                  ) : (
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  )}
                </motion.div>
              </Button>
            </motion.div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center"
                >
                  <Image
                    src="/logo-protectcube.png"
                    alt="ProtectQube"
                    width={120}
                    height={32}
                    className="h-6 w-auto dark:invert dark:hue-rotate-180"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-1.5">
            <div className="space-y-0.5">
              {menuItems.map((item, index) => (
                <NavItem
                  key={item.id}
                  item={item}
                  index={index}
                  collapsed={isCollapsed}
                />
              ))}
            </div>
          </nav>

          <Separator />

          {/* User info at bottom */}
          <div className="p-1.5">
            <motion.div
              className={cn(
                "flex items-center gap-2 rounded-md bg-muted/50 p-1.5",
                isCollapsed && "justify-center p-1",
              )}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-medium">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    className="flex-1 min-w-0"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-[10px] font-medium truncate">
                      {userName || "User"}
                    </p>
                    <span
                      className={cn(
                        "inline-flex px-1 py-0 rounded text-[8px] font-semibold uppercase",
                        getRoleBadge(userRole),
                      )}
                    >
                      {userRole}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 w-48 border-r bg-card lg:hidden"
            variants={mobileMenuVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex h-10 items-center justify-between gap-2 px-2 border-b">
                <div className="flex items-center">
                  <Image
                    src="/logo-protectcube.png"
                    alt="ProtectQube"
                    width={120}
                    height={32}
                    className="h-7 w-auto dark:invert dark:hue-rotate-180"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-1.5">
                <div className="space-y-0.5">
                  {menuItems.map((item, index) => (
                    <NavItem key={item.id} item={item} index={index} />
                  ))}
                </div>
              </nav>

              <Separator />

              {/* User info at bottom */}
              <div className="p-1.5">
                <div className="flex items-center gap-2 rounded-md bg-muted/50 p-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-medium">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium truncate">
                      {userName || "User"}
                    </p>
                    <span
                      className={cn(
                        "inline-flex px-1 py-0 rounded text-[8px] font-semibold uppercase",
                        getRoleBadge(userRole),
                      )}
                    >
                      {userRole}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
