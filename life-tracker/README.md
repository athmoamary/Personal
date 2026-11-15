# Évol

*Evolve a little, every day.*

Évol (formerly Life Tracker) is a personal wellness and self-development app covering fitness, nutrition, reading, habits, self-care and Frequency Maxxing rituals.
It is built with React, TypeScript and Tailwind CSS and compiled into a single HTML file that runs as a Claude artifact.

- `npm install && npm run build` → `dist/index.html` (single self-contained page)
- `npm run build:web` → `dist-web/`: a regular website (installable on the Home Screen, works offline), deployed to GitHub Pages by `.github/workflows/deploy-life-tracker.yml` on every push to `main` that touches `life-tracker/`
- `npm run dev` for local development (data is stored in localStorage when the artifact runtime isn't present)

## How it works
- **Time zone:** Asia/Riyadh (UTC+3, no DST). A new day starts at midnight Riyadh time, and a new fitness week every Sunday (weeks run Sunday–Saturday).
- **Storage:** each day's records are stored in a private per-user document (`data/users/<id>/d-YYYY-MM-DD`) in the artifact database, with settings in `…/settings`. A copy is also cached in localStorage. When account storage isn't reachable, the app falls back to device-only storage.
- **Scoring:** the daily % covers habits, protein, fiber and reading, and leaves out "Skip" and "Not needed". Workouts count toward a separate weekly target (3 strength, 2 Pilates, 4 cardio), capped per type.
- **Reminders:** all reminders are off by default. In-app reminders fire only while the page is open. A calendar (.ics) export turns them into native phone notifications.

## Website version (GitHub Pages)
The website keeps data in the browser's local storage on each device. Nothing is sent to a server, and there is no cross-device sync; use Backup/Restore in Settings to move data.
On iPhone, add the site to the Home Screen: it then opens full-screen, and Safari's 7-day storage cleanup doesn't apply.

One-time setup:
1. Repo **Settings → General → Danger Zone → Change visibility → Public** (Pages on a free plan needs a public repo).
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Merge this work into `main`. The workflow builds and publishes to `https://athmoamary.github.io/Personal/`.

## Frequency Maxxing ✨
- Six activities (`category: 'frequency'` habits) across morning, midday and evening rituals. Each counts once in the daily %, and Frequency % = done ÷ 6.
- Listening studio: a countdown timer (5–30 min) stored as accumulated time plus a start timestamp. When it finishes, a global watcher logs the session and can tick the ritual activity.
- Audio: a real sine tone generated with the Web Audio API (no files), independent of the timer, plus clearly labelled external links (YouTube/Spotify search).
- Mood check-ins (before/after, 1–5 scale), journal hub (autosave, calendar, search, filters), and an optional "14 Days of Alignment" challenge.
- Frequency associations are presented as wellness traditions, not science.

## Data migration
Settings version 2 adds the six Frequency activities and three reminders (disabled) to existing data. New activities start from the upgrade day, so earlier days are never marked missed. All existing habits, history and settings are preserved, and the storage key is unchanged.
