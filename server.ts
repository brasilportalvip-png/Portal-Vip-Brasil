import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app.js';
import { config } from './server/config/index.js';
import { startVideoRetryDaemon } from './server/production/videoRetryDaemon.js';

async function startServer() {
  const app = createApp();

  if (!config.isProduction) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1h',
      etag: true,
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.cjs') || filePath.endsWith('.map')) {
          res.status(404);
        }
      }
    }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(config.port, config.host, () => {
    console.log(`[Froc.IA] servidor em http://${config.host}:${config.port}`);
    startVideoRetryDaemon();
  });
}

startServer().catch((error) => {
  console.error('[Froc.IA] falha fatal:', error);
  process.exit(1);
});
