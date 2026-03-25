package com.service.productservice.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class ProductRequest {
    private String name;
    private String sku;
    private Integer categoryId;
    private BigDecimal costPrice;
    private BigDecimal basePrice;
    private BigDecimal salePrice;
    private Integer stock;
    private String stockStatus;
    private Boolean isActive;
    private Boolean isFeatured;
    private String thumbnail;
    private List<String> images;
    private List<ColorDTO> colors;
    private Map<String, Object> specs;

    @Data
    public static class ColorDTO {
        private String colorName;
        private String colorImageUrl;
    }
}
