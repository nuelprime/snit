import { notFound } from 'next/navigation';
import { getDrop, toPublicDrop } from '@/lib/store';
import DropDetailClient from './detail-client';

export default async function DropDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const drop = await getDrop(id);
  if (!drop) notFound();

  return <DropDetailClient drop={toPublicDrop(drop)} />;
}
