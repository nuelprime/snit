// Drop = a single mint configuration deployed via snit
// Stored in Upstash, shared between snit-app and snit-snap

export type DropStatus =
  | 'draft'        // Created in form, not yet deployed
  | 'deploying'    // Deploy txs sent, waiting for confirmation
  | 'upcoming'     // Deployed, sale not yet started
  | 'live'         // Sale active, mints accepted
  | 'ended'        // Sale ended (time or supply hit)
  | 'failed';      // Deploy failed

export type EndCondition =
  | 'time_only'    // Open edition, ends after duration
  | 'supply_only'  // Caps at maxSupply, no time limit
  | 'time_or_supply'; // Whichever hits first

export type Duration = '24h' | '3d' | '7d' | 'custom';

export interface Drop {
  // Identity
  id: string;                // nanoid, used in URLs
  creatorFid: number;
  creatorAddress: `0x${string}`;
  creatorUsername?: string;  // Cached from Neynar at create time
  creatorPfpUrl?: string;    // Cached for OG image
  
  // Content
  title: string;
  description?: string;
  mediaUri: string;          // VPS URL or ipfs://...
  
  // Pricing
  // Total cost to collector = mintPrice + protocolFee (0.000111 ETH)
  mintPrice: string;         // wei as string (BigInt-safe). "0" = free
  
  // Sale window
  startTime: number;         // unix seconds
  endTime: number;           // unix seconds
  duration: Duration;
  
  // Supply gating
  endCondition: EndCondition;
  maxSupply: string;         // wei-style string for big numbers. "0" if unlimited
  
  // On-chain refs (set after deploy)
  contractAddress?: `0x${string}`;
  tokenId?: string;          // 1 for first token in 1155
  splitsAddress?: `0x${string}`;
  deployTxHash?: `0x${string}`;
  
  // State
  status: DropStatus;
  mintCount: number;
  createdAt: number;
  updatedAt: number;
  
  // Optional metadata
  errorMessage?: string;     // If status === 'failed'
}

// What the snap server needs to render — subset of Drop, public-safe
export interface PublicDrop {
  id: string;
  title: string;
  description?: string;
  mediaUri: string;
  creatorFid: number;
  creatorUsername?: string;
  creatorPfpUrl?: string;
  mintPrice: string;
  startTime: number;
  endTime: number;
  endCondition: EndCondition;
  maxSupply: string;
  contractAddress?: `0x${string}`;
  tokenId?: string;
  status: DropStatus;
  mintCount: number;
}

export const PROTOCOL_FEE_WEI = '111000000000000'; // 0.000111 ETH
export const SPLIT_ARTIST_BPS = 9000;  // 90%
export const SPLIT_PLATFORM_BPS = 1000; // 10%

// Pricing floor:
// Drops must be either FREE (0) or at least MIN_PAID_PRICE_WEI.
// Anything in between (e.g. 0.0001) is rejected at form + backend.
// 0.00037 ETH = 370_000_000_000_000 wei
export const MIN_PAID_PRICE_WEI = '370000000000000';
export const MIN_PAID_PRICE_ETH = '0.00037';
