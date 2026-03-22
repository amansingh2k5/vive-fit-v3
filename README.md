# VibeFit 💪 — AI-Powered MERN Gym Tracker

> Electric Neon · GPT-4o Coaching · Full-Stack MERN

---

## Stack

| Layer       | Technology                                   |
|-------------|----------------------------------------------|
| Frontend    | React 18 + Vite, Tailwind CSS, Framer Motion |
| Backend     | Node.js 20, Express 4                        |
| Database    | MongoDB Atlas + Mongoose                     |
| Auth        | JWT in HTTP-only cookies                     |
| Email       | Nodemailer + Gmail App Password              |
| File Upload | Multer → Cloudinary                          |
| AI          | OpenAI GPT-4o                                |
| Charts      | Recharts (Radar + Line)                      |
| Validation  | Joi (server) · Zod + react-hook-form (client)|

---

## Project Structure

```
vibefit/
├── server/
│   ├── index.js              # Express app + MongoDB connection
│   ├── models/
│   │   ├── User.js           # User schema (stats, PRs, photos, OTP)
│   │   ├── Workout.js        # Workout schema (exercises → sets)
│   │   └── WeightLog.js      # Daily weight entries
│   ├── routes/
│   │   ├── auth.js           # Register, login, logout, forgot/reset password
│   │   ├── user.js           # Profile, stats, PRs, goal, calories
│   │   ├── workouts.js       # CRUD workout sessions
│   │   ├── weight.js         # Daily weight log
│   │   ├── upload.js         # Cloudinary physique photos
│   │   └── ai.js             # GPT-4o analysis endpoint
│   ├── middleware/
│   │   ├── auth.js           # verifyToken + issueToken
│   │   └── upload.js         # Multer + Cloudinary storage
│   └── services/
│       └── mailer.js         # Nodemailer OTP + welcome emails
│
└── client/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx     # Global auth state (React Context)
    │   ├── lib/
    │   │   ├── api.js              # Axios instance (cookie-credentialed)
    │   │   └── validators.js       # Zod schemas for all forms
    │   ├── pages/
    │   │   ├── Auth/AuthPage.jsx        # Login · Register · Forgot · OTP · Reset
    │   │   ├── Onboarding/              # 4-step stats → PRs → photos → goal
    │   │   ├── Dashboard/               # Strength score, weight chart, radar
    │   │   ├── Logger/                  # Set/rep/weight logger with dynamic fields
    │   │   └── AI/                      # GPT-4o analysis + calorie apply
    │   ├── components/
    │   │   └── layout/AppShell.jsx      # Sticky header + mobile bottom nav
    │   ├── index.css                    # Tailwind + glassmorphism utilities
    │   └── App.jsx                      # Router with auth guards
    ├── tailwind.config.js               # Electric Neon theme
    └── vite.config.js                   # Dev proxy to :5000
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/you/vibefit.git
cd vibefit

# Install all dependencies (root + server + client)
npm run install:all
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
# Fill in all values (see below)
```

### 3. Run development servers

```bash
# From root — starts both backend (:5000) and frontend (:5173) concurrently
npm run dev
```

---

## Environment Variables (server/.env)

| Variable                 | Where to get it                                      |
|--------------------------|------------------------------------------------------|
| `MONGO_URI`              | MongoDB Atlas → Connect → Drivers                    |
| `JWT_SECRET`             | Any random 32+ char string                           |
| `EMAIL_USER`             | Your Gmail address                                   |
| `EMAIL_PASS`             | Google Account → Security → App Passwords            |
| `CLOUDINARY_CLOUD_NAME`  | Cloudinary Dashboard                                 |
| `CLOUDINARY_API_KEY`     | Cloudinary Dashboard → API Keys                      |
| `CLOUDINARY_API_SECRET`  | Cloudinary Dashboard → API Keys                      |
| `OPENAI_API_KEY`         | platform.openai.com → API Keys                       |

---

## API Reference

### Auth  `POST /api/auth/`
| Method | Endpoint            | Body                              | Auth |
|--------|---------------------|-----------------------------------|------|
| POST   | `/register`         | `{ name, email, password }`       | —    |
| POST   | `/login`            | `{ email, password }`             | —    |
| POST   | `/logout`           | —                                 | —    |
| GET    | `/me`               | —                                 | ✓    |
| POST   | `/forgot-password`  | `{ email }`                       | —    |
| POST   | `/reset-password`   | `{ email, otp, newPassword }`     | —    |

### User  `PUT/PATCH /api/user/`
| Method | Endpoint      | Body                                     |
|--------|---------------|------------------------------------------|
| GET    | `/profile`    | —                                        |
| PUT    | `/stats`      | `{ age, heightCm, weightKg }`            |
| PUT    | `/prs`        | `{ bench, squat, deadlift, ohp, latPulldown }` |
| PUT    | `/goal`       | `{ goal: 'bulk'|'cut'|'recomp' }`        |
| PATCH  | `/calories`   | `{ dailyCalorieTarget }`                 |

### Workouts  `/api/workouts`
| Method | Endpoint  | Notes                          |
|--------|-----------|--------------------------------|
| GET    | `/`       | `?from=&to=&limit=20`          |
| GET    | `/:id`    |                                |
| POST   | `/`       | Full workout object            |
| PUT    | `/:id`    | Replace workout                |
| DELETE | `/:id`    |                                |

### Weight  `/api/weight`
| Method | Endpoint | Notes              |
|--------|----------|--------------------|
| GET    | `/`      | `?days=21`         |
| POST   | `/`      | `{ weightKg }`  (upserts today's entry) |

### Upload  `/api/upload`
| Method | Endpoint              | Notes                  |
|--------|-----------------------|------------------------|
| POST   | `/physique`           | `multipart/form-data` with `photo` field |
| DELETE | `/physique/:publicId` |                        |

### AI  `/api/ai`
| Method | Endpoint   | Notes                                      |
|--------|------------|--------------------------------------------|
| GET    | `/analyze` | Requires ≥1 workout in last 7 days. Returns structured JSON analysis. |

---

## Strength Score Formula

```
raw = bench×1.0 + squat×1.2 + deadlift×1.3 + ohp×0.8 + latPulldown×0.7
score = min(round(raw / 8), 1000)
```

Calculated server-side as a Mongoose virtual — never stored in DB.

---

## Mobile Optimisation

- Bottom navigation bar on `< md` breakpoint
- All inputs are large-tap-target (`py-3`)
- Number inputs with `inputMode="numeric"` for gym-floor use
- `overscroll-behavior: none` prevents pull-to-refresh accidents mid-set
- Vite proxy means no CORS issues in development

---

## Production Deployment

```bash
# Build client
cd client && npm run build

# Serve static files from Express (add to server/index.js):
# import { fileURLToPath } from 'url';
# import path from 'path';
# const __dirname = path.dirname(fileURLToPath(import.meta.url));
# app.use(express.static(path.join(__dirname, '../client/dist')));
# app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));
```

Recommended hosts: **Railway** (full-stack), **Render**, or **Fly.io** for the server + **Vercel** for the client.

---

## License

MIT
