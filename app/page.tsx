"use client";

import { useEffect, useRef, useState } from "react";
import EntryGate from "./components/EntryGate";
import WorldMap from "./components/WorldMap";
import ConnectionPrompt from "./components/ConnectionPrompt";
import ChatPanel, { type ChatMessage } from "./components/ChatPanel";
import VideoPanel from "./components/VideoPanel";
import FloatingChatHead from "./components/FloatingChatHead";
import NearbyList from "./components/NearbyList";
import { join, leave, poll, sendSignal } from "@/lib/api";
import {
  PeerSession,
  type DescType,
  type IcebreakerMessage,
  type IcebreakerPrompt,
  type IcebreakerState,
  type PeerControl,
} from "@/lib/webrtc";
import { POLL_INTERVAL_MS } from "@/lib/presence";
import { type PeerDot, type SignalMsg } from "@/lib/types";

type Conn =
  | { kind: "idle" }
  | { kind: "requesting"; peerId: string; connectionToken?: string }
  | { kind: "incoming"; peerId: string; connectionToken: string }
  | { kind: "connecting"; peerId: string; connectionToken: string }
  | { kind: "connected"; peerId: string; connectionToken: string };

type VideoState = "none" | "requesting" | "incoming" | "active";
const ICEBREAKER_PROMPTS: IcebreakerPrompt[] = [
  { id: "morning-night", question: "Which would you choose?", options: ["Early morning", "Late night"] },
  { id: "city-nature", question: "Where would you rather spend a free day?", options: ["A lively city", "Somewhere quiet"] },
  { id: "sweet-savory", question: "What is the better comfort food?", options: ["Something sweet", "Something savory"] },
  { id: "plan-spontaneous", question: "What sounds more like you?", options: ["A thoughtful plan", "A spontaneous adventure"] },
];

const REQUEST_TIMEOUT_MS = 30_000;

export default function Home() {
  const [phase, setPhase] = useState<"gate" | "live">("gate");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [peers, setPeers] = useState<PeerDot[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const chatOpenRef = useRef(true);
  const [chatUnread, setChatUnread] = useState(0);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [icebreaker, setIcebreaker] = useState<IcebreakerState | null>(null);
  const [icebreakerUsed, setIcebreakerUsed] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);

  const [conn, _setConn] = useState<Conn>({ kind: "idle" });
  const connRef = useRef<Conn>(conn);
  const setConn = (c: Conn) => {
    connRef.current = c;
    _setConn(c);
  };

  const [video, _setVideo] = useState<VideoState>("none");
  const videoRef = useRef<VideoState>(video);
  const setVideo = (v: VideoState) => {
    videoRef.current = v;
    _setVideo(v);
  };

  const peerRef = useRef<PeerSession | null>(null);
  const msgId = useRef(0);
  const requestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!icebreaker) return;
    const completed =
      icebreaker.localChoice !== undefined && icebreaker.remoteChoice !== undefined;
    const shouldExpire =
      completed || icebreaker.status === "requesting" || icebreaker.status === "incoming";
    if (!shouldExpire) return;
    const timer = window.setTimeout(() => setIcebreaker(null), 10_000);
    return () => window.clearTimeout(timer);
  }, [icebreaker]);

  function showNotice(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 3500);
  }

  function addMessage(mine: boolean, text: string) {
    setMessages((prev) => [...prev, { id: msgId.current++, mine, text }]);
    if (!mine && !chatOpenRef.current) setChatUnread((count) => count + 1);
  }

  function openChat() {
    chatOpenRef.current = true;
    setChatOpen(true);
    setChatUnread(0);
  }

  function closeChat() {
    chatOpenRef.current = false;
    setChatOpen(false);
  }

  function teardown(message?: string) {
    if (requestTimer.current) clearTimeout(requestTimer.current);
    if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
    disconnectTimer.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setVideo("none");
    setMessages([]);
    setIcebreaker(null);
    setIcebreakerUsed(false);
    setConn({ kind: "idle" });
    if (message) showNotice(message);
  }

  function handleIcebreaker(message: IcebreakerMessage) {
    setIcebreaker((current) => {
      if (message.action === "request") {
        if (icebreakerUsed) return current;
        setIcebreakerUsed(true);
        return current ?? { roundId: message.roundId, prompt: message.prompt, status: "incoming" };
      }
      if (!current || current.roundId !== message.roundId) return current;
      if (message.action === "accept") {
        return { ...current, status: "active" };
      }
      if (message.action === "decline") return null;
      if (current.status !== "active") return current;
      return { ...current, remoteChoice: message.choice };
    });
  }

  function startIcebreaker() {
    if (!peerRef.current || connRef.current.kind !== "connected" || icebreaker || icebreakerUsed) return;
    const prompt = ICEBREAKER_PROMPTS[Math.floor(Math.random() * ICEBREAKER_PROMPTS.length)];
    const roundId = crypto.randomUUID();
    setIcebreakerUsed(true);
    setIcebreaker({ roundId, prompt, status: "requesting" });
    peerRef.current.sendIcebreaker({ action: "request", roundId, prompt });
  }

  function acceptIcebreaker() {
    const current = icebreaker;
    if (!current || current.status !== "incoming" || !peerRef.current) return;
    setIcebreaker({ ...current, status: "active" });
    peerRef.current.sendIcebreaker({ action: "accept", roundId: current.roundId });
  }

  function declineIcebreaker() {
    const current = icebreaker;
    if (!current || current.status !== "incoming" || !peerRef.current) return;
    peerRef.current.sendIcebreaker({ action: "decline", roundId: current.roundId });
    setIcebreaker(null);
  }

  function chooseIcebreaker(choice: 0 | 1) {
    const current = icebreaker;
    if (!current || current.status !== "active" || current.localChoice !== undefined || !peerRef.current) return;
    setIcebreaker({ ...current, localChoice: choice });
    peerRef.current.sendIcebreaker({ action: "choice", roundId: current.roundId, choice });
  }

  function startPeer(peerId: string, initiator: boolean, connectionToken: string) {
    const ps = new PeerSession(initiator, {
      onSignal: (type: DescType, payload: string) => {
        void sendSignal(sessionId, peerId, type, payload, connectionToken).catch(() => {
          teardown("Connection signaling failed.");
        });
      },
      onChat: (text) => addMessage(false, text),
      onControl: (ctrl) => handleControl(ctrl),
      onIcebreaker: (message) => handleIcebreaker(message),
      onRemoteStream: (stream) => setRemoteStream(stream),
      onConnectionState: (state) => {
        if (state === "connected") {
          if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
          disconnectTimer.current = null;
          return;
        }
        if (state === "disconnected") {
          if (!disconnectTimer.current) {
            disconnectTimer.current = setTimeout(() => {
              disconnectTimer.current = null;
              const current = connRef.current;
              if (current.kind === "connecting" || current.kind === "connected") {
                void sendSignal(
                  sessionId,
                  current.peerId,
                  "end",
                  undefined,
                  current.connectionToken,
                );
                teardown("Connection lost (network).");
              }
            }, 10_000);
          }
          return;
        }
        if (state === "failed") {
          const current = connRef.current;
          if (current.kind === "connecting" || current.kind === "connected") {
            void sendSignal(
              sessionId,
              current.peerId,
              "end",
              undefined,
              current.connectionToken,
            );
          }
          teardown("Connection failed (network).");
        }
      },
      onChannelOpen: () => {
        setConn({ kind: "connected", peerId, connectionToken });
      },
    });
    peerRef.current = ps;
  }

  function handleControl(ctrl: PeerControl) {
    const ps = peerRef.current;
    switch (ctrl) {
      case "video-request":
        if (videoRef.current === "none") setVideo("incoming");
        break;
      case "video-accept":
        if (videoRef.current === "requesting" && ps) {
          ps.startVideo()
            .then((stream) => {
              setLocalStream(stream);
              setVideo("active");
            })
            .catch(() => {
              setVideo("none");
              ps.sendControl("video-end");
              showNotice("Camera unavailable.");
            });
        }
        break;
      case "video-decline":
        if (videoRef.current === "requesting") {
          setVideo("none");
          showNotice("Video declined.");
        }
        break;
      case "video-end":
        ps?.stopVideo();
        setLocalStream(null);
        setRemoteStream(null);
        setVideo("none");
        break;
    }
  }

  function requestConnection(peerId: string) {
    if (connRef.current.kind !== "idle") return;
    openChat();
    setConn({ kind: "requesting", peerId });
    void sendSignal(sessionId, peerId, "request")
      .then((connectionToken) => {
        const current = connRef.current;
        if (
          current.kind !== "requesting" ||
          current.peerId !== peerId ||
          !connectionToken
        ) {
          if (connectionToken) {
            void sendSignal(sessionId, peerId, "end", undefined, connectionToken);
          }
          return;
        }
        setConn({ ...current, connectionToken });
      })
      .catch(() => {
        if (
          connRef.current.kind === "requesting" &&
          connRef.current.peerId === peerId
        ) {
          teardown("Could not send connection request.");
        }
      });
    requestTimer.current = setTimeout(() => {
      if (
        connRef.current.kind === "requesting" &&
        connRef.current.peerId === peerId
      ) {
        if (connRef.current.connectionToken) {
          void sendSignal(
            sessionId,
            peerId,
            "end",
            undefined,
            connRef.current.connectionToken,
          );
        }
        teardown("No answer.");
      }
    }, REQUEST_TIMEOUT_MS);
  }

  function cancelRequest() {
    if (connRef.current.kind === "requesting") {
      if (connRef.current.connectionToken) {
        void sendSignal(
          sessionId,
          connRef.current.peerId,
          "end",
          undefined,
          connRef.current.connectionToken,
        );
      }
    }
    teardown();
  }

  function acceptIncoming() {
    if (connRef.current.kind !== "incoming") return;
    const { peerId, connectionToken } = connRef.current;
    openChat();
    startPeer(peerId, false, connectionToken);
    void sendSignal(sessionId, peerId, "accept", undefined, connectionToken).catch(() => {
      teardown("Could not accept connection.");
    });
    setConn({ kind: "connecting", peerId, connectionToken });
  }

  function declineIncoming() {
    if (connRef.current.kind !== "incoming") return;
    void sendSignal(
      sessionId,
      connRef.current.peerId,
      "decline",
      undefined,
      connRef.current.connectionToken,
    );
    setConn({ kind: "idle" });
  }

  function endConnection() {
    const c = connRef.current;
    if (c.kind === "connecting" || c.kind === "connected") {
      void sendSignal(sessionId, c.peerId, "end", undefined, c.connectionToken);
    }
    teardown();
  }

  function requestEndConnection() {
    setConfirmingEnd(true);
  }

  function cancelEndConnection() {
    setConfirmingEnd(false);
  }

  function confirmEndConnection() {
    setConfirmingEnd(false);
    endConnection();
  }

  function startVideoRequest() {
    if (videoRef.current !== "none" || !peerRef.current) return;
    setVideo("requesting");
    peerRef.current.sendControl("video-request");
  }

  function acceptVideo() {
    const ps = peerRef.current;
    if (!ps) return;
    ps.startVideo()
      .then((stream) => {
        setLocalStream(stream);
        ps.sendControl("video-accept");
        setVideo("active");
      })
      .catch(() => {
        ps.sendControl("video-decline");
        setVideo("none");
        showNotice("Camera unavailable.");
      });
  }

  function declineVideo() {
    peerRef.current?.sendControl("video-decline");
    setVideo("none");
  }

  function endVideo() {
    const ps = peerRef.current;
    ps?.stopVideo();
    ps?.sendControl("video-end");
    setLocalStream(null);
    setRemoteStream(null);
    setVideo("none");
  }

  function processSignal(sig: SignalMsg) {
    switch (sig.type) {
      case "request": {
        if (connRef.current.kind === "idle" && sig.connectionToken) {
          setConn({
            kind: "incoming",
            peerId: sig.fromId,
            connectionToken: sig.connectionToken,
          });
        } else {
          if (sig.connectionToken) {
            void sendSignal(
              sessionId,
              sig.fromId,
              "decline",
              undefined,
              sig.connectionToken,
            );
          }
        }
        break;
      }
      case "accept": {
        const c = connRef.current;
        if (
          c.kind === "requesting" &&
          c.peerId === sig.fromId &&
          (!c.connectionToken || c.connectionToken === sig.connectionToken)
        ) {
          if (requestTimer.current) clearTimeout(requestTimer.current);
          if (!sig.connectionToken) break;
          startPeer(sig.fromId, true, sig.connectionToken);
          openChat();
          setConn({
            kind: "connecting",
            peerId: sig.fromId,
            connectionToken: sig.connectionToken,
          });
        }
        break;
      }
      case "decline": {
        const c = connRef.current;
        if (
          c.kind === "requesting" &&
          c.peerId === sig.fromId &&
          (!c.connectionToken || c.connectionToken === sig.connectionToken)
        ) {
          if (requestTimer.current) clearTimeout(requestTimer.current);
          teardown("Request declined.");
        }
        break;
      }
      case "offer":
      case "answer":
      case "ice": {
        const c = connRef.current;
        const peerId =
          c.kind === "connecting" || c.kind === "connected" ? c.peerId : null;
        if (
          peerRef.current &&
          peerId === sig.fromId &&
          c.kind !== "idle" &&
          c.kind !== "requesting" &&
          c.connectionToken === sig.connectionToken
        ) {
          void peerRef.current
            .handleSignal(sig.type as DescType, sig.payload ?? "")
            .catch(() => teardown("Connection signaling failed."));
        }
        break;
      }
      case "end": {
        const c = connRef.current;
        if (
          (c.kind === "incoming" ||
            c.kind === "connecting" ||
            c.kind === "connected") &&
          c.peerId === sig.fromId &&
          c.connectionToken === sig.connectionToken
        ) {
          if (c.kind === "incoming") setConn({ kind: "idle" });
          else teardown("Stranger disconnected.");
        }
        break;
      }
    }
  }

  const processSignalRef = useRef(processSignal);
  useEffect(() => {
    processSignalRef.current = processSignal;
  });

  useEffect(() => {
    if (phase !== "live" || !sessionId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const data = await poll(sessionId);
        if (!active) return;
        setPeers(data.peers);
        for (const s of data.signals) processSignalRef.current(s);
      } catch {
        const location = locationRef.current;
        if (active && location) {
          try {
            await join(sessionId, location.lat, location.lng);
          } catch {}
        }
      }
      if (active) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [phase, sessionId]);

  useEffect(() => {
    if (!sessionId || phase !== "live") return;
    const onLeave = () => leave(sessionId);
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [sessionId, phase]);

  async function handleReady(lat: number, lng: number) {
    locationRef.current = { lat, lng };
    setMyLocation({ lat, lng });
    await join(sessionId, lat, lng);
    setPhase("live");
  }

  if (phase === "gate") {
    return <EntryGate onReady={handleReady} />;
  }

  const inChat = conn.kind === "connecting" || conn.kind === "connected";

  return (
    <main className="fixed inset-0 overflow-hidden">
      <WorldMap
        peers={peers}
        me={myLocation}
        onPeerClick={requestConnection}
        canConnect={conn.kind === "idle"}
        chatOpen={inChat}
      />

      <div className="pulse-glass absolute bottom-5 left-5 z-10 rounded-full px-3.5 py-2 text-xs text-[var(--space-muted)] shadow-lg">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        <span className="text-[var(--space-text)]">{peers.length + 1}</span>{" "}
        online
      </div>

      {!inChat && (
        <NearbyList
          peers={peers}
          me={myLocation}
          canConnect={conn.kind === "idle"}
          onPeerClick={requestConnection}
        />
      )}

      {notice && (
        <div className="pulse-glass absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-sm text-[var(--space-text)]">
          {notice}
        </div>
      )}

      {conn.kind === "requesting" && (
        <div className="pulse-glass absolute left-1/2 top-5 z-30 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--space-gold)] opacity-50" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--space-gold)]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--space-gold)]">Connection request</p>
            <p className="truncate text-sm text-[var(--space-text)]">Requesting connection…</p>
          </div>
          <button
            onClick={cancelRequest}
            className="shrink-0 rounded-xl border border-[var(--space-border)] px-3 py-1.5 text-xs font-medium text-[var(--space-nebula-bright)] transition hover:border-[var(--space-nebula)] hover:bg-[var(--space-nebula)]/10"
          >
            Cancel
          </button>
        </div>
      )}

      {conn.kind === "incoming" && (
        <ConnectionPrompt
          title="A stranger wants to connect"
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
        />
      )}

      {inChat && !chatOpen && (
        <FloatingChatHead
          connected={conn.kind === "connected"}
          unreadCount={chatUnread}
          onOpen={openChat}
        />
      )}

      {inChat && chatOpen && (
        <ChatPanel
          messages={messages}
          connected={conn.kind === "connected"}
          videoBusy={video !== "none"}
          onSend={(text) => {
            peerRef.current?.sendChat(text);
            addMessage(true, text);
          }}
          onStartVideo={startVideoRequest}
          icebreaker={icebreaker}
          icebreakerUsed={icebreakerUsed}
          onStartIcebreaker={startIcebreaker}
          onAcceptIcebreaker={acceptIcebreaker}
          onDeclineIcebreaker={declineIcebreaker}
          onChooseIcebreaker={chooseIcebreaker}
          onEnd={requestEndConnection}
          onClose={closeChat}
        />
      )}

      {confirmingEnd && (
        <ConnectionPrompt
          eyebrow="End conversation"
          title="Leave this conversation?"
          subtitle="Your messages and connection will end for both of you."
          acceptLabel="End conversation"
          declineLabel="Keep chatting"
          onAccept={confirmEndConnection}
          onDecline={cancelEndConnection}
        />
      )}

      {video === "requesting" && (
        <div className="pulse-glass absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-sm text-[var(--space-text)]">
          Waiting for stranger to accept video…
        </div>
      )}

      {video === "incoming" && (
        <ConnectionPrompt
          title="Start video call?"
          subtitle="The stranger wants to turn on video."
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptVideo}
          onDecline={declineVideo}
        />
      )}

      {video === "active" && (
        <VideoPanel
          localStream={localStream}
          remoteStream={remoteStream}
          onEnd={endVideo}
        />
      )}
    </main>
  );
}
