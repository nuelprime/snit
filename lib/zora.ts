import { create1155 } from '@zoralabs/protocol-sdk';
import { encodeAbiParameters } from 'viem';
import type { Address, PublicClient, WalletClient } from 'viem';
import { base } from 'viem/chains';
import { PROTOCOL_FEE_WEI } from './types';

const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS as Address;

// Zora's FixedPriceSaleStrategy minter contract on Base mainnet.
// Source: @zoralabs/protocol-deployments wagmi.d.ts → zoraCreatorFixedPriceSaleStrategyAddress[8453]
const FIXED_PRICE_MINTER_BASE = '0x04E2516A2c207E84a1839755675dfd8eF6302F0a' as const;

// ZoraCreator1155Impl mintWithRewards function ABI.
// We call this directly to bypass the SDK's broken Goldsky subgraph dependency.
const ZORA_1155_MINT_ABI = [
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'payable',
    inputs: [
      { name: 'minter', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'quantity', type: 'uint256' },
      { name: 'rewardsRecipients', type: 'address[]' },
      { name: 'minterArguments', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

// ─────────────────────────────────────────────
// Zora Protocol SDK — current API
// 
// Uses direct exports `create1155` and `mint` from @zoralabs/protocol-sdk.
// The `createCreatorClient`/`createCollectorClient` wrappers are deprecated.
//
// Both functions return { parameters, ... } where `parameters` is a
// SimulateContract-shape object that we pass to walletClient.writeContract
// (or sendTransaction in our case since wagmi's connector is configured
// for FC miniapp wallet sheets).
// ─────────────────────────────────────────────

export interface DeployParams {
  creatorAddress: Address;
  splitsAddress: Address;
  contractName: string;
  contractURI: string;          // collection-level metadata URI
  tokenURI: string;             // token-level metadata URI
  pricePerTokenWei: bigint;     // 0n for free mint
  saleStart: bigint;            // unix seconds
  saleEnd: bigint;              // unix seconds (effectively forever for supply-only)
  maxSupply: bigint;            // 0n means unlimited
  publicClient: PublicClient;
  walletClient: WalletClient;
}

export interface DeployResult {
  contractAddress: Address;
  tokenId: bigint;
  txHash: `0x${string}`;
}

export async function deployDrop(params: DeployParams): Promise<DeployResult> {
  // create1155 prepares contract creation + first token in one tx.
  // We use the FixedPriceSaleStrategy by setting `pricePerToken` (when > 0)
  // OR for free mints, we still want fixed-price strategy without the 
  // Timed Sale auto-secondary (so we set `mintStart` / `mintEnd`).
  //
  // For an open edition with no supply cap, max uint64 is the standard.
  const effectiveMaxSupply =
    params.maxSupply === 0n ? 18446744073709551615n /* uint64 max */ : params.maxSupply;

  const { parameters, contractAddress } = await create1155({
    contract: {
      name: params.contractName,
      uri: params.contractURI,
    },
    token: {
      tokenMetadataURI: params.tokenURI,
      payoutRecipient: params.splitsAddress,
      createReferral: PLATFORM_ADDRESS,
      maxSupply: effectiveMaxSupply,
      salesConfig: {
        type: 'fixedPrice',
        pricePerToken: params.pricePerTokenWei,
        saleStart: params.saleStart,
        saleEnd: params.saleEnd,
      },
    },
    account: params.creatorAddress,
    publicClient: params.publicClient as any,
  });

  // Send the deploy tx
  const txHash = await params.walletClient.writeContract({
    ...parameters,
    account: params.creatorAddress,
    chain: base,
  } as any);

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
// Mint — collector-side
// ─────────────────────────────────────────────

export interface MintParams {
  contractAddress: Address;
  tokenId: bigint;
  quantity: bigint;
  minterAddress: Address;
  pricePerTokenWei: bigint;
  publicClient: PublicClient;
}

/**
 * Build a mint transaction by directly calling Zora's ZoraCreator1155Impl.mintWithRewards.
 *
 * Bypasses @zoralabs/protocol-sdk's mint() function which queries a deleted
 * Goldsky subgraph (api.goldsky.com/.../zora-create-base-mainnet/stable/gn).
 * That endpoint returns 404 as of 2026-Q2 because the SDK is unmaintained for
 * the 1155 creator path. We call the contract directly using viem instead —
 * no metadata fetch needed since we already have contractAddress + tokenId in
 * our DB from the deploy step.
 *
 * Same protocol behavior: same rewards, same splits, same referral payout.
 */
export async function buildMintTx(params: MintParams) {
  // For FixedPriceSaleStrategy, minterArguments is just the abi-encoded recipient.
  const minterArguments = encodeAbiParameters(
    [{ name: 'recipient', type: 'address' }],
    [params.minterAddress],
  );

  const totalValue = totalMintCost(params.pricePerTokenWei, params.quantity);

  return {
    address: params.contractAddress,
    abi: ZORA_1155_MINT_ABI,
    functionName: 'mint' as const,
    args: [
      FIXED_PRICE_MINTER_BASE,
      params.tokenId,
      params.quantity,
      [PLATFORM_ADDRESS] as readonly Address[],  // rewardsRecipients[0] = mintReferral
      minterArguments,
    ] as const,
    value: totalValue,
  };
}

// Total cost (price + protocol fee) in wei
export function totalMintCost(pricePerTokenWei: bigint, quantity: bigint = 1n): bigint {
  const protocolFee = BigInt(PROTOCOL_FEE_WEI);
  return (pricePerTokenWei + protocolFee) * quantity;
}