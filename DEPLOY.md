# 🏎 F1BUZZ — GitHub Pages Deployment Guide

## Your Files
```
f1buzz/
├── index.html        ← Main site
├── css/
│   └── style.css     ← All styles
├── js/
│   ├── api.js        ← Jolpica F1 API calls
│   ├── ui.js         ← Rendering helpers
│   └── app.js        ← App controller
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
   - `css/` folder (with style.css inside)
   - `js/` folder (with api.js, ui.js, app.js inside)
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
- **Jolpica API** (https://api.jolpi.ca) is called directly from the browser
- No server needed — it's all client-side JavaScript
- Data updates automatically after each race (API updates within hours of race end)
- Rate limit: 200 requests/hour (more than enough for normal use)
- Results are cached in memory per session to avoid hitting limits

---

## Custom Domain (Optional)
Want `f1buzz.com` instead of `github.io/f1buzz`?
1. Buy a domain (Namecheap, GoDaddy, etc.)
2. In repo Settings → Pages → **Custom domain** → enter your domain
3. Add a CNAME record at your domain registrar pointing to `YOUR-USERNAME.github.io`
