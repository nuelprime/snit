import { NextRequest, NextResponse } from 'next/server';
import { getDropsByFid } from '@/lib/store';
import { getSessionFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const drops = await getDropsByFid(session.fid);
  return NextResponse.json({ drops });
}
