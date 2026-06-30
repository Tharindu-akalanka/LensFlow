# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.0.x (MVP) | ✅ Active |
| < 1.0 | ❌ |

## Reporting a Vulnerability

**Do NOT open a public GitHub Issue for security vulnerabilities.**

For sensitive security issues, please use one of these channels:

1. **GitHub Private Security Advisory**: Go to [Security tab → Report a vulnerability](https://github.com/Tharindu-akalanka/LensFlow/security/advisories/new)
2. **Email**: Contact the maintainer via GitHub profile

### What to Include in Your Report

- Description of the vulnerability
- Steps to reproduce
- Potential impact (what an attacker could achieve)
- Affected version(s)
- Suggested fix (if you have one)

### Response Timeline

- **Acknowledgement**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Fix & Disclosure**: Coordinated with reporter, typically within 30 days

## Security Measures in This Project

- JWT with short expiration + refresh token rotation
- bcrypt password hashing
- RBAC enforced on all protected routes
- Input validation via `class-validator` on all DTOs
- Private S3 buckets with pre-signed URL access
- HTTPS enforced in all environments
- Rate limiting on auth endpoints
- Parameterized queries via Prisma ORM (prevents SQL injection)
