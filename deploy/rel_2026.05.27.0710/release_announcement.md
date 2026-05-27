# Release Announcement — university-admission-officer v2.0.0

**Release date:** 2026-05-27
**Type:** Major release (CHG-002 — Menu-driven UX overhaul)

---

## What's New

### Full-screen interactive menu (replaces all CLI flags)

`ao` is now entirely menu-driven. You no longer pass `--student`, `--university`, `--guidance`, or `--essay` flags on the command line. Just run `ao` and navigate with arrow keys.

- **Student Select** — pick an existing student or create a new one
- **Student Context** — view universities, update or delete the student profile
- **University Context** — access Guidance, Essays, update or delete the university
- **Guidance & Essay lists** — timestamped history with one-click regeneration
- **Config screen** — set and save your Gemini API key and model without editing files
- **Delete with confirmation** — student and university deletion always prompts before acting
- **Back navigation** — every screen has a Back option returning to the prior level

### Workspace renamed: `data/` → `university-ao/`

All student and university data is now stored under `university-ao/` in the directory where you run `ao`. If you have existing data in a `data/` folder from a prior version, it will not be migrated automatically — see the migration note below.

### Dated outputs

Guidance and Essay outputs are now stored in timestamped subdirectories (`YYYY-MM-DD-HHmm`), so every run is preserved. You can view any prior output from the list screen without regenerating it.

---

## Required Actions

### Existing users (v1.x)

1. **Install the new version:**
   ```
   npm install -g university-admission-officer
   ```

2. **Migrate your workspace** (optional but recommended):
   - Your existing `data/` folder is not affected and not deleted.
   - To continue working with your existing student/university data, copy it to the new layout:
     ```
     university-ao/
       students/
         <student-slug>/
           profile.json
           profile.md
           universities/
             <university-slug>/
               university-profile.md
     ```
   - Guidance and essay files from prior runs do not have a dated-directory equivalent — they would need to be re-generated.

3. **Reconfigure your API key** — on first launch, go to **Config** from the Student Select screen and re-enter your Gemini API key. It will be saved to `university-ao/.env`.

### New users

Run `ao` after installing. The workspace is created automatically on first launch. Go to **Config** to set your Gemini API key before generating guidance or essays.

---

## Breaking Changes

| Change | Impact |
| :----- | :----- |
| All `ao --flag` CLI invocations removed | Any scripts or aliases using `ao --student ...` must be updated to run `ao` interactively |
| `data/` workspace not read | Existing student/university data in `data/` is not visible to v2.0.0 |
| `commander` / `enquirer` removed | No programmatic import surface is affected (CLI tool only, no public API) |

---

## Known Limitations

- No automated migration tool for `data/` → `university-ao/` in this release.
- No automated test suite; all verification is smoke-tested manually.
- `react-dom` is bundled but not used (harmless, ~3 MB extra footprint).
- Gemini SDK (`@google/generative-ai`) is pre-1.0; minor API changes on SDK updates are possible.

---

## Rollback

If v2.0.0 has issues, revert to v1.3.1:
```
npm install -g university-admission-officer@1.3.1
```
Your `data/` workspace from v1.3.1 is untouched and will continue to work.
