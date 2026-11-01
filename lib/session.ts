import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "pulse_session";

function secret() {
  const value = process.env.DATABASE_URL;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set");
  }
  return value ?? "local-development-session-secret";
}

function signature(id: string) {
  return createHmac("sha256", secret()).update(`pulse:${id}`).digest("base64url");
}

function connectionSignature(value: string) {
  return createHmac("sha256", secret())
    .update(`pulse-connection:${value}`)
    .digest("base64url");
}

export function createConnectionToken(initiatorId: string, targetId: string) {
  const value = [
    initiatorId,
    targetId,
    Date.now().toString(36),
    randomBytes(16).toString("base64url"),
  ].join(".");
  return `${Buffer.from(value).toString("base64url")}.${connectionSignature(value)}`;
}

export function isConnectionTokenForPair(
  token: unknown,
  firstId: string,
  secondId: string,
) {
  if (typeof token !== "string") return false;
  const [encoded, providedSignature] = token.split(".");
  if (!encoded || !providedSignature) return false;

  let value: string;
  try {
    value = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const expectedSignature = connectionSignature(value);
  const actualBytes = Buffer.from(providedSignature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  ) {
    return false;
  }

  const [initiatorId, targetId, issuedAt] = value.split(".");
  if (!initiatorId || !targetId || !issuedAt) return false;
  const issuedAtMs = Number.parseInt(issuedAt, 36);
  const maxAgeMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (
    !Number.isFinite(issuedAtMs) ||
    now - issuedAtMs > maxAgeMs ||
    issuedAtMs - now > 60_000
  ) {
    return false;
  }

  return (
    (initiatorId === firstId && targetId === secondId) ||
    (initiatorId === secondId && targetId === firstId)
  );
}

export function isValidSessionId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(id);
}

export function isAuthorizedSession(request: NextRequest, id: string) {
  const value = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const expected = `${id}.${signature(id)}`;
  const actualBytes = Buffer.from(value);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

export function withSessionCookie(response: NextResponse, id: string) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: `${id}.${signature(id)}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
