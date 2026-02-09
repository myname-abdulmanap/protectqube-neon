"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { Card } from "@/components/ui/card";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  delay?: number;
  children: React.ReactNode;
  className?: string;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ delay = 0, children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay,
          ease: "easeOut",
        }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        {...props}
      >
        <Card className={cn("h-full", className)}>{children}</Card>
      </motion.div>
    );
  },
);

AnimatedCard.displayName = "AnimatedCard";

// Animated container for staggered children
export const AnimatedContainer = ({
  children,
  className,
  staggerDelay = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

// Animated item for use inside AnimatedContainer
export const AnimatedItem = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: "easeOut" as const,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

// Fade in animation
export const FadeIn = ({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}) => {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
};

// Scale in animation
export const ScaleIn = ({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        delay,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
};

// Hover scale
export const HoverScale = ({
  children,
  className,
  scale = 1.02,
}: {
  children: React.ReactNode;
  className?: string;
  scale?: number;
}) => {
  return (
    <motion.div
      className={className}
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};
