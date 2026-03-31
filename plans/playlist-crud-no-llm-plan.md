# Plan: Playlist CRUD Without LLM

> Source PRD: playlist-crud-no-llm-prd

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: Keep existing Spotify auth routes; add/keep playlist CRUD routes for list, save, resolve, and delete (delete via unfollow).
- **Schema**: Replace generate schemas with paste/resolve input schemas; add delete request/response schema; keep save schema for create/update.
- **Key models**: TrackInput (title, artist, optional album), ResolvedTrack/FailedTrack, PlaylistMeta, FinalPlaylistPreview.

---

## Phase 1: LLM Cleanup + Baseline UI Copy

**User stories**: 29–30

### What to build

Remove all LLM generation capability and AI language across the product while keeping existing Spotify auth and playlist features intact. Ensure UI/README copy reflects a manual playlist tool.

### Acceptance criteria

- [x] All LLM routes, schemas, env vars, and references are removed or disabled.
- [x] UI copy no longer mentions AI, generation, or prompts.
- [x] App still builds and Spotify auth flow remains unchanged.

---

## Phase 2: Paste Input + Parse + Resolve

**User stories**: 1–7, 28

### What to build

Introduce a paste box that accepts `Title - Artist` lines and JSON arrays of `{title, artist, album?}`. Parse and validate input, skip bad lines with warnings, and resolve all parsed tracks against Spotify (using album when provided). Show resolved and unresolved results separately.

### Acceptance criteria

- [x] Line parsing uses first `-` delimiter and skips bad lines with warnings.
- [x] JSON input accepts `{title, artist, album?}` array.
- [x] Resolve step is required before any save.
- [x] Unresolved tracks are shown separately with clear messaging.

---

## Phase 3: Manual Add + Track Review

**User stories**: 8–9

### What to build

Keep manual search add always visible. Allow users to add tracks manually, remove items, and review the resolved list before saving.

### Acceptance criteria

- [x] Manual search box is always visible.
- [x] Users can add/remove tracks from the list.
- [x] Track list reflects resolved/unresolved states.

---

## Phase 4: Create Playlist

**User stories**: 10–12

### What to build

Create flow for new playlists requiring a name and a public/private toggle. No description is set. Save uses the resolved track list only.

### Acceptance criteria

- [x] Playlist name is required to create.
- [x] Visibility toggle controls public/private.
- [x] No description is set on create.
- [x] Only resolved tracks are saved.

---

## Phase 5: Update — Load & Select

**User stories**: 13–19

### What to build

Update flow that lists editable playlists, fetches full track lists on selection, and displays current vs new tracks in separate containers with master and per‑track toggles. Default selection includes all tracks.

### Acceptance criteria

- [ ] Only editable playlists appear for update.
- [ ] Full playlist tracks are fetched on selection (paginate as needed).
- [ ] Current and new tracks are shown in separate containers.
- [ ] Each container has a master toggle; each track has its own toggle.
- [ ] Default state selects all tracks.

---

## Phase 6: Update — Final Preview + Save

**User stories**: 20–25

### What to build

Build a read‑only final preview list that dedupes by Spotify URI, preferring current tracks when duplicates exist, and orders existing tracks before new ones. Allow renaming during update and save the final custom list.

### Acceptance criteria

- [ ] Final preview is read‑only and deduped by URI.
- [ ] Duplicates prefer current tracks.
- [ ] Ordering is existing tracks first, then new.
- [ ] Rename is available during update.
- [ ] Save uses the final preview list.

---

## Phase 7: Delete Playlist

**User stories**: 26–27

### What to build

Delete flow that unfollows/removes a playlist with a confirmation modal.

### Acceptance criteria

- [ ] Delete uses unfollow/remove behavior.
- [ ] Confirmation modal appears before delete.
- [ ] Errors are surfaced clearly.

---

### Phase execution rules

1. Each phase should be blocked by checks for formatting/linting/code errors as applicable.
2. Phases are executed individually, not all at once.
3. After each phase, the user reviews code and provides feedback before proceeding.
4. Only after user approval do we move to the next phase.
