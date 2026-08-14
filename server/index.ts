import express from 'express';
import cors from 'cors';
import { familyTreeRouter } from './routes/familyTreeRouter.js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/familytree', familyTreeRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'rithamic-familytree-api', timestamp: new Date() });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🌳 Rithamic Family Tree API running on http://localhost:${PORT}`);
  });
}

export default app;
