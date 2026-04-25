import { getNeynar } from './neynar';

// ─────────────────────────────────────────────
// Auth strategy:
//   - Inside a Farcaster client, use Quick Auth (sdk.quickAuth.getToken())
//     which gives us a JWT signed by Farcaster's key server
//   - Server verifies via Neynar's auth endpoint OR our own JWT verification
//
// For simplicity in v1, we trust the FID from the verified Quick Auth token
// and use the connected wallet address from wagmi as the on-chain identity.
// ─────────────────────────────────────────────

export interface Session {
  fid: number;
  address?: `0x${string}`;
}

// Verify a Quick Auth JWT and return the FID.
// In production, prefer Neynar's verification endpoint or the official
// @farcaster/quick-auth package once stable.
export async function verifyQuickAuthToken(token: string): Promise<number | null> {
  try {
    // Quick Auth tokens are JWTs signed by auth.farcaster.xyz
    // For v1, decode the payload (best-effort) and trust the sub claim.
    // PRODUCTION TODO: full signature verification against the Farcaster key server.
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as { sub?: string; fid?: number; exp?: number };

    if (payload.exp && payload.exp * 1000 < Date.now()) return null;

    const fid = payload.fid ?? (payload.sub ? Number(payload.sub) : NaN);
    if (!Number.isFinite(fid)) return null;
    return fid;
  } catch {
    return null;
  }
}

// Helper for route handlers
export async function getSessionFromRequest(req: Request): Promise<Session | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const fid = await verifyQuickAuthToken(auth.slice(7));
  if (!fid) return null;
  return { fid };
}
