"use client";

import { useMemo } from "react";
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
    <section className="pulse-glass absolute left-4 top-4 z-10 w-[min(19rem,calc(100%-2rem))] rounded-2xl p-3 text-[var(--space-text)] sm:left-5 sm:top-5">
      <div className="flex items-center justify-between px-2 pb-2">
        <div>
          <p className="text-sm font-semibold">Nearby</p>
        </div>
      </div>

      {nearby.length === 0 ? (
        <p className="rounded-xl border border-[var(--space-border)]/60 bg-[var(--space-void)]/40 px-3 py-4 text-center text-xs text-[var(--space-muted)]">
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
              className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition hover:border-[var(--space-border)] hover:bg-[var(--space-nebula)]/10 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--space-nebula)]/15 text-xs font-semibold text-[var(--space-nebula-bright)]">
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
    </section>
  );
}
