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
// Reads localStorage, falls back to prefers-color-scheme, defaults to light.
const themeInit = `
(function(){
  try {
    var saved = localStorage.getItem('snit-theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      return;
    }
    if (saved === 'light') return;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
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
