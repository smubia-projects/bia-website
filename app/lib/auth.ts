import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD env var is not set");
  return secret;
}

export function createSessionToken(): string {
  const timestamp = Date.now().toString();
  const hmac = createHmac("sha256", getSecret())
    .update(timestamp)
    .digest("hex");
  return `${timestamp}.${hmac}`;
}

export function verifySessionToken(token: string): boolean {
  try {
    const [timestamp, hmac] = token.split(".");
    if (!timestamp || !hmac) return false;

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > SESSION_MAX_AGE || age < 0) return false;

    const expected = createHmac("sha256", getSecret())
      .update(timestamp)
      .digest("hex");
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function isAuthenticated(): boolean {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export function setSessionCookie(): void {
  const token = createSessionToken();
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE / 1000,
    path: "/",
  });
}

export function clearSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}
