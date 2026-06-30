# DevOps & Deployment Workflow

## Infrastructure
- **Hosting Provider**: DigitalOcean / AWS EC2
- **OS**: Ubuntu 24.04 LTS
- **Web Server**: Nginx (Reverse Proxy)
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL (Managed Service or Dockerized)

## CI/CD Pipeline (GitHub Actions)
### 1. PR Checks (Triggered on PR to `main` or `develop`)
- Install dependencies
- Run ESLint & Prettier
- Run Unit Tests (`npm run test`)
- Build project (ensure compilation succeeds)

### 2. Deployment (Triggered on merge to `main`)
- Build Docker Image
- Push to Container Registry
- SSH into Production Server
- Pull latest image
- Run `docker-compose up -d`
- Run Prisma migrations (`npx prisma migrate deploy`)

## Environments
- **Local**: Developer machines (`.env.local`)
- **Staging**: `staging.lensflow.com` (mirrors production data structure)
- **Production**: `app.lensflow.com` (highly available)
