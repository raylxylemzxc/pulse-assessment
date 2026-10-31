export type DescType = "offer" | "answer" | "ice";
export type PeerControl =
  | "video-request"
  | "video-accept"
  | "video-decline"
  | "video-end";

export interface IcebreakerPrompt {
  id: string;
  question: string;
  options: [string, string];
}

export type IcebreakerMessage =
  | { action: "request"; roundId: string; prompt: IcebreakerPrompt }
  | { action: "accept"; roundId: string }
  | { action: "decline"; roundId: string }
  | { action: "choice"; roundId: string; choice: 0 | 1 };

export interface IcebreakerState {
  roundId: string;
  prompt: IcebreakerPrompt;
  status: "requesting" | "incoming" | "active";
  localChoice?: 0 | 1;
  remoteChoice?: 0 | 1;
}

const MAX_CHAT_LENGTH = 4_000;
const MAX_PENDING_CANDIDATES = 100;
const VALID_CONTROLS: PeerControl[] = [
  "video-request",
  "video-accept",
  "video-decline",
  "video-end",
];

interface PeerCallbacks {
  onSignal: (type: DescType, payload: string) => void;
  onChat: (text: string) => void;
  onControl: (ctrl: PeerControl) => void;
  onIcebreaker: (message: IcebreakerMessage) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
  onChannelOpen: () => void;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export class PeerSession {
  private pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private readonly polite: boolean;
  private makingOffer = false;
  private ignoreOffer = false;
  private localStream: MediaStream | null = null;
  private closed = false;
  private readonly cb: PeerCallbacks;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private signalQueue: Promise<void> = Promise.resolve();

  constructor(initiator: boolean, cb: PeerCallbacks) {
    this.cb = cb;
    this.polite = !initiator;
    this.pc = new RTCPeerConnection(ICE_CONFIG);

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.cb.onSignal("ice", JSON.stringify(candidate));
      }
    };

    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.pc.setLocalDescription();
        if (this.pc.localDescription) {
          this.cb.onSignal("offer", JSON.stringify(this.pc.localDescription));
        }
      } catch {
        this.cb.onConnectionState("failed");
      } finally {
        this.makingOffer = false;
      }
    };

    this.pc.ontrack = ({ streams }) => {
      this.cb.onRemoteStream(streams[0] ?? null);
    };

    this.pc.onconnectionstatechange = () => {
      this.cb.onConnectionState(this.pc.connectionState);
    };

    if (initiator) {
      this.dc = this.pc.createDataChannel("chat");
      this.wireDataChannel(this.dc);
    } else {
      this.pc.ondatachannel = (e) => {
        this.dc = e.channel;
        this.wireDataChannel(this.dc);
      };
    }
  }

  private wireDataChannel(dc: RTCDataChannel) {
    dc.onopen = () => this.cb.onChannelOpen();
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (
          msg.t === "chat" &&
          typeof msg.text === "string" &&
          msg.text.length <= MAX_CHAT_LENGTH
        ) {
          this.cb.onChat(msg.text);
        } else if (
          msg.t === "ctrl" &&
          typeof msg.ctrl === "string" &&
          VALID_CONTROLS.includes(msg.ctrl as PeerControl)
        ) {
          this.cb.onControl(msg.ctrl as PeerControl);
        } else if (
          msg.t === "icebreaker" &&
          (msg.action === "request" ||
            msg.action === "accept" ||
            msg.action === "decline" ||
            msg.action === "choice") &&
          typeof msg.roundId === "string"
        ) {
          if (msg.action === "request") {
            const prompt = msg.prompt;
            if (
              prompt &&
              typeof prompt.id === "string" &&
              typeof prompt.question === "string" &&
              Array.isArray(prompt.options) &&
              prompt.options.length === 2 &&
              prompt.options.every((option: unknown) => typeof option === "string")
            ) {
              this.cb.onIcebreaker({
                action: "request",
                roundId: msg.roundId,
                prompt: {
                  id: prompt.id,
                  question: prompt.question,
                  options: [prompt.options[0], prompt.options[1]],
                },
              });
            }
          } else if (msg.action === "accept" || msg.action === "decline") {
            this.cb.onIcebreaker({ action: msg.action, roundId: msg.roundId });
          } else if (msg.choice === 0 || msg.choice === 1) {
            this.cb.onIcebreaker({
              action: "choice",
              roundId: msg.roundId,
              choice: msg.choice,
            });
          }
        }
      } catch {}
    };
  }

  async handleSignal(type: DescType, payload: string) {
    const operation = this.signalQueue.then(() =>
      this.applySignal(type, payload),
    );
    this.signalQueue = operation.catch(() => undefined);
    return operation;
  }

  private async applySignal(type: DescType, payload: string) {
    if (this.closed) return;
    const data = JSON.parse(payload);

    if (type === "ice") {
      if (!this.pc.remoteDescription) {
        if (this.pendingCandidates.length < MAX_PENDING_CANDIDATES) {
          this.pendingCandidates.push(data);
        }
        return;
      }
      try {
        await this.pc.addIceCandidate(data);
      } catch {}
      return;
    }

    const desc = data as RTCSessionDescriptionInit;
    const offerCollision =
      desc.type === "offer" &&
      (this.makingOffer || this.pc.signalingState !== "stable");
    this.ignoreOffer = !this.polite && offerCollision;
    if (this.ignoreOffer) return;

    await this.pc.setRemoteDescription(desc);
    await this.flushPendingCandidates();
    if (desc.type === "offer") {
      await this.pc.setLocalDescription();
      if (this.pc.localDescription) {
        this.cb.onSignal("answer", JSON.stringify(this.pc.localDescription));
      }
    }
  }

  private async flushPendingCandidates() {
    if (this.pendingCandidates.length === 0) return;
    const queued = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of queued) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch {}
    }
  }

  sendChat(text: string) {
    if (text.length <= MAX_CHAT_LENGTH) this.safeSend({ t: "chat", text });
  }

  sendControl(ctrl: PeerControl) {
    this.safeSend({ t: "ctrl", ctrl });
  }

  sendIcebreaker(message: IcebreakerMessage) {
    this.safeSend({ t: "icebreaker", ...message });
  }

  private safeSend(obj: unknown) {
    if (this.dc && this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(obj));
    }
  }

  async startVideo(): Promise<MediaStream> {
    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      for (const track of this.localStream.getTracks()) {
        this.pc.addTrack(track, this.localStream);
      }
    }
    return this.localStream;
  }

  stopVideo() {
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) track.stop();
      for (const sender of this.pc.getSenders()) {
        if (sender.track) {
          try {
            this.pc.removeTrack(sender);
          } catch {}
        }
      }
      this.localStream = null;
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.stopVideo();
    if (this.dc) {
      try {
        this.dc.close();
      } catch {}
    }
    try {
      this.pc.close();
    } catch {}
  }
}
