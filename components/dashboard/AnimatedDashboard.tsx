"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedDashboardProps {
  children: React.ReactNode;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

export function AnimatedDashboard({
  children,
  className,
}: AnimatedDashboardProps) {
  return (
    <motion.div
      className={cn("space-y-8", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section variants={itemVariants} className={className}>
      {children}
    </motion.section>
  );
}

export function AnimatedGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("grid gap-4", className)}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedGridItem({
  children,
  className,
  hoverEffect = true,
}: {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={itemVariants}
      whileHover={
        hoverEffect ? { y: -4, transition: { duration: 0.2 } } : undefined
      }
    >
      {children}
    </motion.div>
  );
}
