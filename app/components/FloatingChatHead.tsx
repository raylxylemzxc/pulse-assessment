"use client";

export default function FloatingChatHead({
  connected,
  unreadCount,
  onOpen,
}: {
  connected: boolean;
  unreadCount: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open chat${unreadCount > 0 ? `, ${unreadCount} unread message${unreadCount === 1 ? "" : "s"}` : ""}`}
      className="pulse-glass fixed bottom-5 right-5 z-20 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[var(--space-text)] transition hover:border-[var(--space-gold)]/50 hover:bg-[var(--space-raised)] sm:bottom-7 sm:right-7"
    >
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--space-nebula)]/15 text-[var(--space-nebula-bright)]">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H12l-3.5 3v-3h-1A2.5 2.5 0 0 1 5 12.5z" />
          <path d="M8.5 8.5h7M8.5 11.5h4" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--space-gold)] px-1.5 text-xs font-bold text-[var(--space-void)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[var(--space-raised)] ${connected ? "bg-[var(--space-gold)]" : "bg-[var(--space-muted)]"}`} />
      </span>
      <span className="hidden min-w-24 sm:block">
        <span className="block text-sm font-semibold">Stranger</span>
        <span className="block text-[10px] uppercase tracking-[0.14em] text-[var(--space-muted)]">
          {connected ? "Connected" : "Connecting"}
        </span>
      </span>
    </button>
  );
}
