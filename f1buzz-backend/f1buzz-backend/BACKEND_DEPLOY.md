# 🏎 F1BUZZ Backend — Render.com Deployment Guide

## Files in this folder
```
f1buzz-backend/
├── server.js      ← Main scraper + API server
├── package.json   ← Dependencies
├── render.yaml    ← Render config
└── BACKEND_DEPLOY.md ← This file
```

---

## Step 1 — Create a NEW GitHub repo for the backend

1. Go to github.com → **New repository**
2. Name it: `f1buzz-backend`
3. Set to **Public**
4. Click **Create repository**
5. Upload these 3 files: `server.js`, `package.json`, `render.yaml`
6. Commit

---

## Step 2 — Sign up on Render.com

1. Go to **render.com**
2. Click **Get Started for Free**
3. Sign up with your **GitHub account** (easiest)

---

## Step 3 — Create a Web Service

1. On Render dashboard → click **New +** → **Web Service**
2. Click **Connect a repository** → select `f1buzz-backend`
3. Fill in:
   - **Name:** `f1buzz-backend`
   - **Region:** Singapore (closest to India)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
4. Click **Create Web Service**

---

## Step 4 — Wait for Deploy (~3 minutes)

Render will install packages and start your server.
You'll see logs — wait until you see:
```
🏎 F1BUZZ Backend running on port 10000
```

Your backend URL will be something like:
```
https://f1buzz-backend.onrender.com
```

---

## Step 5 — Test it

Open these URLs in your browser:
```
https://f1buzz-backend.onrender.com/
https://f1buzz-backend.onrender.com/api/results/2026
https://f1buzz-backend.onrender.com/api/standings/drivers/2026
```

If you see JSON data → it's working! ✅

---

## Step 6 — Update your frontend

In your `f1buzz` repo, open `js/api.js` and change line 8:
```javascript
// Change this:
const BACKEND = 'https://f1buzz-backend.onrender.com';

// To your actual Render URL:
const BACKEND = 'https://YOUR-ACTUAL-URL.onrender.com';
```

Commit → your site now uses the scraper! 🏎

---

## ⚠️ Free Plan Note
Render's free plan **spins down after 15 minutes of inactivity**.
First request after idle takes ~30 seconds to wake up.
After that it's fast. This is fine for a fan site!

## Refreshing data after a race
Visit this URL to clear the cache immediately after a race:
```
https://f1buzz-backend.onrender.com/api/refresh
```
