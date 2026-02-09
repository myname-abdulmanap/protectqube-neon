"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

// Fix for default marker icons in Next.js
const createCustomIcon = (color: "green" | "orange" | "red") => {
  const colors = {
    green: "#22c55e",
    orange: "#f97316",
    red: "#ef4444",
  };

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${colors[color]};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ${color === "red" ? "animation: pulse 1.5s infinite;" : ""}
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

interface OutletLocation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  status: "normal" | "high" | "alert";
  usage: number;
  cost: number;
}

interface LeafletMapProps {
  outlets: OutletLocation[];
  className?: string;
}

// Component to handle map bounds
function MapBounds({ outlets }: { outlets: OutletLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (outlets.length > 0) {
      const bounds = L.latLngBounds(outlets.map((o) => [o.lat, o.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, outlets]);

  return null;
}

export function LeafletMap({ outlets, className }: LeafletMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // This is a standard pattern for client-only components
    // We need to wait for the component to mount before rendering Leaflet
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) {
    return (
      <div
        className={cn(
          "bg-muted/30 rounded-lg flex items-center justify-center",
          className,
        )}
      >
        <p className="text-muted-foreground text-sm">Loading map...</p>
      </div>
    );
  }

  const getIcon = (status: OutletLocation["status"]) => {
    switch (status) {
      case "alert":
        return createCustomIcon("red");
      case "high":
        return createCustomIcon("orange");
      default:
        return createCustomIcon("green");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Center of Java Island
  const defaultCenter: [number, number] = [-7.25, 110.0];

  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 12px;
        }
      `}</style>
      <MapContainer
        center={defaultCenter}
        zoom={7}
        className={cn("rounded-lg z-0", className)}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds outlets={outlets} />
        {outlets.map((outlet) => (
          <Marker
            key={outlet.id}
            position={[outlet.lat, outlet.lng]}
            icon={getIcon(outlet.status)}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-semibold text-sm mb-1">{outlet.name}</p>
                <p className="text-xs text-gray-500 mb-2">{outlet.region}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span
                      className={cn(
                        "font-medium capitalize",
                        outlet.status === "alert" && "text-red-500",
                        outlet.status === "high" && "text-orange-500",
                        outlet.status === "normal" && "text-green-500",
                      )}
                    >
                      {outlet.status === "high" ? "High Usage" : outlet.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Penggunaan:</span>
                    <span className="font-medium">
                      {outlet.usage.toLocaleString("id-ID")} kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Biaya:</span>
                    <span className="font-medium">
                      {formatCurrency(outlet.cost)}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
