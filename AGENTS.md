# SnapSort workspace guidance

- Active product: Electron/React desktop with the Python local engine. The LensFlow backend and studio plans are historical scaffolds.
- Read `docs/AGENT_HANDOVER.md` and the relevant validation/update notes before changing behavior.
- Preserve user photos, local libraries and uncommitted work. Never include `.local-data`, model weights, `.build`, release binaries, secrets or private shoot images in source commits.
- The owner wants GitHub maintained alongside implementation: use focused branches, descriptive Conventional Commits, updated documentation and relevant checks. Publish authorized work through a clear PR workflow and report its result.
- Keep the published main branch understandable to a portfolio reviewer. Explain user-visible changes and testing, not only implementation details.
- Preserve history; do not invent old commits, backdate work, force-push shared branches or move published version tags.
- Documentation-only updates do not need a new binary release. For application changes, clearly distinguish merged source from the latest downloadable build. Publish a new tagged binary only after its own packaging checks.
- Do not claim production certification, universal culling accuracy or real Lightroom validation from mocked tests. Record gaps and skipped checks.
