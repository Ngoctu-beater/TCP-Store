package com.service.ordersservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopProductResponse {
    private Integer productId;
    private String productName;
    private String thumbnail;
    private Integer totalQuantity;
    private BigDecimal totalRevenue;
}
