import { ImageResponse } from 'next/og';
import { getDrop } from '@/lib/store';
import { formatEther } from 'viem';
import { PROTOCOL_FEE_WEI } from '@/lib/types';

export const runtime = 'nodejs';
export const revalidate = 30; // cache for 30s

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const drop = await getDrop(id);
  if (!drop) {
    return new Response('not found', { status: 404 });
  }

  const totalCostWei = BigInt(drop.mintPrice) + BigInt(PROTOCOL_FEE_WEI);
  const totalCostEth = formatEther(totalCostWei);

  const now = Math.floor(Date.now() / 1000);
  const isUpcoming = now < drop.startTime;
  const isEnded = drop.status === 'ended' || now > drop.endTime;
  const stateLabel = isUpcoming
    ? 'upcoming'
    : isEnded
      ? 'closed'
      : 'live';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          color: '#f5f5f5',
          fontFamily: 'monospace',
          padding: 64,
        }}
      >
        {/* Left: artwork */}
        <div
          style={{
            width: 472,
            height: 472,
            background: '#141414',
            borderRadius: 16,
            overflow: 'hidden',
            display: 'flex',
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={drop.mediaUri}
            alt={drop.title}
            width={472}
            height={472}
            style={{ objectFit: 'cover' }}
          />
        </div>

        {/* Right: details */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            paddingLeft: 56,
            flex: 1,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 18,
                color: '#737373',
                textTransform: 'uppercase',
                letterSpacing: 2,
                marginBottom: 16,
                display: 'flex',
              }}
            >
              snit · {stateLabel}
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1.1,
                marginBottom: 24,
                display: 'flex',
              }}
            >
              {drop.title.length > 40 ? drop.title.slice(0, 40) + '…' : drop.title}
            </div>
            {drop.creatorUsername && (
              <div
                style={{
                  fontSize: 24,
                  color: '#a3a3a3',
                  display: 'flex',
                }}
              >
                @{drop.creatorUsername}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 32 }}>
              <Stat label="price" value={`${totalCostEth} ETH`} />
              <Stat label="minted" value={String(drop.mintCount)} />
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 600 },
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          fontSize: 14,
          color: '#737373',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          display: 'flex',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          marginTop: 4,
          display: 'flex',
        }}
      >
        {value}
      </div>
    </div>
  );
}
