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

## Current staging environment

AWS account `522879564192`, region `us-west-1` (CLI: `aws --profile nick-work …`).

| | |
|---|---|
| API (ECS) | `https://contracts-api-dev.dvele.com` — cluster `contract-manager-cluster-dev`, service `contract-manager-service`, task family `contract-manager-task`, behind shared ALB `onedot-lb-dev` (host rule on :443) |
| SPA (Amplify) | `https://dev.d2rywzszecoj4r.amplifyapp.com` (`dev` branch) |
| RDS | `contract-manager-dev-db` (postgres, private; `DATABASE_URL` needs `?sslmode=no-verify`) |
| ECR / image | `522879564192.dkr.ecr.us-west-1.amazonaws.com/contract-manager` |
| Cognito | pool `us-west-1_sdqeeKkT8` (DveleIQ), app client `43p1d9dhrkn5bau9t1s49l7096` |
| Deploy trigger | push to `dev` → GitHub Actions (scoped to the `development` GitHub Environment) |

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
- **IAM:** task **execution** role (`ecsTaskExecutionRole` — ECR pull + CloudWatch
  logs) and task **role** (`contract-manager-task-role` — S3
  `Get/Put/Delete/ListBucket` on `dvele-contract-manager`; the AWS SDK uses it
  automatically, no static keys). **No Secrets Manager** — config is injected as plain
  task-def env (below).
- **ALB + ACM** cert for `api.<domain>`; target group health check path **`/healthz`**.
- **Task definition** — container port `5000`; **all env is plain (no secrets store):**
  - `NODE_ENV=production`, `AWS_REGION=us-west-1`, `AWS_S3_BUCKET=dvele-contract-manager`
  - `DATABASE_URL=postgresql://…/contract_manager?sslmode=no-verify`  — the `sslmode`
    is **required**: RDS enforces TLS and the app's `pg` pools set no SSL otherwise
    (without it the container crash-loops on `no pg_hba.conf entry … no encryption`).
  - `FRONTEND_ORIGIN=https://<app-domain>`  (CORS allowlist; comma-separate multiple)
  - `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`  (server validates JWTs against this pool)
  - `ONEDOT_API_KEY`, `ENABLE_SCHEDULED_JOBS` — see caveat
  - (`ADMIN_SYNC_KEY` appears in `.env.example` but is currently unused by the code.)
- **Service** behind the ALB; **VPC/subnets/SG** that can reach RDS (RDS SG allows the task SG on 5432).

**CI/CD:** [`.github/workflows/deploy-backend.yml`](../.github/workflows/deploy-backend.yml)
builds/pushes the image to ECR and deploys a new task-def revision on **push to `dev`**
(staging). The deploy job is scoped to the **`development` GitHub Environment** — its
**Secret** `AWS_DEPLOY_ROLE_ARN` (OIDC deploy role trusting GitHub) and **Variables**
(`AWS_REGION`, `ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE`, `ECS_TASK_DEF_FAMILY`,
`ECS_CONTAINER_NAME`) live under that environment, so the job declares
`environment: development`. The workflow inherits the existing task-def env and swaps
only the image (tagged with the commit SHA), so **production runs committed code** —
manual image pushes get overwritten by the next CI run; ship by commit + push.

**Schema migrations are automatic:** the container entrypoint
([`docker-entrypoint.sh`](../docker-entrypoint.sh)) runs `drizzle-kit push` against
`DATABASE_URL` on startup before the server boots, reconciling the DB to
`shared/schema.ts`. `drizzle-kit` is a runtime dependency for this. No manual
production migration step.

## DNS
- `<app-domain>` → Amplify (custom domain in the Amplify console).
- `api.<domain>` → ALB (Route 53 alias).

## Post-deploy
1. Schema is applied automatically by the container entrypoint on boot
   (`drizzle-kit push`) — no manual migration. Default reference data is seeded by
   `server/seed.ts` on startup (skips tables that already have rows; project-scoped
   tables like `contractors`/`warranty_terms` are intentionally not seeded).
2. Smoke test: load the Amplify URL, sign in (Cognito), and **generate a PDF**
   (exercises in-container Chromium + the cross-origin API call + CORS + exhibits).
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
