import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SignalType } from "@/lib/types";
import {
  createConnectionToken,
  isAuthorizedSession,
  isConnectionTokenForPair,
  isValidSessionId,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: SignalType[] = [
  "request",
  "accept",
  "decline",
  "offer",
  "answer",
  "ice",
  "end",
];

const MAX_PAYLOAD = 64 * 1024; // SDP/ICE are small; cap to be safe.

// POST /api/signal — body { fromId, toId, type, payload? }
// Drops one message into the recipient's mailbox. Also manages the `busy`
// flag so a user can only be in one connection at a time.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { fromId, toId, type, payload, connectionToken } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (!isValidSessionId(fromId) || !isValidSessionId(toId) || fromId === toId) {
    return Response.json({ error: "invalid ids" }, { status: 400 });
  }
  if (!isAuthorizedSession(request, fromId)) {
    return Response.json({ error: "unauthorized session" }, { status: 401 });
  }
  if (typeof type !== "string" || !VALID_TYPES.includes(type as SignalType)) {
    return Response.json({ error: "invalid type" }, { status: 400 });
  }
  if (
    payload !== undefined &&
    payload !== null &&
    (typeof payload !== "string" || payload.length > MAX_PAYLOAD)
  ) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const signalType = type as SignalType;
  const payloadStr = typeof payload === "string" ? payload : null;

  const target = await prisma.presence.findUnique({
    where: { id: toId },
    select: { busy: true },
  });
  const sender = await prisma.presence.findUnique({
    where: { id: fromId },
    select: { busy: true },
  });
  if (!sender) {
    return Response.json({ error: "sender is offline" }, { status: 410 });
  }
  if (!target) {
    return Response.json({ error: "target is offline" }, { status: 404 });
  }

  let token = typeof connectionToken === "string" ? connectionToken : null;
  if (signalType === "request") {
    token = createConnectionToken(fromId, toId);
  } else if (!token || !isConnectionTokenForPair(token, fromId, toId)) {
    return Response.json({ error: "unauthorized connection" }, { status: 403 });
  }

  if (signalType === "request" && sender.busy) {
    return Response.json({ error: "sender is already busy" }, { status: 409 });
  }
  if (
    (signalType === "offer" || signalType === "answer" || signalType === "ice") &&
    (!sender.busy || !target.busy)
  ) {
    return Response.json({ error: "no active connection" }, { status: 409 });
  }

  // Enforce "one active connection at a time": if the target is already busy,
  // auto-decline the request instead of delivering it.
  if (signalType === "request") {
    if (target.busy) {
      await sendDecline(toId, fromId, token);
      return Response.json({ ok: true, autoDeclined: true, connectionToken: token });
    }
  }

  // Busy transitions:
  // - accept: the connection is now active → mark BOTH peers busy.
  // - end: free both peers.
  if (signalType === "accept") {
    await prisma.presence.updateMany({
      where: { id: { in: [fromId, toId] } },
      data: { busy: true },
    });
  } else if (signalType === "end") {
    await prisma.presence.updateMany({
      where: { id: { in: [fromId, toId] } },
      data: { busy: false },
    });
  }

  await prisma.signal.create({
    data: {
      fromId,
      toId,
      type: signalType,
      payload: JSON.stringify({ token, payload: payloadStr }),
    },
  });

  return Response.json({ ok: true, connectionToken: token });
}

// Helper: deliver an auto-decline from `target` back to `initiator`.
async function sendDecline(
  targetId: string,
  initiatorId: string,
  connectionToken: string,
) {
  await prisma.signal.create({
    data: {
      fromId: targetId,
      toId: initiatorId,
      type: "decline",
      payload: JSON.stringify({ token: connectionToken, payload: null }),
    },
  });
}
