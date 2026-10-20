# LensFlow backend scaffold

This NestJS/PostgreSQL service is separate from SnapSort desktop. It currently implements configuration, Prisma User/Role schema, the starter GET /api greeting, global validation and Swagger /api/docs. Auth, bookings, payments and CRM endpoints from historical plans are not registered modules.

See [optional backend setup](../docs/MAINTAINER_HANDBOOK.md#optional-lensflow-backend). SnapSort requires neither this service nor PostgreSQL.

Checks inside backend: npm run build, npm test -- --runInBand, npm run test:cov, npm run test:e2e and npm run format:check. npm run lint includes --fix and changes files. Review starter e2e assumptions against the API prefix/database lifecycle before interpreting results.

Do not publish .env credentials. Prisma client generation and initial migration preparation are required separately; the reviewed tree has no committed migrations.
