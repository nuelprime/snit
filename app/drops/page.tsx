'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Drop } from '@/lib/types';
import { authedFetch } from '@/lib/client-auth';

export default function MyDropsPage() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch('/api/drops/mine');
        if (res.status === 401) {
          // Not signed in (probably not in a Farcaster client).
          setAuthError(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to load drops');
        const { drops } = await res.json();
        setDrops(drops ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen px-6 py-8 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">my drops</h1>
        <Link
          href="/create"
          className="px-3 py-1.5 bg-snit-accent text-white text-sm font-semibold rounded"
        >
          + new
        </Link>
      </div>

      {loading ? (
        <div className="text-snit-muted">loading…</div>
      ) : authError ? (
        <div className="text-center py-12 text-snit-muted text-sm">
          open snit inside farcaster to see your drops.
        </div>
      ) : drops.length === 0 ? (
        <div className="text-center py-12 text-snit-muted">
          no drops yet. <Link href="/create" className="text-snit-accent">create one</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {drops.map((d) => (
            <Link
              key={d.id}
              href={`/drops/${d.id}`}
              className="flex gap-4 p-3 bg-snit-surface rounded-lg hover:bg-snit-surface/70 transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.mediaUri}
                alt={d.title}
                className="w-16 h-16 rounded object-cover"
              />
              <div className="flex-1">
                <div className="font-semibold">{d.title}</div>
                <div className="text-xs text-snit-muted mt-1">
                  {d.status} · {d.mintCount} minted
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
