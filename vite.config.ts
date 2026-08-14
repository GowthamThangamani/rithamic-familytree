import { defineConfig, Plugin } from 'vite';
import express from 'express';
import cors from 'cors';
import { familyTreeRouter } from './server/routes/familyTreeRouter.ts';

function postgresApiPlugin(): Plugin {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/familytree', familyTreeRouter);

  return {
    name: 'familytree-db-api',
    configureServer(server) {
      server.middlewares.use(app);
    }
  };
}

export default defineConfig({
  root: './',
  plugins: [postgresApiPlugin()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist'
  }
});
