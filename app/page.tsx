import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-6xl font-bold tracking-tight">snit</h1>
          <p className="mt-3 text-snit-muted text-sm tracking-widest">
            mint the moment
          </p>
        </div>

        <p className="text-snit-fg/80 leading-relaxed">
          snap it, snit it.
        </p>

        <div className="flex flex-col gap-3 pt-4">
          <Link
            href="/create"
            className="px-6 py-3 bg-snit-accent text-black font-semibold rounded-lg hover:opacity-90 transition"
          >
            create a drop
          </Link>
          <Link
            href="/drops"
            className="px-6 py-3 border border-snit-border rounded-lg hover:bg-snit-surface transition"
          >
            my drops
          </Link>
        </div>
      </div>

      <div className="fixed bottom-6 left-6 text-xs text-snit-muted">
        powered by zora
      </div>
    </main>
  );
}