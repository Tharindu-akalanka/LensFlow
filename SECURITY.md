# Security

SnapSort is a local-first desktop release candidate, not a security-certified production service. The current downloadable version is 0.3.0-rc.3; newer source changes are documented separately.

Report sensitive issues through a [private GitHub security advisory](https://github.com/Tharindu-akalanka/LensFlow/security/advisories/new), not a public issue. Include the affected version, reproduction steps, impact and operating system. Do not attach private photos, credentials or a real library database publicly.

Runtime photo processing uses a loopback Python engine with authenticated Electron access. Original files must remain unchanged except for intentional separate XMP sidecar writes. The browser demo has no photo-upload endpoint and holds imported previews in tab memory; hosting providers still receive normal web requests and associated request metadata.

Security-sensitive areas include Electron IPC, source-path containment, engine authentication, SQLite transactions, sidecar writes and Lightroom transfer parsing. See the [maintainer handbook](docs/MAINTAINER_HANDBOOK.md) for the trust boundaries and [qualification notes](docs/VALIDATION_0.3.0.md) for known limits.
