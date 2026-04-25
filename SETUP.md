# snit — getting started

## TL;DR setup (10 min)

```bash
# 1. unzip and cd in
cd snit-app

# 2. install deps
npm install
# (or pnpm install — recommended)

# 3. env
cp .env.example .env.local
# fill in ALL the values — see below

# 4. run locally
npm run dev
# → http://localhost:3000
```

## Env vars you need

### Must-haves
- `NEXT_PUBLIC_PLATFORM_ADDRESS` — your wallet that earns referral rewards + 10% splits. Use a Base address you control.
- `KV_REST_API_URL` + `KV_REST_API_TOKEN` — make a free Upstash Redis db, copy from "REST API" tab
- `NEYNAR_API_KEY` — from neynar.com (free tier works for v1)
- `NEXT_PUBLIC_BASE_RPC_URL` — Alchemy free tier on Base, or any Base RPC

### VPS storage (your Contabo)
You need a tiny upload endpoint on your VPS. Below is a literally-copy-paste minimal Node/Hono server:

```js
// vps-upload-server.js
import { Hono } from 'hono';
import { writeFile } from 'fs/promises';
import { randomBytes } from 'crypto';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';

const SECRET = process.env.UPLOAD_SECRET;
const app = new Hono();

app.post('/upload', async (c) => {
  if (c.req.header('authorization') !== `Bearer ${SECRET}`) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const body = await c.req.parseBody();
  const file = body.file;
  if (!file) return c.json({ error: 'no file' }, 400);
  const ext = file.name?.split('.').pop() ?? 'bin';
  const key = `${randomBytes(8).toString('hex')}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(`./art/${key}`, buf);
  return c.json({ key });
});

app.use('/art/*', serveStatic({ root: './' }));

serve({ fetch: app.fetch, port: 3001 });
```

Run with `UPLOAD_SECRET=your-secret-here node vps-upload-server.js` behind nginx/caddy with HTTPS.

Then in `.env.local`:
```
STORAGE_UPLOAD_URL=https://your-vps.com/upload
STORAGE_UPLOAD_SECRET=your-secret-here
NEXT_PUBLIC_STORAGE_BASE_URL=https://your-vps.com/art
```

## Genesis drop checklist

1. Deploy snit.lol to Vercel
2. Verify miniapp manifest at https://farcaster.xyz/~/developers/mini-apps/manifest
3. Drop into `/create`, deploy your first piece
4. Cast the snap URL from `/drops/{id}`
5. Watch mints come in
6. Withdraw rewards from Zora Protocol Rewards contract on Base

## Known v1 limitations (intentional)

- Quick Auth JWT is best-effort verified (TODO: full sig verification before launch)
- Mint count tracking trusts client-reported tx hash (TODO: receipt verification)
- No referral codes / per-user attribution beyond FID (TODO: link sharing tracking)
- VPS storage = single point of failure (TODO: IPFS migration)
- No drop discovery feed (TODO: /explore page in v1.1)

## Earnings withdrawal

Zora rewards accumulate in the Protocol Rewards escrow contract on Base:
`0x7777777F279eba3d3Ad8F4E708545291A6fDBA8B`

Use Zora's withdraw UI or call `withdraw()` directly with your platform address.

0xSplits earnings: visit https://app.splits.org/accounts/{your_platform_address}/?chainId=8453

## Files to know

- `app/create/page.tsx` — artist drop creation form
- `app/mint/[id]/mint-client.tsx` — collector mint flow
- `app/api/snap/[id]/route.ts` — THE snap endpoint
- `lib/zora.ts` — deploy + mint logic
- `lib/splits.ts` — 0xSplits contract creation
- `lib/store.ts` — Upstash data layer

When something breaks: those are the suspects.
