// index.js
// File khởi động chính cho cả bot Discord và web server

import { startServer } from './webserver.js';
import { startBot } from './src/bot.js';

// Khởi động web server trước để Replit nhận diện port
async function main() {
  try {
    // Khởi động web server
    console.log('Starting web server...');
    const server = await startServer();
    console.log('Web server started successfully');
    
    // Khởi động bot Discord
    console.log('Starting Discord bot...');
    await startBot();
    console.log('Discord bot started successfully');
    
    console.log('Application fully initialized');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Xử lý khi nhận tín hiệu tắt
process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down gracefully...');
  process.exit(0);
});

// Bắt đầu ứng dụng
main().catch(err => {
  console.error('Unhandled error in main application:', err);
  process.exit(1);
}); 