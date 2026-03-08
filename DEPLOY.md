# 🏎 F1BUZZ — GitHub Pages Deployment Guide

## Your Files
```
f1buzz/
├── index.html        ← Main site
├── css/
│   └── style.css     ← All styles + pagination styles
├── js/
│   ├── api.js        ← Jolpica F1 API calls (with cache expiry + error logging)
│   ├── ui.js         ← Rendering helpers (XSS-safe + paginated history)
│   └── app.js        ← App controller (state management + debounced search)
└── DEPLOY.md         ← This file
```

---

## Step 1 — Create a GitHub Account
Go to https://github.com and sign up (free).

---

## Step 2 — Create a New Repository
1. Click the **+** button (top right) → **New repository**
2. Name it: `f1buzz` (or anything you like)
3. Set it to **Public**
4. ✅ Check **"Add a README file"**
5. Click **Create repository**

---

## Step 3 — Upload Your Files
1. In your new repo, click **"Add file"** → **"Upload files"**
2. Drag and drop these files/folders:
   - `index.html`
   - `css/` folder (with `style.css` inside)
   - `js/` folder (with `api.js`, `ui.js`, `app.js` inside)
3. Scroll down → click **"Commit changes"**

> **Tip:** Make sure `index.html` is at the ROOT of the repo, not inside a subfolder.

---

## Step 4 — Enable GitHub Pages
1. Go to your repo → click **Settings** (tab at top)
2. Scroll down to **Pages** (left sidebar)
3. Under **Source**, select **"Deploy from a branch"**
4. Branch: **main** · Folder: **/ (root)**
5. Click **Save**

---

## Step 5 — Get Your Public URL 🎉
After ~1 minute, refresh the Pages settings page.
Your site will be live at:

```
https://YOUR-GITHUB-USERNAME.github.io/f1buzz/
```

Share this URL with anyone — it's fully public!

---

## Updating the Site
Whenever you want to update:
1. Go to your repo on GitHub
2. Click on the file you want to edit → pencil icon ✏️
3. Make changes → **Commit changes**
4. GitHub auto-deploys within ~30 seconds

---

## How the Dynamic Data Works
- **F1BUZZ Backend** (your Render.com server) is tried first for results, standings, and schedule
- **Jolpica API** (https://api.jolpi.ca) is used as a fallback if the backend is unavailable
- **OpenF1 API** (https://api.openf1.org) is used for live/recent race results on the home page
- All API responses are cached in memory for 5 minutes per session to avoid hitting rate limits
- Rate limit on Jolpica: 200 requests/hour — more than enough for normal use

---

## What Changed in This Version

### `js/api.js`
- Cache now expires after **5 minutes** (previously grew forever with no expiry)
- Silent `catch(e) {}` blocks replaced with `console.warn(...)` for easier debugging
- Magic numbers extracted to named constants (`CACHE_EXPIRY_MS`, `API_THROTTLE_DELAY_MS`)

### `js/ui.js`
- Added `escapeHtml()` — all API data is now HTML-escaped before rendering, **closing XSS vulnerability**
- `TWO_HOURS_MS` constant replaces raw `7200000` magic number in `raceStatus()`
- Removed unused `teamClass()` function
- History table is now **paginated** (20 rows per page)
- Added `debounce()` utility for search input

### `js/app.js`
- Global variables replaced with a single `AppState` object — **no more memory leaks** from stacked intervals
- `setText()` / `setHTML()` helpers centralise all DOM writes
- Countdown interval is now properly cleared when navigating away from home
- History search uses **300ms debounce** — no longer fires on every keystroke
- Hero title now uses `createElement` / `createTextNode` instead of raw innerHTML

### `css/style.css`
- Added pagination button styles (`.pagination-row`, `.page-btn`)

---

## Custom Domain (Optional)
Want `f1buzz.com` instead of `github.io/f1buzz`?
1. Buy a domain (Namecheap, GoDaddy, etc.)
2. In repo Settings → Pages → **Custom domain** → enter your domain
3. Add a CNAME record at your domain registrar pointing to `YOUR-USERNAME.github.io`