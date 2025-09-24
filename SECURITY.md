# Security Policy

This repository includes both frontend and backend components. Follow these guidelines for handling vulnerabilities and secret material.

1. Secrets and .env
   - Do not commit sensitive credentials to public repositories.
   - This repo is private; still consider moving secrets to a secrets manager (HashiCorp Vault, AWS Secrets Manager, etc.).
   - If a secret is accidentally committed, rotate it immediately and remove it from Git history using `git filter-repo` or BFG.

2. Dependency Vulnerabilities
   - Frontend: run `npm audit` and `npm audit fix` regularly. For remaining vulnerabilities, update direct dependencies in `package.json` and test the build.
   - Backend: run `pip-audit` in a virtualenv and update `requirements.txt` where needed.
   - Use CI checks (`.github/workflows/security.yml`) to enforce regular scans on PRs.

3. Reporting
   - Security issues should be reported by opening an issue labeled `security` and set as private if needed. Include reproduction steps and affected component.
