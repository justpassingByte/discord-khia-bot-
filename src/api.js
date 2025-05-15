import axios from 'axios';
import { getRandomCustomResponse } from './responses.js';

// Track API rate limits
const rateLimiter = {
  lastCallTime: 0,
  minInterval: 1000 // 1 second between calls for free tier
};

// Models thường được sử dụng nhiều cho text generation
const FALLBACK_MODELS = [
  // Text generation cơ bản
  'gpt2',
  'distilgpt2',
  'bigscience/bloom-560m',
  'bigscience/bloom-1b1',
  'facebook/opt-125m',
  'EleutherAI/gpt-neo-125M',
  'stabilityai/stablelm-base-alpha-3b',
  'bigscience/bloomz-560m'
];

// Expanded fallback responses with more variety
const FALLBACK_RESPONSES = [
  // Sarcasm category
  "Trông bạn hôm nay như thể vừa từ cuộc chiến với thức khuya và cà phê trở về vậy.",
  "Nếu sự lười biếng là một nghề, bạn chắc hẳn đã là CEO rồi.",
  "Mỗi lần bạn nói chuyện, não tôi tự động chuyển sang chế độ máy bay.",
  "Thái độ của bạn như thời tiết ấy - thất thường và thường khó chịu.",
  
  // Playful mockery
  "Bạn đúng là hiện thân của câu nói 'cố lên nhưng đừng cố quá'.",
  "Tôi thích phong cách của bạn đấy - một phong cách mà không ai cố bắt chước.",
  "Nếu sự khó hiểu là một môn thể thao, bạn sẽ giành huy chương vàng.",
  "Bạn khiến tôi nhớ đến Google, vì bạn có tất cả các câu trả lời nhưng hầu hết đều không liên quan.",
  
  // Light teasing
  "Cách bạn ăn mặc thật độc đáo, nhìn như thể tủ quần áo của bạn quyết định trả thù vậy.",
  "Bạn thật là đặc biệt, như một bông tuyết - rơi xuống và tan biến không để lại dấu vết gì.",
  "Còn ai hiểu rõ về thất bại hơn bạn chứ? Bạn đúng là chuyên gia trong lĩnh vực này.",
  "Bạn giống như một tác phẩm nghệ thuật vậy - không phải ai cũng hiểu được.",
  
  // Vietnamese specific
  "Bạn nói tiếng Việt như người mới học vậy - đáng yêu nhưng khó hiểu.",
  "Nhìn bạn gõ bàn phím như nhìn gà bới thóc ấy, công nhận là có tài.",
  "Với khả năng của bạn, việc đơn giản cũng thành phức tạp được, quả là tài năng hiếm có.",
  "Tự tin như kiểu bạn biết mình đang làm gì vậy, đáng nể thật.",
  
  // Tech jokes
  "Code của bạn như nồi canh - nhiều thứ quá nên không ai biết vị gì.",
  "Git commit của bạn giống như bài văn lớp 1 vậy - ngắn, khó hiểu và thiếu chủ đề.",
  "Bạn debug như tìm kim trong đống rơm vậy, nhưng kim thì không có, chỉ toàn rơm thôi.",
  "Bạn đặt tên biến như đặt tên con vậy - ngẫu hứng và không ai hiểu được ý nghĩa.",
  
  // Meme references
  "Bạn là phiên bản đời thực của meme 'confused math lady' đấy.",
  "Tôi nghe bạn nói nhưng tất cả những gì tôi thấy là meme 'this is fine' khi mọi thứ đang cháy xung quanh.",
  "Bạn khiến tôi nhớ đến meme 'they don't know' - đứng một mình và nghĩ mình đặc biệt lắm.",
  "Khuôn mặt bạn khi nghe tin này chắc như meme 'surprised Pikachu' nhỉ?",

  // Thêm mới
  "Bạn làm việc cực kỳ chăm chỉ... trong việc tránh làm việc.",
  "IQ của bạn rất cao, nó chỉ đang đi nghỉ mát thôi.",
  "Bạn có điểm mạnh là luôn đúng giờ... khi đi ăn.",
  "Mỗi khi bạn có ý tưởng mới, cả thế giới lại thêm một câu chuyện cười.",
  "Bạn thật là... đặc biệt. Đúng là không ai giống bạn nổi.",
  "Tôi muốn nói điều gì đó tích cực về bạn, nhưng hôm nay tôi không có nhiều thời gian.",
  "Wow, tôi chưa từng thấy ai có thể tự tin như bạn với ít lý do đến vậy.",
  "Nếu sự lười biếng là một môn nghệ thuật, bạn sẽ được treo trong bảo tàng.",
  "Bạn có năng khiếu đặc biệt trong việc làm người khác tự hỏi bạn đang nghĩ gì.",
  "Đừng lo, bạn không tệ nhất đâu. Có người còn tệ hơn. Chỉ là tôi chưa gặp thôi.",
  "Vũ trụ thật rộng lớn và bạn là minh chứng cho thấy nó không có giới hạn.",
  "Nhìn bạn làm việc như xem phim tua chậm vậy, quá sức hấp dẫn.",
  "Đúng là phải làm quen với bạn mới thấy được 'cá tính' của bạn.",
  "Bạn như một cuốn từ điển vậy - cũng đầy chữ nhưng hiếm khi được mở ra.",
  "Bạn có tài năng tự nhiên trong việc làm mọi thứ phức tạp hơn, đáng nể thật!",
  
  // Thêm mới - Phong cách sống
  "Cách bạn dùng điện thoại như thể nó sắp biến mất khỏi tay bạn trong 5 giây nữa vậy.",
  "Giọng hát của bạn có khả năng đặc biệt - làm cho các loài động vật phải di cư sớm hơn dự kiến.",
  "Phong cách nói chuyện của bạn giống như một bài văn dài không có dấu câu vậy.",
  "Bạn nhảy như thể không ai đang nhìn - và mọi người đều ước rằng điều đó là sự thật.",
  "Cách bạn cầm đũa khiến tổ tiên phải quay lại để dạy bạn lần nữa.",
  
  // Thêm mới - Công việc
  "Bạn làm việc theo cách riêng của mình - còn được gọi là 'sai cách' trong hầu hết các trường hợp.",
  "Email của bạn dài như một bộ tiểu thuyết, nhưng chẳng có ai đọc cả.",
  "Cách bạn tổ chức file giống như một trò chơi trốn tìm mà ngay cả bạn cũng không thể thắng.",
  "Thời gian bạn dành cho việc tìm cách trốn việc có thể được dùng để hoàn thành công việc từ lâu rồi.",
  "Buổi họp do bạn điều hành giống như một bản nhạc giao hưởng - dài, buồn ngủ và không ai hiểu nổi.",
  
  // Thêm mới - Cuộc sống hàng ngày
  "Cách bạn lái xe như thể luật giao thông chỉ là những gợi ý không bắt buộc vậy.",
  "Khi bạn kể chuyện, tất cả mọi người đều được rèn luyện sự kiên nhẫn.",
  "Khả năng giữ bí mật của bạn tương đương với một tờ báo được phát miễn phí.",
  "Cách bạn đi shopping như thể tiền không phải vấn đề - có lẽ vì đó là tiền của người khác.",
  "Khi bạn nấu ăn, cả gia đình lại có lý do mới để đánh giá cao dịch vụ giao hàng.",
  
  // Thêm mới - Mạng xã hội
  "Cách bạn sống ảo trên mạng xã hội khiến mọi người tự hỏi bạn có tồn tại thật không.",
  "Số lượng selfie bạn chụp trong ngày nhiều hơn số lần bạn nhìn vào gương - và điều đó nói lên nhiều điều.",
  "Caption Instagram của bạn sâu sắc đến mức chạm đáy của sự nông cạn.",
  "Bạn dùng filter nhiều đến mức ngay cả người thân cũng không nhận ra bạn ngoài đời thật.",
  "Tin nhắn 'Seen' của bạn đã trở thành biểu tượng cho sự im lặng trong thời đại số."
];

// Templates câu cà khịa thông minh có thể được cá nhân hóa
const SMART_TEMPLATES = [
  "{name} đúng là người đặc biệt - có thể làm chậm bất kỳ cuộc trò chuyện nào chỉ bằng cách tham gia.",
  "Nếu {name} mà nỗ lực chăm chỉ như cách viện lý do, thì chắc đã trở thành thiên tài rồi.",
  "Tôi thấy sự tự tin của {name} thật đáng nể, nhất là khi không có lý do gì để tự tin cả.",
  "Mỗi khi {name} mở miệng, não mọi người như tự động chuyển sang chế độ máy bay.",
  "Nói chuyện với {name} giống như đọc Wikipedia - dài dòng và phần lớn là không chính xác.",
  "Năng lượng tiêu cực của {name} đủ để cấp điện cho cả thành phố.",
  "Tôi nghĩ {name} đáng được lên phim đấy - như một ví dụ điển hình về cách không nên cư xử.",
  "Mỗi lần {name} đưa ra ý kiến, cả nhóm lại có thêm động lực... để làm ngược lại.",
  "Thành tựu lớn nhất của {name} là khả năng biến công việc 5 phút thành dự án kéo dài cả ngày.",
  "Cách {name} xử lý vấn đề giống như cách tôi xử lý toán học phức tạp - tránh né hoàn toàn.",
  "Nếu sự lười biếng là một kỹ năng, {name} sẽ là chuyên gia thế giới.",
  "Chắc hẳn {name} phải rất mệt mỏi - bởi việc chạy trốn trách nhiệm cả ngày không hề dễ dàng.",
  "IQ của {name} chắc không cao lắm, nhưng sự tự tin thì vô hạn.",
  "Làm quen với {name} khiến tôi đánh giá lại định nghĩa về sự kiên nhẫn của mình.",
  "{name} đúng là biết cách làm tôi cười - không phải vì hài hước, mà vì những quyết định kỳ lạ.",
  "Tôi ngưỡng mộ cách {name} có thể nói nhiều mà không truyền đạt được gì.",
  "Trí tưởng tượng của {name} thật phong phú, đặc biệt khi nghĩ ra lý do để không làm việc.",
  "Tôi chưa bao giờ gặp ai như {name} - có thể biến mọi tình huống đơn giản thành phức tạp.",
  
  // Thêm mới - Bối cảnh công việc & học tập
  "CV của {name} như tiểu thuyết viễn tưởng vậy - đầy điều thú vị nhưng chẳng có gì là thật.",
  "Bài thuyết trình của {name} là minh chứng hoàn hảo rằng ngủ gật vẫn là một kỹ năng có thể truyền lây.",
  "Mỗi khi {name} nộp báo cáo, sếp lại phải thở dài và tự hỏi mình đã làm gì để đáng bị như vậy.",
  "Đóng góp lớn nhất của {name} cho nhóm là ngày nghỉ phép của bạn ấy.",
  "Kỹ năng giải quyết vấn đề của {name} vô song - không ai tạo ra nhiều vấn đề hơn để giải quyết cả.",
  
  // Mạng xã hội & công nghệ
  "Story Instagram của {name} giống như bộ phim dài tập mà không ai muốn xem tiếp.",
  "Tin nhắn của {name} giống như mã Morse - ngắn, khó hiểu và thuộc về thế kỷ trước.",
  "Avatar của {name} là bức ảnh photoshop đẹp nhất mà tôi từng thấy - chẳng còn gì giống người thật.",
  "Mỗi khi {name} đăng status, Facebook lại cân nhắc việc thêm nút 'không quan tâm nhưng lịch sự'.",
  "Cách {name} dùng hashtag như cách người ta ném confetti - nhiều, lộn xộn và chẳng ai dọn dẹp.",
  
  // Ăn uống & phong cách sống
  "Gu ẩm thực của {name} độc đáo tới mức đầu bếp nhìn thấy cũng phải xin nghỉ việc.",
  "Phong cách thời trang của {name} là minh chứng cho thấy không phải ai cũng nên tự quyết định mặc gì.",
  "Khả năng nấu ăn của {name} khiến dịch vụ giao đồ ăn phải cảm ơn vì có khách hàng trung thành.",
  "Cách {name} ăn phở như thể đó là lần đầu tiên bạn ấy cầm đũa vậy.",
  "Playlist nhạc của {name} là minh chứng rằng tai người và tai trâu đôi khi khó phân biệt.",
  
  // Hài hước về tính cách
  "Tính kiên nhẫn của {name} thật đáng nể - chưa ai đợi lâu hơn để hoàn thành một việc đơn giản.",
  "Sự chung thủy của {name} với những thói quen xấu thật đáng để các mối quan hệ học hỏi.",
  "Mỗi khi {name} tự nhận mình là người hài hước, cả phòng lại im lặng để tưởng nhớ những trò đùa đã chết.",
  "Khả năng trì hoãn của {name} nên được đưa vào sách kỷ lục Guinness.",
  "{name} là người lạc quan nhất tôi từng gặp - vẫn tin rằng mình đúng dù toàn bộ sự thật chứng minh điều ngược lại.",
  
  // Đặc trưng văn hóa Việt Nam
  "{name} đi họp như đi chơi - đến muộn, về sớm và chẳng đóng góp gì ngoài việc ăn bánh.",
  "Lời hứa của {name} như mưa Sài Gòn vậy - không bao giờ biết khi nào sẽ đến và khi nào sẽ kết thúc.",
  "Khả năng lái xe máy của {name} khiến cả Grabbike cũng phải né xa ba cây số.",
  "Cách {name} mặc cả giống như đang tập kịch vậy - kịch tính, ồn ào và chẳng ai tin.",
  "Khả năng uống bia của {name} tỷ lệ nghịch với khả năng chịu đựng hậu quả ngày hôm sau."
];

// Templates cho trích dẫn giả
const QUOTE_TEMPLATES = [
  "Trong cuộc sống, điều quan trọng không phải là {topic}, mà là cách bạn từ chối tham gia vào {topic}.",
  "Thành công trong {topic} không đến từ việc nỗ lực, mà từ việc đổ lỗi cho người khác khi thất bại.",
  "Có hai loại người trên đời: những người giỏi {topic} và những người giống tôi.",
  "Không ai thất bại trong {topic} nhiều như tôi, đó là lý do tôi được coi là chuyên gia.",
  "Tôi không phải là người giỏi nhất về {topic}, nhưng tôi chắc chắn là người nói nhiều nhất về nó.",
  "Một ngày không {topic} là một ngày không hoàn chỉnh... đó là lý do tôi luôn sống không trọn vẹn.",
  "Mọi người đều nghĩ tôi biết về {topic}, nhưng sự thật là tôi chỉ giỏi việc Google thôi.",
  "Khi còn trẻ, tôi mơ ước được trở thành chuyên gia {topic}. Giờ tôi vẫn mơ ước như vậy.",
  "Đừng bao giờ từ bỏ {topic}. Thực ra, hãy từ bỏ đi, vì có lẽ bạn không giỏi về nó.",
  "Người khôn ngoan học từ thất bại của người khác trong {topic}. Tôi để người khác học từ thất bại của mình.",
  "Nếu bạn không thể làm tốt {topic}, hãy dạy nó. Nếu không dạy được, hãy viết sách về nó.",
  "Bí quyết thành công trong {topic} là không bao giờ chia sẻ bí quyết của bạn.",
  "Trong {topic}, thất bại không phải là một lựa chọn - đó là đặc quyền của tôi.",
  "Có những người tạo ra lịch sử trong {topic}, và có những người như tôi - chỉ xem TikTok về nó.",
  "Cuộc sống quá ngắn ngủi để học {topic} đúng cách - đó là lý do tôi luôn làm ẩu.",
  "Người thành công trong {topic} là người thất bại nhiều nhất, nhưng thất bại một cách khôn ngoan - còn tôi thì không.",
  
  // Thêm mới - Triết lý sống
  "Tôi không biết gì về {topic} cả, nhưng điều đó chưa bao giờ ngăn tôi nói về nó như một chuyên gia.",
  "Mọi người thường hỏi bí quyết của tôi về {topic}. Bí quyết đơn giản là: hãy làm như thể bạn biết những gì bạn đang làm.",
  "Thời gian là thứ quý giá nhất trong {topic}. Đó là lý do tôi dành nhiều thời gian nhất để lãng phí nó.",
  "Cách tốt nhất để học {topic} là dạy người khác - nhưng tốt hơn nữa là đừng dính dáng gì đến nó.",
  "Để thành công trong {topic}, bạn cần ba thứ: sự may mắn, nhiều may mắn hơn, và khả năng đổ lỗi khi không may mắn.",
  
  // Thêm mới - Công nghệ & Internet
  "Tôi dùng Internet để nghiên cứu về {topic}. Đó là cách tôi biến 5 phút tìm kiếm thành 3 giờ xem video mèo.",
  "Mạng xã hội đã thay đổi cách chúng ta nhìn nhận {topic} - giờ đây chúng ta có thể sai lầm trước đông đảo công chúng.",
  "Trong thế giới {topic}, có hai loại người: những người đổi mật khẩu thường xuyên và những người như tôi - vẫn dùng tên thú cưng từ năm 2008.",
  "AI sẽ thay thế nhiều công việc liên quan đến {topic}, nhưng may mắn thay, sự lười biếng của tôi đã không thể bị thay thế.",
  "Khi nói đến {topic} online, tôi là chuyên gia - trong việc copy và paste từ Wikipedia.",
  
  // Thêm mới - Công việc & sự nghiệp
  "Sự nghiệp của tôi trong {topic} giống như một bộ phim hài - nhiều người xem, nhiều người cười, nhưng không ai thật sự hiểu.",
  "Làm việc chăm chỉ trong {topic} rất quan trọng. Tôi luôn làm việc cực kỳ chăm chỉ... để tìm cách làm ít nhất có thể.",
  "Tôi không gọi nó là 'trì hoãn {topic}', tôi gọi đó là 'đợi thời điểm hoàn hảo' - thường là vào phút cuối cùng.",
  "Họp hành về {topic} là cách hiệu quả để biến việc có thể giải quyết trong một email thành một ngày làm việc đầy đủ.",
  "Đừng chỉ mơ về thành công trong {topic} - hãy ngủ luôn đi, điều đó dễ chịu hơn nhiều.",
  
  // Thêm mới - Tình yêu & mối quan hệ
  "Tình yêu cũng giống như {topic} - không ai thực sự hiểu nó, nhưng mọi người đều giả vờ như họ biết.",
  "Bí quyết của một mối quan hệ thành công trong {topic} là tìm người không làm bạn phát điên... quá nhiều.",
  "Tôi tiếp cận {topic} như cách tôi tiếp cận tình yêu - với nhiều hy vọng, ít kỹ năng, và kết quả thường là thất vọng.",
  "Trong {topic} cũng như trong tình yêu, tôi luôn đúng - ngay cả khi tôi hoàn toàn sai.",
  "Nếu {topic} là một mối quan hệ, thì tôi chắc chắn đang ở trong giai đoạn 'nên chia tay nhưng vẫn cố gắng'."
];

/**
 * Generate AI response using HuggingFace API or fallback responses
 * @param {string} prompt - The prompt to send to the model
 * @param {string} mode - 'ai', 'custom', 'premium', hoặc 'all' (mặc định) để xác định loại câu cà khịa
 * @returns {Promise<string>} - The generated response
 */
export async function generateResponse(prompt, mode = 'all') {
  try {
    // Apply rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - rateLimiter.lastCallTime;
    
    if (timeSinceLastCall < rateLimiter.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, rateLimiter.minInterval - timeSinceLastCall)
      );
    }
    
    rateLimiter.lastCallTime = Date.now();
    
    // Handle custom mode
    if (mode === 'custom') {
      const customResponse = await getRandomCustomResponse();
      if (customResponse) {
        console.log("Sử dụng câu cà khịa tùy chỉnh theo yêu cầu");
        return customResponse.text;
      } else {
        console.log("Không có câu tùy chỉnh, sử dụng câu mặc định");
        const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
        return FALLBACK_RESPONSES[randomIndex];
      }
    }
    
    // Lấy tên người dùng từ prompt để cá nhân hóa
    const username = prompt.match(/người tên ([^\s.]+)/i)?.[1] || 'bạn';
    
    // Xử lý chế độ Premium AI - thử dùng HuggingFace API
    if (mode === 'premium') {
      // Kiểm tra xem ID người dùng có trong danh sách trả phí không
      console.log("Kiểm tra người dùng Premium...");
      
      // Lấy userId từ prompt nếu có
      const userIdMatch = prompt.match(/user_id:(\d+)/i);
      const userId = userIdMatch ? userIdMatch[1] : null;
      
      // Kiểm tra xem người dùng có trong danh sách premium không
      if (userId && (userId === process.env.OWNER_ID || (process.env.PREMIUM_USERS && process.env.PREMIUM_USERS.split(',').includes(userId)))) {
        console.log(`Người dùng ${userId} là thành viên Premium`);
        
        if (!process.env.HF_API_TOKEN) {
          return "⭐ Premium AI yêu cầu cấu hình HuggingFace API. Vui lòng liên hệ admin để được hỗ trợ.";
        }
        
        console.log("Đang sử dụng chế độ AI Premium...");
        
        // Cố gắng gọi API
        let apiSuccess = false;
        let apiResponse = "";
        
        // Thử gọi API với mô hình theo thứ tự
        for (const model of FALLBACK_MODELS) {
          try {
            const simplifiedPrompt = `Write a short funny teasing comment about ${username}:`;
            console.log(`Premium: Thử với mô hình ${model}`);
            
            const result = await callHuggingFaceAPI(model, simplifiedPrompt);
            if (result && result.data && result.data[0]?.generated_text) {
              const generated = result.data[0].generated_text;
              if (generated.length > simplifiedPrompt.length + 10) {
                apiSuccess = true;
                // Xử lý và làm sạch kết quả
                if (generated.includes(simplifiedPrompt)) {
                  apiResponse = generated.substring(generated.indexOf(simplifiedPrompt) + simplifiedPrompt.length);
                } else {
                  apiResponse = generated;
                }
                
                apiResponse = apiResponse.split(/[.!?][\s\n]/)[0].trim() + ".";
                console.log(`Premium: Thành công với ${model}`);
                break;
              }
            }
          } catch (err) {
            console.log(`Premium: Lỗi với mô hình ${model} - ${err.message}`);
            continue;
          }
        }
        
        if (apiSuccess) {
          return `⭐ ${apiResponse}`;
        } else {
          return "⭐ Premium AI đang bảo trì. Vui lòng thử lại sau.";
        }
      } else {
        // Người dùng không phải Premium
        return "⭐ Tính năng này yêu cầu gói Premium! Vui lòng liên hệ admin để nâng cấp tài khoản.";
      }
    }
    
    // Handle combined mode (all)
    if (mode === 'all') {
      // Try custom response first with 50% probability
      if (Math.random() < 0.5) {
        const customResponse = await getRandomCustomResponse();
        if (customResponse) {
          console.log("Sử dụng câu cà khịa tùy chỉnh (ngẫu nhiên)");
          return customResponse.text;
        }
      }
    }
    
    // AI generation for 'ai' or 'all' modes
    // Đối với mode 'ai' thông thường, chỉ sử dụng template thông minh
    console.log("Sử dụng template thông minh cho chế độ Template");
    
    // Template thông minh
    const templateIndex = Math.floor(Math.random() * SMART_TEMPLATES.length);
    const selectedTemplate = SMART_TEMPLATES[templateIndex];
    return selectedTemplate.replace(/{name}/g, username);
    
  } catch (error) {
    console.error('Error in generateResponse function:', error.message);
    // Use fallback response
    const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
    return FALLBACK_RESPONSES[randomIndex];
  }
}

/**
 * Call HuggingFace API with specific model
 */
async function callHuggingFaceAPI(model, prompt) {
  try {
    const response = await axios({
      method: 'post',
      url: `https://api-inference.huggingface.co/models/${model}`,
      headers: { 
        Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
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
      timeout: 10000 // 10 seconds timeout
    });
    
    return response;
  } catch (error) {
    console.log(`API call thất bại: ${error.message}`);
    throw error;
  }
}

/**
 * Generate quote about a topic
 * @param {string} username - Username to attribute quote to
 * @param {string} topic - Topic of the quote
 * @returns {string} - Generated quote
 */
export function generateQuote(username, topic = "cuộc sống") {
  const randomIndex = Math.floor(Math.random() * QUOTE_TEMPLATES.length);
  const template = QUOTE_TEMPLATES[randomIndex];
  return template.replace(/{topic}/g, topic);
} 