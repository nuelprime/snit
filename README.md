# snit

mint the moment — time-gated open editions on Base, mintable in-feed on Farcaster.

```
artist creates drop in snit miniapp
  → 0xSplits contract deployed (90% artist, 10% platform)
  → Zora 1155 contract deployed with splits as fundsRecipient
  → snap URL generated: https://snit.lol/api/snap/{dropId}
artist casts the snap URL
  → collectors see in-feed snap (preview, price, time left)
  → tap mint → opens miniapp at /mint/{id}
  → wallet sheet → sign → minted
  → mintReferral on tx earns platform Zora protocol rewards
```

## Stack

- **Next.js 15** on Vercel (frontend + API + snap endpoint, all one deploy)
- **Upstash Redis** for drop metadata + mint counts
- **Zora Protocol SDK** for 1155 deploys + mints
- **0xSplits SDK** for trustless 90/10 payouts
- **Wagmi + viem** for wallet interactions
- **Farcaster miniapp SDK** for SIWF, wallet, cast composition
- **Neynar SDK** for FID profile lookups
- **Contabo VPS** for media storage (v1; IPFS migration later)

## Setup

```bash
# 1. Install dependencies
pnpm install   # or npm/yarn

# 2. Copy env
cp .env.example .env.local
# Fill in:
#   - NEXT_PUBLIC_PLATFORM_ADDRESS (your wallet — earns referral rewards + 10% splits)
#   - KV_REST_API_URL, KV_REST_API_TOKEN (from Upstash dashboard)
#   - NEYNAR_API_KEY (from neynar.com)
#   - STORAGE_UPLOAD_URL, STORAGE_UPLOAD_SECRET, NEXT_PUBLIC_STORAGE_BASE_URL
#     (your Contabo VPS upload endpoint)
#   - NEXT_PUBLIC_BASE_RPC_URL (Alchemy or any Base RPC)

# 3. Local dev
pnpm dev
# Visit http://localhost:3000
```

## VPS storage endpoint

You need a simple upload endpoint on your Contabo VPS. Bare-bones spec:

- `POST /upload` accepts multipart/form-data with `file` field
- Auth: `Authorization: Bearer <STORAGE_UPLOAD_SECRET>`
- Returns `{ "key": "abc123.png" }`
- Files served at `https://your-vps/art/<key>` (this is `NEXT_PUBLIC_STORAGE_BASE_URL/<key>`)

A 30-line Node/Hono server with multer or a basic Caddy + PHP setup both work. Migrate to IPFS post-launch.

## Deploy

```bash
# Vercel
vercel --prod

# Connect domain snit.lol
# Add all .env vars in Vercel dashboard
```

After domain is set up:
1. Visit https://farcaster.xyz/~/developers/mini-apps/manifest
2. Sign manifest for snit.lol
3. Replace `accountAssociation` block in `public/.well-known/farcaster.json`
4. Redeploy

## Architecture notes

### Snap endpoint (`/api/snap/[id]`)
Responds with `application/vnd.farcaster.snap+json`. Single Mint button uses
`open_mini_app` action to bounce into `/mint/[id]` (snaps don't support arbitrary
contract calls — only token sends/swaps natively).

### Mint flow
The mint page is a Farcaster miniapp (has `fc:miniapp` meta tag). Auto-connects
to FC wallet, calls Zora's `mintWithRewards` with `mintReferral = PLATFORM_ADDRESS`.

### Earnings
- ~28% of Zora's 0.000111 ETH protocol fee per mint (createReferral + mintReferral)
- 10% of mintPrice (paid via 0xSplits contract)

### Anti-staleness in feed
Snap GET response is cached 30s. Image OG is cached 30s + revalidates on mints.
Pre-tap snap shows rounded time labels ("3d left") and round mint counts to stay
evergreen. Post-tap miniapp shows live data.
