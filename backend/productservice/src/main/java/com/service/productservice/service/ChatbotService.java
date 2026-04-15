package com.service.productservice.service;

import com.service.productservice.model.Product;
import com.service.productservice.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChatbotService {
    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> processMessage(String userMessage, String userName) {
        Map<String, Object> finalResult = new HashMap<>();

        try {
            // Lọc từ khóa
            String keyword = extractKeyword(userMessage);
            Double[] priceRange = extractPriceRange(userMessage);

            Double minPrice = 0.0;
            Double maxPrice = 999999999.0;

            if (priceRange != null) {
                minPrice = priceRange[0];
                maxPrice = priceRange[1];
                keyword = keyword.replaceAll("triệu|tr|củ|đến|dưới|hơn|khoảng|tầm", "").trim();
            }

            List<Product> suggestedProducts = new ArrayList<>();

            suggestedProducts = productRepository.findTop5ForChatbot(keyword, minPrice, maxPrice);

            if (suggestedProducts.isEmpty() && keyword.contains(" ")) {
                String[] words = keyword.split(" ");
                for (int i = words.length - 1; i >= 0; i--) {
                    String singleWord = words[i].trim();
                    if (singleWord.length() > 2) {
                        suggestedProducts = productRepository.findTop5ForChatbot(singleWord, minPrice, maxPrice);
                        if (!suggestedProducts.isEmpty()) break;
                    }
                }
            }

            // Tạo ngữ cảnh cho AI
            StringBuilder context = new StringBuilder();
            if (suggestedProducts.isEmpty()) {
                context.append("[Khách đang chào hỏi hoặc không tìm thấy sản phẩm. Hãy giao tiếp tự nhiên]");
            } else {
                context.append("DỮ LIỆU TỒN KHO:\n");
                for (Product p : suggestedProducts) {
                    context.append("- Tên: ").append(p.getName())
                            .append(" | Giá: ").append(p.getSalePrice()).append("đ\n");
                }
            }

            // Ngữ cảnh xưng hô
            String greetingContext;
            if (userName != null && !userName.trim().isEmpty()) {
                greetingContext = "Tên khách hàng là: " + userName + ". Hãy dùng tên này để xưng hô thật thân thiện.";
            } else {
                greetingContext = "Khách hàng chưa đăng nhập. Hãy xưng hô là 'bạn'.";
            }

            // Gọi Gemini
            String systemPrompt = """
                Bạn là một trợ lý AI thông minh, vui vẻ và vô cùng thân thiện của cửa hàng công nghệ TCP Store.
                Bạn có cảm xúc và cách nói chuyện tự nhiên như con người.
                
                THÔNG TIN KHÁCH HÀNG (BẮT BUỘC DÙNG ĐỂ XƯNG HÔ):
                %s

                DỮ LIỆU TỪ HỆ THỐNG:
                %s

                QUY TẮC ỨNG XỬ BẮT BUỘC:
                1. NẾU KHÁCH HỎI MUA HÀNG:
                   - Hãy dùng DỮ LIỆU TỪ HỆ THỐNG ở trên để tư vấn tối đa 1-2 sản phẩm.
                   - Báo giá rõ ràng, nêu ưu điểm ngắn gọn.

                2. NẾU KHÁCH CHỈ TRÒ CHUYỆN, TÂM SỰ (ví dụ: than buồn, hỏi thời tiết, trêu đùa, chào hỏi...):
                   - KHÔNG tư vấn sản phẩm nếu khách chưa có nhu cầu.
                   - Hãy trò chuyện lại một cách tự nhiên, duyên dáng, thấu cảm như một người bạn.
                   - Khéo léo giữ hình tượng là nhân viên của TCP Store (ví dụ: "Hôm nay TCP Store thấy trời khá nóng, bạn nhớ uống nhiều nước nha!").

                3. NGUYÊN TẮC CHUNG:
                   - Trả lời ngắn gọn 2-3 câu giống như đang nhắn tin Zalo/Messenger.
                   - Nếu khách hỏi những chủ đề nhạy cảm (chính trị, bạo lực), hãy khéo léo bẻ lái câu chuyện sang chủ đề khác cho vui vẻ.

                CÂU HỎI / TIN NHẮN CỦA KHÁCH: %s
                """.formatted(greetingContext, context.toString(), userMessage);

            // Gửi API Gemini
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", systemPrompt))))
            );
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            String fullUrl = apiUrl + apiKey;
            Map<String, Object> response = restTemplate.postForObject(fullUrl, request, Map.class);

            String aiReply = "Hệ thống đang bận, bạn đợi xíu nhé!";
            if (response != null && response.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                aiReply = (String) ((List<Map<String, Object>>) ((Map<String, Object>) candidates.get(0).get("content")).get("parts")).get(0).get("text");
            }

            finalResult.put("reply", aiReply);

            List<Map<String, Object>> safeProducts = suggestedProducts.stream().map(p -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", p.getId());
                map.put("name", p.getName());
                map.put("salePrice", p.getSalePrice());

                map.put("thumbnail", p.getThumbnail());
                return map;
            }).toList();

            finalResult.put("products", safeProducts);
            return finalResult;

        } catch (Exception e) {
            e.printStackTrace();
            finalResult.put("reply", "Xin lỗi bạn, kết nối dữ liệu đang gặp sự cố ạ.");
            finalResult.put("products", new ArrayList<>());
            return finalResult;
        }
    }

    // Hàm hỗ trợ lọc từ khóa
    private String extractKeyword(String message) {
        if (message == null) return "";
        String text = " " + message.toLowerCase().replaceAll("[,.!?]", " ") + " ";
        String[] stopWords = {
                " tôi ", " mình ", " tớ ", " shop ", " bạn ", " ad ", " admin ",
                " muốn ", " cần ", " tìm ", " mua ", " xem ", " lấy ", " tư vấn ",
                " có ", " không ", " nào ", " cho ", " hỏi ", " nhé ", " ạ ", " ơi ",
                " dòng ", " loại ", " máy ", " cái ", " con ", " chiếc ", " tầm ", " giá ", " khoảng "
        };
        for (String word : stopWords) {
            text = text.replace(word, " ");
        }
        return text.trim().replaceAll("\\s+", " ");
    }

    // Nhận diện mức giá
    private Double[] extractPriceRange(String message) {
        String lowerMsg = message.toLowerCase();
        Double minPrice = 0.0;
        Double maxPrice = Double.MAX_VALUE;
        boolean found = false;

        // 15 đến 20 triệu, 15 - 20 tr
        java.util.regex.Pattern p1 = java.util.regex.Pattern.compile("(\\d+)\\s*(đến|tới|-)\\s*(\\d+)\\s*(triệu|tr|củ)");
        java.util.regex.Matcher m1 = p1.matcher(lowerMsg);
        if (m1.find()) {
            minPrice = Double.parseDouble(m1.group(1)) * 1000000;
            maxPrice = Double.parseDouble(m1.group(3)) * 1000000;
            return new Double[]{minPrice, maxPrice};
        }

        // dưới 15 triệu, tối đa 15tr
        java.util.regex.Pattern p2 = java.util.regex.Pattern.compile("(dưới|tối đa|nhỏ hơn|khoảng dưới)\\s*(\\d+)\\s*(triệu|tr|củ)");
        java.util.regex.Matcher m2 = p2.matcher(lowerMsg);
        if (m2.find()) {
            maxPrice = Double.parseDouble(m2.group(2)) * 1000000;
            return new Double[]{0.0, maxPrice};
        }

        // trên 15 triệu, hơn 15 củ
        java.util.regex.Pattern p3 = java.util.regex.Pattern.compile("(trên|hơn|tối thiểu)\\s*(\\d+)\\s*(triệu|tr|củ)");
        java.util.regex.Matcher m3 = p3.matcher(lowerMsg);
        if (m3.find()) {
            minPrice = Double.parseDouble(m3.group(2)) * 1000000;
            return new Double[]{minPrice, Double.MAX_VALUE};
        }

        // tầm 15 triệu, khoảng 15tr
        java.util.regex.Pattern p4 = java.util.regex.Pattern.compile("(tầm|khoảng|mức)\\s*(\\d+)\\s*(triệu|tr|củ)");
        java.util.regex.Matcher m4 = p4.matcher(lowerMsg);
        if (m4.find()) {
            Double basePrice = Double.parseDouble(m4.group(2)) * 1000000;
            minPrice = Math.max(0, basePrice - 2000000);
            maxPrice = basePrice + 2000000;
            return new Double[]{minPrice, maxPrice};
        }

        return null;
    }
}
