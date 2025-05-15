// webserver.js
// Tách biệt web server từ bot để đảm bảo Railway tạo URL cố định

import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Đọc package.json để lấy phiên bản
try {
  var packageJson = JSON.parse(fs.readFileSync(join(__dirname, 'package.json'), 'utf8'));
  var version = packageJson.version;
} catch (e) {
  console.error('Không thể đọc package.json:', e);
  var version = '1.0.0';
}

// Khởi tạo Express server
const server = express();

// Cấu hình server - Railway tự động cung cấp PORT
server.set('port', process.env.PORT || 3000);
server.set('host', '0.0.0.0');

// Route chính
server.all('/', (req, res) => {
  const uptime = process.uptime();
  const uptimeFormatted = formatUptime(uptime);
  
  res.send(`
    <html>
      <head>
        <title>Cà Khịa Bot - Status</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            <p><strong>Server:</strong> Railway</p>
          </div>
        </div>
        <p>Bot is currently running. This page helps keep the bot alive.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Cà Khịa Bot</p>
        </div>
      </body>
    </html>
  `);
});

// Endpoint kiểm tra sức khỏe cho các dịch vụ giám sát
server.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: version,
    platform: 'Railway'
  });
});

// Endpoint ping đơn giản
server.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Định dạng uptime dạng dễ đọc
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

// Khởi động server
function startServer() {
  const PORT = server.get('port');
  const HOST = server.get('host');
  
  return new Promise((resolve, reject) => {
    const serverInstance = server.listen(PORT, HOST, () => {
      console.log(`Web server is running on ${HOST}:${PORT}`);
      console.log('Visit / for status page');
      console.log('Visit /health for health check endpoint');
      console.log('Visit /ping for simple ping endpoint');
      resolve(serverInstance);
    }).on('error', (err) => {
      console.error('Failed to start web server:', err);
      reject(err);
    });
  });
}

// Export hàm khởi động server
export { startServer }; 