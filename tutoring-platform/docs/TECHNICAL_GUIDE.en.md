# Dalili — Technical Guide

🌐 **النسخة العربية:** [`TECHNICAL_GUIDE.md`](./TECHNICAL_GUIDE.md)

Detailed documentation of the project architecture and every feature built, for easier understanding, maintenance, and future development.

> This is the English counterpart of `TECHNICAL_GUIDE.md` (Arabic). Line-by-line explanations live as comments inside the source files themselves (UI components, server actions, migration files).

---

## 1) Overview

**Dalili** (دليلي) is an Iraq-focused, Arabic (RTL) platform that connects students with **verified tutors** by **governorate, subject, and grade level**. The main screen is an **interactive map** of tutors, with a **questions/messages** system, **ratings**, and **push notifications**.

### Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind |
| Backend/DB | Supabase (Postgres 16 + Auth + Storage + RLS) |
| Map | Leaflet + react-leaflet + react-leaflet-cluster |
| Notifications | Web Push (VAPID) via Database Webhook + API route |
| Hosting | Vercel (frontend) + Supabase Cloud (backend) |
| PWA | manifest + service worker (sw.js) |

### Core principles
- **Real security lives in the database (RLS):** every protection is enforced at the Postgres level; the UI is only a second layer.
- **The `service_role` key is server-only** (env var, never sent to the client, never committed).
- **Migrations are applied manually** via the Supabase SQL Editor, and all of them are **idempotent** (safe to re-paste).

---

## 2) Database Structure

### Core tables
- `teacher_profiles` / `student_profiles` — user profiles (linked to `auth.users`).
- `governorates` (18 governorates with coordinates) · `subjects` · `stages`.
- `teacher_subjects` / `teacher_stages` — many-to-many relations.
- `questions` / `messages` / `notifications` — the Q&A and conversation flow.
- `teacher_ratings` — ratings.
- `reports` — abuse reports.
- `account_status` — account state (self-deactivation + admin ban).
- `announcements` — broadcasts and announcements.
- `push_subscriptions` — per-device push subscriptions.
- `user_roles` — roles (admin).
- `app_config` — settings (webhook URL/secret), read only via SECURITY DEFINER functions.

### `teacher_directory` (public, PII-free VIEW)
A system-owned (definer) view exposing **public columns only** for approved, active tutors (excludes: non-approved, self-deactivated, banned). It does **not** contain phone/email (anti-scraping). The `map_teachers()` and `search_teachers()` functions read from it.

---

## 3) Security Model (protection summary)

| Protection | Mechanism |
|---|---|
| Prevent tutor self-verification | `clamp_teacher_insert` trigger forces pending/0 for app roles |
| Prevent PII leaks | `teacher_directory` definer view with public columns only |
| User identity | `auth.uid()` reads the JWT claim; reliable inside SECURITY DEFINER |
| Prevent message/question forgery | triggers enforce sender = account + rate limits |
| Prevent forged ban/verification | policies + `protect_account_ban` trigger |
| SSRF in the push route | allowlist + webhook secret check (constant-time compare) |

Role-detection functions (SECURITY DEFINER, bypass RLS for reads): `is_admin()`, `is_teacher()`, `is_student()`, `is_banned()`, `is_account_deactivated()`.

---

## 4) Features and How They Work

### 4.1 Map + Search + Sort
- `HomeView.tsx`: loads all tutors (via `map_teachers`) and filters in the browser by **subject/gender/name**.
- **Sort dropdown**: "Nearest / Highest-rated / Most-active". "Nearest" computes distance (haversine) from the logged-in user's governorate (fetched server-side via `getUserGov`), and is hidden for guests without a governorate.
- Clustering: clicking a cluster immediately opens a list of tutor cards.

### 4.2 Public tutor page — `/teacher/[id]`
- Reads from `teacher_directory` (excludes invalid → 404).
- Shows: the full profile + **written reviews** (without the student's name, for privacy) + **SEO metadata** (`generateMetadata`) + WhatsApp/Telegram share + a report button.
- Performance: `getProfile` is wrapped in React `cache()` (one query per request instead of two).
- **Security decision:** contact details (phone/email) are **not** shown on a Google-indexable page.

### 4.3 Ratings — `teacher_ratings`
- One rating per (student, tutor), gated by a **real interaction** (the tutor replied to the student).
- The average and count are computed **live** in `teacher_directory` (any edit reflects immediately).
- **Admin moderation** (`/admin/ratings`): search a tutor → edit/delete any rating (migration 31 adds UPDATE permission for admins; delete was already allowed).

### 4.4 Reports and Ban — `reports` + `account_status.banned`
- **Report** (`ReportButton`): a reporter can only file their own report, **no self-report**, **no impersonation**, **one open report per pair** (partial unique index). Only admins can read.
- **Admin ban**: the `banned` column is protected by the `protect_account_ban` trigger (a banned user can't unban themselves). A banned user **disappears from the directory** and is **blocked from messages/questions/ratings** via **RESTRICTIVE policies**.
- `/admin/reports` page: review / dismiss / ban.

### 4.5 Announcements — `announcements`
A unified table serving three cases:
- `audience`: `students` / `teachers` / `all` / `user`.
- `kind`: `announcement` / `tip` / `approval`.

**Read (RLS):** each user sees content matching their role (`is_student`/`is_teacher`) or personally targeted at them; **admins see everything** (for management). Insert/update/delete are **admin-only**.

**Flows:**
- **Tutor verification notification**: on approval (`setTeacherVerification`), a `audience='user', kind='approval'` row is inserted → the push trigger sends it as a **push** to the tutor + shows as a banner.
- **Student/teacher broadcasts + daily tip** (`/admin/announcements`): three boxes → delivered as **push to the audience + an in-app banner** (`AnnouncementsBanner`, dismissible with local persistence).

### 4.6 Push Notifications (Web Push) — full architecture
1. The browser subscribes (VAPID) → the subscription is stored in `push_subscriptions`.
2. Any insert into `notifications` / `messages` / `announcements` fires the `notify_push_on_insert()` trigger (reads URL/secret from `app_config`).
3. The trigger POSTs (via `pg_net`) the INSERT payload to the `/api/push/send` route.
4. The route (Node runtime): verifies the secret, **re-fetches the row from the DB** (never trusts the payload), builds the notification text, then:
   - **Single user** (questions/messages/verification) → only their subscriptions.
   - **Audience** (students/teachers/all) → subscriptions of every matching user.
5. Sends via `web-push` and prunes dead subscriptions (404/410).

> To add a new push channel: add the `notify_push_on_insert` trigger on the table + a branch in `buildTarget` within the route. No new webhook setup needed.

### 4.7 Dark Mode 🌙
- Colors are **CSS variables** (RGB channels) defined for `:root` (light) and `:root[data-theme="dark"]` (dark) — flipping a single attribute swaps the whole UI.
- A `card` token (white in light / navy in dark) replaces `bg-white`.
- A toggle button in the bottom nav + persistence in `localStorage` + a **no-flash** script in `<head>` before first paint. Default is light.

### 4.8 Splash Screen + PWA
- `#dalili-splash`: a circular logo + pulsing ring + tagline + loading dots, with a staggered entrance and a clean exit (`visibility:hidden`).
- PWA: `manifest.ts` + `sw.js` (now only serves precached icons and never intercepts HTML/JS — prevents ChunkLoadError).

---

## 5) Performance Optimizations
- **Home data** cached for 30 seconds (`unstable_cache`).
- **Middleware** does not call Supabase for guests (no `sb-` session cookie) — one fewer network round-trip per navigation.
- **Tutor page**: `cache()` dedupes the repeated query.
- Images via `next/image` where possible + preload for the top banner.

---

## 6) Workflow and Maintenance
- **Development** happens on a `claude/database-architecture-explanation-*` branch and is fast-forward merged into `main` on an explicit "update main" request.
- **Manual migrations**: paste a `supabase/migrations/*.sql` file into the Supabase SQL Editor. All are idempotent.
- **Environment variables (Vercel):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), VAPID keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), and `PUSH_WEBHOOK_SECRET`.
- **Webhook settings** are stored in `app_config` (keys: `push_webhook_url`, `push_webhook_secret`).

### Important code rule (lesson learned)
`"use server"` files may **only export async functions**. Exporting a constant from one makes it arrive **broken** on the client and causes a runtime crash. Shared constants/types belong in a plain module (e.g., `lib/reports/constants.ts`).

---

## 7) Migration Map (most recent)
| # | File | Content |
|---|---|---|
| 28 | `teacher_profile_enrich` | bio / years of experience / gender + directory rebuild |
| 29 | `teacher_ratings` | ratings table + average in the directory |
| 30 | `reports_and_ban` | reports + admin ban + hiding banned users |
| 31 | `admin_edit_ratings` | admin permission to edit ratings |
| 32 | `announcements` | announcements system + role functions + push trigger |
| 33–40 | (see files) | push allowlist, featured, views, YouTube, admin tiers, referrals, teacher study content |
| 41 | `security_audit_fixes` | full security-audit fixes (see section 8) |
| 42 | `message_read_state` | message read/unread state (`message_reads` table, mark-read functions, badge summary) |

---

## 8) Security-Audit Lessons (migration 41) — rules to keep

1. **Views are dangerous by default on Supabase.** Any view created in `public` receives `ALL` privileges for `anon` and `authenticated`, and runs with its owner's rights, bypassing RLS. A simple view (one table, no aggregation) accepts `UPDATE/DELETE` from any visitor. **After every `create view`**: `revoke all ... from public, anon, authenticated`, then grant `select` only where needed.
2. **`revoke ... from public` is not enough for functions.** Supabase grants `anon`/`authenticated` EXECUTE explicitly through default privileges. For server-only functions: `revoke execute ... from public, anon, authenticated`, then `grant ... to service_role`.
3. **Functions used inside a view** must be executable by whoever queries the view (which is why `is_banned`/`is_account_deactivated` stay callable by visitors — the public directory depends on them).
4. **An owner `FOR ALL` policy includes DELETE.** If the row carries admin-enforced state (e.g. a ban), deleting it removes that state. Use separate select/insert/update policies.
5. **An UPDATE policy without a freeze trigger lets every column change** (keys, timestamps, statuses). Freeze sensitive columns with a `BEFORE UPDATE` trigger for app roles.
6. **App-side validation does not protect the database**: any user can call REST directly with the anon key. Every important constraint (links, sizes, rate limits) must also be enforced in the database.
7. **Server-action arguments are untyped at runtime**: validate them (`lib/validate.ts`) and never return a raw `error.message` to the user (`dbErrorMessage`).
8. **Testing**: local `supabase` is unavailable, so we emulate Supabase's default privileges on a local Postgres and run attack tests plus functional tests before any migration.
