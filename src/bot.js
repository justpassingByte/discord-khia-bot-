// src/bot.js
// Logic chính của Discord bot được tách ra từ index.js

import { config } from 'dotenv';
import { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder,
  Collection,
  AttachmentBuilder,
  EmbedBuilder
} from 'discord.js';
import { generateResponse, generateQuote } from './api.js';
import { updateStats, getRankings } from './stats.js';
import { addCustomResponse, getAllCustomResponses, removeCustomResponse } from './responses.js';
import { filterText, generateMeme, formatDate, containsOffensiveContent } from './utils.js';

// Load environment variables
config();

// Define theme colors for embeds
const THEME_COLORS = {
  primary: 0x7289DA,  // Discord blurple
  success: 0x43B581,  // Green
  warning: 0xFAA61A,  // Yellow
  danger: 0xF04747,   // Red
  info: 0x5865F2      // Light blue
};

// Cooldown manager to prevent spam
class CooldownManager {
  constructor(defaultCooldown = 10) { // Default cooldown in seconds
    this.cooldowns = new Map();
    this.defaultCooldown = defaultCooldown;
  }

  // Check if user is on cooldown for a specific command
  isOnCooldown(userId, commandName) {
    const key = `${userId}-${commandName}`;
    const cooldownData = this.cooldowns.get(key);
    
    if (!cooldownData) return false;
    
    const now = Date.now();
    return now < cooldownData.expires;
  }

  // Get remaining cooldown time in seconds
  getRemainingCooldown(userId, commandName) {
    const key = `${userId}-${commandName}`;
    const cooldownData = this.cooldowns.get(key);
    
    if (!cooldownData) return 0;
    
    const now = Date.now();
    const remaining = (cooldownData.expires - now) / 1000;
    return remaining > 0 ? Math.ceil(remaining) : 0;
  }

  // Put user on cooldown for a command
  setCooldown(userId, commandName, duration = this.defaultCooldown) {
    const key = `${userId}-${commandName}`;
    const expires = Date.now() + (duration * 1000);
    
    this.cooldowns.set(key, {
      expires,
      duration
    });
    
    // Auto cleanup after expiration
    setTimeout(() => {
      if (this.cooldowns.has(key) && this.cooldowns.get(key).expires <= Date.now()) {
        this.cooldowns.delete(key);
      }
    }, duration * 1000 + 1000); // Add 1 second buffer
  }
}

// Initialize cooldown manager with 15 seconds default cooldown
const cooldownManager = new CooldownManager(15);

/**
 * Kiểm tra xem người dùng có phải là Premium hay không
 * @param {string} userId - ID người dùng cần kiểm tra
 * @returns {boolean} - true nếu là Premium user, false nếu không phải
 */
function checkPremiumUser(userId) {
  // Admin luôn là premium
  if (userId === process.env.OWNER_ID) {
    return true;
  }
  
  // Lấy danh sách premium users từ biến môi trường
  const premiumUsers = process.env.PREMIUM_USERS ? process.env.PREMIUM_USERS.split(',') : [];
  
  // Kiểm tra userId có trong danh sách không
  return premiumUsers.includes(userId);
}

// Định nghĩa slash commands
const commands = [
  {
    name: 'khia',
    description: 'Cà khịa một người dùng',
    options: [
      {
        name: 'user',
        description: 'Người bị cà khịa',
        type: 6, // USER type
        required: true
      },
      {
        name: 'context',
        description: '⭐ PREMIUM ONLY - Nội dung cà khịa (chỉ hoạt động với Premium AI)',
        type: 3, // STRING type
        required: false
      },
      {
        name: 'mode',
        description: 'Loại cà khịa (ai: template, custom: tùy chỉnh, premium: AI cao cấp, all: kết hợp)',
        type: 3, // STRING type
        required: false,
        choices: [
          { name: 'Template', value: 'ai' },
          { name: 'Tùy chỉnh', value: 'custom' },
          { name: '⭐ Premium AI (dùng context)', value: 'premium' },
          { name: 'Kết hợp (mặc định)', value: 'all' }
        ]
      }
    ]
  },
  {
    name: 'khen',
    description: 'Khen ngợi một người dùng',
    options: [
      {
        name: 'user',
        description: 'Người được khen',
        type: 6, // USER type
        required: true
      },
      {
        name: 'context',
        description: 'Nội dung khen',
        type: 3, // STRING type
        required: false
      }
    ]
  },
  {
    name: 'trichdan',
    description: 'Tạo trích dẫn giả từ một người dùng',
    options: [
      {
        name: 'user',
        description: 'Người được trích dẫn',
        type: 6, // USER type
        required: true
      },
      {
        name: 'topic',
        description: 'Chủ đề trích dẫn',
        type: 3, // STRING type
        required: false
      }
    ]
  },
  {
    name: 'randomkhia',
    description: 'Cà khịa một người ngẫu nhiên trong server',
    options: [
      {
        name: 'mode',
        description: 'Loại cà khịa (ai: template, custom: tùy chỉnh, premium: AI cao cấp, all: kết hợp)',
        type: 3, // STRING type
        required: false,
        choices: [
          { name: 'Template', value: 'ai' },
          { name: 'Tùy chỉnh', value: 'custom' },
          { name: '⭐ Premium AI (dùng context)', value: 'premium' },
          { name: 'Kết hợp (mặc định)', value: 'all' }
        ]
      }
    ]
  },
  {
    name: 'rankkhia',
    description: 'Xem danh sách người bị cà khịa nhiều nhất',
  },
  {
    name: 'help',
    description: 'Hiển thị danh sách lệnh',
  },
  {
    name: 'themkhia',
    description: 'Thêm câu cà khịa tùy chỉnh',
    options: [
      {
        name: 'text',
        description: 'Nội dung câu cà khịa',
        type: 3, // STRING type
        required: true
      }
    ]
  },
  {
    name: 'danhsachkhia',
    description: 'Xem danh sách câu cà khịa tùy chỉnh',
  },
  {
    name: 'xoakhia',
    description: 'Xóa câu cà khịa tùy chỉnh',
    options: [
      {
        name: 'index',
        description: 'Số thứ tự của câu cà khịa (từ 1)',
        type: 4, // INTEGER type
        required: true
      }
    ]
  },
  {
    name: 'khiaanh',
    description: '⭐ PREMIUM - Tạo ảnh cà khịa một người dùng',
    options: [
      {
        name: 'user',
        description: 'Người bị cà khịa',
        type: 6, // USER type
        required: true
      },
      {
        name: 'toptext',
        description: 'Nội dung phía trên ảnh',
        type: 3, // STRING type
        required: false
      },
      {
        name: 'bottomtext',
        description: 'Nội dung phía dưới ảnh',
        type: 3, // STRING type
        required: false
      }
    ]
  }
];

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Register slash commands with Discord
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log('Bắt đầu đăng ký slash commands...');
    
    // Đăng ký cho tất cả guilds mà bot tham gia
    const guilds = client.guilds.cache;
    for (const guild of guilds.values()) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guild.id),
        { body: commands }
      );
      console.log(`Đã đăng ký commands cho guild ${guild.name}`);
    }
    
    console.log('Đăng ký slash commands thành công!');
  } catch (error) {
    console.error('Lỗi khi đăng ký slash commands:', error);
  }
}

// Command handlers
async function handleKhiaCommand(interaction) {
  // Command logic - giữ nguyên từ file index.js
}

async function handleKhenCommand(interaction) {
  // Command logic - giữ nguyên từ file index.js
}

async function handleTrichDanCommand(interaction) {
  // Command logic - giữ nguyên từ file index.js
}

async function handleRandomKhiaCommand(interaction) {
  // Command logic - giữ nguyên từ file index.js
}

async function handleRankCommand(interaction) {
  // Command logic - giữ nguyên từ file index.js
}

async function handleThemKhiaCommand(interaction) {
  // Command logic - giữ nguyên từ file index.js
}

async function handleDanhSachKhiaCommand(interaction) {
  // Command logic - giữ nguyên từ file index.js
}

async function handleXoaKhiaCommand(interaction) {
  // Command logic - giữ nguyên từ file index.js
}

async function handleKhiaAnhCommand(interaction) {
  // Command logic - giữ nguyên từ file index.js
}

async function handleHelpCommand(interaction) {
  // Command logic - giữ nguyên từ file index.js
}

// Process slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'khia') {
      await handleKhiaCommand(interaction);
    } else if (commandName === 'khen') {
      await handleKhenCommand(interaction);
    } else if (commandName === 'trichdan') {
      await handleTrichDanCommand(interaction);
    } else if (commandName === 'randomkhia') {
      await handleRandomKhiaCommand(interaction);
    } else if (commandName === 'rankkhia') {
      await handleRankCommand(interaction);
    } else if (commandName === 'help') {
      await handleHelpCommand(interaction);
    } else if (commandName === 'themkhia') {
      await handleThemKhiaCommand(interaction);
    } else if (commandName === 'danhsachkhia') {
      await handleDanhSachKhiaCommand(interaction);
    } else if (commandName === 'xoakhia') {
      await handleXoaKhiaCommand(interaction);
    } else if (commandName === 'khiaanh') {
      await handleKhiaAnhCommand(interaction);
    }
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    
    const replyMethod = interaction.deferred ? 'editReply' : 'reply';
    try {
      await interaction[replyMethod]({ 
        content: 'Có lỗi xảy ra khi xử lý lệnh!', 
        ephemeral: true 
      });
    } catch (e) {
      console.error('Error sending error message:', e);
    }
  }
});

// Client ready event
client.once('ready', async () => {
  console.log(`Bot is online as ${client.user.tag}`);
  
  // Register commands when the bot starts
  await registerCommands();
  
  console.log('Available commands:');
  console.log('/khia @user [context] [mode] - Teases the mentioned user');
  console.log('/khen @user [context] - Compliments the mentioned user');
  console.log('/trichdan @user [topic] - Generates a fake quote from the user');
  console.log('/randomkhia [mode] - Teases a random server member');
  console.log('/khiaanh @user [toptext] [bottomtext] - ⭐ PREMIUM - Creates a teasing meme image');
  console.log('/rankkhia - Shows top 5 most teased users');
  console.log('/themkhia [text] - Adds a custom teasing phrase');
  console.log('/danhsachkhia - Lists all custom teasing phrases');
  console.log('/xoakhia [index] - Removes a custom teasing phrase (owner only)');
  console.log('/help - Shows command list');
});

// Handle errors
client.on('error', console.error);

// Public function to start the bot
async function startBot() {
  return new Promise((resolve, reject) => {
    try {
      // Login to Discord
      client.login(process.env.DISCORD_TOKEN)
        .then(() => {
          console.log('Bot logged in successfully');
          resolve(client);
        })
        .catch((error) => {
          console.error('Failed to login to Discord:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Error starting bot:', error);
      reject(error);
    }
  });
}

// Export the startBot function
export { startBot }; 