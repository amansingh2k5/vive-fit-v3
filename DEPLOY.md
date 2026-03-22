# VibeFit — GitHub + Vercel Deployment Guide

## Architecture on Vercel

```
vibefit.vercel.app/
├── /            → React SPA (client/dist — Vite build)
├── /dashboard   → React SPA (client-side routing)
├── /api/*       → Serverless Function (api/index.js → server/index.js → Express)
```

Both frontend and backend deploy from the **same GitHub repo** to the **same Vercel project**.
No separate backend hosting needed.

---

## Step 1 — Prepare MongoDB Atlas

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Create free cluster
2. **Database Access** → Add user → username + password → "Read and write to any database"
3. **Network Access** → Add IP Address → `0.0.0.0/0` (allow all — required for Vercel)
4. **Connect** → Drivers → Copy the connection string
   - Replace `<password>` with your DB user password
   - Replace `myFirstDatabase` with `vibefit`
   - Example: `mongodb+srv://aman:mypass123@cluster0.abc.mongodb.net/vibefit?retryWrites=true&w=majority`

---

## Step 2 — Push to GitHub

```bash
# From inside the vibefit/ folder:
git init
git add .
git commit -m "Initial VibeFit commit"

# Create repo on github.com (New repository → vibefit → Don't initialise with README)
git remote add origin https://github.com/YOUR_USERNAME/vibefit.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Click **Import Git Repository** → Select your `vibefit` repo
3. Vercel auto-detects the config from `vercel.json` — **don't change any build settings**
4. Click **Environment Variables** → Add ALL of these:

| Variable | Value |
|---|---|
| `MONGO_URI` | Your Atlas connection string |
| `JWT_SECRET` | 64-char random string (see below) |
| `JWT_EXPIRES_IN` | `7d` |
| `EMAIL_USER` | your Gmail address |
| `EMAIL_PASS` | Gmail App Password (16 chars) |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `OPENAI_API_KEY` | From platform.openai.com |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Leave blank for now — add after first deploy |

5. Click **Deploy** → Wait 2-3 minutes

6. After deploy: copy your URL (e.g. `https://vibefit-abc123.vercel.app`)
   → Go to **Settings → Environment Variables**
   → Add `FRONTEND_URL` = `https://vibefit-abc123.vercel.app`
   → **Redeploy** (Deployments → ⋯ → Redeploy)

---

## Generate a JWT Secret

Run this in any terminal to get a secure random string:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Verify Deployment

After deploy, visit:
```
https://your-app.vercel.app/api/health
```

Should return:
```json
{
  "status": "VibeFit API live 💪",
  "env": "production",
  "openai": true,
  "cloudinary": true,
  "time": "2026-03-21T..."
}
```

If `openai` or `cloudinary` shows `false`, that env var is missing — check Vercel dashboard.

---

## Cookie Authentication on Vercel

HTTP-only cookies work correctly because frontend and API are on the **same domain** (`vibefit.vercel.app`). 
No changes to cookie settings are needed — same-site cookies work perfectly.

> If you later move the API to a separate domain (e.g. `api.vibefit.com`), you'll need to change `sameSite: 'none'` and `secure: true` in `server/middleware/auth.js`.

---

## Updating After Changes

```bash
git add .
git commit -m "describe your change"
git push
```

Vercel auto-deploys on every push to `main`. Done.

---

## Local Development (unchanged)

```bash
# Terminal 1 — Backend
cd server
cp .env.example .env   # fill in your values
npm install
npm run dev            # → http://localhost:5000

# Terminal 2 — Frontend
cd client
npm install
npm run dev            # → http://localhost:5173
```

The Vite dev server proxies `/api/*` to `:5000` automatically.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot find module '../server/index.js'` | Make sure `vercel.json` has `"includeFiles": "server/**"` in functions config |
| `MongoServerSelectionError` | Check Atlas Network Access — must allow `0.0.0.0/0` |
| `Invalid cloud_name` | Cloudinary env vars missing in Vercel dashboard |
| `CORS error` in browser | Add `FRONTEND_URL` env var + redeploy |
| Cookies not sent | Check browser → Application → Cookies — must be same domain |
| 500 on `/api/health` | Check Vercel function logs → Project → Deployments → Functions tab |

