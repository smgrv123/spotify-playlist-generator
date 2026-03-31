# Spotify Playlist Manager

A full-stack Next.js application that helps you manually create, update, and manage Spotify playlists from your own track lists.

---

## 🚀 Setup & Local Deployment

### 1. Environment Variables

Copy `.env.example` to `.env.local` and populate the required keys:

```bash
cp .env.example .env.local
```

You will need the following API:

- **Spotify Developer App**: Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

### 2. Spotify OAuth Configuration (Crucial)

In your Spotify Developer Dashboard for your app, you **MUST** whitelist your exact local redirect URI under the "Redirect URIs" configuration block.

For local development across Next.js 15, cookies and redirects are strictly domains-bound.
Make sure your `.env.local` contains exactly:

```env
APP_BASE_URL="http://127.0.0.1:3000"
SPOTIFY_REDIRECT_URI="http://127.0.0.1:3000/api/auth/callback"
```

**Do not** use `localhost` in the dashboard or your `.env.local` unless you explicitly map it everywhere, otherwise you will encounter `INVALID_STATE` or `INVALID_CLIENT` OAuth exceptions.

### 3. Run the App

```bash
npm install
npm run dev
```

Navigate to [http://127.0.0.1:3000](http://127.0.0.1:3000).

---

## 🛑 Troubleshooting & Operations

Our backend structured logging drops secure identifiers and correlation ids to stdout for tracking API paths. If you encounter issues, check your server console log.

### "INVALID_STATE" during Login

Usually implies you visited the site via `localhost:3000` but your `.env.local` configured the redirect via `127.0.0.1` (or vice versa). Always use exactly `http://127.0.0.1:3000/` in your browser URL bar.

### "INVALID_CLIENT: Invalid redirect URI"

The `SPOTIFY_REDIRECT_URI` exactly as typed in your `.env.local` must be listed byte-for-byte in the allowed redirect URIs on your Spotify Developer Dashboard.

### Spotify "401 Unauthorized"

The platform intelligently uses `isAccessTokenExpiringSoon` to preemptively refresh via `/api/token`. If a 401 still leaks through, the interceptor inside `lib/spotify-client.ts` will force a refresh and instantly retry your request invisibly once. If your refresh token is entirely revoked, you will be booted back to the login screen.

### Spotify "429 Too Many Requests"

The resolver API (`/api/spotify/resolve`) bounds concurrent connections to batches of 10. If the Spotify API hits a rate limit anyway, the internal `spotifyFetch` wrapper automatically halts processing, reads the `Retry-After` header, waits deterministically, and attempts to resume.

---

## 🔒 Known limitations in Spotify Development Mode

While your Spotify API application is designated "Development Mode" (before requesting a quota extension from Spotify), **only users explicitly added to your application's "User Management" list in the dashboard can log in.** If a friend tries to use your localhost app without being added to that dashboard list, they will face an instant `403 Forbidden` error from the Spotify consent screen.

---

### Phase Delivery Rules (Internal Context)

- We strictly avoid monolithic PRs. Everything is scoped down through rigorous `Phase XY` blocks in `task.md`.
- No UI shells are built until the absolute backing structure (Auth, API) is complete.
- 2026 Warning: **DO NOT USE NEXT.JS 13/14 PAGE ROUTERS.** We use 2026 Next.js 15 App router natively with standard `fetch` syntax.
