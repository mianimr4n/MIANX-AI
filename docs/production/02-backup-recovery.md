# Backup and Recovery

> **MIANX.AI** — Next.js 16 + Prisma 6.19.2 + SQLite (PostgreSQL-ready)
> Last updated: Phase 11

---

## Critical Disclaimer

> **No backups have been verified as operational.** Backup capability depends entirely on the infrastructure provider chosen at deployment time. The procedures below document **requirements and commands** but have not been tested against a live production environment. A backup verification exercise MUST be completed before go-live.

---

## 1. Current State

| Aspect | Status |
|---|---|
| Database engine | **SQLite** (`file:` path, `db/custom.db`) |
| Backup automation | **NOT CONFIGURED** |
| Backup tested | **NOT TESTED** |
| Restore tested | **NOT TESTED** |
| Target engine | **PostgreSQL** (migration planned) |

---

## 2. Recovery Objectives

### Recovery Point Objective (RPO)

| Database | RPO Target | Rationale |
|---|---|---|
| SQLite (current) | **< 24 hours** | File-level backup; acceptable for pre-launch / low-volume phase |
| PostgreSQL (target) | **< 1 hour** | WAL-based continuous archiving enables near-point-in-time recovery |

### Recovery Time Objective (RTO)

| Scenario | RTO Target | Rationale |
|---|---|
| Database restore | **< 15 minutes** | Restore from backup, re-run pending migrations, restart app |
| Full application recovery | **< 15 minutes** | Database + application restart, health check confirmation |

### Retention Policy

| Tier | Retention | Applies To |
|---|---|---|
| Standard | **30 days minimum** | All daily/hourly backups |
| Compliance | **1 year** | Weekly full backups for audit/regulatory requirements |
| Archive | **7 years** | Monthly snapshots if regulatory requirements demand (verify with legal) |

---

## 3. SQLite Backup Procedures (Current)

### 3.1 File-Level Backup

SQLite stores the entire database in a single file. The safest method uses the built-in `.backup` command, which handles concurrent writes correctly.

#### Manual Backup

```bash
# Create backup directory
mkdir -p /backups/mianx/sqlite/$(date +%Y-%m-%d)

# SQLite online backup (safe during writes)
sqlite3 /path/to/db/custom.db ".backup '/backups/mianx/sqlite/$(date +%Y-%m-%d)/mianx-$(date +%H%M%S).db'"

# Verify backup integrity
sqlite3 "/backups/mianx/sqlite/$(date +%Y-%m-%d)/mianx-$(date +%H%M%S).db" "PRAGMA integrity_check;"
```

#### Automated Backup (cron)

```bash
# /etc/cron.d/mianx-sqlite-backup
# Run every 6 hours
0 */6 * * * app-user mkdir -p /backups/mianx/sqlite/$(date +\%Y-\%m-\%d) && sqlite3 /path/to/db/custom.db ".backup '/backups/mianx/sqlite/$(date +\%Y-\%m-\%d)/mianx-$(date +\%H\%M\%S).db'" && sqlite3 "/backups/mianx/sqlite/$(date +\%Y-\%m-\%d)/mianx-$(date +\%H\%M\%S).db" "PRAGMA integrity_check;" >> /var/log/mianx-backup.log 2>&1
```

#### Important: Do NOT Use `cp` for Hot Backups

```bash
# WRONG — may produce a corrupt copy if writes are in progress
cp /path/to/db/custom.db /backups/custom.db

# CORRECT — use SQLite's .backup API (handles WAL correctly)
sqlite3 /path/to/db/custom.db ".backup '/backups/custom.db'"
```

### 3.2 SQLite Restore Procedure

```bash
# 1. Stop the application
pm stop mianx    # or: systemctl stop mianx

# 2. Verify the backup file integrity
sqlite3 /backups/mianx/sqlite/2025-01-15/mianx-120000.db "PRAGMA integrity_check;"
# Expected output: ok

# 3. Replace the current database
mv /path/to/db/custom.db /path/to/db/custom.db.failed-$(date +%Y%m%d%H%M%S)
cp /backups/mianx/sqlite/2025-01-15/mianx-120000.db /path/to/db/custom.db

# 4. Verify the restored database
sqlite3 /path/to/db/custom.db "PRAGMA integrity_check;"
sqlite3 /path/to/db/custom.db "SELECT count(*) FROM _prisma_migrations;"

# 5. Run any pending Prisma migrations
npx prisma migrate deploy

# 6. Restart the application
pm start mianx    # or: systemctl start mianx

# 7. Verify health
curl -f http://localhost:3000/api/health
```

### 3.3 SQLite Limitations

- **No point-in-time recovery** — only the timestamp of the last backup is recoverable.
- **Single-node** — no built-in replication or failover.
- **Concurrent write contention** — SQLite uses file-level locking. High write volumes require migration to PostgreSQL.
- **WAL file** — if SQLite is in WAL mode, the `-wal` and `-shm` files should be backed up alongside the main `.db` file when using filesystem snapshots (though `.backup` handles this internally).

---

## 4. PostgreSQL Backup Procedures (Target)

When MIANX.AI migrates to PostgreSQL, the following procedures apply.

### 4.1 Prerequisites

- PostgreSQL 15+ installed and configured
- `pg_dump` and `pg_restore` available on the backup host
- WAL archiving enabled (for point-in-time recovery)
- Replication slot configured (optional, for streaming replication)

### 4.2 Full Backup with `pg_dump`

```bash
# Custom format (recommended — parallel restore capable, compressed)
pg_dump \
  -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE \
  -Fc \
  -f "/backups/mianx/pg/mianx-full-$(date +%Y-%m-%d_%H%M%S).dump"

# Plain SQL format (human-readable, smaller for text storage)
pg_dump \
  -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE \
  -Fp \
  -f "/backups/mianx/pg/mianx-full-$(date +%Y-%m-%d_%H%M%S).sql"
```

### 4.3 Automated Hourly Backups (cron)

```bash
# /etc/cron.d/mianx-pg-backup
# Hourly full backup (custom format)
0 * * * * app-user pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -Fc -f "/backups/mianx/pg/hourly/mianx-$(date +\%Y-\%m-\%d_\%H\%M\%S).dump" 2>> /var/log/mianx-pg-backup.log

# Daily backup kept for 30 days
0 2 * * * app-user find /backups/mianx/pg/hourly -name "mianx-*.dump" -mtime +30 -delete

# Weekly compliance backup kept for 1 year
0 3 * * 0 app-user cp /backups/mianx/pg/hourly/mianx-$(date +\%Y-\%m-\%d_\%H\%M\%S).dump /backups/mianx/pg/compliance/ 2>> /var/log/mianx-pg-backup.log
0 4 * * 0 app-user find /backups/mianx/pg/compliance -name "mianx-*.dump" -mtime +365 -delete
```

### 4.4 WAL Archiving for Point-in-Time Recovery

#### PostgreSQL Configuration (`postgresql.conf`)

```ini
# Enable WAL archiving
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backups/mianx/pg/wal/%f'
archive_timeout = 300   # Force archive switch every 5 minutes max

# Retention
wal_keep_size = 1GB
max_wal_senders = 3
```

#### Continuous Archiving Verification

```bash
# Check that WAL files are being archived
ls -la /backups/mianx/pg/wal/ | tail -5

# Verify archive is not lagging
SELECT 
  pg_walfile_name(pg_current_wal_lsn()) as current_wal,
  pg_walfile_name(last_archived_wal) as last_archived,
  EXTRACT(EPOCH FROM (now() - last_archived_time)) as archive_lag_seconds
FROM pg_stat_archiver;
```

### 4.5 PostgreSQL Restore Procedure

#### Full Restore from `pg_dump`

```bash
# 1. Stop the application
pm stop mianx    # or: systemctl stop mianx

# 2. Drop and recreate the database (or create a new one for side-by-side)
dropdb -h $PGHOST -U $PGUSER $PGDATABASE
createdb -h $PGHOST -U $PGUSER $PGDATABASE

# 3. Restore from custom format dump (parallel, fast)
pg_restore \
  -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE \
  -j 4 \
  --verbose \
  "/backups/mianx/pg/hourly/mianx-2025-01-15_120000.dump"

# 4. Run any pending Prisma migrations
npx prisma migrate deploy

# 5. Verify data
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT count(*) FROM \"Organization\";"
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT count(*) FROM _prisma_migrations;"

# 6. Restart the application
pm start mianx

# 7. Verify health
curl -f http://localhost:3000/api/health
```

#### Point-in-Time Recovery (PITR)

```bash
# 1. Stop the application
pm stop mianx

# 2. Clear the data directory and restore the base backup
dropdb -h $PGHOST -U $PGUSER $PGDATABASE
createdb -h $PGHOST -U $PGUSER $PGDATABASE

# Restore the closest full backup before the target time
pg_restore -h $PGHOST -U $PGUSER -d $PGDATABASE \
  "/backups/mianx/pg/hourly/mianx-2025-01-15_100000.dump"

# 3. Replay WAL up to the target timestamp
# Set recovery target in postgresql.conf or recovery signal
cat > /var/lib/postgresql/recovery.conf <<EOF
restore_command = 'cp /backups/mianx/pg/wal/%f %p'
recovery_target_time = '2025-01-15 11:45:00'
recovery_target_action = 'promote'
EOF

# Start PostgreSQL in recovery mode
pg_ctlcluster 15 main start

# 4. Once recovery completes, verify and restart app
curl -f http://localhost:3000/api/health
pm start mianx
```

> **Note**: For managed PostgreSQL (Supabase, RDS, etc.), use the provider's built-in backup/restore and point-in-time recovery tools rather than manual WAL management.

---

## 5. Restore Procedure (Generic)

All restore operations follow this sequence:

### Step 1: Detect
- Identify the failure (monitoring alert, user report, health check failure)
- Determine scope (single tenant, entire database, application layer)
- Identify the last known good backup

### Step 2: Contain
- Stop the application to prevent further data loss or corruption
- Isolate the affected database if possible (read replica, separate instance)
- Preserve the failed state for forensic analysis

### Step 3: Restore
- Select the appropriate backup (most recent before incident for PITR, latest full for full restore)
- Execute the restore command (see §3.2 or §4.5)
- Run pending migrations

### Step 4: Verify
- Run database integrity checks
- Verify Prisma migration history
- Run application health checks
- Confirm tenant isolation (no cross-tenant data leakage)
- Execute smoke tests

---

## 6. Backup Verification Testing

Backups that have not been tested are not backups. Before go-live:

| Test | Frequency | Responsible |
|---|---|---|
| Automated integrity check (after each backup) | Every backup | Backup system |
| Restore to staging environment | Weekly | DevOps / Platform team |
| Full disaster recovery exercise | Monthly | DevOps / Platform team + Engineering |
| Cross-region restore (if applicable) | Quarterly | DevOps / Platform team |

### Verification Checklist After Every Restore

- [ ] `PRAGMA integrity_check` passes (SQLite) or database starts cleanly (PostgreSQL)
- [ ] `_prisma_migrations` table shows all expected migrations
- [ ] `npx prisma migrate status` shows no pending migrations
- [ ] Organization count matches expected value
- [ ] At least one user per tenant can authenticate
- [ ] Health endpoint (`/api/health`) returns 200
- [ ] No cross-tenant data in any query result

---

## 7. Responsible Parties

| Role | Responsibility |
|---|---|
| **DevOps / Platform Team** | Backup configuration, automation, monitoring, restore execution |
| **Engineering Lead** | Migration compatibility, Prisma schema alignment post-restore |
| **Security** | Encryption at rest, access control to backup storage |
| **On-Call Engineer** | First responder for restore triggers during incidents |

---

## 8. Open Gaps

1. **No backup infrastructure provisioned** — no cloud storage, no cron jobs, no managed backup service confirmed.
2. **No restore has been tested** — restore procedures are documented but unverified.
3. **SQLite is the current engine** — no WAL archiving, no replication, no point-in-time recovery.
4. **Off-site / cross-region storage** not configured.
5. **Backup encryption at rest** not verified.
6. **Automated backup monitoring** (alert on failure) not configured.
