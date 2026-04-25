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

// Inline script runs BEFORE React hydrates → no light/dark flash on load.
// Only adds .dark if user explicitly chose it before. Default = light.
const themeInit = `
(function(){
  try {
    if (localStorage.getItem('snit-theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
