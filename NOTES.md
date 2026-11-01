# Pulse Technical Assessment Notes

## Phase 1 — Make it run

- Fixed stale presence heartbeats, chat message delivery, ICE candidate ordering,
  signaling failures, and connection cleanup so two browser users can reliably
  connect, chat, and start video over STUN-only WebRTC.

## Phase 2 — Make it good

- Reworked the interface around a dark, space-inspired visual direction with
  gold accents, clearer hierarchy, and responsive layouts.
- Added a starfield background and a more polished globe experience with
  matching controls, location markers, and a recenter action.
- Refined the connection and entry states while preserving the existing
  peer-to-peer behavior.
- Added a centered entry transition with a zooming halo, clean text fade,
  reduced-motion handling, and overflow clipping to prevent transition
  scrollbars.
- Refactored connection prompt styling into reusable semantic dialog theme
  classes in `app/globals.css`.

## Phase 3 — Make it secure

- Added signed, HttpOnly session cookies without adding a new environment
  variable; the existing server-only database URL provides the signing secret.
- Protected join, leave, polling, and signaling routes from session spoofing,
  invalid peers, offline targets, busy-state abuse, and oversized payloads.
- Added browser security headers and validated peer-to-peer chat/control data.
- Each joined browser receives a signed, HttpOnly session cookie. Join, leave,
  polling, and signaling requests must prove ownership of the supplied session
  ID.
- A connection request receives a short-lived, signed token tied to both
  participating session IDs. Accept/decline, SDP, ICE, and end signals must
  present that token for the same peer relationship.
- The client only processes WebRTC signaling messages matching its active
  connection token, preventing unrelated or stale signals from being applied.
- Tokens expire after 24 hours and reject future-dated timestamps.
- Tokens are stored beside signal payloads in the existing signal record
  envelope; no database schema, migration, or initialization changes were made.

## Phase 4 — Make it better

- Added nearby people discovery, showing the nearest available users on the
  globe before a conversation starts.
- Added a persistent conversation experience: closing the chat panel does not
  end the conversation, and a floating chat head provides access to it again.
- Added unread-message indication when the chat panel is closed.
- Added explicit end-conversation confirmation so a conversation is not ended
  accidentally.
- Added a draggable, minimized peer-to-peer video panel with close and
  fullscreen controls.
- With more time, I would improve connection safety and intent handling by:
  - detecting simultaneous reciprocal requests and promoting them into one
    accepted connection instead of declining both;
  - adding a short, server-enforced cooldown after a conversation ends so the
    same two active sessions cannot immediately reconnect. The cooldown would
    be pair-specific, expire automatically, and avoid permanent connection
    history.