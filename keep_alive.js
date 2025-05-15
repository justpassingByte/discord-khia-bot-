// keep_alive.js
import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get version
const packageJson = JSON.parse(fs.readFileSync(join(__dirname, 'package.json'), 'utf8'));
const { version } = packageJson;

const server = express();

// Main route
server.all('/', (req, res) => {
  const uptime = process.uptime();
  const uptimeFormatted = formatUptime(uptime);
  
  res.send(`
    <html>
      <head>
        <title>Cà Khịa Bot - Status</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #2c2f33; color: #ffffff; }
          h1 { color: #7289da; }
          .status { background-color: #3a3d41; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .online { color: #43b581; }
          .info { display: flex; flex-direction: column; gap: 8px; }
          .footer { margin-top: 30px; font-size: 0.8em; color: #99aab5; }
        </style>
      </head>
      <body>
        <h1>Cà Khịa Bot</h1>
        <div class="status">
          <h2>Status: <span class="online">Online</span></h2>
          <div class="info">
            <p><strong>Version:</strong> ${version}</p>
            <p><strong>Uptime:</strong> ${uptimeFormatted}</p>
          </div>
        </div>
        <p>Bot is currently running. This page helps keep the bot alive on platforms like Replit.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Cà Khịa Bot</p>
        </div>
      </body>
    </html>
  `);
});

// Health check endpoint for monitoring services
server.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Format uptime in a human-readable format
function formatUptime(uptime) {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
  
  return parts.join(', ');
}

function keepAlive() {
  server.listen(3000, () => {
    console.log('Server is running on port 3000');
    console.log('Visit / for status page');
    console.log('Visit /health for health check endpoint');
  });
}

export { keepAlive }; 