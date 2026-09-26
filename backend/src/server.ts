import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';
import { driveService } from './services/drive.service';
import { generalApiRateLimiter } from './middleware/rateLimiter';
import publicRoutes from './routes/public.routes';
import publicStudentRoutes from './routes/public.students.routes';
import publicVideoRoutes from './routes/public.videos.routes';
import studentRoutes from './routes/student.routes';
import studentProfileRoutes from './routes/student.profile.routes';
import studentPortfolioRoutes from './routes/student.portfolio.routes';
import studentEventsRoutes from './routes/student.events.routes';
import studentInteractionsRoutes from './routes/student.interactions.routes';
import adminAuthRoutes from './routes/admin.auth.routes';
import adminApiRoutes from './routes/admin.api.routes';
import adminPortalRoutes from './routes/admin.portal.routes';
import adminAcademicYearRoutes from './routes/admin.academic-year.routes';

const app = express();

// Trust proxy for secure cookies on Render/Railway
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc: ["'self'", 'blob:'],
        connectSrc: ["'self'", 'https:'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        frameAncestors: [
          "'self'",
          'https://*.netlify.app',
          'https://*.onrender.com',
          'https://*.vercel.app',
          'http://localhost:*',
          'http://127.0.0.1:*',
        ],
      },
    },
    xFrameOptions: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// Configure CORS for Netlify frontend & local development
const allowedOrigins = env.ALLOWED_ORIGINS;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, or same-origin admin)
      if (!origin) {
        return callback(null, true);
      }

      // Normalize incoming request origin (strip trailing slashes)
      const normalizedOrigin = origin.trim().replace(/\/$/, '');

      if (
        allowedOrigins.includes(normalizedOrigin) ||
        /^https:\/\/[a-z0-9_.-]+(\.netlify\.app|\.onrender\.com|\.vercel\.app)$/i.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      console.warn(`[CORS Blocked] Request origin "${origin}" is not in allowed list:`, allowedOrigins);
      return callback(null, false);
    },
    credentials: true,
    // Media elements and the range-aware fetch fallbacks need to read these to
    // seek/inspect a stream. None of them are CORS-safelisted response headers,
    // so without this they are invisible to cross-origin clients.
    exposedHeaders: [
      'Content-Range',
      'Content-Length',
      'Accept-Ranges',
      'Content-Disposition',
      'ETag',
    ],
  })
);

app.use(cookieParser());

// Gzip/Brotli compress all JSON/text responses — reduces payload 60-80%,
// critical when 200 concurrent students poll the dashboard simultaneously.
app.use(
  compression({
    level: 6,            // balance CPU cost vs. ratio
    threshold: 1024,     // only compress responses > 1 KB
    filter: (req: express.Request, res: express.Response) => {
      // Never compress streaming video responses — already compressed
      const ct = res.getHeader('Content-Type') as string | undefined;
      if (ct && ct.startsWith('video/')) return false;
      return compression.filter(req, res);
    },
  })
);

// JSON body size: 1 MB is plenty for profile/portfolio updates.
// Multipart (video/photo) bypasses this via multer.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// General rate limiter on all /api student-facing routes
app.use('/api', generalApiRateLimiter);

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness probe for Render/Railway: DB + Drive must both respond.
app.get('/ready', async (_req, res) => {
  const probe: Record<string, 'ok' | 'down'> = { db: 'down', drive: 'down' };
  try {
    await prisma.$queryRaw`SELECT 1`;
    probe.db = 'ok';
  } catch {
    /* keep down */
  }
  try {
    await driveService.assertRootReachable();
    probe.drive = 'ok';
  } catch {
    /* keep down */
  }
  const ready = probe.db === 'ok' && probe.drive === 'ok';
  res
    .status(ready ? 200 : 503)
    .json({ status: ready ? 'ok' : 'unready', ...probe, timestamp: new Date().toISOString() });
});

// 1. Public API routes (existing submission form + new public directory)
app.use('/api', publicRoutes);
app.use('/api/public/students', publicStudentRoutes);
app.use('/api/public/videos', publicVideoRoutes);   // approved + published intro videos

// 1b. Student portal API routes
app.use('/api/student', studentRoutes);                         // existing: SSO, me, video upload
app.use('/api/student/profile', studentProfileRoutes);          // Phase 1: profile
app.use('/api/student/portfolio', studentPortfolioRoutes);      // Phase 2: projects/achievements/certs
app.use('/api/student/events', studentEventsRoutes);            // Phase 4: events
app.use('/api/student', studentInteractionsRoutes);             // Phase 5: voting, notifications, registrations, teams

// 2. Admin Auth routes (login, logout, me)
app.use('/admin', adminAuthRoutes);

// 3. Admin API routes — existing (stats, submissions, media proxy, email)
app.use('/admin/api', adminApiRoutes);

// 4. Admin Portal Management routes — Phase 7 (moderation, events, voting, RBAC, settings …)
app.use('/admin/api/portal', adminPortalRoutes);

// 5. Admin Academic Year Promotion routes
app.use('/admin/api/academic-year', adminAcademicYearRoutes);
app.use('/api/admin/academic-year', adminAcademicYearRoutes);

// 4. Admin Frontend Static Serving (Served strictly by backend, never Netlify)
const adminBuildPath = path.resolve(__dirname, '../public/admin');

if (fs.existsSync(adminBuildPath)) {
  app.use('/admin', express.static(adminBuildPath));

  // Serve index.html for both /admin and any sub-routes /admin/*
  app.get(['/admin', '/admin/*'], (_req, res) => {
    res.sendFile(path.join(adminBuildPath, 'index.html'));
  });
} else {
  // If admin frontend is not yet built, provide friendly informative landing
  app.get('/admin', (_req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Self Introduction Portal Admin</title><style>body{background:#090d16;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style></head>
        <body>
          <div style="text-align:center;max-width:500px;padding:24px;border:1px solid #1e293b;border-radius:12px;background:#0f172a;">
            <h2>👤 Self Introduction Portal</h2>
            <p style="color:#94a3b8;">Admin UI bundle is being prepared. In development, run the admin client dev server on port 5175 or run <code>npm run build:admin</code>.</p>
          </div>
        </body>
      </html>
    `);
  });
}

// 5. Student / Web Portal Frontend Static Serving (Unified single-server deployment)
const webBuildPathCandidates = [
  path.resolve(__dirname, '../../web/dist'),
  path.resolve(__dirname, '../public/web'),
];
const webBuildPath = webBuildPathCandidates.find((dir) => fs.existsSync(dir));

if (webBuildPath) {
  app.use(express.static(webBuildPath));

  // SPA fallback for student & public portal routes
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/admin') ||
      req.path === '/health' ||
      req.path === '/ready'
    ) {
      return next();
    }
    res.sendFile(path.join(webBuildPath, 'index.html'));
  });
} else {
  // If web frontend is not yet built, provide friendly informative landing on root
  app.get('/', (_req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Self Introduction Portal</title><style>body{background:#090d16;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style></head>
        <body>
          <div style="text-align:center;max-width:520px;padding:24px;border:1px solid #1e293b;border-radius:12px;background:#0f172a;">
            <h2>🎓 Self Introduction Portal</h2>
            <p style="color:#94a3b8;">Web portal bundle is not built yet. In development, run the web dev server on port 5173 or run <code>npm run build:web</code>.</p>
            <div style="margin-top:16px;display:flex;gap:12px;justify-content:center;">
              <a href="/admin" style="color:#38bdf8;text-decoration:none;border:1px solid #0284c7;padding:8px 16px;border-radius:6px;">Go to Admin Portal</a>
              <a href="/health" style="color:#a78bfa;text-decoration:none;border:1px solid #7c3aed;padding:8px 16px;border-radius:6px;">API Health</a>
            </div>
          </div>
        </body>
      </html>
    `);
  });
}

// Global error handler
app.use(errorHandler);

const port = env.PORT;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`🚀 Self Introduction Portal running on port ${port}`);
    console.log(`🌐 Web Portal:    http://localhost:${port}/`);
    console.log(`📡 Public API:    http://localhost:${port}/api`);
    console.log(`🛡️ Admin Portal:  http://localhost:${port}/admin`);
  });
}

export default app;
