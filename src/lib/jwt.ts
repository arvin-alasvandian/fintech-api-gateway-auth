import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || "change-me");
const ttlMin = Number(process.env.JWT_ACCESS_TTL_MIN || 15);

export async function signAccessToken(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlMin}m`)
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  return await jwtVerify(token, secret);
}
