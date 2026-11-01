"use client";

type ConnectionPromptProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
};

const DEFAULT_SUBTITLE = "A private peer-to-peer conversation is waiting for you.";

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
}: ConnectionPromptProps) {
  const message = subtitle ?? DEFAULT_SUBTITLE;

  return (
    <div className="pulse-dialog__backdrop" role="presentation">
      <div className="pulse-glass pulse-card-glow pulse-dialog__card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="pulse-dialog__content">
          <p className="pulse-dialog__eyebrow">{eyebrow}</p>
          <h2 className="pulse-dialog__title">{title}</h2>
        </div>
        <p className="pulse-dialog__message">{message}</p>
        <div className="pulse-dialog__actions">
          <button
            onClick={onDecline}
            className="pulse-dialog__button pulse-dialog__button--secondary"
          >
            {declineLabel}
          </button>
          <button
            onClick={onAccept}
            className="pulse-dialog__button pulse-dialog__button--primary"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
