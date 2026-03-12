"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ReactNode, useEffect } from "react";
import { SWRConfig } from "swr";
import { authToken } from "@/lib/api";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";

/**
 * Syncs the backend JWT token stored in the next-auth session to both the
 * in-memory cache and localStorage so that the axios interceptor always has
 * the token available before SWR fires its first fetch.
 *
 * The synchronous path (render body) writes to the in-memory store immediately
 * when the session resolves. The useEffect path persists to localStorage and
 * handles the unauthenticated / logout case.
 */
function TokenSync() {
  const { data: session, status } = useSession();

  // Synchronous write during render — this runs before any useEffect/SWR fire,
  // so the in-memory token is ready when axios sends the first request.
  if (session?.user?.backendToken) {
    authToken.set(session.user.backendToken);
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      authToken.remove();
    }
  }, [status]);

  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          dedupingInterval: 30000,
          errorRetryCount: 2,
        }}
      >
        <SessionProvider>
          <TokenSync />
          <RealtimeProvider>{children}</RealtimeProvider>
        </SessionProvider>
      </SWRConfig>
    </ThemeProvider>
  );
}
