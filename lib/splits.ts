import { SplitV2Client } from '@0xsplits/splits-sdk';
import type { Address, PublicClient, WalletClient } from 'viem';
import { base } from 'viem/chains';
import { SPLIT_ARTIST_BPS, SPLIT_PLATFORM_BPS } from './types';

const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS as Address;

// ─────────────────────────────────────────────
// 0xSplits creates a tiny payable contract that auto-distributes
// incoming ETH to recipients based on configured percentages.
//
// We use SplitV2 (Pull-based, gas-cheap, immutable for our use case).
// Recipients claim their funds when they want — no custodial risk.
// ─────────────────────────────────────────────

export interface CreateSplitsParams {
  artistAddress: Address;
  publicClient: PublicClient;
  walletClient: WalletClient;
  fromAddress: Address; // who sends the deploy tx (usually artist)
}

export interface CreateSplitsResult {
  splitsAddress: Address;
  txHash: `0x${string}`;
}

export async function createSplitsContract(
  params: CreateSplitsParams,
): Promise<CreateSplitsResult> {
  const client = new SplitV2Client({
    chainId: base.id,
    publicClient: params.publicClient as any,
    walletClient: params.walletClient as any,
  });

  // BPS_PRECISION on splits is 1e6 (so 900_000 = 90%, 100_000 = 10%)
  const totalAllocation = 1_000_000;
  const artistAllocation = (totalAllocation * SPLIT_ARTIST_BPS) / 10_000;   // 900_000
  const platformAllocation = (totalAllocation * SPLIT_PLATFORM_BPS) / 10_000; // 100_000

  const { txHash } = await client.createSplit({
    recipients: [
      { address: params.artistAddress, percentAllocation: artistAllocation },
      { address: PLATFORM_ADDRESS, percentAllocation: platformAllocation },
    ],
    distributorFeePercent: 0, // no distributor fee — anyone can call distribute
    totalAllocationPercent: totalAllocation,
    ownerAddress: params.artistAddress, // artist owns it (can update later if needed)
  });

  // Predict the address from the receipt
  const receipt = await params.publicClient.waitForTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  // Splits emits CreateSplit event — extract address from log
  const splitsAddress = await extractSplitsAddress(receipt);

  return {
    splitsAddress,
    txHash: txHash as `0x${string}`,
  };
}

function extractSplitsAddress(receipt: any): Address {
  // CreateSplit event is the first log from the SplitsFactory
  // The split address is the first indexed topic (after event sig)
  const log = receipt.logs?.[0];
  if (!log?.topics?.[1]) {
    throw new Error('Could not extract splits address from receipt');
  }
  // topics[1] is a 32-byte word — last 20 bytes are the address
  return `0x${log.topics[1].slice(-40)}` as Address;
}
