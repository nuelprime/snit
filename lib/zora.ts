import {
  createCreatorClient,
  createCollectorClient,
} from '@zoralabs/protocol-sdk';
import type { Address, PublicClient, WalletClient } from 'viem';
import { base } from 'viem/chains';
import { PROTOCOL_FEE_WEI } from './types';

const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS as Address;

// ─────────────────────────────────────────────
// Deploy: artist creates a new 1155 collection + token
// ─────────────────────────────────────────────
//
// We use FixedPriceSaleStrategy (not TimedSaleStrategy) because:
// 1. Cleaner protocol fee splits (no 10% siphoned for Uniswap LP)
// 2. Simpler mental model for v1
// 3. Open editions don't need automatic secondary markets yet
//
// Key params on createNew1155Token:
//   - createReferral: PLATFORM_ADDRESS  → we earn create referral rewards
//   - salesConfig.fundsRecipient: SPLITS_ADDRESS → 90/10 split
//   - salesConfig.pricePerToken: artist's price (excl. protocol fee)
//   - salesConfig.saleStart / saleEnd: time window
//   - maxSupply: 0 (unlimited) or specific cap
// ─────────────────────────────────────────────

export interface DeployParams {
  creatorAddress: Address;
  splitsAddress: Address;
  tokenURI: string;            // ipfs:// or https:// pointing to JSON metadata
  contractURI: string;         // collection-level metadata
  contractName: string;
  pricePerTokenWei: bigint;    // mint price excluding protocol fee
  saleStart: bigint;           // unix seconds
  saleEnd: bigint;             // unix seconds (or far future for supply-only)
  maxSupply: bigint;           // 0n = unlimited
  publicClient: PublicClient;
  walletClient: WalletClient;
}

export interface DeployResult {
  contractAddress: Address;
  tokenId: bigint;
  txHash: `0x${string}`;
}

export async function deployDrop(params: DeployParams): Promise<DeployResult> {
  const creatorClient = createCreatorClient({
    chainId: base.id,
    publicClient: params.publicClient,
  });

  const { parameters, contractAddress } = await creatorClient.create1155({
    contract: {
      name: params.contractName,
      uri: params.contractURI,
    },
    token: {
      tokenMetadataURI: params.tokenURI,
      createReferral: PLATFORM_ADDRESS,
      mintToCreatorCount: 1, // mint #1 to the artist as proof
      payoutRecipient: params.splitsAddress,
      maxSupply: params.maxSupply === 0n ? 2n ** 256n - 1n : params.maxSupply,
      salesConfig: {
        type: 'fixedPrice',
        pricePerToken: params.pricePerTokenWei,
        saleStart: params.saleStart,
        saleEnd: params.saleEnd,
      },
    },
    account: params.creatorAddress,
  });

  // Send the deploy tx via the artist's wallet
  const txHash = await params.walletClient.sendTransaction({
    ...parameters,
    account: params.creatorAddress,
    chain: base,
  });

  // Wait for confirmation
  const receipt = await params.publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status !== 'success') {
    throw new Error('Deploy transaction reverted');
  }

  return {
    contractAddress: contractAddress as Address,
    tokenId: 1n, // first token in a fresh contract
    txHash,
  };
}

// ─────────────────────────────────────────────
// Mint: collector mints from an existing drop
// ─────────────────────────────────────────────
//
// Total ETH = pricePerToken + 0.000111 ETH (protocol fee) per mint
// The mintReferral param sends our cut of the protocol fee to PLATFORM_ADDRESS
// ─────────────────────────────────────────────

export interface MintParams {
  contractAddress: Address;
  tokenId: bigint;
  quantity: bigint;
  minterAddress: Address;       // who's minting / receiving
  pricePerTokenWei: bigint;
  publicClient: PublicClient;
}

export async function buildMintTx(params: MintParams) {
  const collectorClient = createCollectorClient({
    chainId: base.id,
    publicClient: params.publicClient,
  });

  const { parameters } = await collectorClient.mint({
    tokenContract: params.contractAddress,
    mintType: '1155',
    tokenId: params.tokenId,
    quantityToMint: Number(params.quantity),
    mintReferral: PLATFORM_ADDRESS,
    minterAccount: params.minterAddress,
  });

  return parameters;
}

// Helper to compute total mint cost (price + protocol fee) in wei
export function totalMintCost(pricePerTokenWei: bigint, quantity: bigint = 1n): bigint {
  const protocolFee = BigInt(PROTOCOL_FEE_WEI);
  return (pricePerTokenWei + protocolFee) * quantity;
}
