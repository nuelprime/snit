import { create1155, mint } from '@zoralabs/protocol-sdk';
import type { Address, PublicClient, WalletClient } from 'viem';
import { base } from 'viem/chains';
import { PROTOCOL_FEE_WEI } from './types';

const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS as Address;

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
      mintToCreatorCount: 1, // mint #1 to artist for proof-of-creation
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
  publicClient: PublicClient;
}

export async function buildMintTx(params: MintParams) {
  const { parameters } = await mint({
    tokenContract: params.contractAddress,
    mintType: '1155',
    tokenId: params.tokenId,
    quantityToMint: Number(params.quantity),
    mintReferral: PLATFORM_ADDRESS, // 🎯 we earn referral rewards on every mint
    minterAccount: params.minterAddress,
    publicClient: params.publicClient as any,
  });
  return parameters;
}

// Total cost (price + protocol fee) in wei
export function totalMintCost(pricePerTokenWei: bigint, quantity: bigint = 1n): bigint {
  const protocolFee = BigInt(PROTOCOL_FEE_WEI);
  return (pricePerTokenWei + protocolFee) * quantity;
}