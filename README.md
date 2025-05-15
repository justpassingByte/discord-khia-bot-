# Cà Khịa Bot

Bot cà khịa (teasing) Discord sử dụng AI để tạo những câu "cà khịa" vui nhộn cho người dùng.

## Tính năng

- **Cà khịa người dùng**: Tạo câu cà khịa tự động hoặc từ thư viện có sẵn
- **Chế độ cà khịa**: Template, tùy chỉnh, Premium AI, hoặc kết hợp
- **Tạo ảnh meme**: ⭐ Tính năng Premium - Tạo ảnh meme để cà khịa
- **Thống kê**: Theo dõi ai bị cà khịa nhiều nhất
- **Thêm câu cà khịa**: Cho phép người dùng thêm câu cà khịa tùy chỉnh
- **Lọc nội dung**: Tự động lọc nội dung không phù hợp
- **Các lệnh khác**: Khen ngợi, trích dẫn giả, cà khịa ngẫu nhiên

## Các lệnh

- `/khia @user [context] [mode]` - Cà khịa người được tag
- `/khen @user [nội dung]` - Khen ngợi người được tag
- `/trichdan @user [chủ đề]` - Tạo trích dẫn giả từ người được tag
- `/randomkhia [mode]` - Cà khịa một người ngẫu nhiên
- `/khiaanh @user [toptext] [bottomtext]` - ⭐ PREMIUM - Tạo ảnh meme cà khịa
- `/rankkhia` - Xem danh sách người bị cà khịa nhiều nhất
- `/themkhia [text]` - Thêm câu cà khịa tùy chỉnh
- `/danhsachkhia` - Xem danh sách câu cà khịa tùy chỉnh
- `/xoakhia [index]` - Xóa câu cà khịa tùy chỉnh (chỉ chủ bot)
- `/help` - Hiển thị danh sách lệnh

## Các chế độ cà khịa:
- **Template**: Sử dụng templates thông minh có sẵn
- **Tùy chỉnh**: Sử dụng các câu do người dùng thêm vào
- **⭐ Premium AI**: Sử dụng HuggingFace API (chỉ mode này dùng context, yêu cầu kích hoạt)
- **Kết hợp**: Kết hợp các loại trên

## Cài đặt

1. Clone repository này
2. Cài đặt các dependencies:
```bash
npm install
```
3. Tạo file `.env` với nội dung:
```
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
OWNER_ID=your_discord_user_id_here

# HuggingFace API Configuration (optional for Premium mode)
HF_API_TOKEN=your_huggingface_api_token_here

# Premium Users (comma-separated user IDs)
PREMIUM_USERS=

# Cooldown Settings (in seconds)
DEFAULT_COOLDOWN=15
IMAGE_COOLDOWN=30
```
4. Chạy bot:
```bash
npm start
```

## Getting Required Tokens

### Discord Bot Token
1. Visit the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a New Application
3. Go to "Bot" tab and add a bot
4. Under the token section, click "Reset Token" and copy it
5. In the "Privileged Gateway Intents" section, enable:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT
   - PRESENCE INTENT

### HuggingFace API Token (Cho Premium AI)
1. Create an account on [HuggingFace](https://huggingface.co/)
2. Go to Settings > Access Tokens
3. Create a new token and select "Read" access

## Running the Bot

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## Triển khai lên Render

1. Đẩy code lên GitHub repository
2. Đăng ký tài khoản trên [Render.com](https://render.com)
3. Chọn "New Web Service"
4. Connect với GitHub repository
5. Thiết lập:
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Thêm các biến môi trường (DISCORD_TOKEN, OWNER_ID, vv.)
6. Deploy

## Inviting the Bot to Your Server

1. Go to Discord Developer Portal > Your Application
2. Navigate to OAuth2 > URL Generator
3. Select scopes: `bot`, `applications.commands`
4. Bot Permissions: `Send Messages`, `Read Messages/View Channels`, `Embed Links`, `Attach Files`
5. Copy and visit the generated URL to invite the bot 