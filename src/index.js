// src/index.js
import { keepAlive } from '../keep_alive.js';
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

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

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
  // Check for cooldown
  if (cooldownManager.isOnCooldown(interaction.user.id, 'khia')) {
    const remaining = cooldownManager.getRemainingCooldown(interaction.user.id, 'khia');
    return interaction.reply({
      content: `Bạn cần đợi thêm ${remaining} giây để sử dụng lại lệnh này.`,
      ephemeral: true // Only visible to the command user
    });
  }

  const user = interaction.options.getUser('user');
  let context = interaction.options.getString('context') || '';
  const mode = interaction.options.getString('mode') || 'all';
  
  // Don't tease the owner
  if (user.id === process.env.OWNER_ID) {
    return interaction.reply("Em không dám cà khịa ông chủ đâu ạ 🙇‍♂️");
  }
  
  // Filter context for offensive content
  if (containsOffensiveContent(context)) {
    return interaction.reply({
      content: "Nội dung của bạn có chứa từ ngữ không phù hợp. Vui lòng thử lại với nội dung khác.",
      ephemeral: true
    });
  }
  
  // Warn if context is provided but mode is not premium
  if (context && mode !== 'premium') {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply({
      content: "⚠️ Lưu ý: Bạn đã nhập context nhưng không chọn chế độ Premium AI (dùng context). Context chỉ hoạt động với Premium AI."
    });
    return;
  }
  
  // Filter context text
  context = filterText(context);

  // Create prompt for AI
  let prompt;
  
  // Chỉ sử dụng context khi ở chế độ premium
  if (mode === 'premium') {
    prompt = `Viết một câu nói cà khịa người tên ${user.username}. Nội dung: ${context} user_id:${interaction.user.id}`;
  } else {
    prompt = `Viết một câu nói cà khịa người tên ${user.username}`;
  }

  try {
    // Defer reply to have more time for API call
    await interaction.deferReply();
    
    // Get AI response with specified mode
    let reply = await generateResponse(prompt, mode);
    
    // Filter the response for offensive content
    reply = filterText(reply);
    
    // Reply with mention
    await interaction.editReply(`${user ? `<@${user.id}>, ` : ''}${reply}`);

    // Update stats
    await updateStats(user.id);
    
    // Set cooldown after successful command
    cooldownManager.setCooldown(interaction.user.id, 'khia');
  } catch (error) {
    console.error('Error handling khia command:', error);
    await interaction.editReply('Có lỗi xảy ra khi xử lý lệnh. Vui lòng thử lại sau.');
  }
}

async function handleKhenCommand(interaction) {
  const user = interaction.options.getUser('user');
  const context = interaction.options.getString('context') || '';
  
  // Create prompt for AI
  const prompt = `Viết một câu khen ngợi quá lố cho người tên ${user.username}. ${context ? `Về: ${context}` : ''}`;
  
  try {
    // Defer reply to have more time for API call
    await interaction.deferReply();
    
    // Get AI response
    const reply = await generateResponse(prompt);
    
    // Reply with mention
    await interaction.editReply(`${user ? `<@${user.id}>, ` : ''}${reply} 🌟`);
  } catch (error) {
    console.error('Error handling khen command:', error);
    
    if (interaction.deferred) {
      await interaction.editReply('Có lỗi xảy ra khi khen, thử lại sau nhé!');
    } else {
      await interaction.reply('Có lỗi xảy ra khi khen, thử lại sau nhé!');
    }
  }
}

async function handleTrichDanCommand(interaction) {
  const user = interaction.options.getUser('user');
  const topic = interaction.options.getString('topic') || 'cuộc sống';
  
  try {
    // Defer reply to have more time for API call
    await interaction.deferReply();
    
    // Sử dụng hàm generateQuote thay vì gọi AI
    const generatedQuote = generateQuote(user.username, topic);
    
    // Reply with mention and quote formatting
    await interaction.editReply(`💭 *"${generatedQuote}"* \n\t\t— ${user ? user.username : 'Ai đó'} 📜`);
  } catch (error) {
    console.error('Error handling trichdan command:', error);
    
    if (interaction.deferred) {
      await interaction.editReply('Có lỗi xảy ra khi tạo trích dẫn, thử lại sau nhé!');
    } else {
      await interaction.reply('Có lỗi xảy ra khi tạo trích dẫn, thử lại sau nhé!');
    }
  }
}

async function handleRandomKhiaCommand(interaction) {
  try {
    // Get all members from the guild
    const guild = interaction.guild;
    const mode = interaction.options.getString('mode') || 'all';
    
    // Defer reply to have more time
    await interaction.deferReply();
    
    // Fetch members
    await guild.members.fetch();
    
    // Filter out bots and the owner
    const members = guild.members.cache.filter(
      member => !member.user.bot && member.user.id !== process.env.OWNER_ID
    );
    
    if (members.size === 0) {
      return interaction.editReply("Không tìm thấy ai để cà khịa!");
    }
    
    // Pick a random member
    const randomIndex = Math.floor(Math.random() * members.size);
    const randomMember = Array.from(members.values())[randomIndex];
    
    // Double check not to tease the owner
    if (randomMember.user.id === process.env.OWNER_ID) {
      return interaction.editReply("Em không dám cà khịa ông chủ đâu ạ 🙇‍♂️");
    }
    
    // Create prompt for AI
    let prompt;
    
    // Chỉ dùng context trong premium mode
    if (mode === 'premium') {
      prompt = `Viết một câu cà khịa ngẫu nhiên về người tên ${randomMember.user.username} user_id:${interaction.user.id}`;
    } else {
      prompt = `Viết một câu cà khịa ngẫu nhiên về người tên ${randomMember.user.username}`;
    }
    
    // Get AI response with specified mode
    let reply = await generateResponse(prompt, mode);
    
    // Filter the response for offensive content
    reply = filterText(reply);
    
    // Reply with mention
    await interaction.editReply(`${randomMember ? `<@${randomMember.user.id}>, ` : ''}${reply} 🎯`);
    
    // Update stats
    await updateStats(randomMember.user.id);
  } catch (error) {
    console.error('Error handling random khia command:', error);
    
    if (interaction.deferred) {
      await interaction.editReply('Có lỗi xảy ra khi cà khịa ngẫu nhiên, thử lại sau nhé!');
    } else {
      await interaction.reply('Có lỗi xảy ra khi cà khịa ngẫu nhiên, thử lại sau nhé!');
    }
  }
}

async function handleRankCommand(interaction) {
  try {
    // Defer reply to have more time
    await interaction.deferReply();
    
    const rankings = await getRankings();
    
    if (!rankings.length) {
      return interaction.editReply("Chưa có ai bị khịa cả 🥲");
    }

    // Create an embed for rankings
    const embed = new EmbedBuilder()
      .setColor(THEME_COLORS.primary)
      .setTitle('🏆 Bảng xếp hạng cà khịa')
      .setDescription('Những người bị cà khịa nhiều nhất')
      .setTimestamp()
      .setFooter({ text: 'Cà Khịa Bot', iconURL: client.user.displayAvatarURL() });
    
    // Add fields for each ranking
    let rank = 1;
    for (const [userId, count] of rankings) {
      try {
        const user = await client.users.fetch(userId);
        
        // Add medal emoji based on rank
        let medal = '';
        if (rank === 1) medal = '🥇';
        else if (rank === 2) medal = '🥈';
        else if (rank === 3) medal = '🥉';
        else medal = `${rank}.`;
        
        embed.addFields({
          name: `${medal} ${user.username}`,
          value: `${count} lần bị cà khịa`,
          inline: false
        });
        
        rank++;
      } catch {
        // Skip users that can't be fetched
        continue;
      }
    }
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error handling rank command:', error);
    
    if (interaction.deferred) {
      await interaction.editReply('Có lỗi xảy ra khi lấy bảng xếp hạng!');
    } else {
      await interaction.reply('Có lỗi xảy ra khi lấy bảng xếp hạng!');
    }
  }
}

// Command handler for themkhia
async function handleThemKhiaCommand(interaction) {
  const text = interaction.options.getString('text');
  const authorId = interaction.user.id;
  
  try {
    await interaction.deferReply();
    
    if (text.length < 10) {
      return interaction.editReply("Câu cà khịa quá ngắn! Hãy nhập ít nhất 10 ký tự.");
    }
    
    // Check for offensive content
    if (containsOffensiveContent(text)) {
      return interaction.editReply("Câu cà khịa của bạn có chứa từ ngữ không phù hợp. Vui lòng thử lại với nội dung khác.");
    }
    
    // Filter text to remove any potential offensive content
    const filteredText = filterText(text);
    
    const success = await addCustomResponse(filteredText, authorId);
    
    if (success) {
      return interaction.editReply(`✅ Đã thêm câu cà khịa: "${filteredText}"`);
    } else {
      return interaction.editReply("❌ Không thể thêm câu cà khịa. Hãy thử lại sau.");
    }
  } catch (error) {
    console.error('Error handling themkhia command:', error);
    
    if (interaction.deferred) {
      await interaction.editReply('Có lỗi xảy ra khi thêm câu cà khịa!');
    } else {
      await interaction.reply('Có lỗi xảy ra khi thêm câu cà khịa!');
    }
  }
}

// Command handler for danhsachkhia
async function handleDanhSachKhiaCommand(interaction) {
  try {
    await interaction.deferReply();
    
    const responses = await getAllCustomResponses();
    
    if (responses.length === 0) {
      return interaction.editReply("📝 Chưa có câu cà khịa tùy chỉnh nào.");
    }
    
    let message = "📝 **Danh sách câu cà khịa tùy chỉnh:**\n\n";
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      try {
        const author = await client.users.fetch(response.authorId);
        message += `${i + 1}. "${response.text}" - thêm bởi ${author.username}\n`;
      } catch {
        message += `${i + 1}. "${response.text}" - thêm bởi người dùng không xác định\n`;
      }
      
      // Discord có giới hạn 2000 ký tự cho mỗi tin nhắn
      if (message.length > 1900 && i < responses.length - 1) {
        await interaction.followUp(message);
        message = "";
      }
    }
    
    if (message) {
      await interaction.editReply(message);
    }
  } catch (error) {
    console.error('Error handling danhsachkhia command:', error);
    
    if (interaction.deferred) {
      await interaction.editReply('Có lỗi xảy ra khi lấy danh sách câu cà khịa!');
    } else {
      await interaction.reply('Có lỗi xảy ra khi lấy danh sách câu cà khịa!');
    }
  }
}

// Command handler for xoakhia
async function handleXoaKhiaCommand(interaction) {
  const index = interaction.options.getInteger('index') - 1; // Người dùng nhập từ 1, nhưng index bắt đầu từ 0
  
  try {
    await interaction.deferReply();
    
    // Chỉ cho phép chủ bot xóa câu cà khịa
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.editReply("❌ Chỉ chủ bot mới có quyền xóa câu cà khịa!");
    }
    
    const responses = await getAllCustomResponses();
    
    if (index < 0 || index >= responses.length) {
      return interaction.editReply(`❌ Không tìm thấy câu cà khịa số ${index + 1}!`);
    }
    
    const removedResponse = responses[index];
    const success = await removeCustomResponse(index);
    
    if (success) {
      return interaction.editReply(`✅ Đã xóa câu cà khịa: "${removedResponse.text}"`);
    } else {
      return interaction.editReply("❌ Không thể xóa câu cà khịa. Hãy thử lại sau.");
    }
  } catch (error) {
    console.error('Error handling xoakhia command:', error);
    
    if (interaction.deferred) {
      await interaction.editReply('Có lỗi xảy ra khi xóa câu cà khịa!');
    } else {
      await interaction.reply('Có lỗi xảy ra khi xóa câu cà khịa!');
    }
  }
}

// New command handler for khiaanh
async function handleKhiaAnhCommand(interaction) {
  // Check for cooldown
  if (cooldownManager.isOnCooldown(interaction.user.id, 'khiaanh')) {
    const remaining = cooldownManager.getRemainingCooldown(interaction.user.id, 'khiaanh');
    return interaction.reply({
      content: `Bạn cần đợi thêm ${remaining} giây để sử dụng lại lệnh này.`,
      ephemeral: true
    });
  }

  // Kiểm tra người dùng premium
  const isPremiumUser = checkPremiumUser(interaction.user.id);
  if (!isPremiumUser) {
    return interaction.reply({
      content: "⭐ Tính năng tạo ảnh cà khịa chỉ có sẵn cho người dùng Premium! Vui lòng liên hệ admin để nâng cấp tài khoản.",
      ephemeral: true
    });
  }

  const user = interaction.options.getUser('user');
  const topText = interaction.options.getString('toptext') || user.username;
  const bottomText = interaction.options.getString('bottomtext') || 'Một người bị cà khịa';
  
  // Don't tease the owner
  if (user.id === process.env.OWNER_ID) {
    return interaction.reply("Em không dám cà khịa ông chủ đâu ạ 🙇‍♂️");
  }

  try {
    // Defer reply to have more time for API call
    await interaction.deferReply();
    
    // Filter potentially offensive content
    const filteredTopText = filterText(topText);
    const filteredBottomText = filterText(bottomText);
    
    // Generate meme image
    const memeUrl = await generateMeme(filteredTopText, filteredBottomText);
    
    if (memeUrl) {
      // Reply with mention and image
      await interaction.editReply({
        content: `⭐ ${user ? `<@${user.id}>, ` : ''}Một món quà dành cho bạn 🎁`,
        files: [memeUrl]
      });
      
      // Update stats
      await updateStats(user.id);
      
      // Set cooldown after successful command
      cooldownManager.setCooldown(interaction.user.id, 'khiaanh', 30); // 30 seconds cooldown for image generation
    } else {
      await interaction.editReply('Không thể tạo ảnh cà khịa. Vui lòng thử lại sau.');
    }
  } catch (error) {
    console.error('Error handling khiaanh command:', error);
    await interaction.editReply('Có lỗi xảy ra khi xử lý lệnh. Vui lòng thử lại sau.');
  }
}

// Help command handler
async function handleHelpCommand(interaction) {
  const helpMessage = `
**🤖 Bot Cà Khịa - Danh sách lệnh:**

\`/khia @user [context] [mode]\` - Cà khịa người được tag (mode: ai/custom/premium/all)
\`/khen @user [nội dung]\` - Khen ngợi người được tag
\`/trichdan @user [chủ đề]\` - Tạo trích dẫn giả từ người được tag
\`/randomkhia [mode]\` - Cà khịa một người ngẫu nhiên (mode: ai/custom/premium/all)
\`/khiaanh @user [toptext] [bottomtext]\` - ⭐ PREMIUM - Tạo ảnh meme cà khịa
\`/rankkhia\` - Xem danh sách người bị cà khịa nhiều nhất
\`/themkhia [text]\` - Thêm câu cà khịa tùy chỉnh
\`/danhsachkhia\` - Xem danh sách câu cà khịa tùy chỉnh
\`/xoakhia [index]\` - Xóa câu cà khịa tùy chỉnh (chỉ chủ bot)
\`/help\` - Hiển thị danh sách lệnh

**Các chế độ cà khịa:**
- **Template**: Sử dụng templates thông minh có sẵn
- **Tùy chỉnh**: Sử dụng các câu do người dùng thêm vào
- **⭐ Premium AI**: Sử dụng HuggingFace API (chỉ mode này dùng context, yêu cầu kích hoạt)
- **Kết hợp**: Kết hợp các loại trên

**Lưu ý:**
- Các lệnh có thời gian chờ: khia (15s), khiaanh (30s)
- Bot sẽ tự động lọc ngôn từ không phù hợp
- Chức năng Premium AI đang thử nghiệm

Bot được tạo với 💖 bởi Đại Lãnh Chúa Discord
`;

  await interaction.reply(helpMessage);
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

// Keep the bot alive (for Replit)
keepAlive();

// Login to Discord
client.login(process.env.DISCORD_TOKEN); 