import axios from 'axios';
import { createHash } from 'crypto';

// Ban list for offensive words
const OFFENSIVE_WORDS = [
  // Add offensive Vietnamese and English words here
  'đụ', 'địt', 'lồn', 'cặc', 'buồi', 'dái', 
  'đéo', 'đít', 'đái', 'chó', 'súc vật',
  'fuck', 'shit', 'bitch', 'dick', 'cock', 'pussy'
];

/**
 * Filter potentially offensive content from text
 * @param {string} text - Text to filter
 * @returns {string} - Filtered text with offensive words replaced
 */
export function filterText(text) {
  if (!text) return text;
  
  let filteredText = text;
  
  // Replace offensive words with stars
  OFFENSIVE_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filteredText = filteredText.replace(regex, '*'.repeat(word.length));
  });
  
  return filteredText;
}

/**
 * Check if text contains offensive content
 * @param {string} text - Text to check
 * @returns {boolean} - True if offensive content is detected
 */
export function containsOffensiveContent(text) {
  if (!text) return false;
  
  for (const word of OFFENSIVE_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(text)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate avatar for a user (using Dicebear API)
 * @param {string} userId - User ID as a seed
 * @param {string} style - Avatar style (bottts, identicon, etc.)
 * @returns {string} - URL to generated avatar
 */
export function generateAvatar(userId, style = 'bottts') {
  const seed = userId || createHash('md5').update(Date.now().toString()).digest('hex');
  return `https://api.dicebear.com/6.x/${style}/svg?seed=${seed}`;
}

/**
 * Generate a teasing meme image
 * @param {string} topText - Text for top of meme
 * @param {string} bottomText - Text for bottom of meme
 * @param {string} templateId - Meme template ID
 * @returns {Promise<string>} - URL to generated meme
 */
export async function generateMeme(topText, bottomText, templateId = '181913649') {
  try {
    // Try to use ImgFlip API if credentials are provided
    if (process.env.IMGFLIP_USERNAME && process.env.IMGFLIP_PASSWORD) {
      const params = new URLSearchParams();
      params.append('template_id', templateId);
      params.append('username', process.env.IMGFLIP_USERNAME);
      params.append('password', process.env.IMGFLIP_PASSWORD);
      params.append('text0', topText);
      params.append('text1', bottomText);
      
      const response = await axios.post('https://api.imgflip.com/caption_image', params);
      
      if (response.data.success) {
        return response.data.data.url;
      }
    }
    
    // Fallback to a simpler meme URL (doesn't actually generate an image)
    return `https://memegen.link/custom/${encodeURIComponent(topText)}/${encodeURIComponent(bottomText)}.jpg`;
  } catch (error) {
    console.error('Error generating meme:', error);
    return null;
  }
}

/**
 * Format number with commas as thousands separators
 * @param {number} number - Number to format
 * @returns {string} - Formatted number
 */
export function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get random element from an array
 * @param {Array} array - Array to pick from
 * @returns {*} - Random element
 */
export function getRandomElement(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Format a date to a readable string
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date
 */
export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
} 