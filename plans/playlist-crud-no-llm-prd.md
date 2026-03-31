## Problem Statement

I want to remove all LLM/AI generation from the app and simplify it into a personal playlist tool. Instead of prompting an AI, I want to paste my own list of songs plus a playlist name, and then create, update, or delete playlists directly in Spotify. The current app is too complex and AI-centric; I want a straightforward, deterministic flow.

## Solution

Replace the AI generation flow with a paste-and-resolve workflow. Users paste a list of songs (line list or JSON), resolve them to Spotify tracks, review what will be saved, and then create, update, or delete playlists. For updates, the user should be able to see current playlist tracks and the new pasted tracks in separate containers, toggle which tracks to include, avoid duplicates, and preview the final playlist state before saving. Deleting a playlist should unfollow/remove it from the library.

## User Stories

1. As a user, I want to paste a list of songs in `Title - Artist` format, so that I can quickly create a playlist without manual entry.
2. As a user, I want to paste a JSON array of `{title, artist, album?}`, so that I can automate my inputs from scripts or other tools.
3. As a user, I want unparseable lines to be skipped with a warning, so that I can fix mistakes without breaking the whole process.
4. As a user, I want pasted lists to be deduplicated by Spotify URI, so that I don’t accidentally add the same track twice.
5. As a user, I want the system to resolve all pasted items against Spotify before saving, so that the playlist is always valid.
6. As a user, I want album information to be used in Spotify search when available, so that I get better matches.
7. As a user, I want to see unresolved tracks separately, so that I understand which songs failed to match.
8. As a user, I want to manually search for tracks and add them, so that I can fix missing items without re-pasting.
9. As a user, I want the manual search box to always be visible, so that it’s easy to add tracks at any time.
10. As a user, I want to create a new playlist with a required name, so that playlists are always identifiable.
11. As a user, I want to choose public vs private when creating a playlist, so that I control visibility.
12. As a user, I want no default description to be set, so that playlist metadata stays clean.
13. As a user, I want to select a playlist to update from only editable playlists, so that I don’t hit permission errors.
14. As a user, I want the update screen to fetch all tracks in the current playlist, so that I can manage large playlists.
15. As a user, I want current playlist tracks and new tracks shown in separate containers, so that I understand the source of each.
16. As a user, I want a master toggle for current tracks, so that I can include/exclude the entire existing playlist quickly.
17. As a user, I want a master toggle for new tracks, so that I can include/exclude all new tracks quickly.
18. As a user, I want per-track toggles, so that I can fine-tune the final playlist content.
19. As a user, I want default selection to include all tracks, so that I don’t have to re-select everything.
20. As a user, I want duplicate tracks to appear in the source lists but be removed from the final preview, so that I can see overlaps without saving duplicates.
21. As a user, I want duplicates to prefer the current playlist version, so that existing order and identity win.
22. As a user, I want the final preview to be read-only, so that it reflects the exact playlist state to be saved.
23. As a user, I want the final playlist order to keep existing tracks first and new tracks after, so that updates feel stable.
24. As a user, I want update mode to build a custom final list (selected current + selected new), so that I can fully control the resulting playlist.
25. As a user, I want to rename playlists during update, so that I can correct names while editing.
26. As a user, I want to delete a playlist by unfollowing/removing it, so that it disappears from my library.
27. As a user, I want a simple confirmation modal before deletion, so that I don’t delete by accident.
28. As a user, I want errors and warnings to be clear, so that I can fix input problems quickly.
29. As a user, I want the app to be clean and minimal with 2–3 main sections, so that it feels simple and personal.
30. As a user, I want all AI references removed from copy and UI, so that the app reflects its new purpose.

## Implementation Decisions

- Remove all LLM generation functionality and references from the system.
- Replace the generation prompt with a paste-and-resolve flow.
- Support two input formats: line list `Title - Artist` and JSON array `{title, artist, album?}`.
- Use the first `-` delimiter for line parsing.
- Skip unparseable lines and surface a warning.
- Always resolve all tracks against Spotify before saving.
- Use album information in search if provided.
- Keep manual search add box always visible.
- Only show editable playlists in update/delete selectors.
- Update mode fetches complete current playlist tracks and paginates as needed.
- Update mode displays current and new tracks in separate containers with master and per-track toggles.
- Update mode produces a custom final list (not a simple append/replace toggle).
- Final playlist preview is read-only and removes duplicates, preferring current tracks.
- Create mode requires a playlist name and allows visibility selection.
- Delete mode unfollows/removes playlists with a confirmation modal.
- Remove AI wording and metadata.

## Testing Decisions

- Tests should validate external behavior: inputs parsed correctly, correct tracks resolved, correct payloads sent, correct final playlist list derived.
- Focus on deep modules that encapsulate complex logic with stable interfaces.
- Modules to test: parsing/validation, resolve pipeline, merge/dedupe/final-list builder, playlist CRUD orchestration, update preview assembly.
- Use existing testing patterns in the codebase if present; otherwise create behavior-focused tests for the new deep modules and critical routes.

## Out of Scope

- Any AI or recommendation functionality.
- Any playlist “generation” from prompts.
- Multi-user support, sharing, or collaboration workflows.
- Reordering tracks beyond the fixed “existing then new” order.
- Advanced fuzzy matching or manual match selection UI.

## Further Notes

- The goal is a clean, personal workflow where the user controls the exact playlist contents.
- The UI should emphasize clarity and deterministic outcomes rather than “smart” features.
