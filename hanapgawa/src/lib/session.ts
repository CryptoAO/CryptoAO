import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

export const SESSION_COOKIE = "hg_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s === "dev-only-secret-change-me") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set to a strong random value in production");
    }
    return new TextEncoder().encode("dev-only-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  uid: string;
  tv: number; // tokenVersion at issue time — bumping User.tokenVersion revokes it
}

export async function createSessionToken(uid: string, tokenVersion: number): Promise<string> {
  return new SignJWT({ uid, tv: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function setSessionCookie(uid: string, tokenVersion: number) {
  const token = await createSessionToken(uid, tokenVersion);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Returns the logged-in user or null. Rejects revoked tokens and blocked accounts. */
export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const { uid, tv } = payload as unknown as SessionPayload;
    if (!uid) return null;
    const user = await db.user.findUnique({ where: { id: uid } });
    if (!user) return null;
    if (user.tokenVersion !== tv) return null; // session revoked
    if (user.status === "BANNED" || user.status === "SUSPENDED") return null;
    return user;
  } catch {
    return null;
  }
}
