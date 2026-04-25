'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === '/';

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-snit-bg/80 border-b border-snit-border/60">
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {!isHome && (
            <button
              onClick={handleBack}
              className="p-1.5 rounded-lg hover:bg-snit-surface transition text-snit-muted hover:text-snit-fg"
              aria-label="back"
              title="back"
            >
              <ArrowLeft size={18} strokeWidth={1.75} />
            </button>
          )}
          <Link
            href="/"
            className="text-xl font-bold tracking-tight px-2 py-1 hover:opacity-80 transition"
            aria-label="snit home"
          >
            snit
          </Link>
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
