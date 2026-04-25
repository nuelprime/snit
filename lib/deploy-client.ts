'use client';

import type { Address, PublicClient, WalletClient } from 'viem';
import { createSplitsContract } from './splits';
import { deployDrop } from './zora';

export interface DeployFromClientParams {
  dropId: string;
  creatorAddress: Address;
  splitsArtistAddress: Address; // usually same as creatorAddress
  title: string;
  contractURI: string;
  tokenURI: string;
  pricePerTokenWei: bigint;
  saleStart: bigint;
  saleEnd: bigint;
  maxSupply: bigint;
  publicClient: PublicClient;
  walletClient: WalletClient;
  onStep?: (s: 'splits' | 'deploying') => void;
}

export interface DeployFromClientResult {
  splitsAddress: Address;
  contractAddress: Address;
  tokenId: bigint;
  deployTxHash: `0x${string}`;
}

// Two-tx deploy:
//   1. Create 0xSplits contract (90/10 artist/platform)
//   2. Deploy Zora 1155 with splits as fundsRecipient
//
// Both txs are signed by the artist's wallet.
export async function deployFromClient(
  params: DeployFromClientParams,
): Promise<DeployFromClientResult> {
  // ── Step 1: Splits ──
  params.onStep?.('splits');
  const splitsResult = await createSplitsContract({
    artistAddress: params.splitsArtistAddress,
    fromAddress: params.creatorAddress,
    publicClient: params.publicClient,
    walletClient: params.walletClient,
  });

  // ── Step 2: Zora 1155 ──
  params.onStep?.('deploying');
  const deployResult = await deployDrop({
    creatorAddress: params.creatorAddress,
    splitsAddress: splitsResult.splitsAddress,
    contractName: params.title,
    contractURI: params.contractURI,
    tokenURI: params.tokenURI,
    pricePerTokenWei: params.pricePerTokenWei,
    saleStart: params.saleStart,
    saleEnd: params.saleEnd,
    maxSupply: params.maxSupply,
    publicClient: params.publicClient,
    walletClient: params.walletClient,
  });

  return {
    splitsAddress: splitsResult.splitsAddress,
    contractAddress: deployResult.contractAddress,
    tokenId: deployResult.tokenId,
    deployTxHash: deployResult.txHash,
  };
}
