# PRD: Codebase Standards Refactor

## Problem Statement

The Spotify Playlist Manager ("Vibecrafter") codebase has grown organically through multiple feature phases and currently suffers from significant standards violations that make the code difficult to read, maintain, and extend. Key pain points include:

- **Data fetching is entirely manual** — every API call uses raw `fetch` + hand-managed `useState` for loading, error, and data, creating massive boilerplate and inconsistent error handling across the app.
- **`react-query` v3 is installed but never used** — the modern `@tanstack/react-query` v5 should be adopted instead.
- **React Compiler is not enabled** — despite running Next.js 16 + React 19, the compiler is off, and manual `useMemo` calls litter the code.
- **Monolith components** — `save-panel.tsx` is 772 lines with 15+ `useState` calls handling three entirely separate flows (create, update, delete). `playlist-builder.tsx` is 358 lines mixing auth, parsing, fetching, and rendering.
- **shadcn is available but underused** — native `<input type="checkbox">`, `window.confirm()`, hand-rolled dropdown overlays, and custom error banners exist where shadcn provides `Checkbox`, `AlertDialog`, `Command`, and `Alert`.
- **No theme switcher** — dark mode CSS variables are fully defined but unreachable; no toggle or theme provider exists.
- **Hardcoded magic strings everywhere** — Spotify brand colors (`#1DB954`), app name, enum values like `'create' | 'update' | 'delete'` are inline throughout components.
- **Unsafe type assertions** — `as Error`, `as ResolvedTrack[]`, `as 'create' | 'update'` bypass TypeScript safety throughout the codebase.
- **Duplicate code** — `SpotifySearchResponse` is defined identically in two API routes; track row markup is duplicated across three components; error banners are copy-pasted.
- **`console.error` in components** — no structured logging on the client side.
- **Zustand installed but unused** — dead dependency.
- **SEO metadata is still the Next.js boilerplate** — "Create Next App".

The net effect: the developer (user) "can't understand what is going on to save their life."

## Solution

A comprehensive, gated refactor across the entire codebase that delivers:

1. **TanStack Query v5** as the single data-fetching layer, with typed hooks for every API route.
2. **React Compiler** enabled — all manual memoization removed.
3. **Component decomposition** — monoliths broken into focused, single-responsibility components.
4. **shadcn everywhere** — all native HTML elements replaced with design-system primitives.
5. **next-themes** with a system-default theme toggle.
6. **`as const` enum objects** as the single source of truth for all string unions, with Zod schemas derived from them.
7. **A constants file** for all app strings (name, tagline, API paths, error codes).
8. **CSS variables for Spotify brand colors** instead of hardcoded hex values.
9. **Zero `as` type assertions** in component code — replaced by type guards and Zod validation.
10. **A reusable `TrackCard` component** used everywhere tracks are displayed.
11. **Structured client logging** — API errors logged via `console.error` in TanStack Query `onError` callbacks.
12. **Toast notifications (sonner)** for save/delete success and API errors; inline `Alert` for validation errors.
13. **Shared types** — all duplicate Spotify API interfaces consolidated into one file.

## User Stories

1. As a developer, I want all client-side data fetching to go through typed TanStack Query hooks, so that loading, error, caching, and refetching states are handled consistently without boilerplate.
2. As a developer, I want the React Compiler to be enabled, so that I never need to manually write `useMemo` or `useCallback`.
3. As a developer, I want `save-panel.tsx` decomposed into `CreatePlaylistForm`, `UpdatePlaylistForm`, and `DeletePlaylistForm`, so that each form is self-contained and under 200 lines.
4. As a developer, I want `playlist-builder.tsx` decomposed so that parsing logic, track pasting, and auth checking are in separate units.
5. As a developer, I want a `TrackCard` component used by `TrackList`, `AddTrackSearch`, and `UpdatePlaylistForm`, so that the track row markup is defined once.
6. As a developer, I want all native `<input type="checkbox">` elements replaced with shadcn `Checkbox`, so that the design language is consistent.
7. As a developer, I want `window.confirm` replaced with shadcn `AlertDialog`, so that destructive actions use a styled, accessible confirmation modal.
8. As a developer, I want the hand-rolled search results dropdown in `AddTrackSearch` replaced with shadcn `Command`, so that it follows the standard combobox pattern.
9. As a developer, I want all hand-rolled error/warning `<div>`s replaced with shadcn `Alert`, so that error presentation is consistent.
10. As a user, I want a theme toggle in the header that switches between light, dark, and system modes, so that I can use the app in my preferred color scheme.
11. As a developer, I want all Spotify brand colors defined as CSS custom properties (`--color-spotify`, `--color-spotify-hover`), so that they adapt to theme and are maintained in one place.
12. As a developer, I want a `lib/constants.ts` file with `as const` enum objects for all string unions (save mode, visibility, track status, failed reason, auth status, etc.), so that all string values have a single source of truth.
13. As a developer, I want Zod schemas derived from `as const` objects rather than defining string unions inline, so that types and runtime validation share the same source of truth.
14. As a developer, I want all `as` type assertions removed from component code and replaced with type guards (`isResolved`, `isFailed`) and a `getErrorMessage` utility, so that TypeScript safety is preserved.
15. As a developer, I want a `lib/type-guards.ts` module with reusable type-narrowing functions, so that type assertions are never needed in component code.
16. As a developer, I want all duplicate Spotify API interfaces (`SpotifySearchResponse`, `SpotifyTrack`, etc.) consolidated into `lib/spotify-types.ts`, so that each type is defined exactly once.
17. As a developer, I want `parseTracks` extracted into a pure function in `lib/track-parser.ts`, so that parsing logic is testable in isolation without React.
18. As a user, I want save and delete success feedback shown as a toast notification that auto-dismisses and resets the form, so that I can immediately perform another action without refreshing.
19. As a user, I want validation errors (e.g., "playlist name required") shown as inline `Alert` components next to the relevant field, so that I know exactly what to fix.
20. As a user, I want API failures (e.g., "Spotify rate limited") shown as a destructive toast and logged to the console, so that transient errors don't block the UI.
21. As a developer, I want all app-level strings (app name, tagline, descriptions) in `lib/constants.ts`, so that copy changes require editing one file.
22. As a developer, I want the SEO metadata in `layout.tsx` to reflect the actual app name and purpose, so that the app is properly indexed.
23. As a developer, I want the `react-query` v3 dependency removed and the `zustand` dependency evaluated, so that no dead dependencies remain.
24. As a developer, I want `console.error` calls in component files replaced with structured logging via TanStack Query's `onError` callbacks or a client logger utility, so that error reporting is consistent.
25. As a developer, I want a `useDebouncedValue` hook, so that search debouncing is reusable and not hand-rolled in `useEffect`.
26. As a developer, I want all API route paths used by hooks stored as constants, so that a URL change only needs one edit.
27. As a developer, I want every phase of this refactor gated by `pnpm lint && pnpm typecheck && pnpm build`, so that regressions are caught immediately.
28. As a developer, I want a `Providers` wrapper component for `QueryClientProvider` and `ThemeProvider`, so that layout.tsx stays clean and providers are centralized.

## Implementation Decisions

### Module Design

| Module                                     | Responsibility                                         | Deep/Shallow                                                           |
| ------------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `lib/constants.ts`                         | `as const` enums, app strings, API paths               | Deep — single source of truth for all string values                    |
| `lib/spotify-types.ts`                     | All Spotify API response/request interfaces            | Deep — one definition per type, imported everywhere                    |
| `lib/type-guards.ts`                       | `isResolved`, `isFailed`, `getErrorMessage`            | Deep — small interface, reused across all components                   |
| `lib/track-parser.ts`                      | `parseTracks(raw) → { tracks, warnings, error }`       | Deep — pure function, no React dependency, independently testable      |
| `hooks/use-session.ts`                     | Auth state via TanStack `useQuery`                     | Deep — hides fetch/cache/retry behind `{ isAuthenticated, isLoading }` |
| `hooks/use-playlists.ts`                   | Playlist list via TanStack `useQuery`                  | Deep                                                                   |
| `hooks/use-playlist-tracks.ts`             | Playlist track fetching via TanStack `useQuery`        | Deep                                                                   |
| `hooks/use-search-tracks.ts`               | Spotify search with debounce via TanStack `useQuery`   | Deep                                                                   |
| `hooks/use-resolve-tracks.ts`              | Track resolution via TanStack `useMutation`            | Deep                                                                   |
| `hooks/use-save-playlist.ts`               | Save/create via TanStack `useMutation`                 | Deep                                                                   |
| `hooks/use-delete-playlist.ts`             | Delete via TanStack `useMutation`                      | Deep                                                                   |
| `hooks/use-logout.ts`                      | Logout + invalidate session via TanStack `useMutation` | Deep                                                                   |
| `hooks/use-debounced-value.ts`             | Generic debounce util                                  | Deep                                                                   |
| `components/providers.tsx`                 | QueryClient + ThemeProvider wrapper                    | Shallow — just wiring                                                  |
| `components/track-card.tsx`                | Single track row (resolved or failed variant)          | Deep — one component for all track displays                            |
| `components/track-paste-form.tsx`          | Textarea + parse + resolve trigger                     | Shallow — consumes `useResolveTracks`                                  |
| `components/save/create-playlist-form.tsx` | Name + visibility + save for new playlist              | Shallow — consumes `useSavePlaylist`                                   |
| `components/save/update-playlist-form.tsx` | Select playlist + track checkboxes + preview + save    | Shallow — consumes multiple hooks                                      |
| `components/save/delete-playlist-form.tsx` | Select playlist + AlertDialog + delete                 | Shallow — consumes `useDeletePlaylist`                                 |
| `components/save/save-success.tsx`         | _(Removed — replaced by sonner toasts)_                | N/A                                                                    |
| `components/theme-toggle.tsx`              | Sun/Moon button using `next-themes`                    | Shallow                                                                |

### Architectural Decisions

- **Enum pattern**: All string unions use `as const` objects. Zod schemas are derived from these objects using `z.enum(Object.values(ENUM))`. Types are derived as `(typeof ENUM)[keyof typeof ENUM]`.
- **Error handling**: Validation errors → inline shadcn `Alert`. API errors → sonner destructive toast + `console.error` in `onError`. No raw `try/catch` + `setState` patterns.
- **Success feedback**: Sonner toast + form auto-reset. No full-card takeover.
- **Theme**: `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`.
- **Spotify colors**: CSS custom properties `--color-spotify` / `--color-spotify-hover` in both `:root` and `.dark`, consumed via Tailwind `bg-spotify` / `hover:bg-spotify-hover`.
- **Track state ownership**: `playlist-builder.tsx` remains the single owner of the `tracks` array state; sub-components receive it via props.
- **TanStack Query key convention**: `['session']`, `['playlists']`, `['playlist-tracks', playlistId]`, `['search-tracks', debouncedQuery]`.
- **No `useMemo` / `useCallback`**: React Compiler handles all memoization.

## Testing Decisions

### What makes a good test

Tests should verify **external behavior** (inputs → outputs, rendered UI), not implementation details (internal state, hook internals). Tests should be resilient to refactors — if the behavior doesn't change, the test shouldn't break.

### Modules to test

1. **`lib/track-parser.ts`** — Pure function, highest test value. Test cases:
   - Line format parsing (happy path, missing delimiter, empty lines, multiple formats).
   - JSON array parsing (valid, missing fields, invalid JSON, non-array).
   - Edge cases (empty input, whitespace-only, mixed valid/invalid).

2. **`lib/type-guards.ts`** — Pure predicates. Test `isResolved`, `isFailed`, `getErrorMessage` with valid and invalid inputs.

3. **`lib/constants.ts`** — Verify enum objects are exhaustive and `as const` (compile-time check, no runtime test needed).

### Prior art

No test framework is currently installed. A test runner (likely Vitest given the Vite-adjacent Next.js tooling) would need to be added to `devDependencies`. This is a separate effort — the PRD focuses on making the code **testable** by extracting pure functions and deep modules, not on writing the tests yet.

## Out of Scope

- **Writing unit/integration tests** — this PRD makes the code testable; a separate effort installs a test runner and writes tests.
- **Adding new features** — no new user-facing functionality; this is a pure standards cleanup.
- **Drag-to-reorder tracks** — the "coming soon" label stays.
- **Favicon/OG image updates** — user will handle separately.
- **Zustand adoption** — kept as a dependency but not wired into any state. Removed if unused by end of refactor.
- **`lib/logger.ts` refactor** — the server-side logger is well-structured; only client-side logging is addressed.
- **API route restructuring** — route file structure stays as-is; only imports and duplicate interfaces change.

## Further Notes

- The refactor will be executed in **6 gated phases**, each ending with `pnpm lint && pnpm typecheck && pnpm build`. No phase starts until the prior one passes all gates.
- Phase order reflects dependency graph: Foundation → Shared Types → Hooks → shadcn Installs → Component Decomposition → Final Polish.
- The existing `plans/playlist-crud-no-llm-plan.md` documents the feature phases that produced the current code; this PRD is the cleanup pass over that output.
