package com.service.shoppingcartservice.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class CartResponse {
    private Integer id;
    private Integer userId;
    private BigDecimal totalAmount;
    private int totalItems;
    private List<CartItemDTO> items;

    @Data
    @Builder
    public static class CartItemDTO {
        private Integer id;
        private Integer productId;
        private String skuId;
        private String productName;
        private String productThumbnail;
        private BigDecimal price;
        private BigDecimal basePrice;
        private Integer quantity;
        private BigDecimal subTotal;
        private Boolean isSelected;
        private Integer stock;
        private String selectedColor;
    }
}
