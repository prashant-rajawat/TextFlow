import { createApp } from './server/app';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

async function start() {
  try {
    const app = await createApp();
    app.listen(PORT, HOST, () => {
      console.log(`TextFlow API server running on http://${HOST}:${PORT}`);
      console.log(`Health check available at http://${HOST}:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start TextFlow API server:', error);
    process.exit(1);
  }
}

start();
