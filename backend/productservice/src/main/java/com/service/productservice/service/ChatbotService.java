package com.service.productservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.productservice.model.Product;
import com.service.productservice.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChatbotService {

    @Autowired
    private ProductRepository productRepository;

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> processMessage(String userMessage, String userName) {
        Map<String, Object> finalResult = new HashMap<>();
        String customerName = (userName != null && !userName.trim().isEmpty()) ? userName : "bạn";

        try {
            // ==========================================
            // PHA 1: NHỜ GEMINI PHÂN TÍCH Ý ĐỊNH (JSON)
            // ==========================================
            String intentPrompt = """
                Bạn là AI phân tích dữ liệu mua sắm. Phân tích tin nhắn và trả về DUY NHẤT một chuỗi JSON hợp lệ. KHÔNG dùng markdown.
                Định dạng: {"action": "SEARCH" hoặc "CHAT", "keyword": "tên SP/hãng/loại ngắn gọn", "minPrice": số, "maxPrice": số}
                Quy tắc:
                - minPrice mặc định là 0. maxPrice mặc định là 999999999.
                - Quy đổi "củ", "triệu", "tr" thành số thực (VND). Ví dụ "15 củ" -> 15000000.
                - Nếu khách chào hỏi, than vãn -> action: CHAT, keyword: "".
                Tin nhắn khách: "%s"
                """.formatted(userMessage);

            String intentJsonString = callGemini(intentPrompt);
            intentJsonString = cleanJsonString(intentJsonString); // Làm sạch markdown nếu AI lỡ sinh ra

            // Đọc JSON AI trả về
            JsonNode intentData = objectMapper.readTree(intentJsonString);
            String action = intentData.path("action").asText("CHAT");
            String keyword = intentData.path("keyword").asText("");
            Double minPrice = intentData.path("minPrice").asDouble(0.0);
            Double maxPrice = intentData.path("maxPrice").asDouble(999999999.0);

            // ==========================================
            // PHA 2: TÌM KIẾM TRONG DATABASE (Nếu là SEARCH)
            // ==========================================
            List<Product> suggestedProducts = new ArrayList<>();
            if ("SEARCH".equals(action) && !keyword.isEmpty()) {
                suggestedProducts = productRepository.findTop5ForChatbot(keyword, minPrice, maxPrice);

                // Fallback thông minh: Nếu cụm từ khóa dài quá không có, cắt từ cuối (thường là tên hãng) ra tìm
                if (suggestedProducts.isEmpty() && keyword.contains(" ")) {
                    String[] words = keyword.split(" ");
                    for (int i = words.length - 1; i >= 0; i--) {
                        if (words[i].length() > 2) {
                            suggestedProducts = productRepository.findTop5ForChatbot(words[i], minPrice, maxPrice);
                            if (!suggestedProducts.isEmpty()) break;
                        }
                    }
                }
            } else if ("SEARCH".equals(action) && keyword.isEmpty() && minPrice < maxPrice) {
                // Khách chỉ nói giá (VD: "có máy nào dưới 15 củ ko")
                suggestedProducts = productRepository.findTop5ForChatbot("", minPrice, maxPrice);
            }

            // ==========================================
            // PHA 3: NHỜ GEMINI TRẢ LỜI TỰ NHIÊN
            // ==========================================
            StringBuilder contextPrompt = new StringBuilder();
            contextPrompt.append("Bạn là nhân viên tư vấn vui vẻ, thân thiện của TCP Store. Tên khách hàng: ").append(customerName).append(".\n");

            if ("CHAT".equals(action)) {
                contextPrompt.append("Khách đang trò chuyện hoặc chào hỏi. Hãy nói chuyện duyên dáng, thân thiện như một người bạn.\n");
            } else {
                if (suggestedProducts.isEmpty()) {
                    contextPrompt.append("Hệ thống ĐÃ HẾT HÀNG hoặc KHÔNG TÌM THẤY sản phẩm theo yêu cầu (Từ khóa: '").append(keyword).append("', Giá: ").append(String.format("%,.0f", minPrice)).append(" - ").append(String.format("%,.0f", maxPrice)).append(").\n");
                    contextPrompt.append("Hãy xin lỗi nhẹ nhàng, chân thành và mời khách xem các dòng sản phẩm khác.\n");
                } else {
                    contextPrompt.append("DANH SÁCH SẢN PHẨM KHỚP YÊU CẦU ĐANG CÓ TẠI KHO:\n");
                    for (Product p : suggestedProducts) {
                        contextPrompt.append("- ").append(p.getName()).append(" | Giá: ").append(String.format("%,.0f", p.getSalePrice())).append("đ\n");
                    }
                    contextPrompt.append("Hãy tư vấn nhiệt tình dựa DUY NHẤT vào danh sách trên. Báo giá rõ ràng.\n");
                }
            }

            contextPrompt.append("\nQUY TẮC PHẢN HỒI:\n")
                    .append("1. Trả lời bằng tiếng Việt, tự nhiên, dùng emoji.\n")
                    .append("2. Ngắn gọn (tối đa 3-4 câu).\n")
                    .append("3. KHÔNG TỰ BỊA SẢN PHẨM nêú danh sách trống.\n")
                    .append("\nTIN NHẮN KHÁCH: ").append(userMessage);

            // Sinh câu trả lời cuối cùng
            String finalReply = callGemini(contextPrompt.toString());
            finalResult.put("reply", finalReply);

            // ==========================================
            // ĐÍNH KÈM SẢN PHẨM VÀO GIAO DIỆN
            // ==========================================
            List<Map<String, Object>> productPayload = new ArrayList<>();
            if ("SEARCH".equals(action) && !suggestedProducts.isEmpty()) {
                productPayload = suggestedProducts.stream().map(p -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", p.getId());
                    m.put("name", p.getName());
                    m.put("salePrice", p.getSalePrice());
                    m.put("thumbnail", p.getThumbnail());
                    return m;
                }).toList();
            }
            finalResult.put("products", productPayload);

        } catch (Exception e) {
            e.printStackTrace();
            finalResult.put("reply", "Hệ thống não bộ của TCP Store đang khởi động lại một chút. Bạn chờ mình giây lát rồi nhắn lại nhé! 😅");
            finalResult.put("products", new ArrayList<>());
        }

        return finalResult;
    }

    // --- HÀM GỌI API GEMINI DÙNG CHUNG ---
    private String callGemini(String prompt) {
        try {
            String fullUrl = apiUrl + apiKey;
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            Map<String, Object> response = restTemplate.postForObject(fullUrl, request, Map.class);

            if (response != null && response.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                return (String) parts.get(0).get("text");
            }
        } catch (Exception e) {
            System.err.println("Lỗi gọi API Gemini: " + e.getMessage());
        }
        return "{}"; // Trả về JSON rỗng nếu lỗi để hệ thống không sập
    }

    // --- HÀM LÀM SẠCH CHUỖI JSON ---
    private String cleanJsonString(String rawString) {
        String cleanString = rawString.trim();
        if (cleanString.startsWith("```json")) {
            cleanString = cleanString.substring(7);
        } else if (cleanString.startsWith("```")) {
            cleanString = cleanString.substring(3);
        }
        if (cleanString.endsWith("```")) {
            cleanString = cleanString.substring(0, cleanString.length() - 3);
        }
        return cleanString.trim();
    }
}