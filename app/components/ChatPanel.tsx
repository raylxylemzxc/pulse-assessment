"use client";

import { useEffect, useRef, useState } from "react";
import type { IcebreakerState } from "@/lib/webrtc";

export interface ChatMessage {
  id: number;
  mine: boolean;
  text: string;
}

export default function ChatPanel({
  messages,
  connected,
  videoBusy,
  onSend,
  onStartVideo,
  icebreaker,
  icebreakerUsed,
  onStartIcebreaker,
  onAcceptIcebreaker,
  onDeclineIcebreaker,
  onChooseIcebreaker,
  onEnd,
  onClose,
}: {
  messages: ChatMessage[];
  connected: boolean;
  videoBusy: boolean;
  onSend: (text: string) => void;
  onStartVideo: () => void;
  icebreaker: IcebreakerState | null;
  icebreakerUsed: boolean;
  onStartIcebreaker: () => void;
  onAcceptIcebreaker: () => void;
  onDeclineIcebreaker: () => void;
  onChooseIcebreaker: (choice: 0 | 1) => void;
  onEnd: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !connected) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="pulse-chat-panel pulse-floating-panel absolute bottom-3 right-3 top-3 z-20 flex w-[calc(100%-1.5rem)] max-w-md flex-col text-[var(--space-text)] sm:bottom-5 sm:right-5 sm:top-5">
      <header className="pulse-chat-header flex items-center justify-between border-b border-[var(--space-border)]/70 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-[var(--space-gold)]" : "bg-[var(--space-muted)]"}`} />
          <div>
            <p className="font-semibold tracking-tight">Stranger</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--space-muted)]">
            {connected ? "Connected" : "Connecting…"}
          </p>
        </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            aria-label="Minimize chat"
            title="Minimize chat"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--space-border)] text-[var(--space-muted)] transition hover:border-[var(--space-nebula)] hover:bg-[var(--space-nebula)]/10 hover:text-[var(--space-text)]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 12h12" />
            </svg>
          </button>
          <button
            onClick={onStartVideo}
            disabled={!connected || videoBusy}
            aria-label="Start video call"
            title="Start video call"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--space-border)] text-[var(--space-nebula-bright)] transition hover:border-[var(--space-nebula)] hover:bg-[var(--space-nebula)]/10 disabled:opacity-40"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="6" width="13" height="12" rx="2" />
              <path d="m16 10 5-3v10l-5-3z" />
            </svg>
          </button>
          <button
            onClick={onEnd}
            aria-label="End connection"
            title="End connection"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--space-danger)] text-[var(--space-void)] transition hover:bg-[#e88b81]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </div>
      </header>

      <div className="pulse-chat-body flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_80%_10%,rgba(232,185,62,0.07),transparent_30%)] p-5">
        {messages.length === 0 && (
          <div className="pulse-chat-empty mx-auto mt-16 max-w-[18rem] text-center">
            <p className="relative z-10 text-sm font-semibold text-[var(--space-text)]">A quiet space for two</p>
            <p className="mt-2 text-xs leading-5 text-[var(--space-muted)]">Say hello. Messages are peer-to-peer and never stored.</p>
            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--space-nebula)]/70">
              <span className="h-px w-6 bg-[var(--space-border)]" />
              Private channel
              <span className="h-px w-6 bg-[var(--space-border)]" />
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                m.mine
                  ? "bg-[var(--space-gold)] text-[var(--space-void)] shadow-[0_5px_18px_rgba(232,185,62,0.12)]"
                  : "border border-[var(--space-border)]/70 bg-[var(--space-raised)] text-[var(--space-text)]"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="pulse-chat-compose flex flex-col gap-2 border-t border-[var(--space-border)]/70 p-4">
        {!icebreaker ? (icebreakerUsed ? null : (
          <button
            type="button"
            onClick={onStartIcebreaker}
            disabled={!connected}
            className="group flex items-center gap-3 rounded-2xl border border-[var(--space-gold)]/25 bg-[var(--space-gold)]/5 px-3 py-2.5 text-left transition hover:border-[var(--space-gold)]/60 hover:bg-[var(--space-gold)]/10 disabled:opacity-50"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-[var(--space-text)]">Break the ice</span>
              <span className="block text-[10px] text-[var(--space-muted)]">Answer a quick question together</span>
            </span>
            <span className="text-xs text-[var(--space-gold)] transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        )) : icebreaker.status === "requesting" ? (
          <div className="rounded-2xl border border-[var(--space-gold)]/25 bg-[var(--space-gold)]/5 px-3 py-2.5">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--space-gold)]">Pulse invite sent</span>
            <span className="mt-1 block text-xs text-[var(--space-muted)]">Waiting for the stranger to opt in…</span>
          </div>
        ) : icebreaker.status === "incoming" ? (
          <div className="rounded-2xl border border-[var(--space-gold)]/35 bg-[var(--space-gold)]/5 p-3">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--space-gold)]">Pulse invitation</span>
            <p className="mt-1 text-sm font-medium text-[var(--space-text)]">The stranger wants to answer a quick question together.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={onAcceptIcebreaker} className="flex-1 rounded-xl bg-[var(--space-gold)] px-3 py-2 text-xs font-semibold text-[var(--space-void)] transition hover:bg-[#f5d36b]">Accept</button>
              <button type="button" onClick={onDeclineIcebreaker} className="flex-1 rounded-xl border border-[var(--space-border)] px-3 py-2 text-xs text-[var(--space-muted)] transition hover:border-[var(--space-nebula)] hover:text-[var(--space-text)]">Not now</button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--space-gold)]/35 bg-[linear-gradient(135deg,rgba(232,185,62,0.12),rgba(91,70,140,0.12))] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--space-gold)]">Pulse question</span>
              {icebreaker.localChoice !== undefined && icebreaker.remoteChoice === undefined && (
                <span className="text-[10px] text-[var(--space-muted)]">Waiting for them…</span>
              )}
            </div>
            <p className="text-sm font-medium text-[var(--space-text)]">{icebreaker.prompt.question}</p>
            {icebreaker.localChoice === undefined ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {icebreaker.prompt.options.map((option, index) => (
                  <button
                    type="button"
                    key={option}
                    onClick={() => onChooseIcebreaker(index as 0 | 1)}
                    className="rounded-xl border border-[var(--space-border)] bg-[var(--space-void)]/50 px-2 py-2 text-xs text-[var(--space-text)] transition hover:border-[var(--space-gold)] hover:bg-[var(--space-gold)]/10"
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : icebreaker.remoteChoice === undefined ? (
              <p className="mt-3 rounded-xl bg-[var(--space-void)]/35 px-3 py-2 text-xs text-[var(--space-muted)]">
                You chose <span className="font-semibold text-[var(--space-text)]">{icebreaker.prompt.options[icebreaker.localChoice]}</span>
              </p>
            ) : (
              <div className="mt-3 rounded-xl bg-[var(--space-void)]/35 px-3 py-2 text-xs text-[var(--space-muted)]">
                {icebreaker.localChoice === icebreaker.remoteChoice ? (
                  <>You both chose <span className="font-semibold text-[var(--space-gold)]">{icebreaker.prompt.options[icebreaker.localChoice]}</span> ✨</>
                ) : (
                  <>You chose <span className="font-semibold text-[var(--space-text)]">{icebreaker.prompt.options[icebreaker.localChoice]}</span>; they chose <span className="font-semibold text-[var(--space-text)]">{icebreaker.prompt.options[icebreaker.remoteChoice]}</span>.</>
                )}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          className="flex-1 rounded-2xl border border-[var(--space-border)]/70 bg-[var(--space-void)] px-4 py-2.5 text-sm outline-none transition placeholder:text-[var(--space-muted)] focus:border-[var(--space-gold)] focus:ring-1 focus:ring-[var(--space-gold)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--space-gold)] text-lg font-semibold text-[var(--space-void)] transition hover:bg-[#f5d36b] disabled:opacity-40"
        >
          ↑
        </button>
        </div>
        <p className="px-1 text-[10px] text-[var(--space-muted)]/70">Messages are encrypted between this device and the stranger.</p>
      </form>
    </div>
  );
}
