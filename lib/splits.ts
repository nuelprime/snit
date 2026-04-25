import { SplitV2Client, SplitV2Type } from '@0xsplits/splits-sdk';
import type { Address, PublicClient, WalletClient } from 'viem';
import { base } from 'viem/chains';
import { SPLIT_ARTIST_BPS, SPLIT_PLATFORM_BPS } from './types';

const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS as Address;

// ─────────────────────────────────────────────
// 0xSplits V2 (Push type)
// Creates a tiny payable contract that auto-distributes incoming ETH
// to the artist (90%) and platform (10%) per the configured percentages.
//
// Push split = funds auto-forward on receipt. Higher gas per mint but
// recipients don't need to claim manually.
//
// SDK V2 createSplit returns { splitAddress, event } directly — no need
// to extract from logs ourselves.
// ─────────────────────────────────────────────

export interface CreateSplitsParams {
  artistAddress: Address;
  publicClient: PublicClient;
  walletClient: WalletClient;
  fromAddress: Address;
}

export interface CreateSplitsResult {
  splitsAddress: Address;
  txHash?: `0x${string}`;
}

export async function createSplitsContract(
  params: CreateSplitsParams,
): Promise<CreateSplitsResult> {
  const client = new SplitV2Client({
    chainId: base.id,
    publicClient: params.publicClient as any,
    walletClient: params.walletClient as any,
  });

  // Splits SDK uses percentage as a number (0-100, up to 4 decimal places).
  // Our BPS constants are in basis points (10_000 = 100%). Convert.
  const artistPercent = SPLIT_ARTIST_BPS / 100;   // 9000 BPS → 90.0%
  const platformPercent = SPLIT_PLATFORM_BPS / 100; // 1000 BPS → 10.0%

  const response = await client.createSplit({
    recipients: [
      { address: params.artistAddress, percentAllocation: artistPercent },
      { address: PLATFORM_ADDRESS, percentAllocation: platformPercent },
    ],
    distributorFeePercent: 0, // no keeper fee
    totalAllocationPercent: 100,
    splitType: SplitV2Type.Push,
    ownerAddress: params.artistAddress, // artist owns the split contract
    creatorAddress: params.fromAddress, // who deployed it
    chainId: base.id,
    // salt: omit → SDK uses factory.createSplit which generates onchain
  });

  return {
    splitsAddress: (response as any).splitAddress as Address,
    txHash: (response as any).txHash,
  };
}
