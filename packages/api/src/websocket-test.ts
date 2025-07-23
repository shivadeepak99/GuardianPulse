import express from 'express';
import { createServer } from 'http';
import { initSocket } from './socket';
import { Logger } from './utils';

const app = express();
const httpServer = createServer(app);
const port = 8081;

// Simple health endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'WebSocket test server running' });
});

// Initialize WebSocket
const io = initSocket(httpServer);

httpServer.listen(port, () => {
  Logger.info('WebSocket test server started', {
    port,
    endpoints: {
      health: `http://localhost:${port}/health`,
      websocket: `ws://localhost:${port}`,
    },
  });
});

export { io };
