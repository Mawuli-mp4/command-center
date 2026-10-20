# Cutting Board

Personal project dashboard. Next.js on Vercel, Vercel Postgres (Neon), installable on iPhone from Safari, push notifications at the start of each work block (Montreal time).

## Deploy (about 15 minutes)

1. Push this folder to a new private GitHub repo.
2. In Vercel: Add New → Project → import the repo. Deploy once (it will show a database error; that's expected).
3. Vercel project → Storage → Create Database → Neon (Postgres) → connect it to the project. This sets `DATABASE_URL`.
4. Generate push keys locally: `npx web-push generate-vapid-keys`
5. Vercel project → Settings → Environment Variables, add:
   - `DASHBOARD_KEY`: your passcode
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: from step 4
   - `VAPID_SUBJECT`: `mailto:` + your email
   - `CRON_SECRET`: any long random string
   - `ANTHROPIC_API_KEY`: optional, turns on AI sorting of dictated updates
6. Redeploy. Open the URL, enter your passcode, tap **Set up board**. Your current projects load in.

## Install on iPhone

Safari → open the URL → Share → Add to Home Screen. Open **Board** from the home screen, sign in again (the home-screen app keeps its own login), then tap **Turn on notifications** at the bottom. A test notification confirms it works.

## Daily use

- Work blocks: tap **Work hours** in the header to set a workstation window per day (default Mon–Fri 10 am–8 pm). Every other hour is laptop time. Saved to the database, so it applies everywhere, including the notification briefs.
- "Up next" shows tasks for the current block. Switch Projects to **Board** for a column view (Workstation / Laptop / Done today); drag cards or tap the arrow to move them.
- Projects disappear from the main list once wrapped or every task is ticked. Find them under **Completed** at the bottom of Projects.
- Tap a task's block tag to move it between blocks.
- **Log update**: tap the mic on the iOS keyboard and talk. File it under one project, or let AI split it across projects, tick off finished tasks and add new ones. You review before anything saves.

## Notes

- Crons run at 14:00 UTC daily and 00:00 UTC Tue–Sat: 10 am / 8 pm Montreal during daylight time, 9 am / 7 pm after Nov 1.
- Seed data lives in `lib/seed.js`; it only loads into an empty database.
