'use client';

import { useEffect, useState } from 'react';

export default function Countdown({ targetUnix }: { targetUnix: number }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, targetUnix - now);
  if (remaining === 0) return <span>ended</span>;

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;

  if (days > 0) return <span>{days}d {hours}h</span>;
  if (hours > 0) return <span>{hours}h {mins}m</span>;
  return <span>{mins}m {secs}s</span>;
}
