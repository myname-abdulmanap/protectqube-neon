"use client";

import { createContext, useContext, ReactNode } from "react";
import {
  useRealtime,
  type WebSocketEventType,
  type WebSocketMessage,
} from "@/lib/use-realtime";

interface RealtimeContextType {
  isConnected: boolean;
  error: string | null;
  subscribe: (
    type: WebSocketEventType | "all",
    callback: (message: WebSocketMessage) => void,
  ) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined,
);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const realtime = useRealtime();

  return (
    <RealtimeContext.Provider value={realtime}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtimeContext must be used within RealtimeProvider");
  }
  return context;
}
