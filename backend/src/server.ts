import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import publicRoutes from './routes/public.routes';
import studentRoutes from './routes/student.routes';
import adminAuthRoutes from './routes/admin.auth.routes';
import adminApiRoutes from './routes/admin.api.routes';

const app = express();

// Trust proxy for secure cookies on Render/Railway
app.set('trust proxy', 1);

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

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(`[CORS Blocked] Request origin "${origin}" is not in allowed list:`, allowedOrigins);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. Public API routes (used by Netlify submission form)
app.use('/api', publicRoutes);

// 1b. Student portal API routes (login, profile, video upload/media)
app.use('/api/student', studentRoutes);

// 2. Admin Auth routes (login, logout, me)
app.use('/admin', adminAuthRoutes);

// 3. Admin API routes (stats, submissions, media proxy, email)
app.use('/admin/api', adminApiRoutes);

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

// Global error handler
app.use(errorHandler);

const port = env.PORT;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`🚀 Self Introduction Portal running on port ${port}`);
    console.log(`📡 Public API: http://localhost:${port}/api`);
    console.log(`🛡️ Admin Portal: http://localhost:${port}/admin`);
  });
}

export default app;
