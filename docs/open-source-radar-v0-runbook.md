# RaderLearning V0 runbook

RaderLearning turns source-backed open-source changes into a small learning loop:

```text
Project → Change Event → Change Brief → Learning Task → local Review Card
```

## Local startup

Use Node.js 24 and Docker Compose. PostgreSQL is exposed on `127.0.0.1:55432` by the compose file.

```bash
npm install --ignore-scripts
node scripts/init-env.ts --llm-key <openai-compatible-key>
docker compose up -d --build
```

Open <http://localhost:3000>. The default safety valves are enabled by the generated `.env`; set `COLLECT_ENABLED=false` and `MODEL_CALLS_ENABLED=false` while working on the UI or API. The release workflow and tests keep both valves off when they do not need a local stub.

For a host install, set `DATABASE_URL` and run `npm run db:migrate`. Backup and restore tests need the PostgreSQL client tools. macOS with Homebrew:

```bash
brew install libpq
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
pg_dump --version
pg_restore --version
```

On CI, the workflow installs the PostgreSQL 17 client explicitly so the tools match the service image.

## Verification and reset

All database-writing tests must use a database whose name ends in `_test` or `_ci`:

```bash
export DATABASE_URL=postgres://aihot:aihot@127.0.0.1:55432/aihot_test
PATH=/opt/homebrew/opt/libpq/bin:$PATH npm run db:migrate
node --test tests/e2e/open-source-radar.spec.ts
npm run typecheck
npm run build -w @aihot/web
PATH=/opt/homebrew/opt/libpq/bin:$PATH npm test
```

The e2e fixture uses only injected local rows and deterministic adapters; it does not contact GitHub or a model provider. To reset the local Docker database and volumes:

```bash
docker compose down -v
docker compose up -d --build
```

After starting the built services, run the HTTP smoke checks:

```bash
node scripts/smoke.ts --base http://localhost:3000
node scripts/mcp-check.ts http://localhost:3000/api/mcp
```

## GitHub release checklist

1. Keep `.env`, `.data/`, database dumps, credentials, and provider tokens out of the commit.
2. Run the focused e2e test, typecheck, Web build, full test suite, and smoke checks above.
3. Confirm `COLLECT_ENABLED`, `MODEL_CALLS_ENABLED`, Feishu switches, and IndexNow submission are off in test environments.
4. Review the public source links and the content license before enabling collection. The default site shows summaries and source links; it does not copy full source text without permission.
5. Push the reviewed commit to the intended GitHub repository and configure the repository's Actions workflow.

## V0 boundaries

The first release is anonymous and local-first. Projects and source-backed change data live in PostgreSQL; personal saved items, task results, review scheduling, and plain-text notes live in the current browser's versioned localStorage. There are no accounts, cloud sync, team workspaces, arbitrary code execution, or live provider calls in the acceptance fixture. The deterministic brief path labels missing, failed, or disputed evidence as uncertain instead of inventing a confident explanation.
