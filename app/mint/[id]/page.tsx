import { notFound } from 'next/navigation';
import { getDrop, toPublicDrop } from '@/lib/store';
import MintClient from './mint-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

// This page MUST have the fc:miniapp meta tag so that when it's opened from
// the snap's open_mini_app action, the Farcaster client knows it's a miniapp
// (gets wallet auto-connection, etc.)
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const drop = await getDrop(id);
  if (!drop) return { title: 'snit — drop not found' };

  const ogImageUrl = `${process.env.NEXT_PUBLIC_URL}/api/og/drop/${id}`;

  return {
    title: `${drop.title} — snit`,
    description: drop.description ?? 'Mint this drop on snit',
    openGraph: {
      images: [ogImageUrl],
      title: drop.title,
      description: drop.description,
    },
    other: {
      // Farcaster miniapp embed metadata
      'fc:miniapp': JSON.stringify({
        version: '1',
        imageUrl: ogImageUrl,
        button: {
          title: 'mint',
          action: {
            type: 'launch_miniapp',
            url: `${process.env.NEXT_PUBLIC_URL}/mint/${id}`,
            name: 'snit',
          },
        },
      }),
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
