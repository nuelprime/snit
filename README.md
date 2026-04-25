# snit

mint the moment — open editions on Base, mintable in-feed on Farcaster.

```
artist creates drop in snit miniapp
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

## Architecture notes

### Snap endpoint (`/api/snap/[id]`)
Responds with `application/vnd.farcaster.snap+json`. Single Mint button uses
`open_mini_app` action to bounce into `/mint/[id]` (snaps don't support arbitrary
contract calls — only token sends/swaps natively).

### Anti-staleness in feed
Snap GET response is cached 30s. Image OG is cached 30s + revalidates on mints.
Pre-tap snap shows rounded time labels ("3d left") and round mint counts to stay
evergreen. Post-tap miniapp shows live data.
