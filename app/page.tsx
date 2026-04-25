import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col px-6 py-6 relative">
      {/* Theme toggle in top-right corner */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Center content vertically, constrained to button width */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          {/* Title block — kept center-aligned */}
          <div className="text-center">
            <h1 className="text-6xl font-bold tracking-tight">snit</h1>
            <p className="mt-3 text-snit-muted text-sm tracking-widest">
              mint the moment
            </p>
          </div>

          {/* Tagline — left edge of button column */}
          <p className="text-snit-fg/80 leading-relaxed">
            snap it, snit it.
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <Link
              href="/create"
              className="px-6 py-3 bg-snit-accent text-white font-semibold rounded-lg hover:opacity-90 transition text-center"
            >
              create a drop
            </Link>
            <Link
              href="/drops"
              className="px-6 py-3 border border-snit-border rounded-lg hover:bg-snit-surface transition text-center"
            >
              my drops
            </Link>
          </div>
        </div>
      </div>

      {/* Footer — sits at bottom of page, content aligned to same center column */}
      <footer className="flex justify-center">
        <div className="max-w-md w-full">
          <div className="text-xs text-snit-muted">powered by zora</div>
        </div>
      </footer>
    </main>
  );
}
