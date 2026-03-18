"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { Style, Circle as CircleStyle, Fill, Stroke } from "ol/style";
import Overlay from "ol/Overlay";
import "ol/ol.css";

export interface MapOutlet {
  id: string;
  name: string;
  address: string | null;
  totalEnergy: number;
  lat: number;
  lng: number;
  online: boolean;
  devices: Array<{ id: string; name: string; online: boolean }>;
}

interface OpenLayersMapProps {
  outlets: MapOutlet[];
  className?: string;
}

export function OpenLayersMap({ outlets, className }: OpenLayersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<MapOutlet | null>(null);

  const closePopup = useCallback(() => {
    setSelectedOutlet(null);
    overlayRef.current?.setPosition(undefined);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !popupRef.current) return;

    const overlay = new Overlay({
      element: popupRef.current,
      autoPan: true,
    });
    overlayRef.current = overlay;

    const vectorSource = new VectorSource();

    outlets.forEach((outlet) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([outlet.lng, outlet.lat])),
      });
      feature.set("outletData", outlet);
      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: outlet.online ? "#22c55e" : "#ef4444" }),
            stroke: new Stroke({ color: "#ffffff", width: 2.5 }),
          }),
        }),
      );
      vectorSource.addFeature(feature);
    });

    const vectorLayer = new VectorLayer({ source: vectorSource });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attributions: "ProtectQube",
          }),
        }),
        vectorLayer,
      ],
      overlays: [overlay],
      view: new View({
        center: fromLonLat([113.0, -2.0]),
        zoom: 4.5,
      }),
      controls: [],
    });

    // Don't auto-fit to outlets - keep Indonesia view
    // Users can zoom in manually to see specific points

    // Click handler
    map.on("click", (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature) {
        const data = feature.get("outletData") as MapOutlet;
        setSelectedOutlet(data);
        const geom = feature.getGeometry();
        if (geom && geom.getType() === "Point") {
          overlay.setPosition((geom as Point).getCoordinates());
        }
      } else {
        closePopup();
      }
    });

    // Pointer cursor on features
    map.on("pointermove", (evt) => {
      const hit = map.hasFeatureAtPixel(evt.pixel);
      map.getTargetElement().style.cursor = hit ? "pointer" : "";
    });

    mapInstanceRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [outlets, closePopup]);

  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)}>
      <div ref={mapRef} className="h-full w-full" />
      <div ref={popupRef} className="absolute">
        {selectedOutlet && (
          <div className="bg-popover text-popover-foreground border border-border rounded-md shadow-lg p-2 min-w-[160px] max-w-[200px] -translate-x-1/2 -translate-y-full -mt-3">
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-2.5 h-2.5 rotate-45 bg-popover border-r border-b border-border" />
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closePopup();
              }}
              className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-[10px]"
            >
              ✕
            </button>
            {/* Content */}
            <p className="font-semibold text-[11px] pr-4 leading-tight">
              {selectedOutlet.name}
            </p>
            {selectedOutlet.address && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {selectedOutlet.address}
              </p>
            )}
            <div className="mt-1 pt-1 border-t border-border">
              <p className="text-[10px] text-muted-foreground">
                Energy:{" "}
                <span className="font-semibold text-foreground">
                  {selectedOutlet.totalEnergy.toLocaleString("id-ID", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  kWh
                </span>
              </p>
            </div>
            {selectedOutlet.devices.length > 0 && (
              <div className="mt-1 pt-1 border-t border-border">
                <p className="text-[10px] font-medium mb-0.5">Devices:</p>
                <ul className="space-y-0 max-h-[60px] overflow-y-auto">
                  {selectedOutlet.devices.map((device) => (
                    <li
                      key={device.id}
                      className="text-[10px] text-muted-foreground flex items-center gap-1"
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          device.online ? "bg-green-500" : "bg-red-500",
                        )}
                      />
                      {device.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Branding */}
      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-[10px] px-2 py-0.5 rounded text-muted-foreground font-medium">
        ProtectQube
      </div>
    </div>
  );
}
