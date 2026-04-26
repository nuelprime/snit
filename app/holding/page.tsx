import Image from 'next/image';

export default function HoldingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAF8F4]">
      <Image
        src="/holding.png"
        alt="snit — coming soon"
        width={1080}
        height={1920}
        priority
        className="max-w-full max-h-screen w-auto h-auto"
      />
    </main>
  );
}