# PRD: Playlist Builder Redesign (Vibecrafter handoff migration)

## Problem Statement

Today's Vibecrafter app is a single-page stack of three shadcn `Card`s — Prepare, Refine, Save — all visible at once on every load. Login is a card-state inside the same component, there is no visual hierarchy between draft data and the in-progress action, no real-time preview of what the playlist will look like, no rich landing experience, no album art, no reorder, no per-step navigation, and the dark/light theme is a flat palette swap. The product feels like a form, not a studio.

The user wants the experience the `design_handoff_vibecrafter/` prototype defines: a focused, stepper-driven workspace with a sticky live-preview rail, a polished full-screen login, real album art, drag-to-reorder, a styled success state, and a visual identity that genuinely differs between light and dark modes.

## Solution

Migrate the existing Next.js + shadcn/Tailwind codebase to the handoff's UI while preserving all current functionality (paste/resolve, search-to-add, selective-merge update flow, delete, real Spotify integration, TanStack Query data fetching).

Concretely:

- Rewire the design tokens so shadcn primitives inherit the handoff's palette. Light theme uses the handoff's "Studio" direction (Hanken Grotesk display, 16px radius, rounded-square brand mark, no glow). Dark theme uses the handoff's "Vinyl" direction (Space Grotesk display, 14px radius, circle brand mark, green glow). Theme toggle becomes the identity toggle.
- Replace the three-card stack with a `BuilderShell` containing a top bar, a linear three-step stepper, and a two-pane workspace (active step card on the left, sticky preview rail on the right). Workspace collapses to one column on narrow screens with the rail stacking below.
- Move login to a dedicated `/login` route with a server-side cookie check redirecting unauthed traffic. Login screen is the handoff's centered card with the animated art strip.
- Extend the session endpoint to return Spotify profile data so the top bar can show the user chip with avatar + display name.
- Persist the in-progress draft (tracks, name, visibility, step, maxReached) in `sessionStorage` so a refresh mid-flow doesn't wipe state. Clear it when the user starts a new playlist ("Build another").
- Add real album art to the cover collage (with per-quadrant gradient fallback) and to the track rows.
- Add drag-to-reorder via `@dnd-kit/sortable` on the resolved track list.
- Add a 401 detector in the API client that triggers a `/login` redirect, preserving the draft.
- Toast system (`sonner`) for cross-cutting failures; inline alerts inside step cards for step-local failures.
- Delete confirmation moves from `window.confirm` to a shadcn `AlertDialog`.

## User Stories

1. As an unauthenticated visitor, I want to land on a polished full-screen login with brand presence and an OAuth CTA, so that connecting to Spotify feels like a deliberate first step rather than a form to skip.
2. As an unauthenticated visitor, I want to toggle the theme on `/login` even before signing in, so that the app respects my preference from the first impression.
3. As a returning user, I want to land directly in the builder without seeing the login screen flash, so that I get to work immediately.
4. As an authenticated user, I want to see my Spotify display name and avatar in the top bar, so that I know which account I'm working in and can log out from there.
5. As a user, I want the dark theme to feel visually distinct from the light theme — different display font, different radius, different brand mark — so that switching themes feels like a real mode change.
6. As a user, I want a stepper at the top of the workspace showing me where I am in the flow (Prepare → Refine → Save), so that I always know what's left.
7. As a user, I want to click any step I've already reached to navigate back to it, so that I can revise earlier choices without losing progress.
8. As a user, I want to be prevented from jumping ahead to a step I haven't reached, so that I can't end up on Save with no tracks.
9. As a user pasting a track list in plain text, I want a textarea with clear formatting hints (Title - Artist, or JSON), so that I know what input the system accepts.
10. As a user, I want a "Use a sample list" chip on the prepare step, so that I can demo the app without typing anything.
11. As a user, I want a "Clear" chip on the prepare step, so that I can reset the textarea quickly.
12. As a user, when I click Resolve and all tracks succeed, I want the app to auto-advance to step 2, so that I don't have to click Continue redundantly.
13. As a user, when I click Resolve and zero tracks match Spotify, I want to stay on step 1 and see the unresolved list inline beneath the textarea, so that I can edit my input and try again without leaving the step.
14. As a user, when some tracks resolve and some fail, I want to advance to step 2 and see both groups clearly separated, so that I can act on each group independently.
15. As a user on step 2, I want to search Spotify in a typeahead dropdown beneath an inline search field, so that I can add tracks without leaving the page.
16. As a user, I want search results that already exist in my draft to render at reduced opacity with an "Added" label, so that I don't add duplicates.
17. As a user, I want each resolved track row to show real album art, title, artist, album context, and duration, so that I can recognize the track at a glance.
18. As a user, I want to hover a track row to reveal a drag handle, so that I can reorder my playlist by dragging.
19. As a user, I want to drag a track to a new position and have the new order persist across step navigation, so that my curated order survives going back to step 1.
20. As a keyboard user, I want to reorder tracks without a mouse, so that drag-to-reorder is accessible to me.
21. As a user, I want to hover a track row to reveal a remove button, so that I can drop a track from the draft.
22. As a user, I want unresolved tracks shown in a separate section with a danger-tinted row and an "unresolved" badge, so that I know exactly which tracks won't be saved.
23. As a user, I want the right-hand preview rail to always show the in-progress playlist — cover collage, name, track count, total duration, scrollable track list — so that I can see the result building up in real time.
24. As a user, I want the cover collage to show real album art from up to four resolved tracks, with a deterministic gradient fallback for quadrants whose track has no image, so that the cover always looks intentional.
25. As a user, I want to edit the playlist name directly in the rail at any time during the flow, so that I don't have to wait until step 3 to name it.
26. As a user on step 3, I want three large mode cards (Create new / Update existing / Delete) with icons and short descriptions, so that I can pick my intent in one click.
27. As a user in Create mode, I want a playlist name field and a public/private visibility segmented control, so that I configure the new playlist without leaving the step.
28. As a user in Create mode with unresolved tracks in my draft, I want a warning alert explaining how many tracks will be skipped, so that I'm not surprised by the final track count.
29. As a user in Update mode, I want to pick a target playlist from a styled list, so that I know exactly which playlist I'm updating.
30. As a user in Update mode, I want to see the target playlist's current tracks alongside my new tracks with checkboxes on each, so that I can selectively merge what to keep.
31. As a user in Update mode, I want duplicates between current and new selections to dedupe automatically by URI, so that the merged playlist doesn't have repeated tracks.
32. As a user in Delete mode, I want to pick a target playlist and see a styled danger alert reminding me the action is permanent, so that I don't delete something by accident.
33. As a user in Delete mode, when I click "Delete playlist", I want a confirmation dialog before the delete actually runs, so that I get a second chance to back out.
34. As a user, when save/update/delete succeeds, I want a centered success state with a badge, a mini cover collage (or just a badge for delete), and clear CTAs ("Open in Spotify" + "Build another"), so that I feel the action completed and can move on.
35. As a user clicking "Open in Spotify" after a save, I want to be taken to the real playlist URL in a new tab, so that I can listen immediately.
36. As a user clicking "Build another" after a save, I want all draft state cleared and to land back on step 1, so that I'm not editing the playlist I just saved.
37. As a user, when my Spotify session expires mid-flow, I want to be redirected to `/login` with my draft preserved, so that I can re-authenticate and continue where I left off.
38. As a user, when save or delete fails because of a server error, I want a clear inline alert in the step card explaining what happened, so that I know whether to retry or fix something.
39. As a user, when cross-cutting failures happen (session expired, network down), I want a toast notification, so that I'm informed even if the failure isn't tied to a specific form field.
40. As a user on a narrow screen (≤940px), I want the rail to stack below the step card, so that the layout doesn't break.
41. As a user, I want my draft to survive an accidental page refresh within the same tab, so that I don't lose half an hour of curation.
42. As a user, I don't want a stale draft from yesterday to greet me when I open the app, so that closing the tab counts as starting fresh.

## Implementation Decisions

### Design tokens & theming

- **Token strategy:** Rewire shadcn's existing tokens in `globals.css` so they map to the handoff's semantic names (e.g. shadcn `--primary` → handoff `--accent`, shadcn `--card` → handoff `--surface`, shadcn `--muted-foreground` → handoff `--text-muted`). Add the handoff extras as net-new variables: `--surface-2`, `--surface-inset`, `--accent-strong`, `--accent-soft`, `--accent-contrast`, `--border-strong`, `--text-faint`, `--accent-2`, `--glow`, `--shadow-card`, `--shadow-pop`, `--ring`.
- **Single source of truth:** shadcn primitives (`Button`, `Card`, `Input`, etc.) inherit the new look automatically through the token rewire; no per-component restyling needed for the basic look.
- **Theme = identity:** `:root` selector sets the full Studio token set (palette + Hanken Grotesk display + 16/11/22 radii + rounded-square brand-mark shape + no glow). `.dark` selector overrides to the full Vinyl token set (palette + Space Grotesk display + 14/9/20 radii + circle brand-mark shape + green glow + coral secondary accent). Brand-mark shape and step-num shape are driven by token-controlled border-radius variables, not by separate selectors.
- **Theme provider:** Keep `next-themes` with `attribute="class"` and `defaultTheme="system"`. Theme toggle becomes a binary sun/moon icon button (system preference still respected at initial load).
- **Fonts:** Replace Geist Sans/Mono with Hanken Grotesk (400, 500, 600, 700, 800), Space Grotesk (400, 500, 600, 700), and JetBrains Mono (400, 500, 600) loaded via `next/font/google`. Expose three CSS variables (`--font-body`, `--font-display`, `--font-mono`) and have the theme toggle their `--font-display` value indirectly through the token system.

### Routing & auth

- **Login route:** New `app/login/page.tsx` renders the full-screen login. New `app/page.tsx` (or `app/(builder)/page.tsx`) does a server-side cookie read and redirects to `/login` when no Spotify tokens are present. No client-side flash of builder content.
- **Login top bar:** Reuse the `TopBar` component in unauthenticated mode (brand + theme toggle only, no user chip).
- **Session endpoint:** Extend `app/api/auth/session/route.ts` to call Spotify `/v1/me` when a valid access token is present and return `{ authenticated, user: { displayName, avatarUrl, initials } }`. If the `/me` call fails, return `{ authenticated: true, user: null }` so the top bar gracefully degrades.
- **Session hook:** Extend `useSession` to expose `user`. Add a thin `useUser` hook that reads from the same query data for ergonomics.
- **401 interceptor:** Introduce `lib/api-client.ts` with an `apiFetch` wrapper. On 401, throw a typed `UnauthorizedError`. A shell-level effect catches this (via a query-client mutation cache subscription or an `onError` callback wired into all queries/mutations) and calls `router.push('/login')`. Draft state is already in `sessionStorage`, so it survives the redirect and is restored after re-auth.

### State & persistence

- **Builder state:** Lift the existing component-state pattern (`useState`) into a new `BuilderShell` component. State shape: `{ tracks, name, visibility, step, maxReached, mode, target }`. Drill down to step components and the rail by props.
- **Draft persistence:** New `lib/draft-storage.ts` module exposes `loadDraft()`, `saveDraft(draft)`, `clearDraft()` over `window.sessionStorage`. `BuilderShell` reads the draft on mount (via a `useEffect`/`useSyncExternalStore` to avoid SSR mismatch), writes back on state change (debounced), and clears it when "Build another" is clicked or on a successful delete.
- **Stepper gating:** `maxReached` enforces linear progression. The stepper component disables steps where `index > maxReached`. Step 1 → 2 advance is gated on `resolvedTracks.length > 0`. Successful resolve auto-advances. Going back preserves all draft state.

### Components

- **Restyled in place (APIs preserved):** `TrackCard`, `TrackList`, `AddTrackSearch`, `TrackPasteForm`, `SavePanel`, `ThemeToggle`. New classNames target the design's structure; props and callbacks unchanged.
- **New presentational modules:** `BuilderShell`, `TopBar`, `Stepper`, `PreviewRail`, `CoverCollage`, `StepPrepare`, `StepRefine`, `StepSave`, `StepSuccess`, `LoginScreen`.
- **Cover collage module:** Renders up to four quadrants. For each quadrant: render `next/image` of `track.displayData.imageUrl` when present, else a styled div with `background: coverGradient(track.title + track.artist)`. Quadrants beyond the available track count render as `--surface-2`. Used in both the rail and the success state.
- **Cover-art gradient module:** New `lib/cover-art.ts` exposes `coverGradient(seed: string): string`. Pure function returning a CSS gradient string derived from a stable hash of the seed.
- **Spotify profile module:** New `lib/spotify-me.ts` exposes `fetchProfile(accessToken: string): Promise<UserProfile | null>`. Server-only. Wraps the `/v1/me` call, extracts displayName + the first avatar URL, computes two-letter initials. — _Correction (later): `fetchProfile` is now `fetchSpotifyProfile(): Promise<UserProfile | null>` with no token argument. It calls `spotifyClient.get('/me')`, which reads and refreshes the access token from cookies itself. See `lib/spotify-me.ts`._

### Drag-to-reorder

- Add `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`. Wrap the resolved-track list in `<DndContext>` + `<SortableContext>`. Each `TrackRow` becomes sortable. The grip handle is the drag handle. Keyboard reorder is supported via dnd-kit's keyboard sensor.

### Errors & toasts

- Add `sonner` as a toast dependency. Mount `<Toaster />` in the root providers.
- Inline alerts inside step cards for step-local failures (resolve failed, save failed, delete failed, current-playlist-tracks fetch failed).
- Toasts for cross-cutting failures: session expired (alongside the redirect), generic network failures from queries, anything caught by the API-client interceptor that isn't already shown inline.

### Delete confirmation

- Add the shadcn `AlertDialog` primitive (`components/ui/alert-dialog.tsx`). Replace `window.confirm` in `SavePanel`'s `handleDelete` with the modal.

### Update mode (selective merge)

- Preserve the existing two-checkbox-list selective-merge UX from today's `SavePanel`. Restyle the lists in the new framework (target-playlist picker styled as the design's track-row picker; current/new track lists styled with the new `TrackRow` look). Dedupe-by-URI logic is unchanged.

### Animations

- CSS keyframes in `globals.css` for: `fadeIn` (entrance translateY 10→0 over 0.45s), `pop` (success scale 0.94→1 with spring bezier), `eq` (equalizer bars in the brand mark), `floatY` (login art strip vertical drift).
- Use `tw-animate-css` utility classes for incidental hover/focus animations.
- Respect `prefers-reduced-motion`: keyframe rules gated behind a `@media (prefers-reduced-motion: no-preference)` block where appropriate.

### Mobile

- Workspace grid: `grid-template-columns: 1fr 380px` desktop, single column ≤940px. Rail stacks below the step card. No mobile-specific drawer or sticky summary bar in this PRD.

### Phasing

- Multi-phase tracer-bullet plan, each phase shippable to main on its own:
  1. **Foundation:** token rewire, font swap, theme/identity flip, restyled top bar, restyled `ThemeToggle`.
  2. **Login + identity:** `/login` route, server-side redirect, session endpoint extension, user chip.
  3. **Shell + stepper + rail:** `BuilderShell`, `Stepper`, `PreviewRail`, `CoverCollage`, state lift, draft persistence.
  4. **Step restyles:** restyle `TrackPasteForm`/`AddTrackSearch`/`TrackList`/`TrackCard`/`SavePanel` (including success state + AlertDialog).
  5. **Drag + errors + toasts:** dnd-kit integration, `sonner`, API-client 401 interceptor.

## Testing Decisions

A good test verifies external behavior: given an input, the module returns the expected output, or interacts with its dependencies the expected way. Tests should not assert on internal helpers, private state, or implementation choices that could change without breaking the contract. Prefer tests that would still pass after a reasonable refactor.

There are no existing tests in the codebase. This work adds **Vitest** as the test framework (Next.js-friendly, no extra Babel config) and seeds the testing convention with the four deep-module test suites below.

Modules to test:

1. **`lib/draft-storage.ts`** — `loadDraft`, `saveDraft`, `clearDraft`. Cases: round-trip save/load, missing key returns `null`, malformed JSON returns `null` (does not throw), `clearDraft` removes the key, behavior under absent `window.sessionStorage` (SSR/Node) returns `null` and is a no-op for writes.
2. **`lib/cover-art.ts`** — `coverGradient(seed)`. Cases: same seed always produces the same gradient string (determinism), distinct seeds produce distinct hues, output is a valid CSS `linear-gradient(...)` string, empty-string seed produces a stable default.
3. **`lib/spotify-me.ts`** — `fetchProfile(token)`. Cases: 200 response with display name + avatar returns the full profile, 200 response with no `images` array returns profile with `avatarUrl: null` and initials derived from `display_name`, 401 returns `null`, non-2xx returns `null` (does not throw), missing/empty display name falls back to a sensible default. — _Correction (later): the function is now `fetchSpotifyProfile()`, with no token argument (see the profile module note above)._
4. **`lib/api-client.ts`** — `apiFetch(path, init)`. Cases: 2xx returns parsed JSON, 401 throws typed `UnauthorizedError`, 5xx throws a generic error containing the server message, network failure throws a recognizable error, JSON-parse failure on a 2xx response throws a typed error.

No tests are required for presentational components in this PRD. Those should be exercised by manual verification through the dev server (see Further Notes).

Prior art: none in this repo. The four suites above set the convention for any future tests.

## Out of Scope

- A second runtime "direction" toggle in the top bar (Studio/Vinyl as user-settable). The two directions are bound to theme and not user-toggleable as a separate axis.
- Mobile-first redesign or a custom mobile drawer for the rail. Mobile gets responsive grid collapse only.
- Persisting drafts across browser tabs or across sessions (localStorage, IndexedDB, or server-side). Draft lives in `sessionStorage` only.
- Multi-draft management (saving multiple in-progress playlists). Only one active draft at a time.
- Silent token refresh on 401. The plan redirects to `/login` instead. (Refresh tokens are already in the cookie; using them transparently is a follow-up.)
- Reduced-motion fallback animations beyond gating the existing keyframes — no custom no-motion variants.
- ARIA-rich keyboard-only navigation of the stepper beyond what shadcn primitives provide natively.
- A toast for every minor success (e.g. "Track added"). Toasts are reserved for cross-cutting failures.
- Tests for presentational components, Spotify API routes, or hooks. Only the four deep `lib/` modules are tested.
- Changing the backend save/delete/resolve/search/playlists endpoints beyond the session endpoint extension.

## Further Notes

- The design ships with two "directions" (Studio and Vinyl) intended as design exploration. This PRD binds Studio to light and Vinyl to dark intentionally; the visual identity changes with theme. Reviewers may flag the brand-mark shape morph and display-font swap as unintended — it is intended.
- The existing `SavePanel`'s selective-merge update flow is materially richer than the handoff's "wholesale replace" update mode. The PRD preserves the existing flow and applies the design's visual language on top.
- Manual verification per phase: start `pnpm dev`, log in with a real Spotify account, paste the sample track list, walk through the full flow in both light and dark themes, verify drag-reorder with mouse and keyboard, refresh mid-flow to verify sessionStorage restore, click "Build another" to verify draft clear, and trigger the 401 path (e.g. by clearing the auth cookie in DevTools) to verify the login redirect.
- The `plans/` directory already contains `codebase-standards-refactor-plan.md` and `codebase-standards-refactor-prd.md`. This PRD is independent of that work; sequencing between the two is at the user's discretion.
