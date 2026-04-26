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
            type: 'stack',
            props: { direction: 'vertical', gap: 'sm' },
            children: ['title', 'msg'],
          },
          title: {
            type: 'text',
            props: { content: 'snit', weight: 'bold' },
          },
          msg: {
            type: 'text',
            props: { content: 'drop not found', size: 'sm' },
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
  // Action: submit with params.target — the universal pattern proven in
  // production snaps (prowlr, tees-omega). When the host follows the target
  // URL, if the destination has fc:miniapp meta tags (which our /mint/[id]
  // page does), it auto-launches as a miniapp with wallet context.
  const buttonElements = isEnded
    ? {
        cta: {
          type: 'button',
          props: { label: 'view drop', variant: 'secondary' },
          on: {
            press: {
              action: 'submit',
              params: { target: mintUrl },
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
                action: 'submit',
                params: { target: mintUrl },
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
                action: 'submit',
                params: { target: mintUrl },
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
        // Vertical layout. Snap renderers stretch images to container width,
        // so horizontal image+text doesn't render the way you'd expect.
        // Instead we keep it vertical but use 16:9 aspect to keep the card
        // compact (avoids the "show more" expander on tall cards).
        main: {
          type: 'stack',
          props: { direction: 'vertical', gap: 'sm' },
          children: ['image', 'title', 'info', 'cta'],
        },
        image: {
          type: 'image',
          props: { url: drop.mediaUri, aspect: '16:9', alt: drop.title },
        },
        title: {
          type: 'text',
          props: { content: drop.title, weight: 'bold', size: 'md' },
        },
        info: {
          type: 'text',
          props: {
            content: `${drop.creatorUsername ? '@' + drop.creatorUsername + ' · ' : ''}${stateLabel} · ${drop.mintCount} minted`,
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
      'Vary': 'Accept',
      // No cache during dev iteration. Restore to `public, max-age=30, s-maxage=30`
      // before launch for CDN performance.
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
