// src/test-api.js
import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

const API_TOKEN = process.env.HF_API_TOKEN;

if (!API_TOKEN) {
  console.error("Không tìm thấy HF_API_TOKEN trong .env file. Vui lòng thêm token của bạn.");
  process.exit(1);
}

// Mô hình để kiểm tra
const models = [
  'gpt2',
  'distilgpt2',
  'bigscience/bloom-560m',
  'EleutherAI/gpt-neo-125M'
];

// Prompt đơn giản
const prompt = "Write a short joke about a computer programmer:";

async function testModel(model) {
  console.log(`\nThử nghiệm với mô hình: ${model}`);
  
  try {
    const response = await axios({
      method: 'post',
      url: `https://api-inference.huggingface.co/models/${model}`,
      headers: { 
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        inputs: prompt,
        parameters: {
          max_new_tokens: 40,
          temperature: 0.7,
          top_p: 0.9,
          do_sample: true
        }
      },
      timeout: 15000 // 15 seconds timeout
    });
    
    console.log("Trạng thái phản hồi:", response.status);
    console.log("Nội dung phản hồi:", response.data);
    
    if (response.data && response.data[0] && response.data[0].generated_text) {
      console.log("\nVăn bản được tạo:");
      console.log(response.data[0].generated_text);
      
      // Bỏ prompt khỏi output
      if (response.data[0].generated_text.includes(prompt)) {
        const cleanOutput = response.data[0].generated_text.substring(
          response.data[0].generated_text.indexOf(prompt) + prompt.length
        ).trim();
        console.log("\nVăn bản đã xử lý:");
        console.log(cleanOutput);
      }
    } else {
      console.log("Không có văn bản được tạo hoặc định dạng không đúng.");
    }
    
    return true;
  } catch (error) {
    console.error(`Lỗi với mô hình ${model}:`);
    
    if (error.response) {
      // Lỗi có phản hồi từ server
      console.error("Mã trạng thái:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Dữ liệu:", error.response.data);
    } else if (error.request) {
      // Không nhận được phản hồi
      console.error("Không nhận được phản hồi từ server:", error.request);
    } else {
      // Lỗi khác
      console.error("Lỗi:", error.message);
    }
    
    return false;
  }
}

async function runTests() {
  console.log("BẮT ĐẦU KIỂM TRA API HUGGINGFACE");
  console.log("=================================");
  
  let successCount = 0;
  
  for (const model of models) {
    const success = await testModel(model);
    if (success) successCount++;
  }
  
  console.log("\n=================================");
  console.log(`KẾT QUẢ: ${successCount}/${models.length} mô hình hoạt động`);
}

// Chạy kiểm tra
runTests(); 