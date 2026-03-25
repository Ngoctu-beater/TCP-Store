package com.service.productservice.dto;

import com.service.productservice.model.StockStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private Integer id;
    private String categoryName;
    private String sku;
    private String name;
    private String thumbnail;
    private BigDecimal salePrice;
    private BigDecimal basePrice;
    private Integer sold;
    private Integer stock;
    private StockStatus stockStatus;
    private Map<String, Object> specs;
    private Map<String, Object> categoryConfig;

    // --- THÊM CÁC TRƯỜNG MỚI (Cho chi tiết sản phẩm) ---
    private List<String> images;      // Danh sách ảnh phụ
    private List<ColorDTO> colors;    // Danh sách màu sắc

    // Inner class để chứa thông tin màu
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ColorDTO {
        private String colorName;
        private String colorImageUrl;
    }
}
