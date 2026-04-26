import { notFound } from 'next/navigation';
import { getDrop, toPublicDrop } from '@/lib/store';
import MintClient from './mint-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

// This page MUST have the fc:miniapp meta tag so that when it's shared in a
// cast, Farcaster clients render a rich embed with the OG image and a "mint"
// button. We also ship the legacy fc:frame tag for backward compatibility with
// older client versions.
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const drop = await getDrop(id);
  if (!drop) return { title: 'snit — drop not found' };

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'https://snit.lol';
  const ogImageUrl = `${baseUrl}/api/og/drop/${id}`;
  const mintUrl = `${baseUrl}/mint/${id}`;
  const splashImageUrl = `${baseUrl}/splash.png`;

  // Modern miniapp embed (current spec)
  const miniappEmbed = {
    version: '1',
    imageUrl: ogImageUrl,
    button: {
      title: 'mint',
      action: {
        type: 'launch_miniapp',
        url: mintUrl,
        name: 'snit',
        splashImageUrl,
        splashBackgroundColor: '#0A0A0A',
      },
    },
  };

  // Legacy frame embed (backward compat — some clients still on this)
  const frameEmbed = {
    version: '1',
    imageUrl: ogImageUrl,
    button: {
      title: 'mint',
      action: {
        type: 'launch_frame',
        url: mintUrl,
        name: 'snit',
        splashImageUrl,
        splashBackgroundColor: '#0A0A0A',
      },
    },
  };

  return {
    title: `${drop.title} — snit`,
    description: drop.description ?? 'mint this drop on snit',
    openGraph: {
      images: [{ url: ogImageUrl, width: 1200, height: 800 }],
      title: drop.title,
      description: drop.description,
    },
    other: {
      'fc:miniapp': JSON.stringify(miniappEmbed),
      'fc:frame': JSON.stringify(frameEmbed),
    },
  };
}

export default async function MintPage({ params }: PageProps) {
  const { id } = await params;
  const drop = await getDrop(id);
  if (!drop || drop.status === 'draft' || drop.status === 'deploying') {
    notFound();
  }

  return <MintClient drop={toPublicDrop(drop)} />;
}
