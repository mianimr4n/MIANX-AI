# Production Environment Contract

> **MIANX.AI** — Mandatory and optional variables for production deployment
> Phase 16: Classified and validated

---

## Variable Classification

### REQUIRED AT RUNTIME

These MUST be set in `.env.production` or the deployment environment. Application will fail or be insecure without them.

| Variable | Example Format | Description | Fail Behavior |
|----------|---------------|-------------|---------------|
| `NODE_ENV` | `production` | Must be exactly `production` | App runs in dev mode (insecure) |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname?schema=public` | PostgreSQL connection string | App crashes — no database |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase project URL | Authentication fails |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (long JWT) | Supabase anonymous key | Authentication fails |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (long JWT) | Supabase service role (server-only) | Server-side auth fails |

### REQUIRED AT BUILD TIME

| Variable | When Needed | Notes |
|----------|-------------|-------|
| `DATABASE_URL` | `prisma generate` | Must start with `postgresql://`. Dockerfile provides dummy URL. CI provides dummy URL. |
| `NODE_ENV` | `next build` | Set to `production` by build system. |

### OPTIONAL (Features degrade gracefully)

| Variable | Default | Description | Degradation |
|----------|---------|-------------|-------------|
| `OPENAI_API_KEY` | (none) | OpenAI API key | AI chat unavailable |
| `ANTHROPIC_API_KEY` | (none) | Anthropic API key | Claude models unavailable |
| `GOOGLE_GENERATIVE_AI_API_KEY` | (none) | Google AI API key | Gemini models unavailable |
| `REDIS_URL` | (none) | Redis for distributed rate limiting | Falls back to in-memory (single-instance) |
| `ALLOWED_ORIGINS` | (none) | Comma-separated CORS origins | Warning logged, may be too permissive |
| `LOG_LEVEL` | `INFO` | Logging verbosity | Uses INFO default |
| `AI_DAILY_TOKEN_LIMIT` | `100000` | Max daily tokens per org | Uses default |
| `AI_DAILY_REQUEST_LIMIT` | `500` | Max daily AI requests per org | Uses default |

### DEVELOPMENT ONLY

| Variable | Notes |
|----------|-------|
| `DATABASE_URL=file:./db/dev.db` | SQLite — NEVER use in production |
| `NEXT_PUBLIC_APP_URL=http://localhost:3000` | Local dev URL — override in production |

### FORBIDDEN IN PRODUCTION

| Pattern | Reason |
|---------|--------|
| `DATABASE_URL=file:...` | Preflight validator blocks this |
| `NODE_ENV=development` | Disables security controls |
| Missing `SUPABASE_SERVICE_ROLE_KEY` | Preflight validator blocks this |

---

## Security Rules

1. **No variable values are ever printed** by the application. Preflight checks use `!!process.env.VAR` (boolean).
2. **`NEXT_PUBLIC_*` variables** are embedded in the client bundle by Next.js. Only non-secret values.
3. **Server-only secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`, `REDIS_URL`) are never accessed in client components.
4. **`.env` and `.env.local` are gitignored.** Only `.env.example` (with placeholders) is tracked.

---

## Minimum `.env.production` Template

```bash
# REQUIRED — Database
DATABASE_URL=postgresql://user:REPLACE_WITH_PASSWORD@host:5432/mianx_ai?schema=public

# REQUIRED — Runtime
NODE_ENV=production

# REQUIRED — Authentication
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=REPLACE_WITH_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_SERVICE_KEY

# REQUIRED — Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# OPTIONAL — AI (at least one recommended)
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=

# OPTIONAL — Distributed rate limiting
# REDIS_URL=redis://redis:6379/0

# OPTIONAL — CORS
ALLOWED_ORIGINS=https://your-domain.com

# OPTIONAL — Logging
LOG_LEVEL=INFO

# OPTIONAL — Docker Compose PostgreSQL
POSTGRES_USER=mianx
POSTGRES_PASSWORD=REPLACE_WITH_POSTGRES_PASSWORD
POSTGRES_DB=mianx_ai
```