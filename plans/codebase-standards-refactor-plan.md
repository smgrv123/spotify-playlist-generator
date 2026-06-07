# Plan: Codebase Standards Refactor

> Source PRD: codebase-standards-refactor-prd

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: No route changes. Existing API routes stay at their current paths (`/api/auth/*`, `/api/spotify/*`). API route paths used by client hooks will be stored in `lib/constants.ts`.
- **Schema**: Zod schemas in `lib/schemas.ts` will be derived from `as const` enum objects in `lib/constants.ts`. Schema structure and field shapes do not change.
- **Key models**: `ResolvedTrack`, `FailedTrack`, `SaveRequest`, `DeletePlaylistRequest`, `ApiError` — all remain as-is. Type aliases stay in `lib/types.ts`, inferred from Zod schemas.
- **Enum pattern**: All string unions use `as const` objects → `type Foo = (typeof FOO)[keyof typeof FOO]` → `z.enum(Object.values(FOO))`. No bare `'a' | 'b' | 'c'` anywhere.
- **Data fetching**: All client-side fetches move to TanStack Query v5 hooks in `hooks/`. Raw `fetch` + `useState` is prohibited in components.
- **Error handling**: Validation errors → inline shadcn `Alert`. API errors → sonner destructive toast + `console.error`. No `try/catch` + `setState` in components.
- **Success feedback**: Sonner toast + form auto-reset. No full-card takeover.
- **Memoization**: React Compiler handles all memoization. No manual `useMemo` / `useCallback`.
- **Spotify colors**: CSS custom properties `--color-spotify` / `--color-spotify-hover` in both `:root` and `.dark`.
- **Theme**: `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`.
- **Track state ownership**: `playlist-builder` remains the single owner of the `tracks` array; sub-components receive via props.
- **Query keys**: `['session']`, `['playlists']`, `['playlist-tracks', playlistId]`, `['search-tracks', debouncedQuery]`.

### Phase execution rules

1. Each phase is blocked by `pnpm lint && pnpm typecheck && pnpm build`.
2. Phases are executed individually, not all at once.
3. After each phase, user reviews code and provides feedback.
4. Only after user approval does the next phase begin.

---

## Phase 1: Foundation + Theme

**User stories**: 2, 10, 11, 21, 22, 28

### What to build

Install TanStack Query v5 and `next-themes`, remove `react-query` v3, enable the React Compiler in the Next.js config. Create a `Providers` client component wrapping `QueryClientProvider` + `ThemeProvider`. Update the root layout to wrap children with `Providers`, fix SEO metadata (title, description) sourced from a new constants file, and add `suppressHydrationWarning` on `<html>`.

Add `--color-spotify` / `--color-spotify-hover` CSS custom properties to `globals.css` for both light and dark themes. Replace all hardcoded `#1DB954` / `#1ed760` across the codebase with the new CSS variable classes.

Create a `ThemeToggle` button component using `next-themes` and add it to the page header.

### Acceptance criteria

- [ ] `react-query` v3 is removed from `package.json`.
- [ ] `@tanstack/react-query` v5 and `next-themes` are installed.
- [ ] `reactCompiler: true` is set in `next.config.ts`.
- [ ] `Providers` component wraps the app with both providers.
- [ ] Layout metadata reflects actual app name and description from constants.
- [ ] Spotify brand colors use CSS variables; zero hardcoded hex values remain.
- [ ] Theme toggle in the header cycles light → dark → system.
- [ ] App renders correctly in both light and dark modes.
- [ ] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

---

## Phase 2: Shared Types, Constants & Type Guards

**User stories**: 12, 13, 14, 15, 16

### What to build

Create `lib/constants.ts` with `as const` enum objects for all string unions used across the codebase: save mode, visibility, track status, failed reason, save response mode, update mode, auth status, API error codes, and API route paths for hooks.

Update `lib/schemas.ts` to derive Zod enums from the `as const` objects instead of inline string arrays.

Create `lib/spotify-types.ts` to consolidate all duplicate Spotify API response interfaces (`SpotifySearchResponse`, `SpotifyTrack`, `SpotifyPlaylistsResponse`, `PlaylistItemContent`, `SpotifyPlaylistTracksResponse`) currently scattered across route files.

Create `lib/type-guards.ts` with `isResolved(track)`, `isFailed(track)`, and `getErrorMessage(err: unknown): string`.

Update all API route files to import from shared type/constant modules. Clean up `as` casts and redundant type assertions in `lib/api-response.ts` and `lib/spotify-client.ts`.

### Acceptance criteria

- [ ] `lib/constants.ts` exists with all `as const` enum objects.
- [ ] Zod schemas derive enums from `as const` objects; no inline string union arrays in schemas.
- [ ] `lib/spotify-types.ts` exists; no duplicate Spotify interface definitions remain across route files.
- [ ] `lib/type-guards.ts` exists with `isResolved`, `isFailed`, `getErrorMessage`.
- [ ] All API routes import from shared modules.
- [ ] Zero `as Record<string, unknown>` casts remain in `lib/api-response.ts`.
- [ ] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

---

## Phase 3: Auth Flow

**User stories**: 1 (partial), 24 (partial)

### What to build

Create `hooks/use-session.ts` wrapping `GET /api/auth/session` in a `useQuery` call, returning `{ isAuthenticated, isLoading }`.

Create `hooks/use-logout.ts` wrapping `POST /api/auth/logout` in a `useMutation`, invalidating the session query on success.

Rewrite `playlist-builder.tsx` to use `useSession()` and `useLogout()` instead of the current manual `useEffect` + `useState` pattern for auth checking and logout. Remove all manual loading/error state for auth.

### Acceptance criteria

- [ ] `useSession` hook exists and returns typed auth state.
- [ ] `useLogout` hook exists and invalidates session on success.
- [ ] `playlist-builder.tsx` uses hooks; no manual `fetch` for session/logout.
- [ ] Auth flow is demoable: loading → unauthenticated → login → authenticated → logout.
- [ ] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

---

## Phase 4: Track Parser + Resolve Pipeline

**User stories**: 1 (partial), 5, 17

### What to build

Extract the `parseTracks` function from `playlist-builder.tsx` into `lib/track-parser.ts` as a pure, framework-agnostic function. Add Zod validation for the JSON input path using the existing track input schema.

Create a reusable `TrackCard` component that renders a single track row (image, title, artist) for both resolved and failed variants via discriminated props. Rewrite `TrackList` to use `TrackCard` internally.

Create `hooks/use-resolve-tracks.ts` wrapping `POST /api/spotify/resolve` in a `useMutation`.

Create `TrackPasteForm` component extracted from `playlist-builder.tsx` — contains the textarea, parse warnings/errors (shadcn `Alert`), and resolve button. Uses `useResolveTracks()` mutation. Replace hand-rolled error `<div>`s with shadcn `Alert`.

Update `playlist-builder.tsx` to render `TrackPasteForm` instead of inline textarea + parse logic.

### Acceptance criteria

- [ ] `lib/track-parser.ts` exists as a pure function with no React dependency.
- [ ] `TrackCard` component renders both resolved and failed track variants.
- [ ] `TrackList` uses `TrackCard`; no duplicate track row markup remains.
- [ ] `useResolveTracks` hook exists.
- [ ] `TrackPasteForm` is self-contained; `playlist-builder` renders it as a child.
- [ ] Error/warning banners in the paste form use shadcn `Alert`.
- [ ] No `as` type casts exist in the new components.
- [ ] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

---

## Phase 5: Track Search + Command

**User stories**: 1 (partial), 8, 25

### What to build

Create `hooks/use-debounced-value.ts` — a generic `useDebouncedValue<T>(value, delay)` hook.

Create `hooks/use-search-tracks.ts` wrapping `GET /api/spotify/search` in a `useQuery` with the debounced query as key, enabled only when the debounced value is non-empty.

Install shadcn `Command` component. Rewrite `AddTrackSearch` to use shadcn `Command` (combobox pattern) instead of the hand-rolled dropdown overlay. Use `useSearchTracks` + `useDebouncedValue` instead of the manual `useEffect` debounce. Remove `console.error` — use `onError` callback or structured error handling.

### Acceptance criteria

- [ ] `useDebouncedValue` hook exists and is generic.
- [ ] `useSearchTracks` hook exists with debounced query key.
- [ ] `AddTrackSearch` uses shadcn `Command` for the search results dropdown.
- [ ] No manual `useEffect` debounce or hand-rolled dropdown markup remains.
- [ ] No `console.error` in the component.
- [ ] `TrackCard` is reused for rendering search result items.
- [ ] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

---

## Phase 6: Save Flow — Create Playlist

**User stories**: 1 (partial), 18, 19, 20 (partial)

### What to build

Create `hooks/use-save-playlist.ts` wrapping `POST /api/spotify/playlist/save` in a `useMutation`.

Install and configure `sonner` in the `Providers` component. Create `CreatePlaylistForm` component with playlist name input, visibility radio (using the `as const` enum), and save button. Uses `useSavePlaylist()`. On success: shows toast via sonner and auto-resets the form. On API error: shows destructive toast + `console.error`. Validation errors shown via inline shadcn `Alert`.

### Acceptance criteria

- [ ] `useSavePlaylist` hook exists.
- [ ] Sonner is configured in `Providers`.
- [ ] `CreatePlaylistForm` is a self-contained component.
- [ ] Success triggers a sonner toast and form reset (no card takeover).
- [ ] API errors show destructive toast + console log.
- [ ] Validation errors show inline shadcn `Alert`.
- [ ] No `as` type casts in the component.
- [ ] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

---

## Phase 7: Save Flow — Update Playlist

**User stories**: 1 (partial), 6, 19, 20 (partial)

### What to build

Create `hooks/use-playlists.ts` wrapping `GET /api/spotify/playlists` in a `useQuery`.

Create `hooks/use-playlist-tracks.ts` wrapping `GET /api/spotify/playlist/tracks` in a `useQuery`, enabled when a playlist ID is selected.

Install shadcn `Checkbox`. Create `UpdatePlaylistForm` component with: playlist selector, playlist name input, current tracks checklist (shadcn `Checkbox`), new tracks checklist, deduped final preview (read-only `TrackList`), and save button. Uses `usePlaylists()`, `usePlaylistTracks()`, `useSavePlaylist()`. Success/error handling via sonner + `Alert`, same pattern as Phase 6.

### Acceptance criteria

- [ ] `usePlaylists` and `usePlaylistTracks` hooks exist.
- [ ] shadcn `Checkbox` replaces all native `<input type="checkbox">`.
- [ ] `UpdatePlaylistForm` is a self-contained component.
- [ ] Track selection, dedup, and preview work correctly.
- [ ] `TrackCard` is reused for track rows in checkboxes.
- [ ] Success/error via sonner + Alert pattern.
- [ ] No `as` type casts in the component.
- [ ] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

---

## Phase 8: Save Flow — Delete Playlist

**User stories**: 1 (partial), 7, 19, 20 (partial)

### What to build

Create `hooks/use-delete-playlist.ts` wrapping `POST /api/spotify/playlist/delete` in a `useMutation`. Invalidates the playlists query on success.

Install shadcn `AlertDialog`. Create `DeletePlaylistForm` component with: playlist selector (reusing `usePlaylists()` from Phase 7), shadcn `AlertDialog` for confirmation (replaces `window.confirm`), and delete button. Success/error via sonner toast pattern.

### Acceptance criteria

- [ ] `useDeletePlaylist` hook exists.
- [ ] shadcn `AlertDialog` replaces `window.confirm`.
- [ ] `DeletePlaylistForm` is a self-contained component.
- [ ] Delete success removes the playlist from the list (via query invalidation).
- [ ] Success/error via sonner toast pattern.
- [ ] No `as` type casts; no `window.confirm` remains.
- [ ] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

---

## Phase 9: Orchestration + Final Cleanup

**User stories**: 3, 4, 23, 24, 26, 27

### What to build

Rewrite `save-panel.tsx` as a thin orchestrator: a mode radio group (using the `as const` enum) and conditional render of `CreatePlaylistForm`, `UpdatePlaylistForm`, or `DeletePlaylistForm`. Remove all 15+ `useState` calls and fetch logic — these now live in sub-components and hooks.

Final cleanup of `playlist-builder.tsx` — ensure it only orchestrates `TrackPasteForm`, `TrackList`, `AddTrackSearch`, and `SavePanel`. Remove any remaining `useMemo`, `as` casts, `console.error`, or `console.log` from all component files.

Create `lib/client-logger.ts` if needed for structured client-side error logging beyond TanStack Query's `onError`.

Evaluate Zustand: if no store was created during the refactor, remove it from `package.json`.

Run final grep verification checks to confirm zero violations remain.

### Acceptance criteria

- [ ] `save-panel.tsx` is under 100 lines — a thin orchestrator only.
- [ ] `playlist-builder.tsx` is under 150 lines — orchestration only.
- [ ] Zero `useMemo` or `useCallback` in user code (shadcn internals excluded).
- [ ] Zero `console.log` / `console.error` / `console.warn` in component files.
- [ ] Zero `window.confirm` calls.
- [ ] Zero `as` type casts in component files (excluding `as const`).
- [ ] Zero hardcoded hex color values.
- [ ] Zero inline string union types (all use `as const` derived types).
- [ ] Zustand is either actively used or removed from dependencies.
- [ ] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.
