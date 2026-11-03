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

- [x] `react-query` v3 is removed from `package.json`.
- [x] `@tanstack/react-query` v5 and `next-themes` are installed.
- [x] `reactCompiler: true` is set in `next.config.ts`.
- [x] `Providers` component wraps the app with both providers.
- [x] Layout metadata reflects actual app name and description from constants.
- [x] Spotify brand colors use CSS variables; zero hardcoded hex values remain. — _Superseded: the `--color-spotify` tokens were replaced by the redesign's token rewire (`--accent` etc.); the zero-hex intent holds (`plans/playlist-builder-redesign-prd.md:75`)._
- [x] Theme toggle in the header cycles light → dark → system. — _Superseded: toggle is now a binary sun/moon button, system respected at initial load only (`plans/playlist-builder-redesign-prd.md:78`)._
- [ ] App renders correctly in both light and dark modes. _(Manual verification pending.)_
- [x] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

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

- [x] `lib/constants.ts` exists with all `as const` enum objects. — _Superseded in part: `SAVE_MODE` was removed by `plans/playlist-management-pages-plan.md` Phase 6 (update strategy lives in `UPDATE_MODE`); no auth-status string union exists to enumerate: auth state is `SessionResponse` in `lib/types.ts` (`authenticated: boolean` plus `user: UserProfile | null`), which is not a string union._
- [x] Zod schemas derive enums from `as const` objects; no inline string union arrays in schemas.
- [x] `lib/spotify-types.ts` exists; no duplicate Spotify interface definitions remain across route files.
- [x] `lib/type-guards.ts` exists with `isResolved`, `isFailed`, `getErrorMessage`.
- [x] All API routes import from shared modules.
- [x] Zero `as Record<string, unknown>` casts remain in `lib/api-response.ts`. — `return {} as T` in `lib/spotify-client.ts` (empty 2xx body) stays deliberately: the JSON boundary is untyped, so `T` is the caller's assertion.
- [x] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

---

## Phase 3: Auth Flow

**User stories**: 1 (partial), 24 (partial)

### What to build

Create `hooks/use-session.ts` wrapping `GET /api/auth/session` in a `useQuery` call, returning `{ isAuthenticated, isLoading }`.

Create `hooks/use-logout.ts` wrapping `POST /api/auth/logout` in a `useMutation`, invalidating the session query on success.

Rewrite `playlist-builder.tsx` to use `useSession()` and `useLogout()` instead of the current manual `useEffect` + `useState` pattern for auth checking and logout. Remove all manual loading/error state for auth.

### Acceptance criteria

- [x] `useSession` hook exists and returns typed auth state. — _Superseded in part: returns `{ user }`, where `user` is `SessionResponse['user']` from `lib/types.ts`, rather than `{ isAuthenticated, isLoading }`. Nothing consumes those flags: `UserChip` is the only caller and reads `user`, and the `(app)` layout's server-side redirect owns auth gating. The PRD's proposed `useUser` hook (`plans/playlist-builder-redesign-prd.md:86`, "expose `user`") was not built; `useSession` exposes `user` directly._
- [x] `useLogout` hook exists and invalidates session on success. — _Superseded in part: on success it also resets the builder draft and calls `queryClient.clear()` (drops the session and every other user-scoped cache, with no refetch) before routing to `/login`; an explicit sign-out must not leak the draft to the next account, unlike the 401 path which preserves it for restore. Restored after the redesign dropped it (`plans/playlist-builder-redesign-prd.md:31`, story 4: "can log out from there")._
- [x] `playlist-builder.tsx` uses hooks; no manual `fetch` for session/logout. — _Superseded: `playlist-builder.tsx` was replaced by `components/builder-shell.tsx` + `components/top-bar.tsx` / `components/user-chip.tsx`; logout is the `UserChip` icon button calling `useLogout()`, and no component calls `fetch` for session/logout (`plans/playlist-builder-redesign-plan.md`)._
- [ ] Auth flow is demoable: loading → unauthenticated → login → authenticated → logout. _(Manual verification pending.)_
- [x] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

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

- [x] `lib/track-parser.ts` exists as a pure function with no React dependency.
- [x] `TrackCard` component renders both resolved and failed track variants.
- [x] `TrackList` uses `TrackCard`; no duplicate track row markup remains.
- [x] `useResolveTracks` hook exists.
- [x] `TrackPasteForm` is self-contained; `playlist-builder` renders it as a child. — _Superseded: `playlist-builder.tsx` was replaced by `components/builder-shell.tsx`, which renders `TrackPasteForm` as a child (`plans/playlist-builder-redesign-plan.md`, Phase 3)._
- [x] Error/warning banners in the paste form use shadcn `Alert`.
- [x] No `as` type casts exist in the new components.
- [x] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

---

## Phase 5: Track Search + Command

**User stories**: 1 (partial), 8, 25

### What to build

Create `hooks/use-debounced-value.ts` — a generic `useDebouncedValue<T>(value, delay)` hook.

Create `hooks/use-search-tracks.ts` wrapping `GET /api/spotify/search` in a `useQuery` with the debounced query as key, enabled only when the debounced value is non-empty.

Install shadcn `Command` component. Rewrite `AddTrackSearch` to use shadcn `Command` (combobox pattern) instead of the hand-rolled dropdown overlay. Use `useSearchTracks` + `useDebouncedValue` instead of the manual `useEffect` debounce. Remove `console.error` — use `onError` callback or structured error handling.

### Acceptance criteria

- [x] `useDebouncedValue` hook exists and is generic. — _Superseded: the debounce lives inside `useSearchTracks`, its only consumer; a generic hook for a single call site is an unneeded abstraction (global "no new abstraction for a single call site" rule)._
- [x] `useSearchTracks` hook exists with debounced query key.
- [x] `AddTrackSearch` uses shadcn `Command` for the search results dropdown. — Built on `components/ui/command.tsx` (`shouldFilter={false}`: results are server-side). The generated file was trimmed: registry's `cn` import repointed to `@/lib/utils` (and the stray `cn` npm package dropped), `CommandDialog`/InputGroup wrapper/check icon removed, so the CLI's `dialog.tsx` + `input-group.tsx` were not kept.
- [x] No manual `useEffect` debounce or hand-rolled dropdown markup remains. — The component has no effect/ref/outside-click listener; outside-click is input blur (rows never take focus), Escape closes via `onKeyDown`. The debounce `useEffect` + `setTimeout` is inside `useSearchTracks` (see above).
- [x] No `console.error` in the component. — The hook's `console.error` + sonner toast is the plan's API-error pattern.
- [x] `TrackCard` is reused for rendering search result items.
- [x] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.
- [ ] Manual verification: keyboard nav (ArrowUp/Down moves the highlight, Enter adds it, Enter/arrows skip "Added" rows, Escape closes, ArrowDown reopens) and the redesign Phase 7 look (icon-left input, trailing spinner, shadow panel, 50% "Added" rows, click-outside closes) on both the builder refine step and the playlist add-tracks panel. _(Needs a browser; pending.)_

---

## Phase 6: Save Flow — Create Playlist

**User stories**: 1 (partial), 18, 19, 20 (partial)

### What to build

Create `hooks/use-save-playlist.ts` wrapping `POST /api/spotify/playlist/save` in a `useMutation`.

Install and configure `sonner` in the `Providers` component. Create `CreatePlaylistForm` component with playlist name input, visibility radio (using the `as const` enum), and save button. Uses `useSavePlaylist()`. On success: shows toast via sonner and auto-resets the form. On API error: shows destructive toast + `console.error`. Validation errors shown via inline shadcn `Alert`.

### Acceptance criteria

- [x] `useSavePlaylist` hook exists.
- [x] Sonner is configured in `Providers`.
- [x] `CreatePlaylistForm` is a self-contained component. — `components/save/create-playlist-form.tsx` (+ `save-success-state.tsx`) owns the save mutation, success state and errors; the draft's tracks/name/visibility come in as props because `BuilderShell` owns and persists the draft.
- [x] Success triggers a sonner toast and form reset (no card takeover). — _Superseded: a successful create renders the unified success state ("Open in Spotify" / "Build another") via `SaveSuccessState`, and minor successes get no toast (`plans/playlist-builder-redesign-plan.md`, Phase 12; `plans/playlist-builder-redesign-prd.md:61,166`)._
- [x] API errors show destructive toast + console log. — _Superseded: step-local failures such as save render as an inline destructive `Alert`; toasts (and the `console.error`) are reserved for cross-cutting failures like a 401 (`plans/playlist-builder-redesign-prd.md:107-111`; `plans/playlist-builder-redesign-plan.md`, Phase 14)._
- [x] Validation errors show inline shadcn `Alert`. — Server-returned save errors (including 400 validation messages) and the "unresolved tracks will be skipped" warning render as inline `Alert`s; an empty name or zero resolved tracks is prevented by disabling the save button.
- [x] No `as` type casts in the component. — The `RadioGroup` value cast in the shared `PlaylistMetaFields` was replaced by the `isVisibility` guard (Phase 9).
- [x] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

---

## Phase 7: Save Flow — Update Playlist

**User stories**: 1 (partial), 6, 19, 20 (partial)

### What to build

Create `hooks/use-playlists.ts` wrapping `GET /api/spotify/playlists` in a `useQuery`.

Create `hooks/use-playlist-tracks.ts` wrapping `GET /api/spotify/playlist/tracks` in a `useQuery`, enabled when a playlist ID is selected.

Install shadcn `Checkbox`. Create `UpdatePlaylistForm` component with: playlist selector, playlist name input, current tracks checklist (shadcn `Checkbox`), new tracks checklist, deduped final preview (read-only `TrackList`), and save button. Uses `usePlaylists()`, `usePlaylistTracks()`, `useSavePlaylist()`. Success/error handling via sonner + `Alert`, same pattern as Phase 6.

### Acceptance criteria

- [x] `usePlaylists` and `usePlaylistTracks` hooks exist.
- [x] shadcn `Checkbox` replaces all native `<input type="checkbox">`. — Zero native checkboxes remain. _Superseded in part: the checklist UI was removed with `save-panel.tsx` (`plans/playlist-management-pages-plan.md`, Phase 6); the replacement editor was built on `TrackList` in Phase 4 of that plan. `components/ui/checkbox.tsx` had no consumer; the unused file has since been deleted._
- [x] `UpdatePlaylistForm` is a self-contained component. — _Superseded: editing an existing playlist moved to the `/playlists/[id]` detail editor (`PlaylistDetail` + `usePlaylistEditor`); the builder is create-only (`plans/playlist-management-pages-plan.md`, Phases 4 and 6)._
- [x] Track selection, dedup, and preview work correctly. — _Superseded: the detail editor edits one ordered row list directly (drag, remove, add via paste/search, diff in `UnsavedChangesBar`), and duplicate URIs are deliberately preserved, not deduped (`plans/playlist-management-pages-plan.md:190`)._
- [x] `TrackCard` is reused for track rows in checkboxes. — _Superseded in part: no checkboxes (see above); the editor's rows render through `TrackList`, which renders `TrackCard`._
- [x] Success/error via sonner + Alert pattern. — _Superseded: the detail editor surfaces errors as inline destructive `Alert`s with no toasts; success is the unsaved-changes bar clearing at the save mutation's `onSuccess`, where the baseline advances, not on the refetch (`plans/playlist-management-pages-plan.md`, Phase 6, "Two consequences")._
- [x] No `as` type casts in the component.
- [x] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

---

## Phase 8: Save Flow — Delete Playlist

**User stories**: 1 (partial), 7, 19, 20 (partial)

### What to build

Create `hooks/use-delete-playlist.ts` wrapping `POST /api/spotify/playlist/delete` in a `useMutation`. Invalidates the playlists query on success.

Install shadcn `AlertDialog`. Create `DeletePlaylistForm` component with: playlist selector (reusing `usePlaylists()` from Phase 7), shadcn `AlertDialog` for confirmation (replaces `window.confirm`), and delete button. Success/error via sonner toast pattern.

### Acceptance criteria

- [x] `useDeletePlaylist` hook exists.
- [x] shadcn `AlertDialog` replaces `window.confirm`. — `PlaylistDetailHeader` confirms through `AlertDialog`.
- [x] `DeletePlaylistForm` is a self-contained component. — _Superseded: delete lives on the `/playlists/[id]` detail page (`PlaylistDetailHeader` + `AlertDialog`); the builder's Delete mode was removed (`plans/playlist-management-pages-plan.md`, Phases 4 and 6)._
- [x] Delete success removes the playlist from the list (via query invalidation). — `useDeletePlaylist` invalidates `QUERY_KEYS.playlists.all` on success, and `PlaylistDetail` then routes to `/playlists`.
- [x] Success/error via sonner toast pattern. — _Superseded: delete errors render as an inline destructive `Alert` in `PlaylistDetailHeader` and success routes back to `/playlists`; no toasts (`plans/playlist-management-pages-plan.md:163`)._
- [x] No `as` type casts; no `window.confirm` remains.
- [x] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

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

- [x] `save-panel.tsx` is under 100 lines — a thin orchestrator only. — _Superseded: `save-panel.tsx` was deleted and decomposed into `components/save/create-playlist-form.tsx` + `save-success-state.tsx`; Update/Delete moved to `/playlists/[id]` (`plans/playlist-management-pages-plan.md`, Phase 6)._
- [x] `playlist-builder.tsx` is under 150 lines — orchestration only. — Met on code lines only: `playlist-builder.tsx` is now `components/builder-shell.tsx`, which is 171 lines total / 122 code lines (non-blank, non-comment), measured after the refine step's card moved to `components/refine-step.tsx`. The shell still owns all draft/track state and passes slices + callbacks down as props.
- [x] Zero `useMemo` or `useCallback` in user code (shadcn internals excluded).
- [x] Zero `console.log` / `console.error` / `console.warn` in component files. — The only client-side `console.error`s are in `hooks/use-logout.ts`, `hooks/use-search-tracks.ts` and `lib/query-client.ts` (the API-error pattern).
- [x] Zero `window.confirm` calls.
- [x] Zero `as` type casts in component files (excluding `as const`). — The last one, `value as Visibility` in `PlaylistMetaFields`, now goes through the `isVisibility` guard in `lib/type-guards.ts` (tested in `lib/type-guards.test.ts`).
- [x] Zero hardcoded hex color values. — None in `app/`, `components/`, `hooks/`, `lib/` or any CSS. (Only the unreferenced create-next-app starter SVGs in `public/` carry hex fills.)
- [x] Zero inline string union types (all use `as const` derived types). — `TrackCard`'s `size` now uses `TRACK_CARD_SIZE`, `SeedSyncAction` is derived from `SEED_SYNC_ACTION` (both in `lib/constants.ts`), and `PlaylistItemContent.type` is a plain `string` (Spotify's open-ended vocabulary; the `| string` had already collapsed the old `'track' | 'episode'` literals). The remaining quoted unions are `Omit<…, 'a' | 'b'>` property-key lists (`components/track-list.tsx`, `lib/spotify-client.ts`), not value enums.
- [x] Zustand is either actively used or removed from dependencies. — Absent from `package.json`, the lockfile and all source.
- [x] Gate passes: `pnpm lint && pnpm typecheck && pnpm build`.

_Not built: `lib/client-logger.ts` — superseded; sonner toasts plus the hooks' `onError` handling cover client-side error reporting, so a structured logger has no caller._
