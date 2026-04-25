import { NextRequest, NextResponse } from 'next/server';
import { getDrop } from '@/lib/store';
import { formatEther } from 'viem';
import { PROTOCOL_FEE_WEI } from '@/lib/types';

export const runtime = 'nodejs';

// ─────────────────────────────────────────────
// Snap protocol response
// Spec: https://docs.farcaster.xyz/snap
//
// We respond to BOTH GET (initial render in feed) and POST (button press).
// For our use case: there's only one button (Mint) and it always opens the
// miniapp via the open_mini_app action — so GET and POST behave identically.
// ─────────────────────────────────────────────

const SNAP_VERSION = '2.0';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleSnap(await params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleSnap(await params);
}

async function handleSnap({ id }: { id: string }) {
  const drop = await getDrop(id);
  if (!drop) {
    return snapResponse({
      version: SNAP_VERSION,
      theme: { accent: 'red' },
      ui: {
        root: 'main',
        elements: {
          main: {
            type: 'container',
            children: ['title', 'msg'],
          },
          title: {
            type: 'text',
            props: { text: 'snit', weight: 'bold' },
          },
          msg: {
            type: 'text',
            props: { text: 'drop not found', size: 'sm' },
          },
        },
      },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'https://snit.lol';
  const mintUrl = `${baseUrl}/mint/${id}`;
  const totalCostWei = BigInt(drop.mintPrice) + BigInt(PROTOCOL_FEE_WEI);
  const totalCostEth = formatEther(totalCostWei);

  const now = Math.floor(Date.now() / 1000);
  const isUpcoming = now < drop.startTime;
  const isEnded = drop.status === 'ended' || now > drop.endTime;

  // Time-to-target, rounded for evergreen-ness (anti-staleness from skill notes)
  const target = isUpcoming ? drop.startTime : drop.endTime;
  const remaining = Math.max(0, target - now);
  const timeLabel = (() => {
    if (remaining === 0) return 'ended';
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    if (days >= 1) return `${days}d`;
    if (hours >= 1) return `${hours}h`;
    return '<1h';
  })();

  const stateLabel = isUpcoming
    ? `opens in ${timeLabel}`
    : isEnded
      ? 'mint closed'
      : `${timeLabel} left`;

  // ── Build snap UI ──
  // States: upcoming / live / ended — different button variants/text
  const buttonElements = isEnded
    ? {
        cta: {
          type: 'button',
          props: { label: 'view drop', variant: 'secondary' },
          on: {
            press: {
              action: 'open_mini_app',
              params: { url: mintUrl, name: 'snit' },
            },
          },
        },
      }
    : isUpcoming
      ? {
          cta: {
            type: 'button',
            props: { label: 'preview', variant: 'secondary' },
            on: {
              press: {
                action: 'open_mini_app',
                params: { url: mintUrl, name: 'snit' },
              },
            },
          },
        }
      : {
          cta: {
            type: 'button',
            props: { label: `mint · ${totalCostEth} ETH`, variant: 'primary' },
            on: {
              press: {
                action: 'open_mini_app',
                params: { url: mintUrl, name: 'snit' },
              },
            },
          },
        };

  return snapResponse({
    version: SNAP_VERSION,
    theme: { accent: 'amber' },
    ui: {
      root: 'main',
      elements: {
        main: {
          type: 'container',
          children: ['image', 'title', 'meta', 'cta'],
        },
        image: {
          type: 'image',
          props: { src: drop.mediaUri, alt: drop.title },
        },
        title: {
          type: 'text',
          props: { text: drop.title, weight: 'bold', size: 'md' },
        },
        meta: {
          type: 'text',
          props: {
            text: `${drop.creatorUsername ? '@' + drop.creatorUsername + ' · ' : ''}${stateLabel} · ${drop.mintCount} minted`,
            size: 'sm',
          },
        },
        ...buttonElements,
      },
    },
  });
}

function snapResponse(body: object) {
  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.farcaster.snap+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=30, s-maxage=30',
    },
  });
}
