import { PlaylistBuilder } from '@/components/playlist-builder';

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground selection:bg-primary/20">
      <main className="container mx-auto px-4 py-16 sm:py-24 max-w-6xl flex flex-col items-center">
        {/* Header Space */}
        <header className="w-full mb-16 text-center space-y-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            Vibecrafter
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl font-medium max-w-xl mx-auto">
            Create and manage Spotify playlists from your own track lists.
          </p>
        </header>

        {/* Central Application Builder Shell */}
        <div className="w-full">
          <PlaylistBuilder />
        </div>
      </main>
    </div>
  );
}
