import { BuilderShell } from '@/components/builder-shell';

/**
 * Playlist builder route. Chrome (TopBar + page container) comes from
 * `app/(app)/layout.tsx` and the auth gate lives there too, so this file
 * renders content only — a thin server shell around the client-side
 * `BuilderShell`.
 */
export default function Home() {
  return <BuilderShell />;
}
