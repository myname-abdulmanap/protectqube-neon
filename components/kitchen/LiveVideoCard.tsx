"use client";

import { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LiveVideoCardProps {
  src: string;
  outletName: string;
}

export function LiveVideoCard({ src, outletName }: LiveVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.load();
    const tryPlay = () => {
      const p = el.play();
      if (p) p.catch(() => setTimeout(() => el.play().catch(() => {}), 200));
    };
    if (el.readyState >= 2) {
      tryPlay();
    } else {
      el.addEventListener("loadeddata", tryPlay, { once: true });
    }
    return () => el.removeEventListener("loadeddata", tryPlay);
  }, [src, outletName]);

  return (
    <div>
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-2 pt-1.5 pb-0">
          <CardTitle className="text-[10px] font-semibold">
            Live Feed — {outletName}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-1.5 pt-1 flex justify-center">
          <div className="relative rounded-md overflow-hidden bg-black" style={{ width: 600, height: 340 }}>
            <video
              ref={videoRef}
              key={src}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            >
              <source src={src} type="video/mp4" />
            </video>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
