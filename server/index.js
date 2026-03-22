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

const ALLOWED = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
].filter(Boolean).map(u => u.replace(/\/$/, ''));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: (_origin, cb) => cb(null, true),
  credentials:    true,
  methods:        ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Cookie','X-Requested-With'],
}));

app.options('*', cors());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/user',     userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/weight',   weightRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/ai',       aiRoutes);
app.use('/api/split',    splitRoutes);
app.use('/api/calories', calorieRoutes);
app.use('/api/strength', strengthRoutes);

app.get('/api/health', (_req, res) =>
  res.json({
    status:     'VibeFit API live 💪',
    env:        process.env.NODE_ENV    || 'development',
    openai:     !!process.env.OPENAI_API_KEY,
    cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
    time:       new Date().toISOString(),
  })
);

app.use('/api/*', (_req, res) => res.status(404).json({ message: 'API route not found' }));

app.use((err, _req, res, _next) => {
  const status = err.statusCode || err.status || 500;
  console.error('[' + status + ']', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});

// MongoDB — cached connection (serverless warm starts reuse this)
let cached = global._mongoConn;
if (!cached) cached = global._mongoConn = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:          10000,
      maxPoolSize:              10,
      bufferCommands:           false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
};

app.use(async (_req, _res, next) => {
  try   { await connectDB(); next(); }
  catch (e) { next(e); }
});

// Only start listening in local dev — Vercel calls the exported app directly
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => app.listen(PORT, () => {
      console.log('🚀 http://localhost:' + PORT);
      if (!process.env.OPENAI_API_KEY)        console.warn('⚠️  OPENAI_API_KEY missing');
      if (!process.env.CLOUDINARY_CLOUD_NAME) console.warn('⚠️  Cloudinary not configured');
    }))
    .catch(e => { console.error('Startup failed:', e.message); process.exit(1); });
}

export default app;