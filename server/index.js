import 'dotenv/config';
import express      from 'express';
import mongoose     from 'mongoose';
import cors         from 'cors';
import helmet       from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit    from 'express-rate-limit';

import authRoutes     from './routes/auth.js';
import userRoutes     from './routes/user.js';
import workoutRoutes  from './routes/workouts.js';
import weightRoutes   from './routes/weight.js';
import uploadRoutes   from './routes/upload.js';
import aiRoutes       from './routes/ai.js';
import splitRoutes    from './routes/split.js';
import calorieRoutes  from './routes/calories.js';
import strengthRoutes from './routes/strength.js';

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (_o, cb) => cb(null, true), credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','Cookie','X-Requested-With'] }));
app.options('*', cors());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true, legacyHeaders: false, skip: (req) => !req.ip }));
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, skip: (req) => !req.ip });

// ── MongoDB ────────────────────────────────────────────────
let mongoError = null;
let mongoState = 'not started';

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 2) {
    // Already connecting — wait for it
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
    return;
  }

  mongoState = 'connecting';
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS:          30000,
      connectTimeoutMS:         15000,
      maxPoolSize:              5,
    });
    mongoState = 'connected';
    mongoError = null;
    console.log('✅ MongoDB connected');
  } catch (err) {
    mongoState = 'failed';
    mongoError = err.message;
    console.error('❌ MongoDB failed:', err.message);
    throw err;
  }
};

// Connect before every request
app.use(async (_req, _res, next) => {
  try { await connectDB(); next(); }
  catch (e) { next(Object.assign(e, { statusCode: 503, message: 'DB unavailable: ' + e.message })); }
});

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/user',     userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/weight',   weightRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/ai',       aiRoutes);
app.use('/api/split',    splitRoutes);
app.use('/api/calories', calorieRoutes);
app.use('/api/strength', strengthRoutes);

// Health — shows REAL mongo state + error message if any
app.get('/api/health', (_req, res) =>
  res.json({
    status:     'VibeFit API live 💪',
    env:        process.env.NODE_ENV || 'development',
    openai:     !!process.env.OPENAI_API_KEY,
    cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
    mongo:      { state: mongoState, readyState: mongoose.connection.readyState, error: mongoError },
    time:       new Date().toISOString(),
  })
);

app.use('/api/*', (_req, res) => res.status(404).json({ message: 'API route not found' }));
app.use((err, _req, res, _next) => {
  const status = err.statusCode || err.status || 500;
  console.error('[' + status + ']', err.message);
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => app.listen(PORT, () => console.log('🚀 http://localhost:' + PORT)))
    .catch(e => { console.error('Startup failed:', e.message); process.exit(1); });
}

export default app;