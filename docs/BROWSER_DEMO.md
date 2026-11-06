# Browser demo and repository cleanup

Source update: 2026-11-06.

## Browser demo

The public demo is an independent static application under `web-demo/`. It allows sample/local photo import, preview quality hints, perceptual groups, requested shortlists, grid/linked comparison, Keep/Reject/clear, review progress, undo, quick preview, search and JSON selection reports.

Imports stay in browser tab memory. No accounts, uploads, server-side photo processing, persistent storage or connector access are used. The sample set contains three licensed public photographs and visibly labelled simulated variations; no private shoot image or screenshot is published.

The basic image measurements are implemented in `web-demo/core.js`, separately from the Python desktop engine. No RAW, face/eye recognition, desktop aesthetic model, Lightroom transfer or equivalence/accuracy claim is implied. See [demo setup](../web-demo/README.md) and [asset provenance](../web-demo/ASSETS.md).

The static site is published through GitHub Pages from the repository's browser-demo Actions workflow. Pull requests run tests/builds; a merge to `main` publishes the static output. Anyone with the URL can try it without an account. No application server or paid AI API is provisioned, and deployment uses GitHub's short-lived Actions identity rather than a token stored in source. The temporary Sites preview was restricted to its owner when the owner requested GitHub Pages as the canonical host.

## Repository cleanup

The current tree now contains the active renderer, desktop shell, local engine, browser demo and supporting documentation. Removed unused LensFlow NestJS/PostgreSQL scaffolds, studio planning templates, Docker configuration, unused login/dashboard code and associated dependencies, inactive legacy workflows, and duplicated historical PRDs. The original material remains in Git history; no shared history or published tag was rewritten.

README, contribution/security guidance and ownership/PR templates now describe the active product. Historical validation records remain because they document evidence and limitations. Ignored local dependencies, libraries, secrets, models, binaries and private images are preserved.

The Windows download remains **0.3.0-rc.3**. This change does not publish a new desktop binary.

## Validation

- Browser heuristic/report tests: 4 passed; static build and JavaScript syntax checks passed.
- Local browser: sample and two-file imports, Keep/Undo, comparison and mobile shortlist controls checked. Mobile layout inspected at 390×844; desktop review checked at 1360×900.
- Published preview: loaded anonymously, sample processing and comparison worked, with no renderer console errors observed. GitHub Pages publication is checked separately after deployment.
- Browser report-download verification was not completed because the browser's download permission was declined. Report data generation is covered by the unit test; no download workaround was attempted.
- Desktop renderer lint/build and the real disposable-engine desktop workflow passed after removing obsolete frontend code/dependencies. Engine behavior was not changed by this pass.

These results are separate from new desktop packaging and real Lightroom qualification. No new desktop binary was built or released.
