"use client";

// Reusable centered prompt for "someone wants to connect" and
// "someone wants to start video".
export default function ConnectionPrompt({
  title,
  subtitle,
  eyebrow = "Incoming connection",
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(232,185,62,0.08),transparent_38%)] bg-black/70 p-5 backdrop-blur-md">
      <div className="pulse-glass pulse-card-glow w-full max-w-sm rounded-[1.35rem] border-[var(--space-border)]/70 p-7 text-[var(--space-text)] shadow-[0_28px_90px_rgba(0,0,0,0.6)]">
        <div className="relative z-10">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--space-gold)]">{eyebrow}</p>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          </div>
        </div>
        {subtitle ? (
          <p className="mt-4 text-sm leading-5 text-[var(--space-muted)]">{subtitle}</p>
        ) : (
          <p className="mt-4 text-sm leading-5 text-[var(--space-muted)]">A private peer-to-peer conversation is waiting for you.</p>
        )}
        <div className="relative z-10 mt-6 flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 rounded-full border border-[var(--space-border)] px-4 py-2.5 text-sm font-medium text-[var(--space-nebula-bright)] transition hover:border-[var(--space-nebula)] hover:bg-[var(--space-nebula)]/10"
          >
            {declineLabel}
          </button>
          <button
            onClick={onAccept}
            className="flex-1 rounded-full bg-[var(--space-gold)] px-4 py-2.5 text-sm font-semibold text-[var(--space-void)] transition hover:bg-[#f5d36b]"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
