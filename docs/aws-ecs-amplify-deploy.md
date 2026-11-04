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

## Master EF 2026 release

One-off runbook for the `feat/master-ef-2026-agreement` release: a new
`projects.itemize_design_fee` column, and the installer that adds the new Master EF
template and deactivates the old one. Old contracts keep their template and clause
snapshot on every generation path, so an issued contract renders unchanged.

Every command uses `--profile nick-work --region us-west-1` (the `default` profile
is a different, empty account). Set these once:

```sh
export AWS_PROFILE=nick-work AWS_REGION=us-west-1
CLUSTER=contract-manager-cluster-dev
SERVICE=contract-manager-service
```

### Running a one-off command in the task (`run-task`)

The RDS instance is private, so SQL and the installer run as a one-off Fargate
task from the service's own task definition, with the container command overridden.
The image's entrypoint (`docker-entrypoint.sh`) still runs first: it runs
`drizzle-kit push` and its verification re-run, then `exec`s the overriding
command. That push is the same no-op or bail the service already does at boot, so it
is harmless here, but expect its output at the top of the task's log.

```sh
# The revision the service runs now, and the network it runs in.
TASK_DEF=$(aws ecs describe-services --cluster $CLUSTER --services $SERVICE \
  --query 'services[0].taskDefinition' --output text)
aws ecs describe-services --cluster $CLUSTER --services $SERVICE \
  --query 'services[0].networkConfiguration.awsvpcConfiguration'
# → { "subnets": ["subnet-…", …], "securityGroups": ["sg-…"], "assignPublicIp": "ENABLED" }

aws ecs run-task --cluster $CLUSTER --task-definition "$TASK_DEF" --launch-type FARGATE \
  --network-configuration 'awsvpcConfiguration={subnets=[subnet-…,subnet-…],securityGroups=[sg-…],assignPublicIp=ENABLED}' \
  --overrides file://overrides.json \
  --query 'tasks[0].taskArn' --output text
```

Copy the subnets, security group and `assignPublicIp` from the `describe-services`
output (the task pulls its image from ECR, so it needs the service's route out).
`overrides.json` names the container, `contract-manager`, and the command:

```json
{ "containerOverrides": [ { "name": "contract-manager",
    "command": ["node", "dist/scripts/install-master-ef-2026.cjs", "--dry-run"] } ] }
```

To run SQL, the command is a `pg` one-liner (`pg` is a production dependency of the
image, and `DATABASE_URL` already carries `?sslmode=no-verify`), with the SQL passed
as an environment override so it needs no escaping:

```json
{ "containerOverrides": [ { "name": "contract-manager",
    "command": ["node", "-e", "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>c.query(process.env.SQL)).then(r=>{console.log(JSON.stringify([].concat(r).map(x=>x.rows)));return c.end()}).catch(e=>{console.error(e);process.exit(1)})"],
    "environment": [ { "name": "SQL", "value": "SELECT 1;" } ] } ] }
```

Wait for the task, then read its exit code and log. Logs are in `/ecs/contract-manager`;
the stream is `<awslogs-stream-prefix>/contract-manager/<task id>`, with the prefix
in the task definition's `logConfiguration.options`.

```sh
TASK_ARN=<the arn run-task printed>
aws ecs wait tasks-stopped --cluster $CLUSTER --tasks "$TASK_ARN"
aws ecs describe-tasks --cluster $CLUSTER --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].[exitCode,reason]'
aws ecs describe-task-definition --task-definition "$TASK_DEF" \
  --query 'taskDefinition.containerDefinitions[0].logConfiguration.options'
aws logs tail /ecs/contract-manager --since 30m \
  --log-stream-name-prefix "<awslogs-stream-prefix>/contract-manager/${TASK_ARN##*/}"
```

### 0. Before pushing

1. **Add the new column by hand.** Staging's `drizzle-kit push` is stuck on the
   `project_units_property_id_unit_role_unique` question, and a push that hits a
   question applies nothing (see `docker-entrypoint.sh`). Left alone, the column is
   never created and every `projects` select in the new code fails. Run, through the
   SQL one-liner above:

   ```sql
   ALTER TABLE projects ADD COLUMN IF NOT EXISTS itemize_design_fee boolean NOT NULL DEFAULT false;
   ALTER TABLE project_details
     ADD COLUMN IF NOT EXISTS permitting_authority text,
     ADD COLUMN IF NOT EXISTS fbh_approval_number text,
     ADD COLUMN IF NOT EXISTS site_access_assumptions text;
   ALTER TABLE contractor_entities ADD COLUMN IF NOT EXISTS insurance_phone text;
   ALTER TABLE contractors
     ADD COLUMN IF NOT EXISTS insurance_phone text,
     ADD COLUMN IF NOT EXISTS contractor_entity_id integer;
   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'contractors_contractor_entity_id_contractor_entities_id_fk') THEN
       ALTER TABLE contractors
         ADD CONSTRAINT contractors_contractor_entity_id_contractor_entities_id_fk
         FOREIGN KEY (contractor_entity_id) REFERENCES contractor_entities(id);
     END IF;
   END $$;
   ```

   Do this immediately before the push. A task still on the old image ignores the
   columns (old code does not select them). The constraint name matches the one
   drizzle-kit would choose, so push sees nothing left to add. (Applied to staging
   on 2026-11-04.)

   Everything the image build needs must be in the Docker build context:
   `.dockerignore` drops `server/templates` except `master-ef-2026-10`, which
   `script/build.ts` inlines into the installer bundle. A new template folder
   needs its own `!` line there, and `.dockerignore` is in the deploy workflow's
   path filter so a change to it deploys.
2. **The stuck constraint still needs its own fix** (not part of this release, but
   until it is done every boot logs the schema WARNING). Check for rows that would
   violate it, resolve any, then add it by hand. Do it once the new image is running,
   so no old-image push sees a schema without `itemize_design_fee`:

   ```sql
   SELECT property_id, unit_role, count(*) AS n, array_agg(id ORDER BY id) AS unit_ids
   FROM project_units
   WHERE property_id IS NOT NULL AND unit_role IS NOT NULL
   GROUP BY property_id, unit_role
   HAVING count(*) > 1;
   -- zero rows, then:
   ALTER TABLE project_units
     ADD CONSTRAINT project_units_property_id_unit_role_unique UNIQUE (property_id, unit_role);
   ```
3. **Pre-flight parity.** The new code fetches a template's clauses through its
   `template_clauses` playlist instead of matching `clauses.contract_types`. For every
   active template the two sets must be equal today, or downloads change on deploy:

   ```sql
   WITH t AS (
     SELECT id, name, contract_type FROM contract_templates
     WHERE organization_id = 1 AND is_active = true
   ),
   playlist AS (
     SELECT t.id AS template_id, tc.clause_id
     FROM t JOIN template_clauses tc ON tc.template_id = t.id
   ),
   by_type AS (
     SELECT t.id AS template_id, c.id AS clause_id
     FROM t JOIN clauses c ON c.contract_types @> jsonb_build_array(t.contract_type)
   )
   SELECT t.id, t.name, t.contract_type,
     (SELECT count(*) FROM playlist p WHERE p.template_id = t.id) AS playlist_clauses,
     (SELECT count(*) FROM by_type b WHERE b.template_id = t.id) AS contract_type_clauses,
     (SELECT count(*) FROM (
        SELECT clause_id FROM playlist WHERE template_id = t.id
        EXCEPT SELECT clause_id FROM by_type WHERE template_id = t.id) x) AS only_in_playlist,
     (SELECT count(*) FROM (
        SELECT clause_id FROM by_type WHERE template_id = t.id
        EXCEPT SELECT clause_id FROM playlist WHERE template_id = t.id) x) AS only_by_contract_type
   FROM t ORDER BY t.id;
   ```

   Both `only_in_…` columns must be 0 for every row. Stop and investigate any that
   is not. (After the install the new template shows the old template's clauses
   under `only_by_contract_type`; that is expected then, not now.)

### 1. Push to `dev`

CI builds the image and waits for service stability. Then confirm the task is
healthy and the schema landed:

```sh
aws ecs wait services-stable --cluster $CLUSTER --services $SERVICE
aws logs tail /ecs/contract-manager --since 30m | grep -E "Schema verified|WARNING: the schema push"
```

Expect `Schema verified: no pending changes.` If the WARNING appears instead, the
output after it shows what push could not apply. While the constraint (step 0.2) is
unfixed the WARNING is expected; then check that its output names only that
constraint and not `itemize_design_fee`.

### 2. Run the installer, immediately

Until it runs the old template is still the active one, so a new contract (a FOB one
included) generates on the old agreement. Run it right after step 1, before
announcing the release. Using the `run-task` recipe above, first with
`["node","dist/scripts/install-master-ef-2026.cjs","--dry-run"]`, read the plan in
the log ("would insert" / "would skip"; the transaction is rolled back), then again
with `["node","dist/scripts/install-master-ef-2026.cjs"]`. Both must exit 0. A
re-run is a no-op.

The installer finds its template by name. Renaming the installed template makes a
re-run install a second copy.

### 3. Spot-check

Generate one contract per Delivery Model (FOB Factory, Delivered to Site, Dvele GC)
and check them as in the plan's Task 10 scripted check. Then download the PDF of
one contract issued on the old template, from its contract page: it must be the
old agreement, unchanged.

### 4. Legal review

Legal reviews every `MASTER_EF_2026_STATE_NOTICES` row on `/admin/state-disclosures`.
Arizona and California come from `server/templates/master-ef-2026-10/state-notices/`
and the installer re-loads them whenever the file changes, so an approved edit to
either goes into the file and ships with the next deploy and install run; an edit
made on the admin page is overwritten by that run. Every other state is still
edited in place on the admin page (see the plan's Deploy step 4).

### 5. Rollback

If the code is reverted after the install, the old code would select the new
template (newest active) for downloads, and it fetches clauses by `contract_types`,
which now matches the old and the new agreement together (191 clauses). Reactivate
the old template, deactivate the new one, and take the new clauses out of the
`MASTER_EF` match, in one transaction:

```sql
BEGIN;
SELECT id, name, is_active FROM contract_templates
WHERE organization_id = 1 AND contract_type = 'MASTER_EF' ORDER BY id;  -- note the old id
UPDATE contract_templates SET is_active = false, updated_at = now()
WHERE organization_id = 1 AND name = 'Dvele Master Factory Built Home Agreement (2026-10)';
UPDATE contract_templates SET is_active = true, updated_at = now()
WHERE organization_id = 1 AND id = <old template id>;
UPDATE clauses SET contract_types = (contract_types - 'MASTER_EF') || '["MASTER_EF_2026_ROLLED_BACK"]'::jsonb
WHERE contract_types @> '["MASTER_EF"]'::jsonb
  AND id IN (SELECT tc.clause_id FROM template_clauses tc
             JOIN contract_templates t ON t.id = tc.template_id
             WHERE t.organization_id = 1
               AND t.name = 'Dvele Master Factory Built Home Agreement (2026-10)');
COMMIT;
```

After a rollback, a contract saved on the new template downloads on the old one in
the old code, and a project whose C.2 matrix was saved by the new wizard falls back
to the default old matrix (the old code does not read the new stored format).
Re-releasing does not undo the rollback, because the installer sees its template
and writes nothing. Run the inverse by hand after the push:

```sql
BEGIN;
UPDATE contract_templates SET is_active = false, updated_at = now()
WHERE organization_id = 1 AND id = <old template id>;
UPDATE contract_templates SET is_active = true, updated_at = now()
WHERE organization_id = 1 AND name = 'Dvele Master Factory Built Home Agreement (2026-10)';
UPDATE clauses SET contract_types = (contract_types - 'MASTER_EF_2026_ROLLED_BACK') || '["MASTER_EF"]'::jsonb
WHERE contract_types @> '["MASTER_EF_2026_ROLLED_BACK"]'::jsonb;
COMMIT;
```

## Local dev is unchanged
`npm run dev` still serves the SPA + API on one port via Vite middleware
(`API_BASE` defaults to `""`, `FRONTEND_ORIGIN` unset → CORS no-op).
