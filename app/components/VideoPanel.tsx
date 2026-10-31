"use client";

import { useEffect, useRef, useState } from "react";

export default function VideoPanel({
  localStream,
  remoteStream,
  onEnd,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEnd: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (localRef.current && localRef.current.srcObject !== localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteRef.current.srcObject !== remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!dragging) return;

    function move(event: PointerEvent) {
      const panel = panelRef.current;
      if (!panel) return;
      const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
      const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
      setPosition({
        left: Math.min(maxLeft, Math.max(8, event.clientX - dragOffset.current.x)),
        top: Math.min(maxTop, Math.max(8, event.clientY - dragOffset.current.y)),
      });
    }

    function stop() {
      setDragging(false);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  }, [dragging]);

  function startDragging(event: React.PointerEvent<HTMLDivElement>) {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setPosition({ left: rect.left, top: rect.top });
    setDragging(true);
  }

  return (
    <div
      ref={panelRef}
      style={!expanded && position ? { left: position.left, top: position.top } : undefined}
      className={`absolute z-30 flex flex-col overflow-hidden border border-white/15 bg-black shadow-2xl ${expanded ? "inset-0 h-full w-full rounded-none" : "bottom-4 right-4 h-[min(70vh,34rem)] w-[min(92vw,28rem)] rounded-[1.35rem] sm:bottom-7 sm:right-7"} ${position && !expanded ? "!bottom-auto !right-auto" : ""}`}
    >
      <div
        onPointerDown={startDragging}
        className="flex cursor-grab touch-none items-center justify-between border-b border-white/10 bg-[var(--space-void)]/90 px-4 py-3 backdrop-blur-xl active:cursor-grabbing"
      >
        <div>
          <p className="text-sm font-semibold text-white">Private video room</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Drag to reposition</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--space-gold)]" />
            Live
          </span>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? "Restore video size" : "Expand video"}
            title={expanded ? "Restore video size" : "Expand video"}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-[var(--space-nebula)] hover:bg-[var(--space-nebula)]/10 hover:text-white"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {expanded ? <path d="M9 3v5a1 1 0 0 1-1 1H3M15 21v-5a1 1 0 0 1 1-1h5M21 9h-5a1 1 0 0 1-1-1V3M3 15h5a1 1 0 0 1 1 1v5" /> : <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />}
            </svg>
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onEnd}
            aria-label="End video"
            title="End video"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-[var(--space-danger)] hover:bg-[var(--space-danger)] hover:text-[var(--space-void)]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {/* Remote (full screen) */}
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="h-full w-full bg-[var(--space-surface)] object-cover"
        />
        {!remoteStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-[var(--space-muted)]">
            Waiting for stranger&rsquo;s video…
          </div>
        )}
        {/* Local (picture-in-picture) */}
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-5 right-5 h-40 w-28 rounded-2xl border border-white/20 bg-[var(--space-raised)] object-cover shadow-2xl"
        />
      </div>
    </div>
  );
}
