"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapboxMap, Marker, NavigationControl } from "mapbox-gl";
import type { PeerDot } from "@/lib/types";
import Starfield from "./Starfield";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "pk.eyJ1IjoicHVsc2UtbWFwIiwiYSI6ImNrMDBkZW1vMDAwMDAwMDAifQ.AAAAAAAAAAAAAAAAAAAAAA";

function dotColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const colors = ["#e8b93e", "#aab8c8", "#d8e3ee"];
  return colors[Math.abs(hash) % colors.length];
}

function improveMapLabelContrast(map: MapboxMap) {
  const styles = getComputedStyle(document.documentElement);
  const labelColor =
    styles.getPropertyValue("--space-text").trim() || "#f4f0df";
  const haloColor =
    styles.getPropertyValue("--space-void").trim() || "#050608";
  const labelLayers = [
    "country-label",
    "state-label",
    "settlement-subdivision-label",
    "settlement-major-label",
    "settlement-minor-label",
    "water-line-label",
    "water-point-label",
    "natural-line-label",
    "natural-point-label",
  ];

  for (const layerId of labelLayers) {
    if (!map.getLayer(layerId)) continue;
    map.setPaintProperty(layerId, "text-color", labelColor);
    map.setPaintProperty(layerId, "text-halo-color", haloColor);
    map.setPaintProperty(layerId, "text-halo-width", 1.1);
    map.setPaintProperty(layerId, "text-halo-blur", 0.2);
  }
}

export default function WorldMap({
  peers,
  me,
  onPeerClick,
  canConnect,
  chatOpen,
}: {
  peers: PeerDot[];
  me: { lat: number; lng: number } | null;
  onPeerClick: (id: string) => void;
  canConnect: boolean;
  chatOpen: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const navigationControlRef = useRef<NavigationControl | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const meMarkerRef = useRef<Marker | null>(null);
  const rotationTimerRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1.4);

  // Marker click handlers are bound once, so read the live click handler +
  // connectability through refs (synced in an effect, never during render).
  const onPeerClickRef = useRef(onPeerClick);
  const canConnectRef = useRef(canConnect);
  useEffect(() => {
    onPeerClickRef.current = onPeerClick;
    canConnectRef.current = canConnect;
  });

  // Initialise the map once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    let cancelled = false;
    const markers = markersRef.current;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        // Open centered on the user if we know where they are, else world view.
        center: me ? [me.lng, me.lat] : [0, 20],
        zoom: me ? 4 : 1.4,
        attributionControl: false,
      });
      const navigationControl = new mapboxgl.NavigationControl({ showCompass: true });
      navigationControlRef.current = navigationControl;
      map.addControl(navigationControl, "bottom-right");
      map.on("zoom", () => setZoom(map.getZoom()));
      map.on("load", () => {
        if (!cancelled) {
          improveMapLabelContrast(map);
          setZoom(map.getZoom());
          setReady(true);
          if (map.getZoom() <= 2.2) startRotation(map);
        }
      });
      map.on("dragstart", () => stopRotation());
      map.on("zoomstart", () => stopRotation());
      map.on("zoomend", () => {
        if (map.getZoom() <= 2.2) startRotation(map);
      });
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      markers.forEach((m) => m.remove());
      markers.clear();
      meMarkerRef.current?.remove();
      meMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      navigationControlRef.current = null;
      stopRotation();
      setReady(false);
    };
    // `me` is only read for the initial center; we don't want to re-init on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const navigationControl = navigationControlRef.current;
    if (!map || !navigationControl || !ready) return;

    map.removeControl(navigationControl);
    map.addControl(navigationControl, chatOpen ? "top-left" : "bottom-right");
  }, [chatOpen, ready]);

  function stopRotation() {
    if (rotationTimerRef.current !== null) {
      window.clearInterval(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
  }

  function startRotation(map: MapboxMap) {
    if (rotationTimerRef.current !== null || map.getZoom() > 2.2) return;
    rotationTimerRef.current = window.setInterval(() => {
      if (map.getZoom() <= 2.2 && !map.isMoving()) {
        map.rotateTo(map.getBearing() + 0.08, { duration: 0 });
      }
    }, 80);
  }

  // Show / move the user's own "you are here" pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !me) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      if (!meMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "pulse-me";
        el.title = "You are here";
        el.innerHTML = `<span class="pulse-me-label">Me</span><span class="pulse-me-pin" aria-hidden="true"></span>`;
        // anchor "bottom" → the pin's tip sits on the exact coordinate.
        meMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([me.lng, me.lat])
          .addTo(map);
      } else {
        meMarkerRef.current.setLngLat([me.lng, me.lat]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me, ready]);

  // Reconcile markers whenever the peer list changes (or the map becomes ready).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      const markers = markersRef.current;
      const seen = new Set<string>();

      for (const peer of peers) {
        seen.add(peer.id);
        let marker = markers.get(peer.id);
        if (!marker) {
          const el = document.createElement("button");
          el.className = "pulse-dot";
          el.style.background = dotColor(peer.id);
          el.setAttribute("aria-label", peer.busy ? "Stranger is busy" : "Connect to stranger");
          el.title = peer.busy ? "Stranger is busy" : "Tap to connect";
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (canConnectRef.current) {
              map.flyTo({
                center: [peer.lng, peer.lat],
                zoom: Math.max(map.getZoom(), 3.5),
                duration: 900,
                essential: true,
              });
              onPeerClickRef.current(peer.id);
            }
          });
          marker = new mapboxgl.Marker({ element: el })
            .setLngLat([peer.lng, peer.lat])
            .addTo(map);
          markers.set(peer.id, marker);
        }
        const element = marker.getElement();
        element.setAttribute(
          "aria-label",
          peer.busy ? "Stranger is busy" : "Connect to stranger",
        );
        element.setAttribute("title", peer.busy ? "Stranger is busy" : "Tap to connect");
        marker.getElement().style.opacity = peer.busy ? "0.35" : "1";
        marker.getElement().classList.toggle("pulse-dot-busy", peer.busy);
      }

      // Drop markers for peers that went offline / got filtered out.
      for (const [id, marker] of markers) {
        if (!seen.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [peers, ready]);

  return (
    <div className="pulse-map-shell absolute inset-0">
      <div
        ref={containerRef}
        className="h-full w-full bg-[var(--space-surface)]"
        role="region"
        aria-label="Interactive world map showing nearby Pulse users"
      />
      <Starfield zoom={zoom} />

      <button
        type="button"
        onClick={() => {
          const map = mapRef.current;
          if (!map) return;
          stopRotation();
          map.flyTo({
            center: me ? [me.lng, me.lat] : [0, 20],
            zoom: me ? 4 : 1.4,
            bearing: 0,
            pitch: 0,
            duration: 1100,
            essential: true,
          });
        }}
        aria-label="Recenter globe"
        title="Recenter globe"
        className="absolute bottom-16 left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--space-border)] bg-[var(--space-surface)]/90 text-[var(--space-text)] shadow-lg backdrop-blur transition hover:border-[var(--space-gold)] hover:bg-[var(--space-gold)]/10 hover:text-[var(--space-gold)] sm:left-5"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="7" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {!TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-md rounded-lg border border-[var(--space-border)] bg-[var(--space-raised)] p-4 text-sm text-[var(--space-text)]">
            Set{" "}
            <code className="text-[var(--space-gold)]">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
            <code>.env</code> to load the map.
          </p>
        </div>
      )}

    </div>
  );
}
