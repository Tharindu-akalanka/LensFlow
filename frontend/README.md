# SnapSort frontend

[← Project home](../README.md) · [User guide](../docs/USER_GUIDE.md) · [Maintainer handbook](../docs/MAINTAINER_HANDBOOK.md)

React + TypeScript + Vite renderer. App.tsx mounts Culling directly; Login, Dashboard and auth services are retained scaffold.

See the [documentation index](../docs/README.md), [setup and configuration](../docs/MAINTAINER_HANDBOOK.md#setup), and [source map](../docs/MAINTAINER_HANDBOOK.md#architecture-and-source-map).

From the repository root:

```powershell
npm --prefix frontend ci
npm --prefix frontend run dev
npm --prefix frontend run lint
npm --prefix frontend run build
```

For development, separately start the Python engine on 127.0.0.1:8765; Vite proxies /api to it. Electron loads built dist files. VITE_API_URL configures the retained NestJS Axios client, not active culling requests. There is no frontend unit-test script; use build/lint and manual review workflows.
