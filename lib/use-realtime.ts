import { useEffect, useRef, useCallback, useState } from "react";

export type WebSocketEventType = "alert" | "mqtt-message" | "connection" | "error";

export interface WebSocketMessage {
  type: WebSocketEventType;
  data: unknown;
  timestamp: string;
}

type EventCallback = (message: WebSocketMessage) => void;

export const useRealtime = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbacksRef = useRef<Map<WebSocketEventType | "all", Set<EventCallback>>>(
    new Map(),
  );

  // Initialize WebSocket connection
  useEffect(() => {
    // Guard flag — set to false in cleanup so the close-handler's
    // setTimeout(reconnect) doesn't fire after the component unmounts.
    let mounted = true;

    const connectWebSocket = () => {
      if (!mounted || typeof window === "undefined") return;

      // Get token from localStorage
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("No authentication token found");
        return;
      }

      // Build WebSocket URL from NEXT_PUBLIC_API_URL (points to backend VPS)
      // Vercel does not support WebSocket, so we must connect directly to the backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const url = new URL(apiUrl);
      const protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${url.host}/api/realtime?token=${encodeURIComponent(token)}`;

      try {
        const ws = new WebSocket(wsUrl);

        ws.addEventListener("open", () => {
          console.log("WebSocket connected");
          setIsConnected(true);
          setError(null);
        });

        ws.addEventListener("message", (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;

            // Call all callbacks
            callbacksRef.current.get("all")?.forEach((callback) => {
              callback(message);
            });

            // Call type-specific callbacks
            const typeCallbacks = callbacksRef.current.get(message.type);
            typeCallbacks?.forEach((callback) => {
              callback(message);
            });
          } catch (err) {
            console.error("Failed to parse WebSocket message:", err);
          }
        });

        ws.addEventListener("error", (event) => {
          console.error("WebSocket error:", event);
          setError("WebSocket connection error");
        });

        ws.addEventListener("close", () => {
          console.log("WebSocket disconnected");
          setIsConnected(false);
          // Only attempt to reconnect if the component is still mounted.
          // Without this check, the cleanup-triggered close fires the timeout
          // and creates a new WebSocket after the component is gone.
          if (mounted) {
            setTimeout(connectWebSocket, 3000);
          }
        });

        wsRef.current = ws;
      } catch (err) {
        console.error("Failed to create WebSocket:", err);
        setError("Failed to create WebSocket connection");
      }
    };

    connectWebSocket();

    // Cleanup
    return () => {
      mounted = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Subscribe to events
  const subscribe = useCallback(
    (type: WebSocketEventType | "all", callback: EventCallback) => {
      if (!callbacksRef.current.has(type)) {
        callbacksRef.current.set(type, new Set());
      }
      callbacksRef.current.get(type)!.add(callback);

      // Return unsubscribe function
      return () => {
        callbacksRef.current.get(type)?.delete(callback);
      };
    },
    [],
  );

  return {
    isConnected,
    error,
    subscribe,
  };
};
