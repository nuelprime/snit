# snit — parked

Status: paused pending Warpcast snap → miniapp client support.

## Why parked
Snap protocol's `open_mini_app` action is in spec but not wired through Warpcast's snap host in 2026-Q2. Snap buttons can submit to other snaps (`submit/target`), open external URLs (`open_url`), and a few other actions — but cannot launch a miniapp. Confirmed via emulator + Neynar (CacheCindy).

The intended UX `Cast → Snap → Miniapp → Mint` requires this capability. Shipping with miniapp embed instead would compromise snap-native identity.

## Unblock
When `open_mini_app` action ships in Warpcast: revert the cast button in `app/create/page.tsx` and `app/drops/[id]/detail-client.tsx` back to snap URL (currently set to snap URL already — no code change needed, just verify the action works in the snap emulator at https://farcaster.xyz/~/developers/snaps).