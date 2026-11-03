# Playlist Management Pages — implementation plan

Adds dedicated `/playlists` and `/playlists/[id]` routes for managing playlists the user
already owns, and removes Update/Delete from the builder's step 3.

## Why

The builder is a one-way funnel: paste → refine → save. Editing or deleting an existing
playlist was reachable only as two "modes" bolted onto step 3, behind a stepper gate that
required resolving tracks first — so in practice it was invisible. A CTA shortcut landed
in `027c385` as a stopgap, but the shape was still wrong: managing an existing playlist
has nothing to do with a draft you just built, yet it was structurally dependent on one.
It also concentrated three unrelated jobs into `save-panel.tsx` (882 lines).

## Decisions

| Decision       | Choice                                                                                                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope          | Full management: browse, view tracks, remove, drag-reorder, rename, change visibility, delete, add tracks                                                                                                                          |
| Builder step 3 | Update and Delete removed. Step 3 becomes Create-only.                                                                                                                                                                             |
| Routes         | `/playlists` (library) + `/playlists/[id]` (detail)                                                                                                                                                                                |
| Save timing    | Deferred. Reorder/remove edit local state; a sticky bar shows the unsaved count with Discard / Save. Save writes the full ordered URI list through the existing save endpoint in `replace` mode. Zero new Spotify write endpoints. |

## Constraints

- No new dependencies. `sonner` belongs to phase 14 of the redesign plan and must not be
  pulled forward; API errors surface as inline shadcn `Alert`.
- No manual `useMemo` / `useCallback` — React Compiler owns memoization. The render loop
  fixed in `027c385` came from comparing an unmemoized array _by reference_ in a
  render-time sync. Derive primitive keys; never compare array or object identity.
- No raw `fetch` + `useState` in components — TanStack Query hooks in `hooks/` only.
- Zod in `lib/schemas.ts` stays the single source of truth; types via `z.infer`.
- Vitest is Node-env only (no jsdom), so all testable logic lives in pure `lib/` functions.

## Bugs this plan fixes

1. Visibility cannot be changed on an existing playlist — the update path never forwards
   `isPublic` to `PUT /playlists/{id}`.
2. Rename-only updates are impossible — the zero-URI rejection sits before the
   create/update branch split.
3. `TrackList` mishandles duplicate tracks — the row id is not duplicate-safe and the
   sortable index lookup returns the first match, so dragging the second copy of a
   duplicated track moves the first.
4. `useSavePlaylist` invalidates nothing, so the library and track lists go stale after
   every save.

---

## Phase 0: Server reads + save-route fixes

### What to build

New `GET /api/spotify/playlist?playlistId=` returning playlist metadata, so
`/playlists/[id]` can deep-link to any playlist (the existing list route returns only the
first 50 owned playlists). Fix bugs 1 and 2 in the save route. Add `skippedCount` to the
tracks route so the UI can warn about podcast/local items that a full rewrite would drop.

### Acceptance criteria

- [x] `GET /api/spotify/playlist?playlistId=X` returns `{id, name, public, description, imageUrl, trackCount, ownerId, ownerName, isOwner, collaborative, snapshotId}`. — _Correction (later): `description` and `snapshotId` were removed as unused in f12cd03. `playlistDetailSchema` in `lib/schemas.ts` and `PLAYLIST_FIELDS` in `app/api/spotify/playlist/route.ts` now return `{id, name, public, imageUrl, trackCount, ownerId, ownerName, isOwner, collaborative}`._
- [x] Missing `playlistId` returns a 400 `VALIDATION_ERROR` matching the tracks route's shape.
- [x] The route resolves a playlist that sits past offset 50 in the user's library — it fetches `/playlists/{id}` directly rather than scanning the paged list.
- [x] An update with `uris: []` and `mode: 'replace'` no longer 400s; the guard now lives in the create and `append` branches only.
- [x] Creating a playlist with zero URIs still 400s; appending zero URIs still 400s.
- [x] The tracks route returns `skippedCount` counting filtered items across all pages.
- [x] New route path is in `API_ROUTES`; `QUERY_KEYS.playlists.detail` nests under the `['playlists']` prefix.
- [x] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass clean.
- [ ] Live verification (needs a real Spotify account): `uris: []` actually clears the playlist; `isPublic` actually flips visibility, and omitting it leaves visibility untouched.

---

## Phase 1: Pure edit model + tests

### What to build

`lib/playlist-edit.ts` — the framework-free brain of deferred save: `toEditableRows`,
`hasSameOrder`, `diffPlaylist`, `orderKey`, `toSaveUris`. Every row carries a UUID
`rowId` so drag and removal target the right row even when a playlist contains the same
track twice.

### Acceptance criteria

- [x] Duplicate URIs receive distinct `rowId`s.
- [x] Identical server/local lists with identical metadata diff to `total === 0`.
- [x] A pure reorder of a duplicate-heavy list yields `reordered: true, removed: 0, added: 0`.
- [x] Removing one of two identical URIs counts `removed: 1` (multiset-correct, not set-correct).
- [x] Rename-only and visibility-only diffs each set exactly one flag.
- [x] `toSaveUris` preserves order and keeps duplicates.
- [x] `hasSameOrder` short-circuits on length mismatch and does not join arrays into strings.
- [x] `orderKey` documents that it exists solely as a scalar seed for render-time sync.
- [x] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass clean.

Notes: `total` = `removed + added + (reordered ? 1 : 0) + (renamed ? 1 : 0) + (visibilityChanged ? 1 : 0)`.
`reordered` is decided only over retained occurrences, so a mid-list removal or insertion is not
mislabelled a reorder. A name that trims to empty counts as **not** renamed — a blank title can't be
saved, so an in-progress cleared input must not inflate the count or arm Save.

---

## Phase 2: Nav, layout, auth gate

### What to build

`components/main-nav.tsx` (client, `usePathname` for active state) rendered by the
existing server-component `TopBar`. `app/playlists/layout.tsx` holding one server-side
cookie gate for both new routes plus the shared `<TopBar/>` + `<main>` wrapper.
`hooks/use-playlist-detail.ts` mirroring `use-playlist-tracks.ts`.

### Acceptance criteria

- [x] Signed out, `/playlists` and `/playlists/[id]` server-redirect to `/login` with no flash.
- [x] Nav shows Build and Playlists, highlighting the active route. `/` matches exactly; `/playlists` matches itself or a `${href}/` prefix, so `/playlists/<id>` keeps Playlists lit without `/` matching everything.
- [x] Nav does not render on `/login`.
- [x] `TopBar` remains a server component.
- [x] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass clean; `pnpm build` lists both new routes.
- [ ] Live verification: no hydration warnings in the console.

Open item: at ~375px the header carries brand mark + 2 nav pills + theme toggle + user chip. Nothing
overflows, but it is tight. Deliberately not hidden behind a breakpoint — that would leave mobile with
no route to `/playlists`. Revisit during polish.

---

## Phase 3: `/playlists` library

### What to build

A grid of playlist cards linking to the detail route, using real cover art from
`imageUrl` with `coverGradient(name)` as fallback. Loading, error, and empty states lift
from the existing picker.

### Acceptance criteria

- [x] `/playlists` lists the user's owned and collaborative playlists.
- [x] Cards show real Spotify cover art, falling back to the generated gradient when a playlist has no image. Both `i.scdn.co` and `mosaic.scdn.co` are already allowlisted in `next.config.ts` — the latter matters because Spotify serves auto-generated mosaics from it.
- [x] Each card links to `/playlists/<id>`.
- [x] Loading, error, and empty states all render. Loading uses inert placeholder cards gated behind `motion-safe:` — no `skeleton` primitive added.
- [x] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass clean; `pnpm build` compiles.
- [ ] Manual verification: load the library signed in, confirm art and links.

---

## Phase 4: `/playlists/[id]` detail with deferred save

### What to build

The detail page: existing tracks in order, drag-reorder, per-row remove, rename,
visibility, delete, and a sticky unsaved-changes bar with Discard / Save. Local state is
seeded from query data through a render-time sync keyed on a derived **primitive** string
— never on an array reference. `TrackList` gains an optional `rowIds` prop to fix bug 3,
and `useSavePlaylist` starts invalidating to fix bug 4.

### Acceptance criteria

- [x] Opening a playlist loads its tracks in Spotify's order.
- [x] Dragging reorders; removing a row removes that row.
- [x] The sticky bar appears only when there are pending changes and shows an accurate count.
- [x] Discard restores the server state exactly and hides the bar.
- [x] Save writes order, removals, name, and visibility in one request, then the list re-seeds from the refetch.
- [x] A rename-only save does not disturb the track rows.
- [x] In a playlist containing the same track twice, dragging the second copy moves the second copy — `SortableContext` items, the drag lookup, every `useSortable({ id })`, and every React key now read one `rowIds` array.
- [x] Delete confirms via `AlertDialog`, then routes back to `/playlists`.
- [x] Errors render as inline destructive `Alert`s — no toasts, no new dependency.
- [x] Existing `TrackList` callers are behaviourally unchanged — with `rowIds` undefined, `trackId` is byte-for-byte the previous expression.
- [x] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass clean; `pnpm build` compiles.
- [x] Render-loop convergence proven by harness: 7 scenarios (mount, detail-before-tracks race, duplicate drag, removal, discard, post-save re-seed, identical refetch) each settle in ≤2 render attempts. A negative control seeded on the array reference reproduces "Too many re-renders", confirming the harness detects the `027c385` failure mode.
- [ ] Live verification: reorder, remove, discard, save, reload and confirm Spotify reflects the change; delete-then-return-to-library.

---

## Phase 5: Add tracks (paste + search)

### What to build

`components/playlist/add-tracks-panel.tsx` — an inline collapsible section rather than a
modal (no `dialog` primitive installed, the resolve-results flow needs vertical room, and
the sticky action bar must stay visible while adding). Reuses `AddTrackSearch` and the
paste resolver. Added tracks append to local rows only; nothing is written until Save.

### Acceptance criteria

- [x] Adding by search appends the track to the local list and bumps the unsaved count.
- [x] Pasting a list resolves it and appends the resolved tracks; unparseable lines (parser warnings) and unmatched tracks (resolve failures) fold into one destructive `Alert`. The textarea clears only when both are empty.
- [x] The search dedupe check accounts for unsaved local additions, not just server state — `existingUris` is built from local `rows`, not server tracks.
- [x] Nothing is written to Spotify until Save. The only network call is the read-only resolve endpoint.
- [x] The sticky action bar stays reachable while the panel is open (inline section, not a modal).
- [x] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass clean; `pnpm build` compiles.
- [ ] Manual verification: add by both paths, save, confirm in Spotify.

Decision: the **paste** path does not dedupe against existing tracks; only **search** does. The repo
treats duplicate URIs as legitimate (`toSaveUris` deliberately preserves them), so silently dropping a
pasted line would be the more surprising behaviour. Remove-then-re-add correctly nets to `total: 0`
rather than reporting a phantom change.

---

## Phase 6: Collapse the builder + mitigations + cleanup

### What to build

Decompose `save-panel.tsx` into `components/save/create-playlist-form.tsx` and
`components/save/save-success-state.tsx`, then delete it along with `MODE_OPTIONS`,
`TargetPlaylistPicker`, and all Update/Delete state. Remove `SAVE_MODE`, `Draft.mode`,
and `Draft.target`. Repoint the paste-form CTA at `/playlists`. Add the replace-strategy
mitigations.

### Acceptance criteria

- [x] `save-panel.tsx` is deleted (882 lines); `create-playlist-form.tsx` is 139 lines.
- [x] Step 3 renders name + visibility + Create only — no mode grid.
- [x] The prepare-step CTA links to `/playlists`.
- [x] `SAVE_MODE`, `SaveMode`, `Draft.mode`, and `Draft.target` are gone — grep confirms zero live references.
- [x] `DRAFT_STORAGE_KEY` is bumped to `-v2`; a stale v1 draft returns `null` from `loadDraft()` without throwing (verified empirically). — _Correction (later): the key is now `spotify-playlist-builder-draft-v3`. It was bumped again in d6d98fd, when draft tracks gained a client-minted `rowId`._
- [x] `skippedCount > 0` renders a standing warning that podcast/local items will be dropped on save.
- [x] The chunked-write failure mode (truncation, no 429 backoff) is documented in the save path.
- [x] The builder still creates a playlist end-to-end.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` (59/59), and `pnpm build` pass clean.
- [ ] Manual verification: full builder run, then full management run, on a real account.

**Superseded criterion.** The plan called for "a `snapshotId` that moved between load and save blocks
the write". That was not implemented as written, because a stronger guard replaced it. `snapshotId`
exists on `playlistDetailSchema` but is never compared. — _Correction (later): this is false. f12cd03 removed `snapshotId` from the detail schema. It remains only as an optional field on `saveResponseSchema` in `lib/schemas.ts`._

The reason: the original design had a worse bug than the one the snapshot guard was meant to catch.
The seed included `orderKey(serverTracks)`, so when the playlist changed on Spotify's side while the
user held unsaved edits — a collaborator's write, or the same user in another tab — the render-time
sync **silently overwrote those edits**, and the diff simultaneously redefined itself against the new
server data. A snapshot check at save time would have fired long after the work was gone.

The replacement diffs against a captured `baseline` rather than live server data, and on a seed change
branches on whether edits are pending: clean → re-seed as before; dirty → keep the edits, close the
render branch to stay convergent, and raise a conflict banner. Save is blocked while a conflict stands,
since `replace` mode would clobber the other write. This catches item-level drift, fires at refetch
time rather than only at save time, and needs no snapshot support. The branch is a pure truth table
(`planSeedSync`) with unit tests.

Two consequences worth knowing:

- The baseline advances in the save mutation's `onSuccess`, not on the refetch. Waiting for the
  refetch would raise a false conflict on **every** successful save, since the diff runs against the
  pre-save baseline until new data lands.
- A partial (truncated) write cannot be repaired by re-saving: the truncation changes server data, so
  the error-path refetch raises a conflict and blocks the repair. Recovery is an explicit reload. A
  "Save anyway" escape hatch would be a one-line `canSave` change plus a button if that trade is
  unwanted.

---

## Execution rules

1. Each phase is executed individually; the plan does not get implemented all at once.
2. Each phase ends with the gating checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
   All must pass clean before review.
3. Phases 0–5 are independently shippable and leave the builder untouched. Phase 6 is the
   only teardown phase and lands last, separately.
4. Consult the codebase coding standards (`CLAUDE.md`,
   `plans/codebase-standards-refactor-*.md`) before writing code.
