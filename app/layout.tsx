import { Providers } from '@/components/providers';
import { APP_DESCRIPTION, APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { Hanken_Grotesk, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

const hankenGrotesk = Hanken_Grotesk({
  variable: '--font-hanken-grotesk',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
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
