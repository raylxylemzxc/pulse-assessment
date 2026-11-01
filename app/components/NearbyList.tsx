"use client";

import { useMemo, useState } from "react";
import type { PeerDot } from "@/lib/types";

function distanceKm(from: { lat: number; lng: number }, to: PeerDot) {
  const earthRadiusKm = 6371;
  const latDelta = ((to.lat - from.lat) * Math.PI) / 180;
  const lngDelta = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.sin(lngDelta / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distance: number) {
  if (distance < 1) return "<1 km";
  if (distance < 10) return `${distance.toFixed(1)} km`;
  return `${Math.round(distance)} km`;
}

export default function NearbyList({
  peers,
  me,
  canConnect,
  onPeerClick,
}: {
  peers: PeerDot[];
  me: { lat: number; lng: number } | null;
  canConnect: boolean;
  onPeerClick: (id: string) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const nearby = useMemo(
    () =>
      me
        ? peers
            .map((peer) => ({ peer, distance: distanceKm(me, peer) }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5)
        : [],
    [me, peers],
  );

  if (!me) return null;

  return (
    <section
      aria-label="Nearby people"
      className={`pulse-glass absolute left-3 top-3 z-10 max-h-[42vh] max-w-none overflow-y-auto text-[var(--space-text)] ${mobileOpen ? "w-[calc(100%-1.5rem)] rounded-2xl p-2" : "h-10 w-10 rounded-full p-0"} sm:left-5 sm:right-auto sm:top-5 sm:h-auto sm:w-[min(19rem,calc(100%-2rem))] sm:max-w-[19rem] sm:rounded-2xl sm:p-3`}
    >
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-expanded={false}
        aria-controls="nearby-list"
        aria-label="Expand nearby people"
        title="Expand nearby people"
        className={`${mobileOpen ? "hidden" : "flex"} h-full w-full items-center justify-center rounded-full text-[var(--space-text)] transition hover:bg-[var(--space-nebula)]/10 sm:hidden`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M15.5 14.5a4.5 4.5 0 0 1 5 4.5" />
        </svg>
      </button>

      <div className={`${mobileOpen ? "flex" : "hidden"} items-center justify-between px-1.5 pb-1.5 sm:flex sm:px-2 sm:pb-2`}>
        <p className="text-sm font-semibold">Nearby</p>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-expanded={mobileOpen}
          aria-controls="nearby-list"
          aria-label="Minimize nearby people"
          title="Minimize nearby people"
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--space-text)] transition hover:bg-[var(--space-nebula)]/10 sm:hidden"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>

      <div id="nearby-list" className={`${mobileOpen ? "block" : "hidden"} sm:block`}>
        {nearby.length === 0 ? (
          <p className="rounded-xl border border-[var(--space-border)]/60 bg-[var(--space-void)]/40 px-2.5 py-3 text-center text-xs text-[var(--space-muted)] sm:px-3 sm:py-4">
            No strangers nearby yet.
          </p>
        ) : (
          <div className="space-y-1">
            {nearby.map(({ peer, distance }, index) => (
              <button
                type="button"
                key={peer.id}
                disabled={!canConnect || peer.busy}
                onClick={() => onPeerClick(peer.id)}
                className="group flex w-full items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 text-left transition hover:border-[var(--space-border)] hover:bg-[var(--space-nebula)]/10 disabled:cursor-not-allowed disabled:opacity-55 sm:gap-3 sm:px-2.5 sm:py-2"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--space-nebula)]/15 text-xs font-semibold text-[var(--space-nebula-bright)] sm:h-8 sm:w-8">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-[var(--space-text)]">
                    Stranger {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="block text-[10px] text-[var(--space-muted)]">
                    {peer.busy ? "Currently connected" : "Available to connect"}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] text-[var(--space-nebula)]">
                  {formatDistance(distance)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
