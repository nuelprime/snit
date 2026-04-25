'use client';

import { useState } from 'react';
import type { PublicDrop } from '@/lib/types';
import { formatEther } from 'viem';
import { PROTOCOL_FEE_WEI } from '@/lib/types';
import Countdown from '@/components/Countdown';

export default function DropDetailClient({ drop }: { drop: PublicDrop }) {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const snapUrl = `${baseUrl}/api/snap/${drop.id}`;
  const mintPageUrl = `${baseUrl}/mint/${drop.id}`;

  const totalCostWei = BigInt(drop.mintPrice) + BigInt(PROTOCOL_FEE_WEI);
  const totalCostEth = formatEther(totalCostWei);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function castDrop() {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      await sdk.actions.composeCast({
        text: `${drop.title} — minting now on snit ↓`,
        embeds: [snapUrl],
      });
    } catch (err) {
      console.error(err);
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const isUpcoming = now < drop.startTime;
  const isEnded = drop.status === 'ended' || now > drop.endTime;

  return (
    <main className="min-h-screen px-6 py-8 max-w-md mx-auto">
      <div className="aspect-square w-full bg-snit-surface rounded-lg overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={drop.mediaUri} alt={drop.title} className="w-full h-full object-cover" />
      </div>

      <h1 className="text-2xl font-bold mt-6">{drop.title}</h1>
      <div className="mt-2 flex gap-2 items-center text-sm">
        <span
          className={`px-2 py-0.5 rounded text-xs uppercase tracking-wider ${
            isEnded
              ? 'bg-snit-ended/20 text-snit-ended'
              : isUpcoming
                ? 'bg-amber-900/30 text-amber-400'
                : 'bg-snit-live/20 text-snit-live'
          }`}
        >
          {isEnded ? 'ended' : isUpcoming ? 'upcoming' : 'live'}
        </span>
        <span className="text-snit-muted">
          {isUpcoming
            ? <><Countdown targetUnix={drop.startTime} /> until live</>
            : isEnded
              ? 'mint closed'
              : <><Countdown targetUnix={drop.endTime} /> left</>}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <Stat label="minted" value={String(drop.mintCount)} />
        <Stat label="price" value={`${totalCostEth} ETH`} />
      </div>

      {/* Share section */}
      <div className="mt-8 space-y-3">
        <button
          onClick={castDrop}
          className="w-full py-3 bg-snit-accent text-black font-semibold rounded-lg hover:opacity-90 transition"
        >
          cast on farcaster
        </button>

        <button
          onClick={() => copy(snapUrl)}
          className="w-full py-3 border border-snit-border rounded-lg hover:bg-snit-surface transition text-sm"
        >
          {copied ? 'copied!' : 'copy snap url'}
        </button>

        <details className="text-xs text-snit-muted">
          <summary className="cursor-pointer">advanced</summary>
          <div className="mt-2 space-y-1 mono">
            <div>contract: {drop.contractAddress}</div>
            <div>token: #{drop.tokenId}</div>
            <div className="break-all">snap: {snapUrl}</div>
            <div className="break-all">mint page: {mintPageUrl}</div>
          </div>
        </details>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-snit-surface rounded-lg">
      <div className="text-xs text-snit-muted uppercase tracking-wider">{label}</div>
      <div className="mt-1 mono">{value}</div>
    </div>
  );
}
