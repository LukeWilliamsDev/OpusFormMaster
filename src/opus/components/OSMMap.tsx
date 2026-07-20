// @ts-nocheck
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Phone, Globe, Navigation } from "lucide-react";
import { usePortal } from "../context/PortalContext";

interface Supplier {
  id: string;
  name: string;
  address: string;
  phone: string;
  website?: string;
  businessType?: string;
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
  const { theme } = usePortal();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const routeLineRef = useRef<L.Polyline | null>(null);
  // Read inside the marker click handler without adding selectedSupplierId
  // to that effect's deps — doing so would rebuild every marker (and its
  // click closures) on every selection change instead of just on marker sync.
  const selectedIdRef = useRef(selectedSupplierId);
  selectedIdRef.current = selectedSupplierId;

  // Guard against NaN, missing, or out-of-range lat/lng values before handing them to Leaflet
  const isValidCoord = (coords?: { lat: number; lng: number } | null): boolean => {
    if (!coords) return false;
    const { lat, lng } = coords;
    return (
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  };

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

  // Initialize the map + tile layer + site marker ONCE per site/theme —
  // deliberately excludes `suppliers` so a supplier-list refresh (a new
  // array reference on every fetch, even with identical data) doesn't tear
  // down and rebuild the whole map. That full rebuild was the cause of the
  // attribution control visibly flickering, and risked clearing markersRef
  // out from under an in-progress marker click/selection.
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!isValidCoord(center) || !isValidCoord(siteCoords)) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    routeLineRef.current = null;
    markersRef.current = {};

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    mapRef.current = map;

    // CartoDB Dark Matter / Positron match the app's dark/light theme
    L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/${theme === "light" ? "light_all" : "dark_all"}/{z}/{x}/{y}{r}.png`,
      {
        maxZoom: 20,
        // Required by OSM/CARTO's free tile usage terms — kept, but the
        // redundant "Leaflet |" prefix is dropped and styling below shrinks
        // it to a quiet corner credit instead of a full-width banner.
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    ).addTo(map);
    map.attributionControl.setPrefix(false);

    const siteIcon = createCustomMarkerIcon("#E11D48", "pulsing-marker-red");
    const siteMarker = L.marker([siteCoords.lat, siteCoords.lng], { icon: siteIcon }).addTo(map);
    siteMarker.bindPopup(`
      <div style="padding: 4px; font-family: inherit;">
        <h4 style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--card-foreground);">${siteName}</h4>
        <p style="margin: 0; font-size: 8.5px; color: var(--muted-foreground);">Active Job Site Location</p>
      </div>
    `);
    markersRef.current = { site: siteMarker };

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [siteCoords.lat, siteCoords.lng, siteName, theme]);

  // Sync supplier markers whenever the list changes, without touching the
  // map/tile layer/attribution control set up above.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.keys(markersRef.current).forEach((key) => {
      if (key !== "site") {
        markersRef.current[key].remove();
        delete markersRef.current[key];
      }
    });

    suppliers.forEach((s) => {
      if (!isValidCoord(s.coords)) return;
      const supplierIcon = createCustomMarkerIcon("var(--primary)", "pulsing-marker-accent");
      // riseOnHover: when supplier pins overlap at this zoom level (common —
      // several suppliers often cluster within a few hundred metres of each
      // other), hovering brings the intended one to the top before you click,
      // instead of always silently hitting whichever pin was drawn last.
      const supplierMarker = L.marker([s.coords.lat, s.coords.lng], {
        icon: supplierIcon,
        riseOnHover: true,
      }).addTo(map);

      // Details render in a fixed overlay card below (driven by React state)
      // instead of a Leaflet popup, which floated at an uncontrolled position
      // and printed the literal string "null" when phone was missing.
      supplierMarker.on("click", () => {
        onSelectSupplier(selectedIdRef.current === s.id ? null : s.id);
      });

      markersRef.current[s.id] = supplierMarker;
    });

    // Fit the view to the site + every supplier instead of a fixed zoom, so
    // nothing sits off-screen — but only when nothing is currently selected,
    // so this doesn't yank the view away from an active directions/route.
    if (!selectedSupplierId) {
      const allMarkers = Object.values(markersRef.current);
      if (allMarkers.length > 1) {
        map.fitBounds(L.featureGroup(allMarkers).getBounds(), { padding: [40, 40], maxZoom: 14 });
      }
    }
    // Also re-run whenever the map-init effect rebuilds the map (site or
    // theme change) — that effect resets markersRef to just the site marker,
    // so without these deps here too, supplier pins would vanish on a theme
    // toggle until the suppliers array itself happened to change again.
  }, [suppliers, onSelectSupplier, siteCoords.lat, siteCoords.lng, theme]);

  // Track selection changes: draw a route line to the selected supplier and
  // zoom out to fit both points so the direction/distance is visible, rather
  // than zooming in tight on just the supplier marker.
  useEffect(() => {
    if (!mapRef.current) return;

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (selectedSupplierId) {
      const marker = markersRef.current[selectedSupplierId];
      if (marker && isValidCoord(siteCoords)) {
        const supplierLatLng = marker.getLatLng();
        routeLineRef.current = L.polyline(
          [
            [siteCoords.lat, siteCoords.lng],
            [supplierLatLng.lat, supplierLatLng.lng],
          ],
          { color: "var(--primary)", weight: 2, dashArray: "6, 8", opacity: 0.8 },
        ).addTo(mapRef.current);

        // Extra bottom padding so neither pin sits behind the details card
        // overlaid at the bottom of the map.
        mapRef.current.fitBounds(
          L.latLngBounds([siteCoords.lat, siteCoords.lng], supplierLatLng),
          { paddingTopLeft: [40, 40], paddingBottomRight: [40, 130], maxZoom: 12 },
        );
      }
    } else if (isValidCoord(center)) {
      mapRef.current.setView([center.lat, center.lng], 13, { animate: true });
    }
  }, [selectedSupplierId, center.lat, center.lng, siteCoords.lat, siteCoords.lng]);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-b-xl"
        style={{ minHeight: "420px", zIndex: 1 }}
      />
      {selectedSupplier && (
        <div className="absolute bottom-3 left-3 right-3 z-[400] bg-card border border-border rounded-lg p-3 shadow-lg">
          <div className="flex justify-between items-start gap-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-foreground truncate">
              {selectedSupplier.name}
            </h4>
            <span className="text-[10px] font-bold text-primary whitespace-nowrap shrink-0">
              {selectedSupplier.distance} from site
            </span>
          </div>
          {selectedSupplier.businessType && (
            <p className="text-[9px] text-primary font-bold uppercase tracking-wider mt-1">
              {selectedSupplier.businessType}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
            {selectedSupplier.address}
          </p>
          {/* Full-height tap targets (not inline text links) — call/website/
              directions are the actions staff need mid-task on a tablet/
              phone, so they get real button sizing and share the row evenly
              whichever of the three actually exist for this supplier. */}
          <div className="flex gap-2 mt-2">
            {selectedSupplier.phone && (
              <a
                href={`tel:${selectedSupplier.phone.replace(/\s+/g, "")}`}
                className="flex-1 flex items-center justify-center gap-1 min-h-[30px] rounded-md bg-destructive/15 border border-destructive/30 text-destructive font-bold text-xs active:scale-95 transition-transform"
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </a>
            )}
            {selectedSupplier.website && (
              <a
                href={selectedSupplier.website}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1 min-h-[30px] rounded-md bg-muted border border-border text-muted-foreground font-bold text-xs active:scale-95 transition-transform"
              >
                <Globe className="w-3.5 h-3.5" /> Website
              </a>
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedSupplier.coords.lat},${selectedSupplier.coords.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1 min-h-[30px] rounded-md bg-primary/15 border border-primary/30 text-primary font-bold text-xs active:scale-95 transition-transform"
            >
              <Navigation className="w-3.5 h-3.5" /> Directions
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
