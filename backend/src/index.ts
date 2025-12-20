import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import session from 'express-session';

// Load environment variables FIRST (before any imports that use them)
dotenv.config();

// Now import modules that depend on env vars
import passport from './config/passport';
import videoRoutes from './routes/video.routes';
import healthRoutes from './routes/health.routes';
import oauthRoutes from './routes/oauth.routes';
import { generalLimiter } from './middleware/rateLimit.middleware';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Request size limits (reduced for security)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration (needed for OAuth)
app.use(
  session({
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// General rate limiting
app.use(generalLimiter);

// Request timeout for long-running video analysis (3 minutes)
app.use((req, res, next) => {
  req.setTimeout(180000); // 3 minutes (reduced from 5)
  res.setTimeout(180000);
  next();
});

// Routes
app.use('/', healthRoutes);
app.use('/auth', oauthRoutes);
app.use('/', videoRoutes);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Video Searcher Backend running on port ${PORT}`);
});

export default app;
