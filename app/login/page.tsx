import { BrandMark } from '@/components/brand-mark';
import { TopBar } from '@/components/top-bar';
import { API_ROUTES } from '@/lib/constants';
import { getSpotifyTokens } from '@/lib/cookies';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

function gradientForHue(hue: number) {
  const h2 = (hue + 55) % 360;
  return `linear-gradient(135deg, oklch(0.62 0.17 ${hue}), oklch(0.5 0.16 ${h2}))`;
}

export default async function LoginPage() {
  // If already authenticated, send them straight to the builder.
  const tokens = await getSpotifyTokens();
  if (tokens.accessToken || tokens.refreshToken) {
    redirect('/');
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="grid min-h-[calc(100vh-73px)] place-items-center px-8 py-8">
        <div className="anim-fade-in relative w-full max-w-[440px] overflow-hidden rounded-lg border border-border bg-surface p-10 text-center shadow-pop sm:p-11">
          {/* Animated art strip */}
          <div
            className="-mx-2 mb-6 grid h-[150px] grid-cols-5 gap-1.5 overflow-hidden rounded"
            style={{
              WebkitMaskImage: 'linear-gradient(180deg, black 55%, transparent)',
              maskImage: 'linear-gradient(180deg, black 55%, transparent)',
            }}
            aria-hidden
          >
            {/* Hue values from the design handoff's reference page (green / yellow-green / teal / blue / orange). */}
            {([125, 114, 197, 219, 58] as const).map((hue, i) => (
              <div
                key={i}
                className="anim-float-y rounded-lg"
                style={{
                  background: gradientForHue(hue),
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>

          {/* Brand block */}
          <div className="mb-5 flex justify-center">
            <BrandMark />
          </div>

          <h1 className="display-text mb-2 text-[30px] text-foreground">
            Build playlists, your way.
          </h1>
          <p className="mx-auto mb-7 max-w-[320px] text-[15px] leading-[1.55] text-[color:var(--text-muted)]">
            Paste a track list or search song-by-song, refine the order, then push it straight to
            Spotify.
          </p>

          <Link
            href={API_ROUTES.AUTH_LOGIN}
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-primary px-7 py-4 text-[15px] font-semibold text-accent-contrast shadow-glow transition-all hover:-translate-y-0.5"
          >
            {/* Spotify glyph */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden>
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.32a.75.75 0 0 1-1.03.25c-2.82-1.72-6.36-2.11-10.54-1.16a.75.75 0 1 1-.33-1.46c4.57-1.04 8.49-.59 11.65 1.34.35.21.46.67.25 1.03zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.56-11.97-1.4a.94.94 0 1 1-.54-1.8c4.37-1.32 9.79-.68 13.5 1.6.44.27.58.85.3 1.29zm.13-3.41C15.74 8.31 8.9 8.08 5.1 9.24a1.12 1.12 0 1 1-.65-2.15c4.37-1.33 11.92-1.07 16.22 1.49a1.12 1.12 0 1 1-1.15 1.92l.05-.05z" />
            </svg>
            Connect with Spotify
          </Link>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-[color:var(--text-faint)]">
            <Lock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            Secure OAuth · we never store your password
          </div>
        </div>
      </div>
    </div>
  );
}
