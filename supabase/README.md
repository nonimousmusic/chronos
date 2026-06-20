# Supabase Setup — Synapse GTB

Run these SQL files **in order** in the Supabase SQL Editor (**Database → SQL Editor → New Query**).

## Execution Order

| # | File | What it does |
|---|------|--------------|
| 1 | `01_extensions.sql` | Enables `uuid-ossp` extension |
| 2 | `02_tables.sql` | Creates all 12 tables |
| 3 | `03_seed.sql` | Inserts sample units, patients, reports, and risk predictions |
| 4 | `04_realtime.sql` | Enables Realtime on 5 tables for live push updates |
| 5 | `05_rls_policies.sql` | Configures Row Level Security (read/write access) |
| 6 | `06_storage.sql` | Creates the `sessions` storage bucket + access policies |
| 7 | `07_notification_trigger.sql` | Auto-creates notification when risk score ≥ 70% |
| 8 | `08_auth_trigger.sql` | Auto-creates `public.users` row on signup |

## Manual Steps (Dashboard)

After running the SQL files, do these in the Supabase dashboard:

### Optional: Generate TypeScript types
If the [Supabase CLI](https://supabase.com/docs/guides/cli) is installed and linked:
```bash
supabase gen types typescript --linked > frontend/src/types/supabase.ts
```
This adds type safety to all `supabase.from('table_name')` calls across the frontend.

1. **Authentication → Settings** → Disable **"Confirm email"** (for dev/demo)
2. **Authentication → Providers** → Ensure **Email** is enabled

## Environment Variables

### Frontend (`frontend/.env`)
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Backend (`backend/.env`)
```
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
```

> ⚠️ Never commit `.env` files to Git.

## Tables Reference

| Table | Purpose |
|-------|---------|
| `units` | ICU ward definitions |
| `users` | Doctor/nurse profiles (linked to `auth.users`) |
| `patients` | Patient records |
| `instructions` | Doctor orders → nurse tasks |
| `administered` | Medication administration log |
| `complaints` | Patient complaints/requests |
| `reports` | Clinical documents (labs, imaging) |
| `risk_predictions` | AI risk scores from Chronos engine |
| `notifications` | Realtime alerts for doctor notification bell |
| `ot_blocks` | Surgical session hash blocks from Sentinel |
| `patient_reminders` | Follow-up appointment reminders |
| `qr_tokens` | Secure family access QR codes |

## Storage

| Bucket | Contents |
|--------|----------|
| `sessions` | Frame JPEGs, vitals JSON, session manifests |

## Realtime-Enabled Tables

| Table | Why |
|-------|-----|
| `notifications` | Live alert bell for doctors |
| `instructions` | Nurse gets push when doctor assigns task |
| `administered` | Updates when nurse administers medication |
| `complaints` | Patient complaint status changes |
| `qr_tokens` | Detects when family scans QR code |
