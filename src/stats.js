// src/stats.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to stats JSON file
const STATS_FILE = path.join(__dirname, 'data', 'stats.json');

// In-memory stats tracking with Map
const khiaStats = new Map();

// Load stats from file on startup
async function loadStats() {
  try {
    await ensureDataDirExists();
    const data = await fs.readFile(STATS_FILE, 'utf8');
    const statsObj = JSON.parse(data);
    
    // Convert object to Map
    Object.entries(statsObj).forEach(([userId, count]) => {
      khiaStats.set(userId, count);
    });
    
    console.log('Stats loaded successfully');
  } catch (error) {
    // If file doesn't exist or is invalid, create a new one
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      await saveStats();
      console.log('Created new stats file');
    } else {
      console.error('Error loading stats:', error);
    }
  }
}

// Save stats to file
async function saveStats() {
  try {
    await ensureDataDirExists();
    // Convert Map to object for JSON serialization
    const statsObj = Object.fromEntries(khiaStats.entries());
    await fs.writeFile(STATS_FILE, JSON.stringify(statsObj, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving stats:', error);
    return false;
  }
}

// Ensure data directory exists
async function ensureDataDirExists() {
  const dataDir = path.join(__dirname, 'data');
  try {
    await fs.access(dataDir);
  } catch (error) {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * Update the stats for a user
 * @param {string} userId - Discord user ID
 */
export async function updateStats(userId) {
  const currentCount = khiaStats.get(userId) || 0;
  khiaStats.set(userId, currentCount + 1);
  await saveStats();
}

/**
 * Get the top users who have been teased
 * @param {number} limit - Maximum number of users to return
 * @returns {Array} - Array of [userId, count] pairs, sorted by count
 */
export function getRankings(limit = 5) {
  return [...khiaStats.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

/**
 * Get stats for a specific user
 * @param {string} userId - Discord user ID
 * @returns {number} - Number of times user has been teased
 */
export function getUserStats(userId) {
  return khiaStats.get(userId) || 0;
}

/**
 * Reset stats for all users or a specific user
 * @param {string} [userId] - Optional user ID to reset
 */
export async function resetStats(userId = null) {
  if (userId) {
    khiaStats.delete(userId);
  } else {
    khiaStats.clear();
  }
  await saveStats();
}

// Initialize stats on module load
loadStats(); 