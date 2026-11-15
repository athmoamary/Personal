# Life Tracker

A personal wellness and productivity tracker for fitness, nutrition, reading, habits and self-care.
It is built with React, TypeScript and Tailwind CSS and compiled into a single HTML file that runs as a Claude artifact.

- `npm install && npm run build` → `dist/index.html` (single self-contained page)
- `npm run dev` for local development (data is stored in localStorage when the artifact runtime isn't present)

## How it works
- **Time zone:** Asia/Riyadh (UTC+3, no DST). A new day starts at midnight Riyadh time, and a new fitness week every Sunday (weeks run Sunday–Saturday).
- **Storage:** each day's records are stored in a private per-user document (`data/users/<id>/d-YYYY-MM-DD`) in the artifact database, with settings in `…/settings`. A copy is also cached in localStorage. When account storage isn't reachable, the app falls back to device-only storage.
- **Scoring:** the daily % covers habits, protein, fiber and reading, and leaves out "Skip" and "Not needed". Workouts count toward a separate weekly target (3 strength, 2 Pilates, 4 cardio), capped per type.
- **Reminders:** all reminders are off by default. In-app reminders fire only while the page is open. A calendar (.ics) export turns them into native phone notifications.
