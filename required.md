# Discord Cà Khịa Bot (HuggingFace API-based)

## Overview
A Discord bot that generates AI-powered playful banter with these key features:
- Smart, context-aware teasing using HuggingFace API
- @mentions users in responses
- Treats owner as special (calling them "boss" and never teases them)
- Additional commands: `!khen`, `!trichdan`, `!rankkhia`, `!randomkhia`

## Tech Stack
- **Runtime**: Node.js
- **Bot Framework**: discord.js v14+
- **AI**: HuggingFace API (text generation)
- **Storage**: In-memory Map (can extend to Firebase/MongoDB)
- **Hosting**: Railway, Render, or Replit (free tier)

## Command Flow
1. User sends: `!khia @user <context>`
2. Bot:
   - Parses message and extracts @mentioned user
   - Generates prompt for HuggingFace
   - Gets AI response
   - Replies with @mention and teasing content
   - Updates user statistics

## Implementation

### 1. Setup
```bash
npm init -y
npm install discord.js axios dotenv
```

Create `.env` file:
```
DISCORD_TOKEN=your_token_here
OWNER_ID=your_discord_id_here
HF_API_TOKEN=your_huggingface_token
```

### 2. Bot Implementation

```js
// index.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ],
});

// In-memory stats tracking
const khiaStats = new Map();

// HuggingFace API call
async function generateResponse(prompt) {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/gpt2',
      { inputs: prompt },
      { 
        headers: { 
          Authorization: `Bearer ${process.env.HF_API_TOKEN}` 
        } 
      }
    );
    return response.data[0]?.generated_text || "Không nghĩ ra gì để cà khịa...";
  } catch (error) {
    console.error('HuggingFace API error:', error);
    return "API error, không thể tạo nội dung lúc này.";
  }
}

// Message handler
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const content = msg.content.trim();
  const mentioned = msg.mentions.users.first();
  const isOwner = msg.author.id === process.env.OWNER_ID;

  // Handle commands
  if (content.startsWith('!khia')) {
    await handleKhiaCommand(msg, content, mentioned, isOwner);
  } else if (content.startsWith('!rankkhia')) {
    await handleRankCommand(msg);
  }
  // TODO: Implement other commands (!khen, !trichdan, etc.)
});

async function handleKhiaCommand(msg, content, mentioned, isOwner) {
  // Don't tease the owner
  if (isOwner) {
    return msg.reply("Em không dám cà khịa ông chủ đâu ạ 🙇‍♂️");
  }

  // Extract context from message
  let inputText = content.replace('!khia', '').trim();
  if (mentioned) {
    inputText = inputText.replace(`<@${mentioned.id}>`, '').trim();
  }

  // Create prompt for AI
  const prompt = mentioned
    ? `Viết một câu nói cà khịa người tên ${mentioned.username}. Nội dung: ${inputText}`
    : `Viết một câu cà khịa vui: ${inputText}`;

  // Get AI response
  const reply = await generateResponse(prompt);
  
  // Reply with mention
  msg.reply(`${mentioned ? `<@${mentioned.id}>, ` : ''}${reply}`);

  // Update stats
  if (mentioned) {
    const count = khiaStats.get(mentioned.id) || 0;
    khiaStats.set(mentioned.id, count + 1);
  }
}

async function handleRankCommand(msg) {
  if (khiaStats.size === 0) {
    return msg.reply("Chưa có ai bị khịa cả 🥲");
  }

  const sorted = [...khiaStats.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let message = `🏆 Top người bị khịa nhiều nhất:\n`;
  for (let [userId, count] of sorted) {
    try {
      const user = await client.users.fetch(userId);
      message += `- ${user.username}: ${count} lần\n`;
    } catch (error) {
      message += `- Unknown User: ${count} lần\n`;
    }
  }
  
  msg.reply(message);
}

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
```

## Command Reference

| Command | Format | Description |
|---------|--------|-------------|
| `!khia` | `!khia @user [context]` | Teases the mentioned user |
| `!rankkhia` | `!rankkhia` | Shows top 5 most teased users |

## Extension Ideas

### Additional Commands
- `!khen @user`: Compliment a user (prompt: "Nịnh người tên [name] quá lố")
- `!trichdan @user`: Generate fake quote (prompt: "Tạo quote hài hước giả mạo từ người tên [name]")
- `!randomkhia`: Pick random server user to tease
- `!drama @user1 @user2`: Create fake argument between two users

### Storage Extensions
Replace in-memory Map with persistent storage:
```js
// Example for Firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Update stats in Firestore
async function updateStats(userId) {
  const userRef = doc(db, 'khiaStats', userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    await updateDoc(userRef, {
      count: userDoc.data().count + 1
    });
  } else {
    await setDoc(userRef, { count: 1 });
  }
}
```

## Deployment
1. Push code to GitHub
2. Connect to Railway/Render/Replit
3. Set environment variables
4. Deploy

## HuggingFace Models
- For best performance: `gpt2`, `tiiuae/falcon-7b-instruct`
- For Vietnamese: Consider fine-tuned Vietnamese models

## Notes
- Use fast-responding models for free-tier hosting
- Consider rate limiting for API calls to stay within free limits