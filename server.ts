import express from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { authRouter } from './server/routes/auth.routes.js';
import { batchRouter } from './server/routes/batch.routes.js';
import { eventRouter } from './server/routes/event.routes.js';
import { labRouter } from './server/routes/lab.routes.js';
import { productRouter } from './server/routes/product.routes.js';
import { statsRouter } from './server/routes/stats.routes.js';
import { blockchainRouter } from './server/routes/blockchain.routes.js';
import { publicRouter } from './server/routes/public.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/batches', batchRouter);
  app.use('/api/events', eventRouter);
  app.use('/api/lab-tests', labRouter);
  app.use('/api/products', productRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/blockchain', blockchainRouter);
  app.use('/api/public', publicRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'HerbOrigin: Blockchain-Based End-to-End Traceability of Ayurvedic Herbs from Source to Shelf',
      timestamp: new Date().toISOString(),
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // In dev: mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production: serve static built dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌿 HerbOrigin Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
