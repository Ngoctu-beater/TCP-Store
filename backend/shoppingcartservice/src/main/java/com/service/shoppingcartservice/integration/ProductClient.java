package com.service.shoppingcartservice.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class ProductClient {
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper; // Spring tự động inject
    private final String PRODUCT_API_URL = "http://localhost:8082/api/products/";

    public ProductDTO getProductById(Integer productId) {
        try {
            Map response = restTemplate.getForObject(PRODUCT_API_URL + productId, Map.class);
            if (response == null) throw new RuntimeException("Product Service trả về null");

            BigDecimal price = BigDecimal.ZERO;
            if (response.get("salePrice") != null) {
                price = new BigDecimal(String.valueOf(response.get("salePrice")));
            }

            BigDecimal basePrice = BigDecimal.ZERO;
            if (response.get("basePrice") != null) {
                basePrice = new BigDecimal(String.valueOf(response.get("basePrice")));
            }

            // --- XỬ LÝ DANH SÁCH MÀU (MỚI) ---
            List<ColorDTO> colors = Collections.emptyList();
            if (response.get("colors") != null) {
                try {
                    // Convert mảng JSON thành List<ColorDTO>
                    colors = objectMapper.convertValue(response.get("colors"),
                            new com.fasterxml.jackson.core.type.TypeReference<List<ColorDTO>>() {});
                } catch (Exception e) {
                    System.err.println("Lỗi parse colors: " + e.getMessage());
                }
            }

            return ProductDTO.builder()
                    .id((Integer) response.get("id"))
                    .name((String) response.get("name"))
                    .thumbnail((String) response.get("thumbnail"))
                    .salePrice(price)
                    .basePrice(basePrice)
                    .sku((String) response.get("sku"))
                    .stock((Integer) response.get("stock"))
                    .colors(colors) // <--- LƯU COLORS VÀO DTO
                    .build();

        } catch (Exception e) {
            e.printStackTrace();
            return ProductDTO.builder().id(productId).name("Sản phẩm lỗi").build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductDTO {
        private Integer id;
        private String name;
        private String thumbnail;
        private BigDecimal salePrice;
        private BigDecimal basePrice;
        private String sku;
        private Integer stock;
        private List<ColorDTO> colors; // Danh sách màu
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ColorDTO {
        private String colorName;
        private String colorImageUrl;
    }
}
