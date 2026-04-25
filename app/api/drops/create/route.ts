import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { saveDrop } from '@/lib/store';
import { fetchProfile } from '@/lib/neynar';
import { getSessionFromRequest } from '@/lib/auth';
import type { Drop } from '@/lib/types';

export const runtime = 'nodejs';

const CreateDropSchema = z.object({
  title: z.string().min(1).max(64),
  description: z.string().max(500).optional(),
  mediaUri: z.string().url(),
  mintPriceWei: z.string().regex(/^\d+$/),
  startTime: z.number().int().positive(),
  endTime: z.number().int().positive(),
  duration: z.enum(['24h', '3d', '7d', 'custom']),
  endCondition: z.enum(['time_only', 'supply_only', 'time_or_supply']),
  maxSupply: z.string().regex(/^\d+$/),
  creatorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export async function POST(req: NextRequest) {
  try {
    // For v1, auth is best-effort: if session exists use it, else we accept the
    // creatorAddress from the body (the on-chain tx ultimately enforces ownership)
    const session = await getSessionFromRequest(req);

    const body = await req.json();
    const parsed = CreateDropSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Lookup FC profile (fallback: minimal record if no session)
    const fid = session?.fid ?? 0;
    const profile = fid ? await fetchProfile(fid) : null;

    const dropId = nanoid(12);
    const now = Date.now();

    const drop: Drop = {
      id: dropId,
      creatorFid: fid,
      creatorAddress: data.creatorAddress as `0x${string}`,
      creatorUsername: profile?.username,
      creatorPfpUrl: profile?.pfpUrl,
      title: data.title,
      description: data.description,
      mediaUri: data.mediaUri,
      mintPrice: data.mintPriceWei,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      endCondition: data.endCondition,
      maxSupply: data.maxSupply,
      status: 'deploying',
      mintCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await saveDrop(drop);

    return NextResponse.json({ dropId, drop });
  } catch (err) {
    console.error('[drops/create]', err);
    return NextResponse.json({ error: 'Failed to create drop' }, { status: 500 });
  }
}
