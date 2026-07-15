// @ts-nocheck
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Supplier {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: string;
  coords: { lat: number; lng: number };
  services: string[];
}

interface OSMMapProps {
  center: { lat: number; lng: number };
  siteCoords: { lat: number; lng: number };
  siteName: string;
  postcode: string;
  suppliers: Supplier[];
  selectedSupplierId: string | null;
  onSelectSupplier: (id: string | null) => void;
}

export const OSMMap: React.FC<OSMMapProps> = ({
  center,
  siteCoords,
  siteName,
  postcode,
  suppliers,
  selectedSupplierId,
  onSelectSupplier,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  // Helper to create glowing ping icons
  const createCustomMarkerIcon = (color: string, pulsingClass: string) => {
    return L.divIcon({
      html: `
        <div class="${pulsingClass}" style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
          <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background-color: ${color}; border: 2px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.5);"></div>
        </div>
      `,
      className: "",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -10],
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing map instance
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Create the map instance
    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    mapRef.current = map;

    // CartoDB Dark Matter tile layer matches our premium charcoal theme perfectly
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    const markers: { [key: string]: L.Marker } = {};

    // Site Marker
    const siteIcon = createCustomMarkerIcon("#E11D48", "pulsing-marker-red");
    const siteMarker = L.marker([siteCoords.lat, siteCoords.lng], { icon: siteIcon }).addTo(map);

    const sitePopupContent = `
      <div style="padding: 4px; font-family: inherit;">
        <h4 style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #ffffff;">${siteName}</h4>
        <p style="margin: 0; font-size: 8.5px; color: #888888;">Active Job Site Location</p>
      </div>
    `;
    siteMarker.bindPopup(sitePopupContent);
    markers["site"] = siteMarker;

    // Suppliers Markers
    suppliers.forEach((s) => {
      const supplierIcon = createCustomMarkerIcon("#5C7285", "pulsing-marker-accent");
      const supplierMarker = L.marker([s.coords.lat, s.coords.lng], { icon: supplierIcon }).addTo(
        map,
      );

      const supplierPopupContent = `
        <div style="padding: 4px; font-family: inherit; max-width: 180px;">
          <h4 style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #ffffff;">${s.name}</h4>
          <p style="margin: 0 0 2px 0; font-size: 9.5px; color: #5C7285; font-weight: 800;">${s.distance} from site</p>
          <p style="margin: 0 0 6px 0; font-size: 8.5px; color: #aaaaaa; line-height: 1.3;">${s.address}</p>
          <p style="margin: 0; font-size: 8.5px; color: #E11D48; font-weight: 800;">📞 ${s.phone}</p>
        </div>
      `;
      supplierMarker.bindPopup(supplierPopupContent);

      supplierMarker.on("click", () => {
        onSelectSupplier(s.id);
      });

      markers[s.id] = supplierMarker;
    });

    markersRef.current = markers;

    // Clean up map instance on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [siteCoords.lat, siteCoords.lng, siteName, postcode, suppliers, onSelectSupplier]);

  // Track selection changes and set view smoothly
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedSupplierId) {
      const marker = markersRef.current[selectedSupplierId];
      if (marker) {
        mapRef.current.setView(marker.getLatLng(), 14, { animate: true });
        marker.openPopup();
      }
    } else {
      mapRef.current.setView([center.lat, center.lng], 13, { animate: true });
    }
  }, [selectedSupplierId, center.lat, center.lng]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full rounded-b-xl"
      style={{ minHeight: "280px", zIndex: 1 }}
    />
  );
};
