import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Lấy đường dẫn hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đường dẫn đến file JSON
const responsesPath = path.join(__dirname, 'data', 'responses.json');

// Đảm bảo thư mục data tồn tại
async function ensureDataDirExists() {
  const dataDir = path.join(__dirname, 'data');
  try {
    await fs.access(dataDir);
  } catch (error) {
    await fs.mkdir(dataDir, { recursive: true });
    // Tạo file JSON nếu không tồn tại
    await fs.writeFile(responsesPath, JSON.stringify({ custom_responses: [] }, null, 2));
  }
}

// Đọc dữ liệu từ file JSON
async function readResponses() {
  try {
    await ensureDataDirExists();
    const data = await fs.readFile(responsesPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading responses file:', error);
    return { custom_responses: [] };
  }
}

// Ghi dữ liệu vào file JSON
async function writeResponses(data) {
  try {
    await ensureDataDirExists();
    await fs.writeFile(responsesPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing responses file:', error);
    return false;
  }
}

/**
 * Thêm câu cà khịa tùy chỉnh
 * @param {string} response - Câu cà khịa
 * @param {string} authorId - ID của người thêm
 * @returns {Promise<boolean>} - Kết quả thêm
 */
export async function addCustomResponse(response, authorId) {
  try {
    const data = await readResponses();
    data.custom_responses.push({
      text: response,
      authorId,
      addedAt: new Date().toISOString()
    });
    return await writeResponses(data);
  } catch (error) {
    console.error('Error adding custom response:', error);
    return false;
  }
}

/**
 * Lấy tất cả câu cà khịa tùy chỉnh
 * @returns {Promise<Array>} - Danh sách câu cà khịa
 */
export async function getAllCustomResponses() {
  const data = await readResponses();
  return data.custom_responses;
}

/**
 * Lấy một câu cà khịa ngẫu nhiên
 * @returns {Promise<string|null>} - Câu cà khịa ngẫu nhiên
 */
export async function getRandomCustomResponse() {
  const responses = await getAllCustomResponses();
  if (responses.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

/**
 * Xóa câu cà khịa theo index
 * @param {number} index - Vị trí câu cà khịa cần xóa
 * @returns {Promise<boolean>} - Kết quả xóa
 */
export async function removeCustomResponse(index) {
  try {
    const data = await readResponses();
    if (index < 0 || index >= data.custom_responses.length) {
      return false;
    }
    
    data.custom_responses.splice(index, 1);
    return await writeResponses(data);
  } catch (error) {
    console.error('Error removing custom response:', error);
    return false;
  }
}

// Initial setup
ensureDataDirExists(); 