import { Providers } from '@/components/providers';
import { APP_DESCRIPTION, APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Self-hosted (latin subset) instead of next/font/google: Google Fonts
// intermittently serves extensionless `/l/font?kit=` URLs that fail `next build`
// (vercel/next.js#99114). ponytail: latin only; add latin-ext files if accented names render in the fallback.
const poppins = localFont({
  src: [
    { path: './fonts/Poppins-400-latin.woff2', weight: '400' },
    { path: './fonts/Poppins-500-latin.woff2', weight: '500' },
    { path: './fonts/Poppins-600-latin.woff2', weight: '600' },
    { path: './fonts/Poppins-700-latin.woff2', weight: '700' },
    { path: './fonts/Poppins-800-latin.woff2', weight: '800' },
  ],
  variable: '--font-poppins',
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
    // Font variables live on <html> because globals.css builds the font stacks on :root.
    <html
      lang="en"
      className={cn(poppins.variable, jetbrainsMono.variable)}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
