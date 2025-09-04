import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env var is required");
}

export type JwtPayload = {
  sub: string; // user id
  role: string; // 'admin' | 'merchant' | 'customer'
};

/** 15 minutes access token by default */
export async function signAccessToken(
  payload: JwtPayload,
  opts?: jwt.SignOptions
): Promise<string> {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "15m",
    ...(opts ?? {}),
  });
}

/** Verify and return the JwtPayload (throws on invalid) */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
