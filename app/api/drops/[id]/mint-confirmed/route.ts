import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDrop, incrementMintCount, saveDrop } from '@/lib/store';
import { getSessionFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

const ConfirmSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  minterAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = ConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const drop = await getDrop(id);
    if (!drop) {
      return NextResponse.json({ error: 'Drop not found' }, { status: 404 });
    }

    // For trust: get FID from session if present, otherwise 0 (anonymous)
    const session = await getSessionFromRequest(req);
    const fid = session?.fid ?? 0;

    // PRODUCTION TODO: verify the txHash actually mints from drop.contractAddress
    // by fetching the receipt and checking the logs.
    const newCount = await incrementMintCount(id, fid);

    // Check if supply cap reached
    const cap = BigInt(drop.maxSupply || '0');
    if (cap > 0n && BigInt(newCount) >= cap) {
      drop.status = 'ended';
      await saveDrop(drop);
    }

    return NextResponse.json({ ok: true, mintCount: newCount });
  } catch (err) {
    console.error('[mint-confirmed]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
