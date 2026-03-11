"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/lib/auth-context";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";

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
          <RealtimeProvider>
            <AuthProvider>{children}</AuthProvider>
          </RealtimeProvider>
        </SessionProvider>
      </SWRConfig>
    </ThemeProvider>
  );
}
