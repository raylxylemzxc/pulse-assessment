"use client";

import { useState } from "react";

export default function EntryGate({
  onReady,
}: {
  onReady: (lat: number, lng: number) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [error, setError] = useState<string>("");

  function enter() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void Promise.resolve(onReady(pos.coords.latitude, pos.coords.longitude)).catch(
          () => {
            setStatus("error");
            setError("Couldn't join Pulse. Please try again.");
          },
        );
      },
      (err) => {
        setStatus("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is required to place you on the map."
            : "Couldn't get your location. Please try again.",
        );
      },
      // High accuracy + maximumAge:0 forces a fresh fix (Wi-Fi/GPS scan)
      // instead of reusing the browser's cached IP-based location.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden bg-[var(--space-void)] p-6 text-[var(--space-text)]">
      <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full pulse-orbit" />
      <div className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--space-nebula)]/10" />
      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--space-gold)]">Anonymous connections</p>
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-[-0.06em]">Pulse</h1>
        <p className="mt-2 max-w-sm text-[var(--space-muted)]">
          A living globe of anonymous strangers. Drop onto the map and connect.
        </p>
      </div>

      <button
        onClick={enter}
        disabled={status === "locating"}
        className="mt-8 flex items-center gap-3 rounded-full bg-[var(--space-gold)] px-7 py-3.5 font-semibold text-[var(--space-void)] shadow-[0_8px_30px_rgba(232,185,62,0.2)] transition hover:bg-[#f5d36b] hover:shadow-[0_10px_38px_rgba(232,185,62,0.3)] disabled:opacity-60"
      >
        {status === "locating" ? "Locating…" : "Enter Pulse"}
      </button>

      {status === "error" && (
        <p className="mt-5 max-w-sm rounded-xl border border-[var(--space-danger)]/30 bg-[var(--space-danger)]/10 px-4 py-3 text-center text-sm text-[var(--space-danger)]">{error}</p>
      )}

      <p className="mt-10 max-w-sm text-center text-xs leading-5 text-[var(--space-muted)]">
        No sign-up. Your dot is placed 1–3&nbsp;km from your real location.
        Nothing is stored — closing the tab ends everything.
      </p>
      </div>
    </div>
  );
}
