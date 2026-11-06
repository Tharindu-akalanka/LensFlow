# Contributing to SnapSort

Read the [maintainer handbook](docs/MAINTAINER_HANDBOOK.md) and [agent handover](docs/AGENT_HANDOVER.md) before changing behavior.

1. Branch from current `main` with a focused name such as `codex/fix-preview` or `feat/review-controls`.
2. Make a complete, bounded change. Keep original photos, local libraries and existing user decisions safe.
3. Run the relevant checks below and update the owning behavior notes.
4. Use a descriptive Conventional Commit, such as `fix(review): retain selection after undo`.
5. Open a pull request explaining the user-visible behavior, validation and remaining limits. Preserve history; do not force-push shared branches or move published tags.

## Checks

```powershell
npm --prefix frontend run lint
npm --prefix frontend run build
python -m unittest discover -s local-engine -v
node --test desktop/scripts/test-lightroom.cjs
python desktop/scripts/test_lightroom_plugin.py -v
npm --prefix web-demo test
npm --prefix web-demo run build
```

The Lua checks require `lupa`. The desktop workflow check is `desktop/scripts/verify-workflow.cjs`; it needs Electron and the labelled optional QA shoot. Run tests on disposable libraries, not a real shoot. Engine/launcher/freezing changes also need frozen or packaged runtime checks as appropriate. See the handbook for setup.

No new tests are required for a simple documentation edit. Run checks relevant to the changed behavior; record skips honestly. Mocked Lightroom SDK/bridge results do not prove a real Adobe import.

## Data and releases

- Never commit photos from private shoots, `.local-data`, model weights, `.build`, release binaries or secrets.
- Browser-demo samples must have documented permission and provenance in `web-demo/ASSETS.md`.
- Publishing source is separate from publishing a downloadable build. A tagged binary needs its own packaging checks; documentation and demo-only updates do not need one.
- Changes affecting original-file writes, IPC, paths or data recovery need careful review and relevant regression evidence.
