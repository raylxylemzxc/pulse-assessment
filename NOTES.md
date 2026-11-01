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

  ## Phase 3 — Make it secure

- Added signed, HttpOnly session cookies without adding a new environment
  variable; the existing server-only database URL provides the signing secret.
- Protected join, leave, polling, and signaling routes from session spoofing,
  invalid peers, offline targets, busy-state abuse, and oversized payloads.
- Added browser security headers and validated peer-to-peer chat/control data.

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
- Nearby discovery is hidden while an active conversation is open to keep the
  interface focused.

## Phase 5 — Interaction polish

- Added a centered entry transition: the halo begins zooming when “Enter Pulse”
  is clicked and expands until it disappears into the live experience.
- Kept the halo centered during its beat and zoom animations, with page overflow
  clipped to prevent transition scrollbars.
- Made entry text fade out without translating or scaling, and added reduced-motion
  handling for the transition.
- Refactored connection prompt styling into reusable semantic dialog theme classes
  in `app/globals.css`.
- Removed the decorative icon from the icebreaker action to keep the chat composer
  more focused.

### Current authorization implementation

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

## Audit follow-up

- Phase 1 failures were found by exercising the complete two-browser flow and
  checking the failure paths: stale dots after tab close, dropped chat messages,
  out-of-order ICE candidates, signaling failures, and incomplete teardown.
- Phase 3 priorities were identity and connection authorization first, followed
  by payload validation and browser hardening. Concurrent connection claiming is
  now atomic so two accepts cannot place the same user in active conversations.
- The root layout now uses a system font stack instead of fetching Google Fonts at
  build time, keeping the Next.js production build reproducible offline.
