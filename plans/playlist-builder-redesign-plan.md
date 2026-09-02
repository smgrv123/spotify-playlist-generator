# Plan: Playlist Builder Redesign (Vibecrafter handoff migration)

> Source PRD: `plans/playlist-builder-redesign-prd.md`

## Architectural decisions

Durable decisions that apply across all phases. These are referenced by every phase below; if any of them need to change mid-flight, stop and re-plan.

- **Routes**:
  - `/` — Builder workspace. Server-side cookie check redirects to `/login` when no Spotify tokens are present.
  - `/login` — Full-screen login with brand block + art strip + OAuth CTA.
- **API contract changes**:
  - `GET /api/auth/session` returns `{ authenticated: boolean, user: { displayName: string, avatarUrl: string | null, initials: string } | null }`. Existing consumers tolerate the additional field. If the Spotify `/v1/me` call fails, `user` is `null` and `authenticated` reflects token presence.
  - All other existing routes (`/api/spotify/resolve`, `/api/spotify/search`, `/api/spotify/playlists`, `/api/spotify/playlist/tracks`, `/api/spotify/playlist/save`, `/api/spotify/playlist/delete`, auth callback/login/logout) are unchanged.
- **Key data models**:
  - Existing `ResolvedTrack` and `FailedTrack` from `lib/types.ts` are unchanged.
  - New domain types: `UserProfile { displayName, avatarUrl, initials }`, `Draft { tracks, name, visibility, step, maxReached, mode, target }`.
- **Authentication / authorization**:
  - Cookie-based Spotify OAuth (unchanged backend). Builder route gates on cookie presence server-side. Mid-flow 401s from any API call route through a single typed `UnauthorizedError` and trigger a `/login` redirect with the draft preserved in sessionStorage.
- **Theme & identity**:
  - `next-themes` with `attribute="class"`, `defaultTheme="system"`. Toggle is binary sun/moon.
  - `:root` defines the Studio identity (warm-neutral palette, Hanken Grotesk display, 16/11/22px radii, rounded-square brand mark, no glow). `.dark` overrides to the Vinyl identity (greenish base, Space Grotesk display, 14/9/20px radii, circle brand mark, green glow, coral secondary accent). Brand-mark / step-number shape is driven by a token-controlled border-radius variable, not by separate selectors.
- **Token model**:
  - shadcn semantic tokens are rewired to the handoff's names in-place. The handoff's extras (`--surface-2`, `--surface-inset`, `--accent-strong`, `--accent-soft`, `--accent-contrast`, `--border-strong`, `--text-faint`, `--accent-2`, `--glow`, `--shadow-card`, `--shadow-pop`, `--ring`) are added as net-new CSS variables.
- **State & persistence**:
  - Builder draft state lives in a `BuilderShell` component via `useState` and is drilled by props to step components and the rail.
  - Draft is persisted to `window.sessionStorage` (single key, single active draft). Survives in-tab refresh; lost on tab close. Cleared when the user clicks "Build another" or after a successful delete.
- **Drag-to-reorder**: `@dnd-kit/sortable` on the resolved track list. Mouse + keyboard sensors. Reorder mutates the existing tracks state array; persistence layer picks it up automatically.
- **Errors & toasts**:
  - Inline alerts live inside the step card whose action produced the error.
  - `sonner` toasts are reserved for cross-cutting failures (session expired, generic network failures).
  - 401 detection lives in a single `apiFetch` wrapper that throws typed `UnauthorizedError`; the shell catches and redirects.
- **Testing framework**: Vitest, added in Phase 2 alongside its first test suite. Tests cover the four deep `lib/` modules called out in the PRD.
- **Per-phase gating checks**: every phase ends with `pnpm lint`, `pnpm typecheck`, and (for phases that introduce or modify tests) `pnpm test`. Manual verification via the dev server is required before opening the next phase. The lint-staged pre-commit hook is the floor; CI-equivalent commands must pass clean.

---

## Phase 1: Foundation — design tokens, fonts, theme identity flip, login route

**User stories**: 1, 2, 3, 5

### What to build

End-to-end visual foundation plus the login route. Globals.css is rewritten so `:root` carries the full Studio identity (palette + Hanken Grotesk display + 16/11/22px radii + no glow) and `.dark` overrides to the full Vinyl identity (palette + Space Grotesk display + 14/9/20px radii + green glow). Three Google fonts (Hanken Grotesk, Space Grotesk, JetBrains Mono) are loaded via `next/font/google` and exposed as `--font-body`, `--font-display`, `--font-mono`. The theme toggle changes from a 3-state cycle (light/dark/system) to a binary sun/moon toggle (`system` remains the initial default).

The login screen moves to its own `/login` route with the handoff's centered-card layout (animated art strip + brand block + Spotify CTA + secure-OAuth meta line). A new `/` (builder) route does a server-side cookie check and redirects to `/login` when no Spotify tokens are present. Both routes render a top bar with brand mark (equalizer-bars animation) + theme toggle. No user chip yet, no workspace restyle yet — `PlaylistBuilder` continues to render its existing three-card stack underneath the new top bar.

### Acceptance criteria

- [x] Light mode renders with the Studio palette, Hanken Grotesk display, 16/11/22px radii, rounded-square brand mark.
- [x] Dark mode renders with the Vinyl palette, Space Grotesk display, 14/9/20px radii, circle brand mark, visible green glow on the brand mark.
- [x] Theme toggle is binary; clicking flips theme without cycling through `system`. First-load respects OS preference.
- [x] `/login` renders the handoff's centered-card layout with art strip and Spotify OAuth CTA. Clicking the CTA hits `/api/auth/login`.
- [x] Navigating to `/` while unauthenticated server-side-redirects to `/login` (no client-side flash of builder content).
- [x] Navigating to `/` while authenticated renders the existing builder workspace (unrestyled three-card stack is acceptable in this phase).
- [x] Theme toggle works on both `/` and `/login`.
- [x] `pnpm lint` and `pnpm typecheck` pass clean.
- [x] Manual verification in both themes on `/` and `/login`.

---

## Phase 2: Session profile + user chip + Vitest setup

**User stories**: 4

### What to build

Extend `/api/auth/session` to call Spotify's `/v1/me` when a valid access token is present and return `{ authenticated, user: { displayName, avatarUrl, initials } | null }`. The fetch helper for `/me` becomes its own deep module (`lib/spotify-me.ts`) with a small testable interface. The `useSession` hook surfaces `user`; the top bar renders the user chip (avatar + display name) when `user` is non-null, and renders nothing in that slot otherwise.

This phase also introduces the testing framework (Vitest) and the first test suite, covering `lib/spotify-me.ts`. A `pnpm test` script is added.

### Acceptance criteria

- [x] `GET /api/auth/session` returns the new shape; existing consumers unaffected by the additional field.
- [x] When authenticated with a working Spotify token, the top bar shows the avatar + display name pulled from `/v1/me`.
- [x] When authenticated but `/v1/me` fails, the top bar gracefully omits the user chip; nothing crashes.
- [x] Initials are derived from `display_name` when avatar is missing.
- [x] Vitest is installed and configured; `pnpm test` runs the suite.
- [x] `lib/spotify-me.ts` test suite covers: 200 with display_name + avatar, 200 with no images array, 401, non-2xx, empty display_name.
- [x] `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass clean.
- [ ] Manual verification: log in with a real Spotify account, confirm chip renders.

---

## Phase 3: Builder shell + stepper gating

**User stories**: 6, 7, 8

### What to build

Introduce `BuilderShell` as the top-level component on `/` (authenticated). It owns the new builder state: `{ tracks, name, visibility, step, maxReached, mode, target }`. The current `PlaylistBuilder`'s three-card stack is moved INSIDE the shell as a temporary single-pane layout (no rail yet) — the existing prepare/refine/save cards continue to render unchanged, but only the active step is visible at a time, gated by the stepper.

A `Stepper` component renders the three-step header (Prepare / Refine / Save) with linear gating: steps beyond `maxReached` are disabled. Steps at or below `maxReached` are clickable and navigate to that step. Auto-advance behavior from Phase 6 onward depends on this scaffolding being in place.

### Acceptance criteria

- [x] `BuilderShell` owns the state previously scattered across `PlaylistBuilder`.
- [x] Stepper renders three steps with active/done/disabled visual states (matching the handoff's stepper styling, leveraging the tokens from Phase 1).
- [x] Clicking a reached step navigates to it. Clicking an unreached step is a no-op.
- [x] Only the active step's card is visible at a time; the other two are hidden.
- [x] State (tracks, name, visibility) is preserved when navigating between reached steps.
- [x] `pnpm lint` and `pnpm typecheck` pass clean.
- [ ] Manual verification: walk forward through all three steps, then back, confirming gating and state preservation. _(Deferred: auto-advance lands in Phase 6; until then `maxReached` stays at 0 and the walk-through isn't observable.)_

---

## Phase 4: Preview rail + cover collage + name editor

**User stories**: 23, 24, 25

### What to build

Introduce the right-side sticky preview rail rendered inside `BuilderShell`. The workspace becomes a two-pane grid (active step card left, rail right) at desktop widths. The rail renders the cover collage (2×2 grid of quadrants), a playlist-name input bound to the shell's `name` state, a stats line (`{count} songs · {duration}`), and a scrollable compact track list of resolved tracks.

The cover collage is its own component, fed by the resolved tracks. For each of up to four quadrants: if the track has `displayData.imageUrl`, render `next/image` for it; otherwise render a div with `background: coverGradient(title + artist)`. Quadrants beyond the resolved-track count fall back to `--surface-2`.

The gradient generator is its own deep module (`lib/cover-art.ts`) with a small testable interface. This phase introduces the second test suite.

### Acceptance criteria

- [x] Workspace renders as two columns at ≥941px wide (step card left, rail right). Rail is sticky.
- [x] Cover collage shows real album art for resolved tracks with images.
- [x] Cover collage shows the deterministic gradient for resolved tracks without images.
- [x] Cover collage shows muted placeholder quadrants when fewer than four tracks are resolved.
- [x] Editing the rail's name field updates the shell's `name` state immediately and is reflected if the user later visits the save step.
- [x] Stats line shows the resolved track count and total duration in `{H} hr {M} min` or `{M} min` format.
- [x] Rail's track list scrolls within a bounded height and shows compact rows.
- [x] `lib/cover-art.ts` test suite covers: determinism (same seed → same gradient), distinct seeds → distinct hues, valid CSS gradient output, empty-string seed handled.
- [x] `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass clean.
- [ ] Manual verification: walk steps with a mix of tracks-with-art and tracks-without-art.

---

## Phase 5: Mobile responsive + draft persistence

**User stories**: 40, 41, 42

### What to build

At ≤940px the workspace grid collapses to a single column; the rail un-stickies and stacks below the active step card. Vertical scroll behavior on mobile is verified — rail content (cover, name, stats, track list) remains usable without horizontal overflow.

Introduce `lib/draft-storage.ts` with `loadDraft()`, `saveDraft(draft)`, `clearDraft()` over `window.sessionStorage`. `BuilderShell` reads the draft on mount via `useSyncExternalStore` (or `useEffect` with hydration guard) to avoid SSR mismatch. Writes back on state change, debounced. Clears on "Build another" (wired in a later phase). For now, expose the clear function but leave the trigger for Phase 12.

This phase introduces the third test suite, covering `lib/draft-storage.ts`.

### Acceptance criteria

- [x] At ≤940px, workspace is single-column; rail stacks below the step card.
- [x] Refreshing within the same tab restores `tracks`, `name`, `visibility`, `step`, `maxReached`, `mode`, `target` exactly as left.
- [x] Closing the tab and opening a fresh tab to `/` starts with a clean draft (no stale state).
- [x] No hydration warnings in the console.
- [x] `lib/draft-storage.ts` test suite covers: round-trip save/load, missing key returns null, malformed JSON returns null without throwing, clear removes the key, absence of `window.sessionStorage` (SSR/Node) returns null and writes are no-ops.
- [x] `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass clean.
- [ ] Manual verification: resize the browser to <940px, refresh mid-flow, open in a fresh tab.

---

## Phase 6: Prepare step restyle

**User stories**: 9, 10, 11, 12, 13

### What to build

Restyle the prepare-step card to match the handoff: eyebrow "STEP 01 — IMPORT", h-step heading, descriptive subtext, textarea with focus ring, formatting-hint copy with `<strong>` highlights, "Use a sample list" + "Clear" chip buttons, primary "Resolve tracks" button with wand icon and loading spinner state. `TrackPasteForm` is restyled in place; its props and callbacks are preserved.

Behavior on resolve completion:

- If at least one track resolved successfully, auto-advance to step 2 (setting `maxReached` accordingly).
- If zero tracks resolved (all failed), stay on step 1 and render the unresolved list inline beneath the textarea with the danger-styled rows. User edits and re-resolves; previous unresolved list is replaced on the next resolve attempt.

### Acceptance criteria

- [x] Prepare step matches the handoff's visual layout in both themes.
- [x] "Use a sample list" populates the textarea with the sample track list.
- [x] "Clear" empties the textarea.
- [x] Resolve button shows spinner + "Resolving…" during the API call; disabled when textarea is empty.
- [x] On at least one successful resolve, app auto-advances to step 2.
- [x] On zero successful resolves, stays on step 1; unresolved tracks render inline beneath the textarea as danger-styled rows.
- [x] Re-resolving after a total-fail replaces the inline unresolved list.
- [x] `pnpm lint` and `pnpm typecheck` pass clean.
- [ ] Manual verification: paste the sample list, paste an unmatchable list, paste a mix.

---

## Phase 7: Refine step — search dropdown + partial-fail UX

**User stories**: 14, 15, 16

### What to build

Restyle the refine-step card and its search field. The search input gets the icon-left layout and a loading spinner on the right during search. The dropdown is repositioned beneath the input as an absolute-positioned panel with the handoff's shadow, padding, and row styling. Each result row shows album art + title/artist + an "Add" ghost button. Duplicate-of-existing rows render at 50% opacity with an "Added" label.

When the user arrives at step 2 with a mix of resolved + failed tracks (from Phase 6's auto-advance), both groups are visible: resolved tracks in the main list, failed tracks in a separate "Unresolved" section below (full styling deferred to Phase 8).

### Acceptance criteria

- [x] Refine step layout matches the handoff (eyebrow, h-step, descriptive subtext).
- [x] Search field renders with left-icon + placeholder; spinner appears during search.
- [x] Search dropdown renders as an absolute-positioned panel with the handoff's shadow.
- [x] Search-result rows render album art + title/artist + Add button.
- [x] Duplicate result rows render at 50% opacity with "Added" label and are not addable.
- [x] Clicking a non-duplicate result row adds the track to the top of the resolved list and clears the search input.
- [x] Clicking outside the dropdown closes it.
- [x] Partial-fail draft from Phase 6 renders both resolved and unresolved sections (visual styling of unresolved section is final-styled in Phase 8).
- [x] `pnpm lint` and `pnpm typecheck` pass clean.
- [ ] Manual verification: search for a track, attempt to add a duplicate.

---

## Phase 8: Refine step — track row + remove + unresolved section

**User stories**: 17, 21, 22

### What to build

Restyle `TrackCard` and `TrackList` (preserving their APIs). Each resolved track row in the refine step shows: album art (46×46 with the play-overlay-on-hover), title, artist, album context, duration in mono, and a remove button visible on hover. The grip handle is rendered (Phase 13 wires drag) but functions only as a visual affordance for now — confirm whether to render it now or hold until Phase 13 is up to the implementer; the safer choice is to leave the slot empty and add the handle in Phase 13.

The "Unresolved" section is fully styled: section label + count badge, danger-soft row background, alert icon in place of album art, red title, "No Spotify match found" subtext, "unresolved" badge on the right. The remove button still works.

### Acceptance criteria

- [x] Resolved track row matches the handoff (art, title, artist + album, duration, remove on hover).
- [x] Hovering a track row reveals the remove button; clicking it removes the track from the draft.
- [x] Unresolved section renders with section label + count badge.
- [x] Unresolved rows render with danger-soft background, alert icon, red title, "No Spotify match found" subtext, "unresolved" badge.
- [x] Removing an unresolved track removes it from the draft.
- [x] Track row works in both themes.
- [x] `pnpm lint` and `pnpm typecheck` pass clean.
- [ ] Manual verification: walk through a partial-fail draft, remove tracks from both sections.

---

## Phase 9: Save step — Create mode

**User stories**: 26, 27, 28

### What to build

Restyle the save-step card's mode-selector grid to match the handoff: 3-column grid of mode cards (Create new / Update existing / Delete), each with an icon, title, description. Active card gets the accent border + ring + accent-soft background + accent icon. Delete mode card uses the danger variant when active.

In Create mode (default): playlist name input bound to the shell's `name`, visibility segmented control (Private with lock icon / Public with globe icon) bound to the shell's `visibility`. Unresolved-track warning alert renders above the action bar when the draft contains any failed tracks, with the count.

The action bar at the bottom: between summary text + primary "Save to Spotify" button. Save button shows spinner during the save API call. Update and Delete mode bodies are stubbed in this phase (Phases 10–11 implement them).

### Acceptance criteria

- [x] Mode grid renders three cards with active/inactive visual states matching the handoff in both themes.
- [x] Create card is active by default.
- [x] In Create mode: name input is bound to shell `name`; visibility segmented control is bound to shell `visibility`.
- [x] When `tracks` contains any failed entries, the warning alert renders with the correct count.
- [x] Action bar shows summary text + primary save button.
- [x] Save button is disabled when name is empty or when there are zero resolved tracks.
- [x] Save button shows spinner + "Saving…" while the API call is in flight.
- [x] Successful create save still routes to the existing success-state component (re-styling deferred to Phase 12).
- [x] `pnpm lint` and `pnpm typecheck` pass clean.
- [ ] Manual verification: save a new playlist end-to-end.

---

## Phase 10: Save step — Update mode (selective-merge restyle)

**User stories**: 29, 30, 31

### What to build

Switching to Update mode renders the existing selective-merge flow restyled within the new framework. Target-playlist picker becomes a scrollable list of styled rows (album art derived from playlist name via `coverGradient`, name, track count, checkmark on selected); selected row gets accent border + ring. Picking a target fetches its current tracks (existing behavior).

The two-checkbox-list selective-merge UI is preserved end-to-end: current tracks of the target playlist on top, new tracks from the draft below, each with per-row checkboxes and a "select all" toggle. Dedupe-by-URI happens on the merged set (existing behavior). Action bar at the bottom shows the merged count and a primary "Update playlist" button.

### Acceptance criteria

- [x] Update mode renders the target picker as a styled row list with checkmarks for the selected target.
- [x] Picking a target triggers the existing `/api/spotify/playlist/tracks` fetch.
- [x] Current-tracks list and new-tracks list both render with per-row checkboxes and a select-all toggle.
- [x] Per-row toggle correctly mutates the corresponding selection set.
- [x] Merge dedupes by URI; duplicate count is shown to the user (existing summary preserved).
- [x] Update button is disabled when zero tracks would be saved or when no target is selected.
- [x] Successful update routes through to the existing success-state component (restyle in Phase 12).
- [x] `pnpm lint` and `pnpm typecheck` pass clean.
- [ ] Manual verification: update an existing playlist with a mix of kept and dropped tracks from both lists.

---

## Phase 11: Save step — Delete mode + AlertDialog confirmation

**User stories**: 32, 33

### What to build

Switching to Delete mode renders the same styled target-playlist picker as Update mode, but the selected-row affordance uses danger styling instead of accent. A `.alert-danger` warning ("Deleting removes this playlist from your library. This can't be undone.") renders below the picker. The primary action button becomes the danger-styled "Delete playlist".

The existing `window.confirm` is replaced with a shadcn `AlertDialog`. The `alert-dialog` component is added via the shadcn CLI (`components/ui/alert-dialog.tsx`). Clicking Delete opens the dialog; confirming triggers the existing delete API call; cancelling closes the dialog without action.

### Acceptance criteria

- [x] Delete mode renders the styled target picker with danger-tinted selection.
- [x] Danger warning alert renders below the picker.
- [x] Primary action button is danger-styled and labeled "Delete playlist".
- [x] Clicking Delete opens the shadcn AlertDialog; confirming triggers the API call; cancelling closes the dialog.
- [x] `window.confirm` is no longer used anywhere in `SavePanel`.
- [x] Successful delete routes through to the success-state component (restyle in Phase 12).
- [x] `pnpm lint` and `pnpm typecheck` pass clean.
- [ ] Manual verification: delete a test playlist with the confirm dialog.

---

## Phase 12: Success state + Open in Spotify + Build another + inline alerts

**User stories**: 34, 35, 36, 38

### What to build

Replace the existing success blocks (`saveSuccessUrl` block and `deleteSuccess` block in `SavePanel`) with the handoff's centered success layout: 64px circle badge (accent-soft for save/update, danger-soft for delete), display-font heading ("Playlist saved!" / "Playlist updated!" / "Playlist deleted!"), subtext with playlist name + track count, mini 150×150 cover collage (reuses `CoverCollage` from Phase 4) for non-delete cases, and two CTAs: primary pill "Open in Spotify" (real URL from save response) + outline pill "Build another".

"Build another" resets the shell to its initial state (tracks=[], name="", step=0, maxReached=0, visibility='private', mode='create', target='', done=null) AND calls `clearDraft()` from Phase 5's storage module so sessionStorage is wiped too.

Inline error alerts: save-failure, delete-failure, and current-playlist-tracks-fetch-failure render as styled `.alert-danger` blocks within the active step card. The existing error state from `SavePanel` (`saveError`, `deleteError`, `currentTracksError`) wires into these alerts.

### Acceptance criteria

- [x] Success state renders for save, update, and delete with the correct badge color, heading, subtext, and CTAs.
- [x] "Open in Spotify" links to the URL returned by the save API in a new tab.
- [x] "Build another" wipes the shell state, clears sessionStorage, and lands the user on step 1 with an empty draft.
- [x] Delete success does NOT render a cover collage (badge + text only + "Build another").
- [x] Save failure renders a styled inline alert within the save step card.
- [x] Delete failure renders a styled inline alert within the save step card.
- [x] Playlist-tracks fetch failure (in Update mode) renders a styled inline alert.
- [x] `pnpm lint` and `pnpm typecheck` pass clean.
- [ ] Manual verification: trigger save success, then "Build another"; trigger delete success; force a failure (e.g. invalid token) and confirm inline alert.

---

## Phase 13: Drag-to-reorder

**User stories**: 18, 19, 20

### What to build

Add `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`. Wrap the refine-step resolved-track list in `<DndContext>` + `<SortableContext>`. Each resolved-track row becomes sortable; the grip handle (rendered on hover) is the drag handle. Mouse pointer sensor + keyboard sensor + (optionally) touch sensor are registered.

Reorder mutates the shell's `tracks` state array. Phase 5's `saveDraft` debounce picks up the new order automatically; the rail's track list and any subsequent save action see the new order.

### Acceptance criteria

- [x] Hovering a resolved-track row reveals the grip handle.
- [x] Dragging a row by the grip handle reorders it; the cursor and ghost row render with dnd-kit defaults.
- [x] Releasing on a new position persists the new order in the shell's `tracks` array.
- [x] Reordering does not affect failed tracks (unresolved section is not sortable).
- [x] Navigating away to another step and back preserves the new order.
- [x] Refreshing the tab restores the new order from sessionStorage.
- [x] Keyboard reorder: focus a row's grip handle with Tab, press Space to pick up, arrow keys to move, Space to drop.
- [x] `pnpm lint` and `pnpm typecheck` pass clean.
- [ ] Manual verification: reorder with mouse, reorder with keyboard, refresh after reorder.

---

## Phase 14: Toast system + 401 interceptor

**User stories**: 37, 39

### What to build

Add `sonner`. Mount `<Toaster />` inside the existing root `Providers` so it's available app-wide.

Introduce `lib/api-client.ts` exposing `apiFetch(path, init)` that wraps `fetch`. On a 401 response, throws a typed `UnauthorizedError`. On other non-2xx, throws an error with the server's message. On JSON parse failure, throws a typed parse error. On 2xx, returns the parsed body.

At the shell level (or via a query-client `onError` callback wired into all queries and mutations), catch `UnauthorizedError` and trigger `router.push('/login')`. Because Phase 5's sessionStorage already holds the draft, the user lands on `/login` with their draft preserved and is restored on return to `/`. Show a `sonner` toast on the way out: "Session expired. Please sign in again."

Use sonner toasts for generic cross-cutting failures (resolve, search, playlists fetch) only when the failure isn't already shown inline. Step-local failures (save, delete) keep their inline alerts from Phase 12.

Refactor existing fetch calls (`useResolveTracks`, `AddTrackSearch`, `SavePanel`'s playlists/tracks fetches, save/delete fetches, `useSession`) to route through `apiFetch`. The fourth test suite covers `lib/api-client.ts`.

### Acceptance criteria

- [ ] `sonner` is installed and `<Toaster />` is mounted in `Providers`.
- [ ] `lib/api-client.ts` exposes `apiFetch` with the documented error semantics.
- [ ] Every existing fetch call routes through `apiFetch` (no raw `fetch` calls remain in components or hooks that hit our `/api/*` routes).
- [ ] Forcing a 401 (e.g. by clearing the auth cookie in DevTools and triggering any API call) redirects to `/login` and shows the "Session expired" toast.
- [ ] Returning to `/` after re-auth restores the draft from sessionStorage.
- [ ] Cross-cutting failures (e.g. network down on search) surface a sonner toast.
- [ ] Step-local failures continue to render inline (no double-notification via both toast and inline alert).
- [ ] `lib/api-client.ts` test suite covers: 2xx returns parsed JSON, 401 throws typed `UnauthorizedError`, 5xx throws a generic error containing the server message, network failure throws a recognizable error, JSON-parse failure on 2xx throws a typed error.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass clean.
- [ ] Manual verification: clear auth cookie mid-flow, confirm redirect + restore; disconnect network and confirm toast.

---

## Execution rules

These rules apply to every phase:

1. Each phase is executed individually. The plan does not get implemented all at once.
2. Each phase ends with the gating checks: `pnpm lint`, `pnpm typecheck`, and (where tests apply) `pnpm test`. All must pass clean before review.
3. After each phase, the user reviews the code and provides feedback. Consult any codebase coding standards / documentation (`CLAUDE.md`, `plans/codebase-standards-refactor-*.md`) before writing code.
4. Only proceed to the next phase after the user explicitly approves the current phase.
