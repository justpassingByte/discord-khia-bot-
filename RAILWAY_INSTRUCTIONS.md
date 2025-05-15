# Triển khai Cà Khịa Bot lên Railway

Đây là hướng dẫn chi tiết để triển khai Cà Khịa Bot lên nền tảng Railway.

## Bước 1: Chuẩn bị

1. Đăng ký tài khoản [Railway](https://railway.app/)
2. Tạo Github repository và đẩy code lên đó

## Bước 2: Triển khai

### Cách 1: Triển khai từ GitHub

1. Đăng nhập vào Railway
2. Chọn "New Project"
3. Chọn "Deploy from GitHub repo"
4. Kết nối GitHub account và chọn repository của bot
5. Railway sẽ tự động phát hiện Node.js project và thiết lập build

### Cách 2: Triển khai trực tiếp từ CLI

1. Cài đặt Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Đăng nhập vào Railway từ CLI:
   ```bash
   railway login
   ```

3. Khởi tạo project:
   ```bash
   railway init
   ```

4. Deploy project:
   ```bash
   railway up
   ```

## Bước 3: Thiết lập biến môi trường

Trong Railway Dashboard, vào project của bạn:

1. Chọn tab "Variables"
2. Thêm các biến môi trường sau:
   - `DISCORD_TOKEN`: Token của bot Discord
   - `OWNER_ID`: ID Discord của chủ bot
   - `HF_API_TOKEN`: Token HuggingFace (nếu sử dụng Premium AI)
   - `PREMIUM_USERS`: Danh sách ID người dùng Premium (phân cách bởi dấu phẩy)
   - `DEFAULT_COOLDOWN`: Thời gian cooldown mặc định (mặc định: 15)
   - `IMAGE_COOLDOWN`: Thời gian cooldown cho lệnh tạo ảnh (mặc định: 30)
   - Nếu sử dụng ImgFlip:
     - `IMGFLIP_USERNAME`: Tên đăng nhập ImgFlip
     - `IMGFLIP_PASSWORD`: Mật khẩu ImgFlip

## Bước 4: Khởi động Bot

1. Vào tab "Deployments" và đảm bảo rằng dịch vụ đã được deploy thành công
2. Kiểm tra logs để xác nhận bot đã kết nối với Discord

## Xử lý sự cố

- **Bot không online**: Kiểm tra logs trong Railway dashboard
- **Token Discord không hợp lệ**: Đảm bảo token trong biến môi trường là chính xác
- **Lỗi kết nối**: Kiểm tra xem Discord API có sự cố không
- **Bot bị ngừng sau 21 ngày**: Railway miễn phí chỉ hoạt động trong 21 ngày mỗi tháng, bạn cần nâng cấp lên gói trả phí

## Lưu ý về Railway

- Railway miễn phí cung cấp $5 credit mỗi tháng
- Bot Discord tiêu thụ rất ít tài nguyên (~0.25-0.5GB RAM)
- Nếu dự án vượt quá mức miễn phí, Railway sẽ tự động dừng dịch vụ
- Các file JSON lưu trữ dữ liệu có thể bị mất khi Railway tái khởi động container. Nếu cần lưu trữ lâu dài, hãy xem xét sử dụng Database plugin của Railway 