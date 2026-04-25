import { Redis } from '@upstash/redis';
import type { Drop, PublicDrop } from './types';

// Single client used across the app — Upstash KV is fine for our access patterns
export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ─────────────────────────────────────────────
// Key conventions (hierarchical, no whitespace/quotes)
// ─────────────────────────────────────────────
//   drop:{id}                  → Drop (full record)
//   drops:byFid:{fid}          → Set<dropId>
//   drops:active               → Set<dropId> (status === 'live')
//   mints:{dropId}             → counter (incremented on confirmation)
//   mints:{dropId}:byFid       → Hash<fid, count>
// ─────────────────────────────────────────────

const k = {
  drop: (id: string) => `drop:${id}`,
  byFid: (fid: number) => `drops:byFid:${fid}`,
  active: () => 'drops:active',
  mintCount: (dropId: string) => `mints:${dropId}`,
  mintsByFid: (dropId: string) => `mints:${dropId}:byFid`,
};

export async function saveDrop(drop: Drop): Promise<void> {
  const now = Date.now();
  drop.updatedAt = now;
  await redis.set(k.drop(drop.id), JSON.stringify(drop));
  await redis.sadd(k.byFid(drop.creatorFid), drop.id);
  if (drop.status === 'live') {
    await redis.sadd(k.active(), drop.id);
  } else {
    await redis.srem(k.active(), drop.id);
  }
}

export async function getDrop(id: string): Promise<Drop | null> {
  const raw = await redis.get(k.drop(id));
  if (!raw) return null;
  // Upstash auto-parses JSON in newer versions; handle both
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as Drop);
}

export async function getDropsByFid(fid: number): Promise<Drop[]> {
  const ids = (await redis.smembers(k.byFid(fid))) as string[];
  if (ids.length === 0) return [];
  const drops = await Promise.all(ids.map(getDrop));
  return drops
    .filter((d): d is Drop => d !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getActiveDrops(limit = 20): Promise<Drop[]> {
  const ids = (await redis.smembers(k.active())) as string[];
  if (ids.length === 0) return [];
  const drops = await Promise.all(ids.slice(0, limit).map(getDrop));
  return drops.filter((d): d is Drop => d !== null);
}

export async function incrementMintCount(
  dropId: string,
  fid: number,
): Promise<number> {
  const newCount = await redis.incr(k.mintCount(dropId));
  await redis.hincrby(k.mintsByFid(dropId), String(fid), 1);

  // Update the drop record's cached count
  const drop = await getDrop(dropId);
  if (drop) {
    drop.mintCount = newCount;
    await saveDrop(drop);
  }
  return newCount;
}

export async function getMintCount(dropId: string): Promise<number> {
  const count = await redis.get(k.mintCount(dropId));
  return Number(count ?? 0);
}

// Strip private fields for snap/public consumption
export function toPublicDrop(drop: Drop): PublicDrop {
  return {
    id: drop.id,
    title: drop.title,
    description: drop.description,
    mediaUri: drop.mediaUri,
    creatorFid: drop.creatorFid,
    creatorUsername: drop.creatorUsername,
    creatorPfpUrl: drop.creatorPfpUrl,
    mintPrice: drop.mintPrice,
    startTime: drop.startTime,
    endTime: drop.endTime,
    endCondition: drop.endCondition,
    maxSupply: drop.maxSupply,
    contractAddress: drop.contractAddress,
    tokenId: drop.tokenId,
    status: drop.status,
    mintCount: drop.mintCount,
  };
}
