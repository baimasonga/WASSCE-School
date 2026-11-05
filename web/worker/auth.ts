import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export type User = { id: string; email: string };

const remoteKeys = new Map<string, JWTVerifyGetKey>();
/** Supabase signs access tokens with asymmetric keys published at this JWKS URL (cached per isolate). */
export function supabaseKeys(supabaseUrl: string): JWTVerifyGetKey {
  let keys = remoteKeys.get(supabaseUrl);
  if (!keys) { keys = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)); remoteKeys.set(supabaseUrl, keys); }
  return keys;
}

/** Returns the signed-in user for a `Bearer <access token>` header, or null if absent or invalid. */
export async function verifyUser(header: string | undefined, supabaseUrl: string, getKey: JWTVerifyGetKey): Promise<User | null> {
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey, { issuer: `${supabaseUrl}/auth/v1`, audience: "authenticated" });
    if (payload.role !== "authenticated" || typeof payload.sub !== "string" || typeof payload.email !== "string" || !payload.email) return null;
    return { id: payload.sub, email: payload.email.toLowerCase() };
  } catch {
    return null;
  }
}

export const adminList = (emails: string | undefined) =>
  new Set((emails ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean));
