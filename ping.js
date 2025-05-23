// ping.js
import axios from 'axios';

// This script is designed to be run externally (e.g., with a cron job or service like UptimeRobot)
// It will ping your Replit app to keep it from going to sleep

// Replace with your actual Replit URL once deployed
const REPLIT_URL = process.env.REPLIT_URL || 'https://discord-khia-bot.repl.co';

async function pingServer() {
  try {
    console.log(`Pinging ${REPLIT_URL} at ${new Date().toISOString()}`);
    const response = await axios.get(`${REPLIT_URL}/health`);
    console.log(`Response status: ${response.status}`);
    console.log(`Server uptime: ${response.data.uptime} seconds`);
    console.log('Ping successful');
  } catch (error) {
    console.error('Ping failed:', error.message);
  }
}

// Run the ping function
pingServer();

// If you want to run this on a schedule
// setInterval(pingServer, 5 * 60 * 1000); // Ping every 5 minutes 