"use client";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IconPickerItem } from "react-icons-picker";
import {
  RiBusLine,
  RiCupLine,
  RiGobletLine,
  RiHeartPulseLine,
  RiHotelLine,
  RiInformationLine,
  RiLandscapeLine,
  RiParkingBoxLine,
  RiRestaurantLine,
  RiRunLine,
  RiShapesLine,
  RiShoppingBag3Line,
  RiTaxiLine,
  RiUmbrellaLine,
  RiWaterFlashLine,
} from "react-icons/ri";
import type { IconType } from "react-icons";

import type { RoomMapPoint } from "@/utils/mapUtils";
import { MAP_ICON_CLASS } from "@/utils/mapUtils";

const SafeIconPickerItem =
  typeof IconPickerItem === "function" ? IconPickerItem : null;

interface RoomMapCanvasProps {
  points: RoomMapPoint[];
  selectedPointId?: string | null;
  onSelectPoint: (pointId: string) => void;
}

const REMIX_ICON_COMPONENTS: Record<string, IconType> = {
  "ri-hotel-line": RiHotelLine,
  "ri-restaurant-line": RiRestaurantLine,
  "ri-goblet-line": RiGobletLine,
  "ri-umbrella-line": RiUmbrellaLine,
  "ri-water-flash-line": RiWaterFlashLine,
  "ri-heart-pulse-line": RiHeartPulseLine,
  "ri-taxi-line": RiTaxiLine,
  "ri-parking-box-line": RiParkingBoxLine,
  "ri-run-line": RiRunLine,
  "ri-shopping-bag-3-line": RiShoppingBag3Line,
  "ri-information-line": RiInformationLine,
  "ri-landscape-line": RiLandscapeLine,
  "ri-bus-line": RiBusLine,
  "ri-cup-line": RiCupLine,
  "ri-shapes-line": RiShapesLine,
};

const escapeAttribute = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const toSafeMarkerColor = (value?: string) => {
  if (!value) return "#2563eb";

  const normalized = value.trim();

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
    return normalized;
  }

  if (/^rgb(a)?\([\d\s.,%]+\)$/i.test(normalized)) {
    return normalized;
  }

  return "#2563eb";
};

const getMarkerIconHtml = (point: RoomMapPoint) => {
  if (point.customIconImage) {
    return `<img class="infiora-map-marker__image" src="${escapeAttribute(
      point.customIconImage
    )}" alt="" />`;
  }

  if (point.customIconClass) {
    if (SafeIconPickerItem) {
      return renderToStaticMarkup(<SafeIconPickerItem value={point.customIconClass} size={14} />);
    }
  }

  const iconClass =
    (point.icon ? MAP_ICON_CLASS[point.icon] : undefined) ||
    MAP_ICON_CLASS.info;
  const IconComponent =
    (iconClass ? REMIX_ICON_COMPONENTS[iconClass] : undefined) || RiInformationLine;

  return renderToStaticMarkup(<IconComponent />);
};

const createMarkerHtml = (point: RoomMapPoint, selected: boolean) => `
  <div
    class="infiora-map-marker${selected ? " is-selected" : ""}"
    style="--marker-color:${escapeAttribute(toSafeMarkerColor(point.color))}"
  >
    <div class="infiora-map-marker__badge">
      <div class="infiora-map-marker__icon">
        ${getMarkerIconHtml(point)}
      </div>
    </div>
  </div>
`;

const RoomMapCanvas: React.FC<RoomMapCanvasProps> = ({
  points,
  selectedPointId,
  onSelectPoint,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const leafletRef = React.useRef<any>(null);
  const markersLayerRef = React.useRef<any>(null);
  const [mapReady, setMapReady] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    const initMap = async () => {
      if (!containerRef.current || mapRef.current) return;

      const leafletModule = await import("leaflet");
      const L = leafletModule.default;

      if (!active || !containerRef.current) return;

      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      });
      map.attributionControl.setPrefix(false);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
    };

    void initMap();

    return () => {
      active = false;
      if (mapRef.current) {
        mapRef.current.remove();
      }
      mapRef.current = null;
      markersLayerRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const layer = markersLayerRef.current;

    if (!mapReady || !map || !L || !layer) return;

    layer.clearLayers();

    const markerBounds: [number, number][] = [];

    points.forEach((point) => {
      try {
        markerBounds.push([point.lat, point.lng]);

        const marker = L.marker([point.lat, point.lng], {
          icon: L.divIcon({
            className: "",
            html: createMarkerHtml(point, point.markerId === selectedPointId),
            iconSize: [42, 42],
            iconAnchor: [21, 42],
          }),
        });

        marker.on("click", () => onSelectPoint(point.markerId));
        marker.addTo(layer);
      } catch (error) {
        console.error("Failed to render map marker", point, error);
      }
    });

    const selectedPoint = selectedPointId
      ? points.find((point) => point.markerId === selectedPointId)
      : null;

    if (selectedPoint) {
      map.flyTo([selectedPoint.lat, selectedPoint.lng], Math.max(map.getZoom() || 0, 16), {
        animate: true,
        duration: 0.35,
      });
    } else if (markerBounds.length === 1) {
      map.setView(markerBounds[0], 15);
    } else if (markerBounds.length > 1) {
      map.fitBounds(markerBounds, {
        padding: [32, 32],
        maxZoom: 15,
      });
    }

    requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }, [mapReady, onSelectPoint, points, selectedPointId]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
};

export default RoomMapCanvas;
