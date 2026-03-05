import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import identifyRoutes from './routes/identify';
import prisma from './db';
import { execSync } from 'child_process';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database on startup
async function initializeDatabase() {
  try {
    // Push schema to database (creates tables if they don't exist)
    console.log('🔄 Initializing database...');
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('⚠️ Database initialization warning:', error);
    // Continue anyway - the database might already exist
  }
}

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    message: 'Bitespeed Identity Reconciliation Service',
    endpoints: {
      identify: 'POST /identify',
    },
  });
});

// Routes
app.use('/', identifyRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Graceful shutdown
async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server with database initialization
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📍 POST /identify - Identity Reconciliation Endpoint`);
  });
}

startServer().catch(console.error);

export default app;
