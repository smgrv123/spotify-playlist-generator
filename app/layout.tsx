import { Providers } from '@/components/providers';
import { APP_DESCRIPTION, APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Self-hosted (latin subset, variable weight) instead of next/font/google: Google Fonts
// intermittently serves extensionless `/l/font?kit=` URLs that fail `next build`
// (vercel/next.js#99114). ponytail: latin only; add latin-ext files if accented names render in the fallback.
const hankenGrotesk = localFont({
  src: './fonts/HankenGrotesk-latin.woff2',
  variable: '--font-hanken-grotesk',
  weight: '400 800',
  display: 'swap',
});

const spaceGrotesk = localFont({
  src: './fonts/SpaceGrotesk-latin.woff2',
  variable: '--font-space-grotesk',
  weight: '400 700',
  display: 'swap',
});

const jetbrainsMono = localFont({
  src: './fonts/JetBrainsMono-latin.woff2',
  variable: '--font-jetbrains-mono',
  weight: '400 600',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${APP_NAME} — Spotify Playlist Manager`,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          hankenGrotesk.variable,
          spaceGrotesk.variable,
          jetbrainsMono.variable,
          'antialiased'
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
