import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL ?? 'https://snit.lol'),
  title: 'snit — mint moments on farcaster',
  description: 'Time-gated open editions, mintable in-feed.',
  openGraph: {
    title: 'snit',
    description: 'Time-gated open editions, mintable in-feed.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
