import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDrop, saveDrop } from '@/lib/store';

export const runtime = 'nodejs';

const ConfirmSchema = z.object({
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenId: z.string().regex(/^\d+$/),
  splitsAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  deployTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
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

    drop.contractAddress = parsed.data.contractAddress as `0x${string}`;
    drop.tokenId = parsed.data.tokenId;
    drop.splitsAddress = parsed.data.splitsAddress as `0x${string}`;
    drop.deployTxHash = parsed.data.deployTxHash as `0x${string}`;

    // Determine status based on time
    const now = Math.floor(Date.now() / 1000);
    drop.status = now < drop.startTime ? 'upcoming' : 'live';

    await saveDrop(drop);

    return NextResponse.json({ ok: true, drop });
  } catch (err) {
    console.error('[drops/confirm]', err);
    return NextResponse.json({ error: 'Failed to confirm' }, { status: 500 });
  }
}
