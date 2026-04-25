'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useConnect,
  usePublicClient,
  useWalletClient,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { formatEther } from 'viem';
import type { PublicDrop } from '@/lib/types';
import { PROTOCOL_FEE_WEI } from '@/lib/types';
import Countdown from '@/components/Countdown';

interface Props {
  drop: PublicDrop;
}

export default function MintClient({ drop }: Props) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);

  const { isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  useEffect(() => {
    if (!isConnected && connectors[0]) {
      connect({ connector: connectors[0] });
    }
  }, [isConnected, connect, connectors]);

  // Notify backend on mint confirmation
  useEffect(() => {
    if (confirmed && txHash) {
      fetch(`/api/drops/${drop.id}/mint-confirmed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash, minterAddress: address }),
      }).catch(() => {});
    }
  }, [confirmed, txHash, drop.id, address]);

  const totalCostWei =
    BigInt(drop.mintPrice) + BigInt(PROTOCOL_FEE_WEI);
  const totalCostEth = formatEther(totalCostWei);

  async function onMint() {
    setError(null);
    if (!isConnected || !address || !walletClient || !publicClient) {
      setError('Connect wallet first');
      return;
    }
    if (!drop.contractAddress || !drop.tokenId) {
      setError('Drop not deployed');
      return;
    }

    setMinting(true);
    try {
      const { buildMintTx } = await import('@/lib/zora');
      const params = await buildMintTx({
        contractAddress: drop.contractAddress,
        tokenId: BigInt(drop.tokenId),
        quantity: 1n,
        minterAddress: address,
        publicClient,
      });

      const hash = await walletClient.writeContract({
        ...params,
        account: address,
      } as any);
      setTxHash(hash);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Mint failed');
    } finally {
      setMinting(false);
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const isUpcoming = now < drop.startTime;
  const isEnded = drop.status === 'ended' || now > drop.endTime;

  return (
    <main className="min-h-screen px-6 py-8 max-w-md mx-auto">
      {/* Art */}
      <div className="aspect-square w-full bg-snit-surface rounded-lg overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={drop.mediaUri} alt={drop.title} className="w-full h-full object-cover" />
      </div>

      {/* Title + creator */}
      <div className="mt-6">
        <h1 className="text-2xl font-bold">{drop.title}</h1>
        {drop.creatorUsername && (
          <p className="text-snit-muted mt-1 text-sm">
            by @{drop.creatorUsername}
          </p>
        )}
        {drop.description && (
          <p className="mt-3 text-snit-fg/80 text-sm">{drop.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Stat label="price" value={`${totalCostEth} ETH`} />
        <Stat label="minted" value={String(drop.mintCount)} />
        <Stat
          label={isUpcoming ? 'starts in' : 'ends in'}
          value={
            <Countdown
              targetUnix={isUpcoming ? drop.startTime : drop.endTime}
            />
          }
        />
        {drop.maxSupply !== '0' && (
          <Stat label="supply cap" value={drop.maxSupply} />
        )}
      </div>

      {/* CTA */}
      <div className="mt-8">
        {confirmed ? (
          <div className="space-y-3">
            <div className="p-4 bg-snit-live/10 border border-snit-live rounded-lg text-center">
              ✓ minted
            </div>
            <ShareButton dropId={drop.id} title={drop.title} />
          </div>
        ) : isEnded ? (
          <div className="p-4 bg-snit-surface rounded-lg text-center text-snit-muted">
            mint closed
          </div>
        ) : isUpcoming ? (
          <div className="p-4 bg-snit-surface rounded-lg text-center text-snit-muted">
            mint not started yet
          </div>
        ) : (
          <button
            onClick={onMint}
            disabled={minting || !isConnected}
            className="w-full py-4 bg-snit-accent text-black font-bold rounded-lg disabled:opacity-50 hover:opacity-90 transition"
          >
            {minting ? 'minting…' : `mint for ${totalCostEth} ETH`}
          </button>
        )}
        {error && (
          <div className="mt-3 p-3 bg-red-900/30 border border-red-800 rounded text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-3 bg-snit-surface rounded-lg">
      <div className="text-xs text-snit-muted uppercase tracking-wider">{label}</div>
      <div className="mt-1 mono">{value}</div>
    </div>
  );
}

function ShareButton({ dropId, title }: { dropId: string; title: string }) {
  async function onShare() {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const url = `${window.location.origin}/api/snap/${dropId}`;
      await sdk.actions.composeCast({
        text: `just minted "${title}" on snit ↓`,
        embeds: [url],
      });
    } catch (err) {
      console.error(err);
    }
  }
  return (
    <button
      onClick={onShare}
      className="w-full py-3 border border-snit-border rounded-lg hover:bg-snit-surface transition"
    >
      share
    </button>
  );
}