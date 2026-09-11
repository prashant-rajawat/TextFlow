import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import healthRoutes from './routes/healthRoutes';
import ttsRoutes from './routes/ttsRoutes';
import authRoutes from './routes/authRoutes';
import historyRoutes from './routes/historyRoutes';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';

// Load environment configuration
dotenv.config();

export async function createApp(): Promise<Express> {
  const app: Express = express();

  // Security Headers for API routes
  app.use(
    '/api',
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL;
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (!frontendUrl || frontendUrl === '*' || origin === frontendUrl || origin.startsWith('http://localhost')) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );

  // Cookie Parser Middleware
  app.use(cookieParser());

  // Body Parsing & Request limits (100kb maximum payload limit)
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Development Request Logger
  if (process.env.NODE_ENV !== 'production') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });
  }

  // API Routes
  app.use('/api', healthRoutes);
  app.use('/api', authRoutes);
  app.use('/api', ttsRoutes);
  app.use('/api', historyRoutes);

  // 404 Handler for unknown API endpoints
  app.use('/api/*', notFoundHandler);

  // Vite Middleware integration for frontend serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Centralized Error Handler (Mounted at the very end of middleware pipeline)
  app.use(errorHandler);

  return app;
}
