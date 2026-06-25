# Deploy: ECS (API) + Amplify (SPA)

Matches the org pattern (ECS backend, Amplify frontend, GitHub Actions). The app
is split: an **API-only** Express container on ECS Fargate behind an ALB, and the
**React SPA** on Amplify Hosting. They are different origins, so the SPA targets
the API via `VITE_API_URL` and the API allows the SPA origin via `FRONTEND_ORIGIN`
(CORS). Auth is JWT Bearer (no cookies).

```
Cognito ── JWT
   │
<app-domain>  →  Amplify Hosting (React SPA, built from this repo)
   │  fetch VITE_API_URL
   ▼
api.<domain>  →  ALB (ACM TLS)  →  ECS Fargate service (API-only container)
                                      ├─ task role → S3 dvele-contract-manager
                                      └─ VPC → RDS PostgreSQL
```

## Frontend — Amplify
1. Create an Amplify Hosting app connected to this GitHub repo. It uses
   [`amplify.yml`](../amplify.yml) (runs `vite build`, publishes `dist/public`).
2. Set build-time env vars in the Amplify console: `VITE_API_URL=https://api.<domain>`,
   `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_APP_ID`,
   `VITE_COGNITO_IDENTITY_POOL_ID`, `VITE_FRONTEND_URL=https://<app-domain>`.
3. Add the SPA rewrite (App settings → Rewrites and redirects), target
   `/index.html` type 200 — see the rule in `amplify.yml`'s comments.
4. Amplify builds and deploys on every push to the connected branch.

## Backend — ECS Fargate
**One-time AWS setup (your side):**
- **ECR** repo (e.g. `contract-manager`).
- **RDS PostgreSQL** in private subnets.
- **Secrets Manager:** `DATABASE_URL`, `ADMIN_SYNC_KEY`.
- **IAM:** task **execution** role (ECR pull, CloudWatch logs, read the secrets) and
  task **role** (S3 `Get/Put/Delete/ListBucket` on `dvele-contract-manager`; the
  AWS SDK uses it automatically — no static keys).
- **ALB + ACM** cert for `api.<domain>`; target group health check path **`/healthz`**.
- **Task definition** — container port `5000`; env:
  - `NODE_ENV=production`, `AWS_REGION=us-west-1`, `AWS_S3_BUCKET=dvele-contract-manager`
  - `FRONTEND_ORIGIN=https://<app-domain>`  (CORS allowlist; comma-separate multiple)
  - `ENABLE_SCHEDULED_JOBS` — see caveat
  - secrets: `DATABASE_URL`, `ADMIN_SYNC_KEY` (from Secrets Manager)
- **Service** behind the ALB; **VPC/subnets/SG** that can reach RDS (RDS SG allows the task SG on 5432).

**CI/CD:** [`.github/workflows/deploy-backend.yml`](../.github/workflows/deploy-backend.yml)
builds/pushes the image to ECR and deploys a new task-def revision on push to
`main`. Configure repo **Variables** (`AWS_REGION`, `ECR_REPOSITORY`,
`ECS_CLUSTER`, `ECS_SERVICE`, `ECS_TASK_DEF_FAMILY`, `ECS_CONTAINER_NAME`) and a
**Secret** `AWS_DEPLOY_ROLE_ARN` (OIDC deploy role trusting GitHub).

## DNS
- `<app-domain>` → Amplify (custom domain in the Amplify console).
- `api.<domain>` → ALB (Route 53 alias).

## Post-deploy
1. Run the schema migration once against RDS from a host that can reach it
   (`DATABASE_URL=… npm run db:push`).
2. Smoke test: load the Amplify URL, sign in (Cognito), and **generate a PDF**
   (exercises in-container Chromium + the cross-origin API call + CORS).
3. Confirm `/healthz` is green on the ALB target group.

## Caveats
- **Scheduled catalog sync:** `ENABLE_SCHEDULED_JOBS=true` runs the 2am sync on
  every running task. It's idempotent (harmless), but for guaranteed-once run it
  on a dedicated single-task service, or via an **EventBridge scheduled ECS task**
  / EventBridge → a protected `ADMIN_SYNC_KEY` endpoint, and leave it unset on the
  web service.
- **`VITE_*` changes** require an Amplify rebuild (inlined at build time).
- **CORS:** `FRONTEND_ORIGIN` must exactly match the Amplify origin (scheme + host,
  no trailing slash); add more origins comma-separated if you use preview domains.

## Local dev is unchanged
`npm run dev` still serves the SPA + API on one port via Vite middleware
(`API_BASE` defaults to `""`, `FRONTEND_ORIGIN` unset → CORS no-op).
