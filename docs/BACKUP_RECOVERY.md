# MiT Salon database backup and recovery

This project currently runs on the Supabase Free plan, so scheduled Supabase-managed database backups are not available. The repository therefore includes a daily encrypted logical backup workflow at `.github/workflows/database-backup.yml`.

## What is backed up

The workflow follows Supabase's CLI backup sequence and creates:

- `roles.sql`
- `schema.sql`
- `data.sql`

The files are packaged together, encrypted with AES-256-CBC using PBKDF2, and uploaded only as an encrypted GitHub Actions artifact. Unencrypted SQL files are deleted before artifact upload.

GitHub artifact retention is 7 days.

## Required GitHub Actions secrets

Configure these under repository Settings → Secrets and variables → Actions:

- `SUPABASE_DB_URL` — the production Supabase Session Pooler database connection string, including the database password.
- `BACKUP_ENCRYPTION_PASSWORD` — a long, unique backup encryption password kept separately in a password manager.

Never commit either value to the repository.

## Schedule

The backup runs daily at `01:30 UTC` and can also be started manually from GitHub Actions.

## Verify a backup

A successful workflow run must contain an artifact named `mit-salon-db-backup-<run_id>` with:

- `database-backup.tar.gz.enc`
- `database-backup.tar.gz.enc.sha256`

Before recovery, verify integrity:

```bash
sha256sum -c database-backup.tar.gz.enc.sha256
```

On macOS, if `sha256sum` is unavailable, use:

```bash
shasum -a 256 database-backup.tar.gz.enc
```

and compare the result with the checksum file.

## Decrypt a backup

```bash
export BACKUP_ENCRYPTION_PASSWORD='your-password-from-password-manager'
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in database-backup.tar.gz.enc \
  -out database-backup.tar.gz \
  -pass env:BACKUP_ENCRYPTION_PASSWORD

tar -xzf database-backup.tar.gz
```

Do not leave decrypted backup files on shared or unmanaged devices.

## Restore

Restoration should normally be performed into a newly created Supabase project first, not directly over production. Follow the current Supabase CLI backup/restore documentation and restore the files in the order required by Supabase.

A restore test should be performed periodically so that backup success is not assumed solely from successful artifact creation.

## Supabase Storage

The current MiT Salon application code does not upload tenant files through the Supabase Storage API. If file uploads are introduced later, database backups alone will not protect the actual Storage objects and a separate Storage backup process must be added.
