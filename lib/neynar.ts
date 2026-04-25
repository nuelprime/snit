import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';

let client: NeynarAPIClient | null = null;

export function getNeynar(): NeynarAPIClient {
  if (!client) {
    client = new NeynarAPIClient(
      new Configuration({ apiKey: process.env.NEYNAR_API_KEY! }),
    );
  }
  return client;
}

export interface FcProfile {
  fid: number;
  username: string;
  pfpUrl: string;
  verifiedAddresses: `0x${string}`[];
  custodyAddress: `0x${string}`;
}

export async function fetchProfile(fid: number): Promise<FcProfile | null> {
  try {
    const { users } = await getNeynar().fetchBulkUsers({ fids: [fid] });
    const u = users[0];
    if (!u) return null;
    return {
      fid: u.fid,
      username: u.username,
      pfpUrl: u.pfp_url ?? '',
      verifiedAddresses: (u.verified_addresses?.eth_addresses ?? []) as `0x${string}`[],
      custodyAddress: u.custody_address as `0x${string}`,
    };
  } catch (err) {
    console.error('[neynar] fetchProfile failed', err);
    return null;
  }
}
